import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CodeEditor } from "./CodeEditor";
import { HtmlPreview } from "./HtmlPreview";
import { PublishDialog } from "./PublishDialog";
import { Save, Play, RotateCcw, Copy, Share2, FileText, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  const [publishedPageData, setPublishedPageData] = useState<any>(null);
  const [currentDraft, setCurrentDraft] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Get user-specific localStorage keys
  const getUserProjectsKey = useCallback(() => {
    return user ? `htmlProjects_${user.id}` : "htmlProjects";
  }, [user]);

  const getUserDraftKey = useCallback(() => {
    return user ? `editorDraft_${user.id}` : "editorDraft";
  }, [user]);

  const getUserTempWorkKey = useCallback(() => {
    return user ? `tempEditorWork_${user.id}` : "tempEditorWork";
  }, [user]);

  // Generate default filename with automatic numbering (only for drafts)
  const generateDefaultDraftFileName = useCallback(() => {
    const savedProjects = JSON.parse(localStorage.getItem(getUserProjectsKey()) || "[]");
    let baseName = "דף חדש";
    let counter = 1;
    let finalName = baseName;

    // Check if name exists and increment counter
    while (savedProjects.some((p: any) => p.name === finalName)) {
      finalName = `${baseName} ${counter}`;
      counter++;
    }

    return finalName;
  }, [getUserProjectsKey]);

  // Check if current project is published and get publish data
  const checkIfProjectIsPublished = useCallback(async (projectId: string) => {
    if (!user || !projectId) {
      setIsProjectPublished(false);
      setPublishedPageData(null);
      return false;
    }

    try {
      const { data: publishedPage, error } = await supabase
        .from('published_pages')
        .select('slug, custom_domain, title, created_at, updated_at')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking publish status:', error);
        setIsProjectPublished(false);
        setPublishedPageData(null);
        return false;
      }

      const isPublished = !!publishedPage;
      setIsProjectPublished(isPublished);
      setPublishedPageData(publishedPage);
      return isPublished;
    } catch (error) {
      console.error('Error in checkIfProjectIsPublished:', error);
      setIsProjectPublished(false);
      setPublishedPageData(null);
      return false;
    }
  }, [user]);

  // Save temporary work when filename changes
  const saveTempWork = useCallback(() => {
    if (fileName.trim() || htmlCode.trim()) {
      const tempWork = {
        fileName: fileName || '',
        htmlCode: htmlCode || '',
        savedAt: new Date().toISOString(),
        userId: user?.id
      };
      localStorage.setItem(getUserTempWorkKey(), JSON.stringify(tempWork));
    }
  }, [fileName, htmlCode, getUserTempWorkKey, user]);

  // Save draft only when exiting without saving
  const saveDraftOnExit = useCallback(() => {
    if (hasUnsavedChanges && (htmlCode.trim() || fileName.trim())) {
      // Generate default name for draft
      const draftFileName = generateDefaultDraftFileName();
      
      const draft = {
        id: currentProjectId || 'draft_' + Date.now(),
        htmlCode,
        fileName: draftFileName,
        savedAt: new Date().toISOString(),
        isDraft: true,
        userId: user?.id
      };
      localStorage.setItem(getUserDraftKey(), JSON.stringify(draft));
      console.log('Draft saved on exit:', draft);
    }
  }, [htmlCode, fileName, currentProjectId, hasUnsavedChanges, getUserDraftKey, generateDefaultDraftFileName, user]);

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

  // Save temporary work when content changes
  useEffect(() => {
    saveTempWork();
  }, [fileName, htmlCode, saveTempWork]);

  // Auto-save function - only for existing projects
  const autoSave = useCallback(async () => {
    if (!user || !isEditingExisting || !currentProjectId) {
      console.log('Skipping auto-save: no user, not editing existing project, or no project ID');
      return;
    }

    // Don't auto-save if content hasn't changed
    if (lastSavedContentRef.current === htmlCode) {
      return;
    }

    // Must have a filename for auto-save
    if (!fileName.trim()) {
      console.log('Skipping auto-save: no filename provided');
      return;
    }

    // Check for duplicate names
    const savedProjects = JSON.parse(localStorage.getItem(getUserProjectsKey()) || "[]");
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
      
      // Update existing project
      const projectIndex = savedProjects.findIndex((p: any) => p.id === currentProjectId);
      if (projectIndex !== -1) {
        const existingProject = savedProjects[projectIndex];
        
        // Create version history entry if there's a significant change
        if (existingProject.html !== htmlCode && existingProject.html.trim()) {
          if (!existingProject.versions) {
            existingProject.versions = [];
          }
          
          // Add current version to history
          existingProject.versions.unshift({
            id: Date.now().toString() + "_v",
            html: existingProject.html,
            savedAt: existingProject.updatedAt || existingProject.createdAt,
            version: (existingProject.versions.length || 0) + 1
          });
          
          // Keep only last 10 versions
          if (existingProject.versions.length > 10) {
            existingProject.versions = existingProject.versions.slice(0, 10);
          }
          
          console.log(`Created new version ${existingProject.versions[0].version} for project ${existingProject.name}`);
        }
        
        // Update current project
        savedProjects[projectIndex] = {
          ...existingProject,
          name: fileName,
          html: htmlCode,
          updatedAt: now,
          userId: user.id
        };
        
        // Check if project is published
        const publishStatus = await checkIfProjectIsPublished(currentProjectId);
        setIsProjectPublished(publishStatus);

        localStorage.setItem(getUserProjectsKey(), JSON.stringify(savedProjects));
        lastSavedContentRef.current = htmlCode;
        setHasUnsavedChanges(false);
        
        // Clear draft and temp work after successful save
        localStorage.removeItem(getUserDraftKey());
        localStorage.removeItem(getUserTempWorkKey());
        setCurrentDraft(null);
        
        // Set last saved project for publish functionality
        const currentProject = savedProjects.find((p: any) => p.id === currentProjectId);
        if (currentProject) {
          setLastSavedProject(currentProject);
        }
        
        console.log("Auto-saved successfully");
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [htmlCode, fileName, currentProjectId, isEditingExisting, toast, checkIfProjectIsPublished, user, getUserProjectsKey, getUserDraftKey, getUserTempWorkKey]);

  // Track changes to mark unsaved changes
  useEffect(() => {
    if (htmlCode !== lastSavedContentRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [htmlCode, fileName]);

  // Set up auto-save when content changes - only for existing projects
  useEffect(() => {
    if (!fileName.trim() || !user || !isEditingExisting) return;

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
  }, [htmlCode, fileName, autoSave, user, isEditingExisting]);

  // ... keep existing code (useEffect for loading projects and initialization)

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
    localStorage.removeItem(getUserDraftKey());
    setCurrentDraft(null);
    toast({
      title: "טיוטה נמחקה",
      description: "הטיוטה נמחקה בהצלחה",
    });
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

    // Require filename before saving
    if (!fileName.trim()) {
      toast({
        title: "שם קובץ נדרש",
        description: "אנא הזן שם לקובץ לפני השמירה",
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicate names before saving
    const savedProjects = JSON.parse(localStorage.getItem(getUserProjectsKey()) || "[]");
    const existingProject = savedProjects.find((p: any) => p.name === fileName && p.id !== currentProjectId);
    
    if (existingProject) {
      toast({
        title: "שם כבר קיים",
        description: "פרויקט עם השם הזה כבר קיים. אנא בחר שם אחר.",
        variant: "destructive",
      });
      return;
    }

    try {
      const now = new Date().toISOString();
      
      if (isEditingExisting && currentProjectId) {
        // Update existing project
        const projectIndex = savedProjects.findIndex((p: any) => p.id === currentProjectId);
        if (projectIndex !== -1) {
          const existingProject = savedProjects[projectIndex];
          
          // Create version history entry if there's a significant change
          if (existingProject.html !== htmlCode && existingProject.html.trim()) {
            if (!existingProject.versions) {
              existingProject.versions = [];
            }
            
            // Add current version to history
            existingProject.versions.unshift({
              id: Date.now().toString() + "_v",
              html: existingProject.html,
              savedAt: existingProject.updatedAt || existingProject.createdAt,
              version: (existingProject.versions.length || 0) + 1
            });
            
            // Keep only last 10 versions
            if (existingProject.versions.length > 10) {
              existingProject.versions = existingProject.versions.slice(0, 10);
            }
            
            console.log(`Created new version ${existingProject.versions[0].version} for project ${existingProject.name}`);
          }
          
          // Update current project
          savedProjects[projectIndex] = {
            ...existingProject,
            name: fileName,
            html: htmlCode,
            updatedAt: now,
            userId: user.id
          };
          
          // Check if project is published
          const publishStatus = await checkIfProjectIsPublished(currentProjectId);
          setIsProjectPublished(publishStatus);
        }
      } else {
        // Create new project
        const project = {
          id: Date.now().toString(),
          name: fileName,
          html: htmlCode,
          createdAt: now,
          updatedAt: now,
          versions: [],
          userId: user.id
        };

        savedProjects.push(project);
        setCurrentProjectId(project.id);
        setIsEditingExisting(true);
        setIsProjectPublished(false);
        setPublishedPageData(null);
        
        console.log(`Created new project: ${project.name} with ID: ${project.id}`);
      }

      localStorage.setItem(getUserProjectsKey(), JSON.stringify(savedProjects));
      lastSavedContentRef.current = htmlCode;
      setHasUnsavedChanges(false);
      
      // Clear draft and temp work after successful save
      localStorage.removeItem(getUserDraftKey());
      localStorage.removeItem(getUserTempWorkKey());
      setCurrentDraft(null);
      
      // Set last saved project for publish functionality
      const currentProject = savedProjects.find((p: any) => p.id === currentProjectId || (p.name === fileName && p.html === htmlCode));
      if (currentProject) {
        setLastSavedProject(currentProject);
      }
      
      toast({
        title: "נשמר בהצלחה!",
        description: `הקובץ "${fileName}" נשמר`,
      });
    } catch (error) {
      console.error("Save failed:", error);
      toast({
        title: "שגיאה בשמירה",
        description: "אירעה שגיאה בשמירת הפרויקט",
        variant: "destructive",
      });
    }
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

  const handleUpdatePublish = async () => {
    if (!user || !currentProjectId || !publishedPageData) {
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון הפרסום",
        variant: "destructive",
      });
      return;
    }

    try {
      const titleMatch = htmlCode.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : fileName || "ללא כותרת";

      const { error } = await supabase
        .from('published_pages')
        .update({
          title,
          html_content: htmlCode,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', currentProjectId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Update project in localStorage
      const savedProjects = JSON.parse(localStorage.getItem(getUserProjectsKey()) || "[]");
      const projectIndex = savedProjects.findIndex((p: any) => p.id === currentProjectId);
      if (projectIndex !== -1) {
        savedProjects[projectIndex].publishedAt = new Date().toISOString();
        localStorage.setItem(getUserProjectsKey(), JSON.stringify(savedProjects));
      }

      // Refresh publish data
      await checkIfProjectIsPublished(currentProjectId);

      toast({
        title: "עודכן בהצלחה! 🎉",
        description: "הדף המפורסם עודכן עם התוכן החדש",
      });

    } catch (error) {
      console.error("Update publish error:", error);
      toast({
        title: "שגיאה בעדכון",
        description: "אירעה שגיאה בעת עדכון הדף המפורסם",
        variant: "destructive"
      });
    }
  };

  const handleOpenPublishedPage = () => {
    if (publishedPageData) {
      const url = publishedPageData.custom_domain 
        ? `https://${publishedPageData.custom_domain}/${publishedPageData.slug}`
        : `https://html-to-site.lovable.app/${publishedPageData.slug}`;
      window.open(url, '_blank');
    }
  };

  const handlePublishComplete = async () => {
    // Refresh publish status after successful publish
    if (currentProjectId) {
      const publishStatus = await checkIfProjectIsPublished(currentProjectId);
      setIsProjectPublished(publishStatus);
    }
  };

  // Save button requires filename
  const canSave = !!user && fileName.trim();
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
              placeholder="שם הקובץ (נדרש לשמירה)..."
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
            disabled={isAutoSaving || !canSave}
          >
            <Save size={18} className="mr-2" />
            {isAutoSaving ? "שומר..." : "שמור"}
          </Button>
          
          {canPublish && !isProjectPublished && (
            <Button 
              onClick={handlePublish} 
              className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8 font-semibold text-base"
            >
              <Share2 size={18} className="mr-2" />
              פרסום
            </Button>
          )}

          {canPublish && isProjectPublished && publishedPageData && (
            <div className="flex gap-2">
              <Button 
                onClick={handleUpdatePublish} 
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6 font-semibold text-base"
              >
                <RefreshCw size={18} className="mr-2" />
                עדכן פרסום
              </Button>
              <Button 
                onClick={handleOpenPublishedPage} 
                variant="outline"
                className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-all duration-200 h-12 px-6 font-medium"
              >
                <ExternalLink size={18} className="mr-2" />
                פתח דף
              </Button>
              <Button 
                onClick={handlePublish} 
                variant="outline"
                className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-all duration-200 h-12 px-6 font-medium"
              >
                שנה כתובת
              </Button>
            </div>
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
          {isEditingExisting && fileName.trim() && user && (
            <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-xl p-4 text-emerald-200 text-sm flex-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                🔄 שמירה אוטומטית פעילה לפרויקט קיים
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
          {!isEditingExisting && (fileName.trim() || htmlCode.trim()) && user && (
            <div className="bg-blue-900/40 border border-blue-700/50 rounded-xl p-4 text-blue-200 text-sm flex-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                💾 הזן שם קובץ ולחץ שמור כדי לשמור את הפרויקט
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="mr-2 border-yellow-400 text-yellow-400">
                    יש שינויים לא שמורים - יישמרו כטיוטה בעת יציאה
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
          onPublishComplete={handlePublishComplete}
        />
      )}
    </div>
  );
};
