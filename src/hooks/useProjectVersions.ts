
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { projectVersionsService, ProjectVersion } from "@/services/projectVersionsService";
import { useToast } from "@/hooks/use-toast";

export const useProjectVersions = (projectId: string | null) => {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load versions for a project
  const loadVersions = useCallback(async () => {
    if (!projectId) {
      setVersions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const projectVersions = await projectVersionsService.getProjectVersions(projectId);
      setVersions(projectVersions);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את ההיסטוריה",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  // Create a new version
  const createVersion = useCallback(async (
    name: string,
    htmlContent: string,
    isDraft: boolean = false
  ): Promise<ProjectVersion | null> => {
    if (!user || !projectId) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לשמור גירסאות",
        variant: "destructive"
      });
      return null;
    }

    try {
      setIsSaving(true);
      const newVersion = await projectVersionsService.createVersion(
        projectId,
        user.id,
        name,
        htmlContent,
        isDraft
      );

      // Update local state
      setVersions(prev => [newVersion, ...prev]);

      return newVersion;
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור גירסה חדשה",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, projectId, toast]);

  // Delete a version
  const deleteVersion = useCallback(async (versionId: string): Promise<boolean> => {
    try {
      await projectVersionsService.deleteVersion(versionId);
      setVersions(prev => prev.filter(v => v.id !== versionId));
      
      toast({
        title: "נמחק בהצלחה",
        description: "הגירסה נמחקה",
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting version:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את הגירסה",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Load versions when project changes
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  return {
    versions,
    isLoading,
    isSaving,
    createVersion,
    deleteVersion,
    refreshVersions: loadVersions
  };
};
