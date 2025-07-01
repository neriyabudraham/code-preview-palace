import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CodeEditor } from "./CodeEditor";
import { HtmlPreview } from "./HtmlPreview";
import { PublishDialog } from "./PublishDialog";
import { Save, Play, RotateCcw, Copy, Share2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EMPTY_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הדף הזה ריק</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background: #f5f5f5;
            color: #333;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #666;
            font-size: 2rem;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>הדף הזה ריק</h1>
    </div>
</body>
</html>`;

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>דף לדוגמא</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
        }
        p {
            font-size: 1.2rem;
            line-height: 1.6;
        }
        .note {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>זהו דף לדוגמא</h1>
        <p>אתה יכול להחליף את הקוד הזה בקוד שלך</p>
        <div class="note">
            <p>זהו רק דף רקע לדוגמא - לא ניתן לשמור אותו</p>
        </div>
    </div>
</body>
</html>`;

export const HtmlEditor = () => {
  const [htmlCode, setHtmlCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isSampleMode, setIsSampleMode] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedProject, setLastSavedProject] = useState<any>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const { toast } = useToast();
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Save editor state to localStorage
  const saveEditorState = useCallback(() => {
    if (!isSampleMode) {
      const editorState = {
        htmlCode,
        fileName,
        currentProjectId,
        isEditingExisting,
        isSampleMode: false
      };
      localStorage.setItem("editorState", JSON.stringify(editorState));
    }
  }, [htmlCode, fileName, currentProjectId, isEditingExisting, isSampleMode]);

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (isSampleMode || !htmlCode.trim() || !fileName.trim()) {
      return;
    }

    // Don't auto-save if content hasn't changed
    if (lastSavedContentRef.current === htmlCode) {
      return;
    }

    // Check for duplicate names
    const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
    const existingProject = savedProjects.find((p: any) => p.name === fileName && p.id !== currentProjectId);
    
    if (existingProject) {
      toast({
        title: "שם כבר קיים",
        description: "פרויקט עם השם הזה כבר קיים. אנא בחר שם אחר.",
        variant: "destructive",
      });
      return;
    }

    setIsAutoSaving(true);
    
    try {
      const now = new Date().toISOString();
      
      if (isEditingExisting && currentProjectId) {
        // Update existing project
        const projectIndex = savedProjects.findIndex((p: any) => p.id === currentProjectId);
        if (projectIndex !== -1) {
          const existingProject = savedProjects[projectIndex];
          
          // Create version history entry only if there's a significant change
          if (existingProject.html !== htmlCode) {
            if (!existingProject.versions) {
              existingProject.versions = [];
            }
            
            // Add current version to history
            existingProject.versions.unshift({
              id: Date.now().toString() + "_v",
              html: existingProject.html,
              savedAt: existingProject.updatedAt,
              version: (existingProject.versions.length || 0) + 1
            });
            
            // Keep only last 10 versions
            if (existingProject.versions.length > 10) {
              existingProject.versions = existingProject.versions.slice(0, 10);
            }
          }
          
          // Update current project
          savedProjects[projectIndex] = {
            ...existingProject,
            name: fileName,
            html: htmlCode,
            updatedAt: now,
          };
        }
      } else {
        // Create new project for auto-save
        const project = {
          id: Date.now().toString(),
          name: fileName,
          html: htmlCode,
          createdAt: now,
          updatedAt: now,
          versions: []
        };

        savedProjects.push(project);
        setCurrentProjectId(project.id);
        setIsEditingExisting(true);
      }

      localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
      lastSavedContentRef.current = htmlCode;
      
      // Set last saved project for publish functionality
      const currentProject = savedProjects.find((p: any) => p.id === currentProjectId || p.name === fileName);
      if (currentProject) {
        setLastSavedProject(currentProject);
      }
      
      console.log("Auto-saved successfully");
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [htmlCode, fileName, currentProjectId, isEditingExisting, isSampleMode, toast]);

  // Set up auto-save when content changes
  useEffect(() => {
    if (isSampleMode) return;

    // Save editor state
    saveEditorState();

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after user stops typing)
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000);

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [htmlCode, fileName, autoSave, isSampleMode, saveEditorState]);

  useEffect(() => {
    // Check if there's an editing project in sessionStorage (from project manager)
    const editingProject = sessionStorage.getItem("editingProject");
    if (editingProject) {
      try {
        const project = JSON.parse(editingProject);
        setHtmlCode(project.html);
        setFileName(project.name);
        setCurrentProjectId(project.id);
        setIsEditingExisting(true);
        setIsSampleMode(false);
        setLastSavedProject(project);
        lastSavedContentRef.current = project.html;
        // Clear the sessionStorage after loading
        sessionStorage.removeItem("editingProject");
        
        toast({
          title: "פרויקט נטען",
          description: `הפרויקט "${project.name}" נטען לעריכה`,
        });
        return;
      } catch (error) {
        console.error("Error loading project:", error);
      }
    }

    // Check if there's a saved editor state
    const savedEditorState = localStorage.getItem("editorState");
    if (savedEditorState) {
      try {
        const editorState = JSON.parse(savedEditorState);
        setHtmlCode(editorState.htmlCode);
        setFileName(editorState.fileName);
        setCurrentProjectId(editorState.currentProjectId);
        setIsEditingExisting(editorState.isEditingExisting);
        setIsSampleMode(false);
        lastSavedContentRef.current = editorState.htmlCode;
        
        // Find the project for publish functionality
        const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
        const currentProject = savedProjects.find((p: any) => p.id === editorState.currentProjectId);
        if (currentProject) {
          setLastSavedProject(currentProject);
        }
        
        return;
      } catch (error) {
        console.error("Error loading editor state:", error);
      }
    }

    // Show sample page when entering fresh
    setHtmlCode(SAMPLE_HTML);
    setFileName("");
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setIsSampleMode(true);
    setLastSavedProject(null);
  }, [toast]);

  const handleCodeChange = (newCode: string) => {
    if (isSampleMode) {
      // Exit sample mode when user starts typing
      setIsSampleMode(false);
      setHtmlCode(newCode);
    } else {
      setHtmlCode(newCode);
    }
  };

  const handleFileNameChange = (newFileName: string) => {
    setFileName(newFileName);
    if (isSampleMode && newFileName.trim()) {
      setIsSampleMode(false);
    }
  };

  const handleNewPage = () => {
    setHtmlCode(EMPTY_HTML);
    setFileName("דף חדש");
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setIsSampleMode(false);
    setLastSavedProject(null);
    lastSavedContentRef.current = "";
    localStorage.removeItem("editorState");
    toast({
      title: "דף חדש",
      description: "נוצר דף חדש",
    });
  };

  const handleSave = () => {
    if (isSampleMode) {
      toast({
        title: "לא ניתן לשמור",
        description: "לא ניתן לשמור את דף הדוגמא. התחל לערוך קוד חדש.",
        variant: "destructive",
      });
      return;
    }

    if (!fileName.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הזן שם לקובץ",
        variant: "destructive",
      });
      return;
    }

    // Force immediate save
    autoSave().then(() => {
      toast({
        title: "נשמר בהצלחה!",
        description: `הקובץ "${fileName}" נשמר`,
      });
    });
  };

  const handleDuplicate = () => {
    if (isSampleMode || !htmlCode.trim()) {
      toast({
        title: "לא ניתן לשכפל",
        description: "אין תוכן לשכפול",
        variant: "destructive",
      });
      return;
    }

    const duplicateName = fileName ? `${fileName} - עותק` : "עותק";
    setFileName(duplicateName);
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setLastSavedProject(null);
    lastSavedContentRef.current = "";
    
    toast({
      title: "שוכפל בהצלחה",
      description: "נוצר עותק של הדף הנוכחי",
    });
  };

  const handleReset = () => {
    setHtmlCode(SAMPLE_HTML);
    setFileName("");
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setIsSampleMode(true);
    setLastSavedProject(null);
    lastSavedContentRef.current = "";
    localStorage.removeItem("editorState");
    toast({
      title: "אופס!",
      description: "הקוד אופס למצב הבסיסי",
    });
  };

  const handlePublish = () => {
    if (!lastSavedProject) {
      toast({
        title: "שגיאה",
        description: "אנא שמור את הפרויקט לפני הפרסום",
        variant: "destructive",
      });
      return;
    }
    setShowPublishDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <FileText className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              value={fileName}
              onChange={(e) => handleFileNameChange(e.target.value)}
              placeholder="שם הקובץ..."
              className="pr-12 bg-slate-800/70 border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 h-12 text-lg"
              disabled={isSampleMode}
            />
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleNewPage} 
              variant="outline" 
              className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-all duration-200 h-12 px-6 font-medium"
            >
              דף חדש
            </Button>
            <Button 
              onClick={handleDuplicate} 
              variant="outline" 
              className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-all duration-200 h-12 px-4"
            >
              <Copy size={18} className="mr-2" />
              שכפל
            </Button>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6">
          <Button 
            onClick={handleSave} 
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8 font-semibold text-base" 
            disabled={isSampleMode || isAutoSaving}
          >
            <Save size={18} className="mr-2" />
            {isAutoSaving ? "שומר..." : "שמור"}
          </Button>
          
          {lastSavedProject && (
            <Button 
              onClick={handlePublish} 
              className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8 font-semibold text-base"
            >
              <Share2 size={18} className="mr-2" />
              פרסום
            </Button>
          )}
          
          <Button 
            onClick={handleReset} 
            variant="outline" 
            className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all duration-200 h-12 px-6 font-medium"
          >
            <RotateCcw size={18} className="mr-2" />
            איפוס
          </Button>
        </div>
        
        <div className="flex gap-2">
          {isSampleMode && (
            <div className="bg-blue-900/40 border border-blue-700/50 rounded-xl p-4 text-blue-200 text-sm flex-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                זהו דף לדוגמא - התחל להקליד כדי לערוך קוד חדש
              </div>
            </div>
          )}
          {!isSampleMode && (
            <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-xl p-4 text-emerald-200 text-sm flex-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                🔄 שמירה אוטומטית פעילה - השינויים נשמרים אוטומטיים
              </div>
            </div>
          )}
          {isAutoSaving && (
            <div className="bg-amber-900/40 border border-amber-700/50 rounded-xl p-4 text-amber-200 text-sm backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                💾 שומר...
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-350px)]">
        <Card className="p-4 bg-slate-900/80 border-slate-700 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <span className="text-sm text-slate-400 font-medium">עורך הקוד</span>
            {isSampleMode && <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded-full">(דוגמא)</span>}
          </div>
          <CodeEditor value={htmlCode} onChange={handleCodeChange} />
        </Card>

        <Card className="p-4 bg-slate-900/80 border-slate-700 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <Play size={16} className="text-emerald-400" />
            <span className="text-sm text-slate-400 font-medium">תצוגה מקדימה</span>
          </div>
          <HtmlPreview html={htmlCode} />
        </Card>
      </div>

      {lastSavedProject && (
        <PublishDialog 
          open={showPublishDialog} 
          onOpenChange={setShowPublishDialog}
          project={lastSavedProject}
        />
      )}
    </div>
  );
};
