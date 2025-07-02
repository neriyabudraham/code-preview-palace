import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Share2, Globe, CheckCircle, Link, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
  onPublishComplete?: () => void | Promise<void>;
}

export const PublishDialog = ({ open, onOpenChange, project, onPublishComplete }: PublishDialogProps) => {
  const [publishedUrl, setPublishedUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRepublishing, setIsRepublishing] = useState(false);
  const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);
  const [userDomain, setUserDomain] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load user's custom domain
  useEffect(() => {
    const loadUserDomain = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('custom_domain, domain_verified')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
          return;
        }

        if (profile && profile.custom_domain && profile.domain_verified) {
          setUserDomain(profile.custom_domain);
        }
      } catch (error) {
        console.error('Error in loadUserDomain:', error);
      }
    };

    if (open) {
      loadUserDomain();
    }
  }, [open, user]);

  // Initialize the dialog state when it opens
  useEffect(() => {
    if (open && project) {
      const existingUrl = project.publishedUrl;
      const existingSlug = project.customSlug;
      
      if (existingUrl && existingSlug) {
        // Project is already published - show update mode
        setPublishedUrl(existingUrl);
        setCustomSlug(existingSlug);
        setIsUpdatingExisting(true);
      } else {
        // New publish
        setPublishedUrl("");
        setCustomSlug("");
        setIsUpdatingExisting(false);
      }
    }
  }, [open, project]);

  const checkSlugAvailability = async (slug: string) => {
    try {
      // Check if the slug is available for the current user
      const { data: existingPages, error } = await supabase
        .from('published_pages')
        .select('id, project_id, user_id')
        .eq('slug', slug)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error checking slug availability:', error);
        return { available: false, error: 'שגיאה בבדיקת זמינות הסיומת' };
      }

      // If no pages found for this user with this slug, it's available
      if (!existingPages || existingPages.length === 0) {
        return { available: true };
      }

      // Check if any of the existing pages are from different projects
      const conflictingPages = existingPages.filter(page => page.project_id !== project.id);
      
      if (conflictingPages.length > 0) {
        return { available: false, error: 'הסיומת כבר בשימוש על ידי פרויקט אחר שלך' };
      }

      return { available: true };
    } catch (error) {
      console.error('Error in checkSlugAvailability:', error);
      return { available: false, error: 'שגיאה בבדיקת זמינות הסיומת' };
    }
  };

  const handleRepublish = async () => {
    if (!isUpdatingExisting || !customSlug.trim() || !user) {
      return;
    }

    setIsRepublishing(true);
    
    try {
      const slug = customSlug.trim();
      console.log('Republishing with slug:', slug);
      
      // Get project title from HTML
      const titleMatch = project.html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : project.name;

      const publishedPageData = {
        title,
        html_content: project.html,
        updated_at: new Date().toISOString(),
        // Add custom domain if user has one
        custom_domain: userDomain
      };

      console.log('Republishing page data:', publishedPageData);

      // Update existing published page
      const result = await supabase
        .from('published_pages')
        .update(publishedPageData)
        .eq('project_id', project.id)
        .eq('slug', slug)
        .eq('user_id', user.id)
        .select()
        .single();

      console.log('Republish result:', result);

      if (result.error) {
        console.error('Republishing error details:', result.error);
        throw result.error;
      }
      
      // Update project in localStorage
      const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
      const projectIndex = savedProjects.findIndex((p: any) => p.id === project.id);
      if (projectIndex !== -1) {
        savedProjects[projectIndex].publishedAt = new Date().toISOString();
        localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
      }
      
      toast({
        title: "פורסם מחדש בהצלחה! 🎉",
        description: `הפרויקט "${project.name}" עודכן עם התוכן החדש`,
      });

      // Call onPublishComplete callback if provided
      if (onPublishComplete) {
        await onPublishComplete();
      }
      
    } catch (error) {
      console.error("Republishing error:", error);
      
      let errorMessage = "אירעה שגיאה בעת פרסום מחדש. אנא נסה שנית.";
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as any).message;
        if (errorMsg.includes('row-level security policy')) {
          errorMessage = "שגיאת הרשאות. אנא פנה למנהל המערכת.";
        }
      }
      
      toast({
        title: "שגיאה בפרסום מחדש",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRepublishing(false);
    }
  };

  const handlePublish = async () => {
    if (!customSlug.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין סיומת לדף",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לפרסם דפים",
        variant: "destructive"
      });
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-zA-Z0-9-]+$/;
    if (!slugRegex.test(customSlug.trim())) {
      toast({
        title: "שגיאה",
        description: "הסיומת יכולה להכיל רק אותיות באנגלית, מספרים ומקפים",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true);
    
    try {
      const slug = customSlug.trim();
      console.log('Publishing with slug:', slug);
      
      // Check slug availability
      const { available, error: availabilityError } = await checkSlugAvailability(slug);
      
      if (!available) {
        toast({
          title: "הסיומת לא זמינה",
          description: availabilityError || "הסיומת כבר בשימוש",
          variant: "destructive"
        });
        setIsPublishing(false);
        return;
      }

      // Get project title from HTML
      const titleMatch = project.html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : project.name;

      const publishedPageData = {
        slug,
        title,
        html_content: project.html,
        project_id: project.id,
        user_id: user.id,
        // Add custom domain if user has one
        custom_domain: userDomain
      };

      console.log('Publishing page data:', publishedPageData);

      // Check if this project already has a published page
      const { data: existingProjectPage, error: existingError } = await supabase
        .from('published_pages')
        .select('id')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .maybeSingle();

      let result;
      if (existingProjectPage && !existingError) {
        // Update existing published page
        result = await supabase
          .from('published_pages')
          .update(publishedPageData)
          .eq('id', existingProjectPage.id)
          .select()
          .single();
      } else {
        // Create new published page
        result = await supabase
          .from('published_pages')
          .insert(publishedPageData)
          .select()
          .single();
      }

      console.log('Publish result:', result);

      if (result.error) {
        console.error('Publishing error details:', result.error);
        throw result.error;
      }

      // Generate the URL - use custom domain if available, otherwise use default
      const url = userDomain 
        ? `https://${userDomain}/${slug}` 
        : `https://html-to-site.lovable.app/${slug}`;
      setPublishedUrl(url);
      
      // Update project in localStorage
      const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
      const projectIndex = savedProjects.findIndex((p: any) => p.id === project.id);
      if (projectIndex !== -1) {
        savedProjects[projectIndex].publishedUrl = url;
        savedProjects[projectIndex].customSlug = slug;
        savedProjects[projectIndex].publishedAt = new Date().toISOString();
        localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
      }
      
      const actionText = isUpdatingExisting ? "עודכן" : "פורסם";
      toast({
        title: `${actionText} בהצלחה! 🎉`,
        description: `הפרויקט "${project.name}" ${isUpdatingExisting ? 'עודכן' : 'פורסם'} בהצלחה`,
      });
      
      setIsUpdatingExisting(true);

      // Call onPublishComplete callback if provided
      if (onPublishComplete) {
        await onPublishComplete();
      }
    } catch (error) {
      console.error("Publishing error:", error);
      
      // Provide more specific error messages
      let errorMessage = "אירעה שגיאה בעת פרסום הדף. אנא נסה שנית.";
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as any).message;
        if (errorMsg.includes('row-level security policy')) {
          errorMessage = "שגיאת הרשאות. אנא פנה למנהל המערכת.";
        } else if (errorMsg.includes('duplicate key')) {
          errorMessage = "הסיומת כבר קיימת. אנא בחר סיומת אחרת.";
        }
      }
      
      toast({
        title: "שגיאה בפרסום",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publishedUrl);
    toast({
      title: "הועתק! 📋",
      description: "הקישור הועתק ללוח",
    });
  };

  const openLink = () => {
    window.open(publishedUrl, '_blank');
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: project.name,
        url: publishedUrl
      });
    } else {
      copyLink();
    }
  };

  const resetToNewPublish = () => {
    setPublishedUrl("");
    setCustomSlug("");
    setIsUpdatingExisting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white max-w-lg shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {isUpdatingExisting ? "עדכון פרסום" : "פרסום פרויקט"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 border border-blue-200 dark:border-gray-600">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Globe size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  נוצר: {new Date(project.createdAt).toLocaleDateString("he-IL")}
                </p>
                {isUpdatingExisting && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✅ כבר מפורסם
                  </p>
                )}
              </div>
            </div>
            
            {userDomain && (
              <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    יפורסם בדומיין המותאם שלך: {userDomain}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!publishedUrl || !isUpdatingExisting ? (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Link size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {isUpdatingExisting ? "עדכן כתובת מותאמת אישית" : "הגדר כתובת מותאמת אישית"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-sm mx-auto">
                  {userDomain 
                    ? `הפרויקט יפורסם תחת הדומיין שלך: ${userDomain}` 
                    : "הפרויקט יפורסם תחת הדומיין הברירת מחדל"}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                    כתובת הפרסום:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg border">
                      https://{userDomain || 'html-to-site.lovable.app'}/
                    </span>
                    <Input 
                      value={customSlug} 
                      onChange={(e) => setCustomSlug(e.target.value)}
                      placeholder={isUpdatingExisting ? "הסיומת הנוכחית" : "my-page"}
                      className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-mono"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    בחר סיומת ייחודית לדף שלך (רק אותיות באנגלית, מספרים ומקפים)
                  </p>
                  {isUpdatingExisting && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      הסיומת הנוכחית: {project.customSlug || "לא מוגדרת"}
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={handlePublish}
                  disabled={isPublishing || !customSlug.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg font-bold rounded-xl h-14"
                >
                  <Share2 size={24} className="mr-3" />
                  {isPublishing ? (isUpdatingExisting ? "מעדכן..." : "מפרסם...") : (isUpdatingExisting ? "עדכן פרסום" : "פרסם עכשיו")}
                </Button>

                {isUpdatingExisting && (
                  <Button 
                    onClick={resetToNewPublish}
                    variant="outline"
                    className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    פרסם בסיומת חדשה
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {isUpdatingExisting ? "עודכן בהצלחה! 🎉" : "פורסם בהצלחה! 🎉"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  הפרויקט שלך זמין כעת {userDomain ? "בדומיין המותאם שלך" : "בכתובת המותאמת אישית"}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-green-200 dark:border-gray-600">
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                  קישור לדף שפורסם:
                </label>
                <div className="flex gap-3">
                  <Input 
                    value={publishedUrl} 
                    readOnly 
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm font-mono"
                  />
                  <Button 
                    onClick={copyLink}
                    variant="outline"
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-all duration-200 px-4"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={openLink}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg transition-all duration-300 transform hover:scale-105 font-bold py-3 rounded-xl"
                >
                  <ExternalLink size={18} className="mr-2" />
                  פתח דף
                </Button>
                
                <Button 
                  onClick={shareLink}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-all duration-300 transform hover:scale-105 font-bold py-3 rounded-xl"
                >
                  <Share2 size={18} className="mr-2" />
                  שתף
                </Button>
              </div>

              {/* Republish Button - New Feature */}
              <Button 
                onClick={handleRepublish}
                disabled={isRepublishing}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg transition-all duration-300 transform hover:scale-105 font-bold py-3 rounded-xl"
              >
                <RefreshCw size={18} className={`mr-2 ${isRepublishing ? 'animate-spin' : ''}`} />
                {isRepublishing ? "מפרסם מחדש..." : "פרסם מחדש"}
              </Button>

              <Button 
                onClick={resetToNewPublish}
                variant="outline"
                className="w-full border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium"
              >
                שנה סיומת
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
