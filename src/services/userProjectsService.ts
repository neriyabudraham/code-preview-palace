
import { supabase } from "@/integrations/supabase/client";

export interface UserProject {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  html_content: string;
  is_draft: boolean;
  is_published: boolean;
  published_page_id?: string;
  created_at: string;
  updated_at: string;
}

export const userProjectsService = {
  // Get all projects for the current user
  async getUserProjects(userId: string): Promise<UserProject[]> {
    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user projects:', error);
      throw error;
    }

    return data || [];
  },

  // Create a new project
  async createProject(project: Omit<UserProject, 'id' | 'created_at' | 'updated_at'>): Promise<UserProject> {
    const { data, error } = await supabase
      .from('user_projects')
      .insert(project)
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw error;
    }

    return data;
  },

  // Update an existing project
  async updateProject(projectId: string, updates: Partial<Omit<UserProject, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserProject> {
    const { data, error } = await supabase
      .from('user_projects')
      .update(updates)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }

    return data;
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('user_projects')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  // Get a specific project
  async getProject(projectId: string): Promise<UserProject | null> {
    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No data found
      }
      console.error('Error fetching project:', error);
      throw error;
    }

    return data;
  },

  // Save or update a draft
  async saveDraft(userId: string, projectId: string, name: string, htmlContent: string): Promise<UserProject> {
    const existingProject = await this.getProject(projectId);
    
    if (existingProject) {
      return this.updateProject(projectId, {
        name,
        html_content: htmlContent,
        is_draft: true
      });
    } else {
      return this.createProject({
        user_id: userId,
        project_id: projectId,
        name,
        html_content: htmlContent,
        is_draft: true,
        is_published: false
      });
    }
  },

  // Mark project as published
  async markAsPublished(projectId: string, publishedPageId: string): Promise<UserProject> {
    return this.updateProject(projectId, {
      is_published: true,
      published_page_id: publishedPageId,
      is_draft: false
    });
  }
};
