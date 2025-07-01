
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ExternalLink, Trash2, Globe, Calendar, Copy, Save, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PublishedPage {
  id: string;
  slug: string;
  title: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  custom_domain?: string;
}

interface DraftProject {
  id: string;
  htmlCode: string;
  fileName: string;
  savedAt: string;
  isDraft: true;
}

export const PublishedPagesManager = () => {
  const [publishedPages, setPublishedPages] = useState<PublishedPage[]>([]);
  const [drafts, setDrafts] = useState<DraftProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load pages on component mount
  useEffect(() => {
    if (user) {
      loadPublishedPages();
    } else {
      setIsLoading(false);
    }
    loadDrafts();
  }, [user]);

  const loadDrafts = () => {
    // Load draft from localStorage
    const savedDraft = localStorage.getItem("editorDraft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setDrafts([draft]);
      } catch (error) {
        console.error("Error loading draft:", error);
        setDrafts([]);
      }
    } else {
      setDrafts([]);
    }
  };

  const loadPublishedPages = async () => {
    if (!user) {
      setPublishedPages([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch pages that belong to the current user
      const { data, error } = await supabase
        .from('published_pages')
        .select('id, slug, title, project_id, created_at, updated_at, custom_domain')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPublishedPages(data || []);
    } catch (error) {
      console.error('Error loading published pages:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הדפים המפורסמים",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveProjectFromPublished = async (page: PublishedPage) => {
    try {
      // Get the HTML content from the published page
      const { data, error } = await supabase
        .from('published_pages')
        .select('html_content')
        .eq('id', page.id)
        .single();

      if (error) {
        throw error;
      }

      // Save to localStorage as a new project
      const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
      const newProject = {
        id: Date.now().toString(),
        name: `${page.title} (שוחזר)`,
        html: data.html_content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: []
      };

      savedProjects.push(newProject);
      localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));

      toast({
        title: "פרויקט נשמר!",
        description: `הפרויקט "${page.title}" נשמר בהצלחה למחשב`,
      });

    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את הפרויקט",
        variant: "destructive"
      });
    }
  };

  const saveProjectFromDraft = (draft: DraftProject) => {
    try {
      const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
      const newProject = {
        id: Date.now().toString(),
        name: draft.fileName,
        html: draft.htmlCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: []
      };

      savedProjects.push(newProject);
      localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));

      // Remove the draft after saving
      localStorage.removeItem("editorDraft");
      setDrafts([]);

      toast({
        title: "טיוטה נשמרה!",
        description: `הטיוטה "${draft.fileName}" נשמרה כפרויקט`,
      });

    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את הטיוטה",
        variant: "destructive"
      });
    }
  };

  const deletePage = async (id: string, slug: string, title: string) => {
    setDeletingPageId(id);
    
    try {
      console.log(`Deleting page: ${title} (${slug}) with ID: ${id}`);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('published_pages')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id); // Double check ownership

      if (error) {
        console.error('Supabase deletion error:', error);
        throw error;
      }

      console.log('Page deleted from Supabase successfully');

      // Update local state immediately
      setPublishedPages(prev => {
        const updated = prev.filter(page => page.id !== id);
        console.log(`Updated published pages list. Removed ${title}, remaining: ${updated.length} pages`);
        return updated;
      });
      
      // Update localStorage projects - remove publication data
      try {
        const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
        console.log('Current localStorage projects:', savedProjects);
        
        const updatedProjects = savedProjects.map((project: any) => {
          // Check if this project matches the deleted page
          if (project.customSlug === slug || project.publishedUrl?.includes(slug)) {
            console.log(`Removing publication data from project: ${project.name || project.id}`);
            // Remove publication-related fields
            const { publishedUrl, customSlug, publishedAt, ...cleanProject } = project;
            return cleanProject;
          }
          return project;
        });
        
        localStorage.setItem("htmlProjects", JSON.stringify(updatedProjects));
        console.log('Updated localStorage projects:', updatedProjects);
      } catch (localStorageError) {
        console.error('Error updating localStorage:', localStorageError);
        // Don't fail the operation if localStorage update fails
      }

      toast({
        title: "נמחק בהצלחה",
        description: `הדף "${title}" הוסר מהפרסום. כעת ניתן להשתמש בסלאג "${slug}" שוב`,
      });

    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את הדף. נסה שוב מאוחר יותר",
        variant: "destructive"
      });
    } finally {
      setDeletingPageId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPublishedUrl = (page: PublishedPage) => {
    if (page.custom_domain) {
      return `https://${page.custom_domain}/${page.slug}`;
    }
    return `https://code-preview-palace.lovable.app/${page.slug}`;
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "הועתק! 📋",
      description: "הקישור הועתק ללוח",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-3 text-slate-400">טוען דפים מפורסמים...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 text-center shadow-xl">
        <Globe className="mx-auto mb-4 text-slate-400" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">נדרש אימות</h3>
        <p className="text-slate-400">
          יש להתחבר כדי לצפות בדפים המפורסמים שלך
        </p>
      </Card>
    );
  }

  const totalItems = publishedPages.length + drafts.length;

  if (totalItems === 0) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 text-center shadow-xl">
        <Globe className="mx-auto mb-4 text-slate-400" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">אין דפים מפורסמים</h3>
        <p className="text-slate-400">
          עדיין לא פרסמת דפים ולא נשמרו טיוטות. פרסם דף ראשון מהעורך!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">דפים מפורסמים וטיוטות</h2>
        <div className="flex gap-2">
          {publishedPages.length > 0 && (
            <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 px-3 py-1">
              {publishedPages.length} מפורסמים
            </Badge>
          )}
          {drafts.length > 0 && (
            <Badge variant="outline" className="border-amber-400 text-amber-400 px-3 py-1">
              {drafts.length} טיוטות
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Show drafts first */}
        {drafts.map((draft) => (
          <Card key={draft.id} className="bg-gradient-to-br from-amber-900/20 via-amber-800/20 to-amber-900/20 border-amber-700/50 hover:shadow-xl transition-all duration-300">
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-amber-400" />
                  <h3 className="font-bold text-white text-lg truncate">{draft.fileName}</h3>
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-400 ml-auto">
                    טיוטה - שמירה אוטומטית
                  </Badge>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>נשמר: {formatDate(draft.savedAt)}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => saveProjectFromDraft(draft)}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg transition-all duration-200 font-semibold"
                >
                  <Save size={14} className="mr-1" />
                  שמור פרויקט
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {/* Show published pages */}
        {publishedPages.map((page) => {
          const fullUrl = getPublishedUrl(page);
          return (
            <Card key={page.id} className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300">
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-lg mb-2 truncate">{page.title}</h3>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Globe size={14} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-400 font-mono text-xs truncate" title={fullUrl}>
                      {fullUrl}
                    </span>
                    <Button
                      onClick={() => copyUrl(fullUrl)}
                      size="sm"
                      variant="ghost"
                      className="p-1 h-6 w-6 hover:bg-slate-700"
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                  {page.custom_domain && (
                    <Badge variant="outline" className="text-xs border-blue-400 text-blue-400 mb-2">
                      דומיין מותאם
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>פורסם: {formatDate(page.created_at)}</span>
                  </div>
                  {page.updated_at !== page.created_at && (
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>עודכן: {formatDate(page.updated_at)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.open(fullUrl, '_blank')}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg transition-all duration-200 font-semibold"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    פתח
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => saveProjectFromPublished(page)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white px-3"
                  >
                    <Save size={14} />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="px-3"
                        disabled={deletingPageId === page.id}
                      >
                        {deletingPageId === page.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-800 border-slate-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">מחיקת דף מפורסם</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          האם אתה בטוח שברצונך למחוק את הדף "{page.title}" מהפרסום? 
                          הדף לא יהיה זמין יותר בכתובת /{page.slug} ותוכל להשתמש בסלאג הזה שוב בעתיד.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                          ביטול
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePage(page.id, page.slug, page.title)}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={deletingPageId === page.id}
                        >
                          {deletingPageId === page.id ? "מוחק..." : "מחק"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
