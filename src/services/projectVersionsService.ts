
import { supabase } from "@/integrations/supabase/client";

export interface ProjectVersion {
  id: string;
  project_id: string;
  user_id: string;
  version_number: number;
  name: string;
  html_content: string;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export const projectVersionsService = {
  // Get all versions for a project
  async getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching project versions:', error);
      throw error;
    }

    return data || [];
  },

  // Create a new version
  async createVersion(
    projectId: string,
    userId: string,
    name: string,
    htmlContent: string,
    isDraft: boolean = false
  ): Promise<ProjectVersion> {
    // Get the next version number
    const { data: existingVersions } = await supabase
      .from('project_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersionNumber = existingVersions && existingVersions.length > 0 
      ? existingVersions[0].version_number + 1 
      : 1;

    const { data, error } = await supabase
      .from('project_versions')
      .insert({
        project_id: projectId,
        user_id: userId,
        version_number: nextVersionNumber,
        name,
        html_content: htmlContent,
        is_draft: isDraft
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating version:', error);
      throw error;
    }

    return data;
  },

  // Update a version
  async updateVersion(
    versionId: string,
    updates: Partial<Omit<ProjectVersion, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ProjectVersion> {
    const { data, error } = await supabase
      .from('project_versions')
      .update(updates)
      .eq('id', versionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating version:', error);
      throw error;
    }

    return data;
  },

  // Delete a version
  async deleteVersion(versionId: string): Promise<void> {
    const { error } = await supabase
      .from('project_versions')
      .delete()
      .eq('id', versionId);

    if (error) {
      console.error('Error deleting version:', error);
      throw error;
    }
  },

  // Get a specific version
  async getVersion(versionId: string): Promise<ProjectVersion | null> {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No data found
      }
      console.error('Error fetching version:', error);
      throw error;
    }

    return data;
  }
};
