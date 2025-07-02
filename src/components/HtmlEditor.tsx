
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
import { useAuth } from "@/contexts/AuthContext";
import { useUserProjects } from "@/hooks/useUserProjects";
import { UserProject } from "@/services/userProjectsService";

const EMPTY_HTML = "";
const LOCAL_STORAGE_KEY = "htmlEditor";

export const HtmlEditor = () => {
  const [htmlCode, setHtmlCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [lastSavedProject, setLastSavedProject] = useState<any>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isProjectPublished, setIsProjectPublished] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<UserProject | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastLocalSave, setLastLocalSave] = useState<Date | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { projects, saveProject, saveDraft, isSaving } = useUserProjects();
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Save to local storage
  const saveToLocalStorage = useCallback(() => {
    const dataToSave = {
      htmlCode,
      fileName,
      currentProjectId,
      isEditingExisting,
      lastSaved: new Date().toISOString(),
      userId: user?.id
    };
    
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
      setLastLocalSave(new Date());
      console.log("Saved to local storage:", dataToSave);
    } catch (error) {
      console.error("Error saving to local storage:", error);
    }
  }, [htmlCode, fileName, currentProjectId, isEditingExisting, user?.id]);

  // Load from local storage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        
        // Only load if it belongs to the current user (or if no user was saved)
        if (!parsed.userId || !user?.id || parsed.userId === user.id) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error loading from local storage:", error);
    }
    return null;
  }, [user?.id]);

  // Clear local storage
  const clearLocalStorage = useCallback(() => {
    try {
      setLastLocalSave(null);
      console.log("Cleared local storage");
    } catch (error) {
      console.error("Error clearing local storage:", error);
    }
  }, []);

  // Generate default filename with automatic numbering
  const generateDefaultFileName = useCallback(() => {
    let baseName = "דף חדש";
    let counter = 1;
    let finalName = baseName;

    // Check if name exists and increment counter
    while (projects.some((p: UserProject) => p.name === finalName && p.project_id !== currentProjectId)) {
      finalName = `${baseName} ${counter}`;
      counter++;
    }

    return finalName;
  }, [currentProjectId, projects]);

  // Check if current project is published
  const checkIfProjectIsPublished = useCallback((projectId: string) => {
    const project = projects.find((p: UserProject) => p.project_id === projectId);
    return project && project.is_published;
  }, [projects]);

  // Auto-save to database function
  const autoSave = useCallback(async () => {
    if (!user || !fileName.trim()) {
      console.log('No user logged in or no filename, skipping database auto-save');
      return;
    }

    // Use default filename if no filename is provided
    const finalFileName = fileName.trim() || generateDefaultFileName();

    // Don't auto-save if content hasn't changed
    if (lastSavedContentRef.current === htmlCode) {
      return;
    }

    // Check for duplicate names
    const existingProject = projects.find((p: UserProject) => p.name === finalFileName && p.project_id !== currentProjectId);
    
    if (existingProject) {
      toast({
        title: "שם כבר קיים",
        description: "פרויקט עם השם הזה כבר קיים. אנא בחר שם אחר.",
        variant: "destructive",
      });
      return;
    }

    try {
      const projectId = currentProjectId || Date.now().toString();
      
      const savedProject = await saveProject(projectId, finalFileName, htmlCode, false);
      
      if (savedProject) {
        if (!currentProjectId) {
          setCurrentProjectId(savedProject.project_id);
          setIsEditingExisting(true);
        }
        
        lastSavedContentRef.current = htmlCode;
        setHasUnsavedChanges(false);
        setLastSavedProject(savedProject);
        setIsProjectPublished(savedProject.is_published);
        
        // Update filename if it was empty and we used default
        if (!fileName.trim()) {
          setFileName(finalFileName);
        }
        
        // Clear draft if it exists
        setCurrentDraft(null);
        
        // Clear local storage since we saved to database
        clearLocalStorage();
        
        console.log("Auto-saved to database successfully");
      }
    } catch (error) {
      console.error("Database auto-save failed:", error);
    }
  }, [htmlCode, fileName, currentProjectId, user, saveProject, generateDefaultFileName, projects, toast, clearLocalStorage]);

  // Track changes to mark unsaved changes and trigger local storage save
  useEffect(() => {
    if (htmlCode !== lastSavedContentRef.current || fileName !== (lastSavedProject?.name || "")) {
      setHasUnsavedChanges(true);
      
      // Clear existing timeout
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
      
      // Set new timeout for local storage save (immediate for local, 500ms delay)
      localSaveTimeoutRef.current = setTimeout(() => {
        saveToLocalStorage();
      }, 500);
    }
  }, [htmlCode, fileName, lastSavedProject, saveToLocalStorage]);

  // Set up auto-save to database when content changes
  useEffect(() => {
    if (!fileName.trim() || !user) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for database auto-save (2 seconds after user stops typing)
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000);

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [htmlCode, fileName, autoSave, user]);

  // Load data on component mount
  useEffect(() => {
    // Check if there's an editing project in sessionStorage (from project manager)
    const editingProject = sessionStorage.getItem("editingProject");
    if (editingProject) {
      try {
        const project = JSON.parse(editingProject);
        // Verify the project belongs to the current user
        if (!user || !project.userId || project.userId === user.id) {
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
          // Clear local storage since we're editing an existing project
          clearLocalStorage();
          
          toast({
            title: "פרויקט נטען",
            description: `הפרויקט "${project.name}" נטען לעריכה`,
          });
          return;
        }
      } catch (error) {
        console.error("Error loading project:", error);
      }
    }

    // If no editing project, try to load from local storage
    const localData = loadFromLocalStorage();
    if (localData && (localData.htmlCode || localData.fileName)) {
      setHtmlCode(localData.htmlCode || "");
      setFileName(localData.fileName || "");
      setCurrentProjectId(localData.currentProjectId);
      setIsEditingExisting(localData.isEditingExisting || false);
      lastSavedContentRef.current = ""; // Mark as unsaved since it's from local storage
      setHasUnsavedChanges(true);
      
      return;
    }

    // Check if there's a draft to restore
    const drafts = projects.filter((p: UserProject) => p.is_draft);
    if (drafts.length > 0) {
      setCurrentDraft(drafts[0]); // Show the most recent draft
    }

    // Show empty editor when entering fresh
    if (!editingProject && !localData) {
      setHtmlCode(EMPTY_HTML);
      setFileName("");
      setCurrentProjectId(null);
      setIsEditingExisting(false);
      setLastSavedProject(null);
      setIsProjectPublished(false);
      lastSavedContentRef.current = "";
      setHasUnsavedChanges(false);
    }
  }, [toast, checkIfProjectIsPublished, user, projects, loadFromLocalStorage, clearLocalStorage]);

  // Save current work as draft when navigating away
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      // Save to local storage immediately
      saveToLocalStorage();
      
      // Save as draft if there are unsaved changes and user is logged in
      if (hasUnsavedChanges && user && (htmlCode.trim() || fileName.trim())) {
        const draftId = currentProjectId || `draft_${Date.now()}`;
        const draftName = fileName || 'טיוטה - שמירה אוטומטית';
        
        // Try to save as draft (non-blocking)
        saveDraft(draftId, draftName, htmlCode).catch(console.error);
        
        // Show browser warning
        event.preventDefault();
        event.returnValue = 'יש לך שינויים לא שמורים. האם אתה בטוח שברצונך לעזוב?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, user, htmlCode, fileName, currentProjectId, saveToLocalStorage, saveDraft]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleCodeChange = (newCode: string) => {
    setHtmlCode(newCode);
  };

  const handleFileNameChange = (newFileName: string) => {
    setFileName(newFileName);
  };

  const handleNewPage = async () => {
    // Save current work as draft if there are unsaved changes
    if (hasUnsavedChanges && user && (htmlCode.trim() || fileName.trim())) {
      const draftId = currentProjectId || `draft_${Date.now()}`;
      const draftName = fileName || 'טיוטה - שמירה אוטומטית';
      
      await saveDraft(draftId, draftName, htmlCode);
      
      toast({
        title: "טיוטה נשמרה",
        description: "העבודה הנוכחית נשמרה כטיוטה",
      });
    }
    
    // Clear local storage and reset state
    clearLocalStorage();
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
      setHtmlCode(currentDraft.html_content);
      setFileName(currentDraft.name);
      setCurrentProjectId(currentDraft.project_id);
      setIsEditingExisting(true);
      setHasUnsavedChanges(true);
      
      // Clear local storage since we're loading from draft
      clearLocalStorage();
      
      toast({
        title: "טיוטה שוחזרה",
        description: "הטיוטה נטענה בהצלחה",
      });
    }
  };

  const handleClearDraft = async () => {
    if (currentDraft) {
      setCurrentDraft(null);
      toast({
        title: "טיוטה נמחקה",
        description: "הטיוטה נמחקה בהצלחה",
      });
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לשמור פרויקטים",
        variant: "destructive",
      });
      return;
    }

    // Use default filename if no filename is provided
    const finalFileName = fileName.trim() || generateDefaultFileName();
    
    // Check for duplicate names before saving
    const existingProject = projects.find((p: UserProject) => p.name === finalFileName && p.project_id !== currentProjectId);
    
    if (existingProject) {
      toast({
        title: "שם כבר קיים",
        description: "פרויקט עם השם הזה כבר קיים. אנא בחר שם אחר.",
        variant: "destructive",
      });
      return;
    }

    // Update filename if it was empty and we're using default
    if (!fileName.trim()) {
      setFileName(finalFileName);
    }

    // Force immediate save
    await autoSave();
    
    toast({
      title: "נשמר בהצלחה!",
      description: `הקובץ "${finalFileName}" נשמר`,
    });
  };

  const handleDuplicate = () => {
    const duplicateName = fileName ? `${fileName} - עותק` : "עותק";
    setFileName(duplicateName);
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setLastSavedProject(null);
    setIsProjectPublished(false);
    lastSavedContentRef.current = "";
    setHasUnsavedChanges(true);
    
    // Clear local storage since we're creating a new project
    clearLocalStorage();
    
    toast({
      title: "שוכפל בהצלחה",
      description: "נוצר עותק של הדף הנוכחי",
    });
  };

  const handleReset = () => {
    clearLocalStorage();
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
    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לפרסם דפים",
        variant: "destructive",
      });
      return;
    }

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

  // Save button is always enabled when user is logged in
  const canSave = !!user;
  const canPublish = lastSavedProject && user;

  // Show login message if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">נדרש אימות</h2>
          <p className="text-slate-400 mb-6">
            יש להתחבר כדי להשתמש בעורך ולשמור פרויקטים
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <FileText className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              value={fileName}
              onChange={(e) => handleFileNameChange(e.target.value)}
              placeholder="שם הקובץ (יווצר שם אוטומטי אם לא יוזן)..."
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
            disabled={isSaving || !canSave}
          >
            <Save size={18} className="mr-2" />
            {isSaving ? "שומר..." : "שמור"}
          </Button>
          
          {canPublish && (
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
                <span>טיוטה זמינה: "{currentDraft.name}"</span>
                <span className="text-xs text-amber-300">
                  ({new Date(currentDraft.updated_at).toLocaleString('he-IL')})
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
          {(fileName.trim() || htmlCode.trim()) && user && (
            <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-xl p-4 text-emerald-200 text-sm flex-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                💾 שמירה אוטומטית פעילה - נשמר במקומי + במאגר
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
                {lastLocalSave && (
                  <span className="text-xs text-emerald-300">
                    (שמירה מקומית: {lastLocalSave.toLocaleTimeString('he-IL')})
                  </span>
                )}
              </div>
            </div>
          )}
          {isSaving && (
            <div className="bg-amber-900/40 border border-amber-700/50 rounded-xl p-4 text-amber-200 text-sm backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                💾 שומר במאגר...
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
