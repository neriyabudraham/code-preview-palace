
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ExternalLink, Trash2, Globe, Calendar } from "lucide-react";
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

export const PublishedPagesManager = () => {
  const [publishedPages, setPublishedPages] = useState<PublishedPage[]>([]);
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
  }, [user]);

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

  if (publishedPages.length === 0) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 text-center shadow-xl">
        <Globe className="mx-auto mb-4 text-slate-400" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">אין דפים מפורסמים</h3>
        <p className="text-slate-400">
          עדיין לא פרסמת דפים. פרסם דף ראשון מהעורך!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">דפים מפורסמים</h2>
        <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 px-3 py-1">
          {publishedPages.length} דפים
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {publishedPages.map((page) => (
          <Card key={page.id} className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300">
            <div className="p-5 space-y-4">
              <div>
                <h3 className="font-bold text-white text-lg mb-1 truncate">{page.title}</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={14} className="text-emerald-400" />
                  <span className="text-emerald-400 font-mono">/{page.slug}</span>
                  {page.custom_domain && (
                    <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">
                      דומיין מותאם
                    </Badge>
                  )}
                </div>
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
                  onClick={() => window.open(getPublishedUrl(page), '_blank')}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg transition-all duration-200 font-semibold"
                >
                  <ExternalLink size={14} className="mr-1" />
                  פתח
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
        ))}
      </div>
    </div>
  );
};
