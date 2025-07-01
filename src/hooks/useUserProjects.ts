
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userProjectsService, UserProject } from "@/services/userProjectsService";
import { useToast } from "@/hooks/use-toast";

export const useUserProjects = () => {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load projects from database
  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userProjects = await userProjectsService.getUserProjects(user.id);
      setProjects(userProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הפרויקטים",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Save or update project
  const saveProject = useCallback(async (
    projectId: string,
    name: string,
    htmlContent: string,
    isDraft: boolean = false
  ): Promise<UserProject | null> => {
    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לשמור פרויקטים",
        variant: "destructive"
      });
      return null;
    }

    try {
      setIsSaving(true);
      let savedProject: UserProject;

      const existingProject = await userProjectsService.getProject(projectId);
      
      if (existingProject) {
        savedProject = await userProjectsService.updateProject(projectId, {
          name,
          html_content: htmlContent,
          is_draft: isDraft
        });
      } else {
        savedProject = await userProjectsService.createProject({
          user_id: user.id,
          project_id: projectId,
          name,
          html_content: htmlContent,
          is_draft: isDraft,
          is_published: false
        });
      }

      // Update local state
      setProjects(prev => {
        const index = prev.findIndex(p => p.project_id === projectId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = savedProject;
          return updated;
        } else {
          return [savedProject, ...prev];
        }
      });

      return savedProject;
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את הפרויקט",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, toast]);

  // Delete project
  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await userProjectsService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.project_id !== projectId));
      
      toast({
        title: "נמחק בהצלחה",
        description: "הפרויקט נמחק מהמאגר",
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את הפרויקט",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Save draft
  const saveDraft = useCallback(async (
    projectId: string,
    name: string,
    htmlContent: string
  ): Promise<UserProject | null> => {
    if (!user) return null;

    try {
      setIsSaving(true);
      const savedDraft = await userProjectsService.saveDraft(user.id, projectId, name, htmlContent);
      
      // Update local state
      setProjects(prev => {
        const index = prev.findIndex(p => p.project_id === projectId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = savedDraft;
          return updated;
        } else {
          return [savedDraft, ...prev];
        }
      });

      return savedDraft;
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את הטיוטה",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, toast]);

  // Mark as published
  const markAsPublished = useCallback(async (projectId: string, publishedPageId: string): Promise<boolean> => {
    try {
      const updatedProject = await userProjectsService.markAsPublished(projectId, publishedPageId);
      
      // Update local state
      setProjects(prev => {
        const index = prev.findIndex(p => p.project_id === projectId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedProject;
          return updated;
        }
        return prev;
      });

      return true;
    } catch (error) {
      console.error('Error marking as published:', error);
      return false;
    }
  }, []);

  // Load projects when user changes
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    isLoading,
    isSaving,
    saveProject,
    deleteProject,
    saveDraft,
    markAsPublished,
    refreshProjects: loadProjects
  };
};
