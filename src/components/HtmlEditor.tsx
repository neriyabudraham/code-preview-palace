
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CodeEditor } from "./CodeEditor";
import { HtmlPreview } from "./HtmlPreview";
import { PublishDialog } from "./PublishDialog";
import { Save, Play, RotateCcw, Copy, Share2, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const EMPTY_HTML = "";

export const HtmlEditor = () => {
  const [htmlCode, setHtmlCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedProject, setLastSavedProject] = useState<any>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isProjectPublished, setIsProjectPublished] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Check if current project is published
  const checkIfProjectIsPublished = useCallback((projectId: string) => {
    const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
    const project = savedProjects.find((p: any) => p.id === projectId);
    return project && (project.publishedUrl || project.customSlug);
  }, []);

  // Save draft only when exiting without saving
  const saveDraftOnExit = useCallback(() => {
    if (hasUnsavedChanges && (htmlCode.trim() || fileName.trim())) {
      const draft = {
        id: currentProjectId || 'draft_' + Date.now(),
        htmlCode,
        fileName: fileName || 'טיוטה - שמירה אוטומטית',
        savedAt: new Date().toISOString(),
        isDraft: true
      };
      localStorage.setItem("editorDraft", JSON.stringify(draft));
      console.log('Draft saved on exit:', draft);
    }
  }, [htmlCode, fileName, currentProjectId, hasUnsavedChanges]);

  // Set up beforeunload event to save draft when leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveDraftOnExit();
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveDraftOnExit, hasUnsavedChanges]);

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!htmlCode.trim() || !fileName.trim()) {
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
          
          // Check if project is published
          setIsProjectPublished(checkIfProjectIsPublished(currentProjectId));
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
        setIsProjectPublished(false);
      }

      localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
      lastSavedContentRef.current = htmlCode;
      setHasUnsavedChanges(false);
      
      // Clear draft after successful save
      localStorage.removeItem("editorDraft");
      setCurrentDraft(null);
      
      // Set last saved project for publish functionality
      const currentProject = savedProjects.find((p: any) => p.id === currentProjectId || (p.name === fileName && p.html === htmlCode));
      if (currentProject) {
        setLastSavedProject(currentProject);
      }
      
      console.log("Auto-saved successfully");
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [htmlCode, fileName, currentProjectId, isEditingExisting, toast, checkIfProjectIsPublished]);

  // Track changes to mark unsaved changes
  useEffect(() => {
    if (htmlCode !== lastSavedContentRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [htmlCode, fileName]);

  // Set up auto-save when content changes
  useEffect(() => {
    if (!htmlCode.trim() || !fileName.trim()) return;

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
  }, [htmlCode, fileName, autoSave]);

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
        setLastSavedProject(project);
        setIsProjectPublished(checkIfProjectIsPublished(project.id));
        lastSavedContentRef.current = project.html;
        setHasUnsavedChanges(false);
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

    // Show empty editor when entering fresh
    setHtmlCode(EMPTY_HTML);
    setFileName("");
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setLastSavedProject(null);
    setIsProjectPublished(false);
    lastSavedContentRef.current = "";
    setHasUnsavedChanges(false);
    
    // Check if there's a draft to restore
    const savedDraft = localStorage.getItem("editorDraft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setCurrentDraft(draft);
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  }, [toast, checkIfProjectIsPublished]);

  const handleCodeChange = (newCode: string) => {
    setHtmlCode(newCode);
  };

  const handleFileNameChange = (newFileName: string) => {
    setFileName(newFileName);
  };

  const handleNewPage = () => {
    // Save current work as draft if there are unsaved changes
    if (hasUnsavedChanges) {
      saveDraftOnExit();
      toast({
        title: "טיוטה נשמרה",
        description: "העבודה הנוכחית נשמרה כטיוטה",
      });
    }
    
    setHtmlCode(EMPTY_HTML);
    setFileName("");
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setLastSavedProject(null);
    setIsProjectPublished(false);
    lastSavedContentRef.current = "";
    setHasUnsavedChanges(false);
    
    toast({
      title: "דף חדש",
      description: "נוצר דף חדש",
    });
  };

  const handleRestoreDraft = () => {
    if (currentDraft) {
      setHtmlCode(currentDraft.htmlCode);
      setFileName(currentDraft.fileName);
      setCurrentProjectId(currentDraft.id.startsWith('draft_') ? null : currentDraft.id);
      setIsEditingExisting(!currentDraft.id.startsWith('draft_'));
      setHasUnsavedChanges(true);
      
      toast({
        title: "טיוטה שוחזרה",
        description: "הטיוטה נטענה בהצלחה",
      });
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem("editorDraft");
    setCurrentDraft(null);
    toast({
      title: "טיוטה נמחקה",
      description: "הטיוטה נמחקה בהצלחה",
    });
  };

  const handleSave = async () => {
    if (!fileName.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הזן שם לקובץ",
        variant: "destructive",
      });
      return;
    }

    if (!htmlCode.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הזן תוכן HTML",
        variant: "destructive",
      });
      return;
    }

    // Force immediate save
    await autoSave();
    
    // Make sure the project is available for publishing immediately after save
    const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
    const savedProject = savedProjects.find((p: any) => p.id === currentProjectId || (p.name === fileName && p.html === htmlCode));
    if (savedProject) {
      setLastSavedProject(savedProject);
      setIsProjectPublished(checkIfProjectIsPublished(savedProject.id));
    }
    
    toast({
      title: "נשמר בהצלחה!",
      description: `הקובץ "${fileName}" נשמר`,
    });
  };

  const handleDuplicate = () => {
    if (!htmlCode.trim()) {
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
    setIsProjectPublished(false);
    lastSavedContentRef.current = "";
    setHasUnsavedChanges(true);
    
    toast({
      title: "שוכפל בהצלחה",
      description: "נוצר עותק של הדף הנוכחי",
    });
  };

  const handleReset = () => {
    setHtmlCode(EMPTY_HTML);
    setFileName("");
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setLastSavedProject(null);
    setIsProjectPublished(false);
    lastSavedContentRef.current = "";
    setHasUnsavedChanges(false);
    
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

  const getPublishButtonText = () => {
    if (isProjectPublished) {
      return "פרסום מחדש";
    }
    return "פרסום";
  };

  // Fix the content empty check
  const isContentEmpty = !htmlCode.trim() && !fileName.trim();
  const canSaveOrPublish = htmlCode.trim() && fileName.trim();

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
              disabled={isContentEmpty}
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
            disabled={!canSaveOrPublish || isAutoSaving}
          >
            <Save size={18} className="mr-2" />
            {isAutoSaving ? "שומר..." : "שמור"}
          </Button>
          
          {canSaveOrPublish && lastSavedProject && (
            <Button 
              onClick={handlePublish} 
              className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8 font-semibold text-base"
            >
              <Share2 size={18} className="mr-2" />
              {getPublishButtonText()}
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
        
        {/* Draft section - only show if there's a draft */}
        {currentDraft && (
          <div className="bg-amber-900/40 border border-amber-700/50 rounded-xl p-4 text-amber-200 text-sm mb-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span>טיוטה זמינה: "{currentDraft.fileName || 'ללא שם'}"</span>
                <span className="text-xs text-amber-300">
                  ({new Date(currentDraft.savedAt).toLocaleString('he-IL')})
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleRestoreDraft}
                  variant="outline"
                  size="sm"
                  className="border-amber-600 text-amber-200 hover:bg-amber-600 hover:text-white"
                >
                  שחזר
                </Button>
                <Button
                  onClick={handleClearDraft}
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-200 hover:bg-red-600 hover:text-white"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          {!isContentEmpty && (
            <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-xl p-4 text-emerald-200 text-sm flex-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                🔄 שמירה אוטומטית פעילה - השינויים נשמרים אוטומטיים
                {isProjectPublished && (
                  <Badge variant="outline" className="mr-2 border-orange-400 text-orange-400">
                    מפורסם
                  </Badge>
                )}
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="mr-2 border-yellow-400 text-yellow-400">
                    יש שינויים לא שמורים
                  </Badge>
                )}
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
