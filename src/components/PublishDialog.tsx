
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Globe, ExternalLink, CheckCircle } from "lucide-react";

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  projectId: string;
  title: string;
}

export const PublishDialog = ({ isOpen, onClose, htmlContent, projectId, title }: PublishDialogProps) => {
  const [slug, setSlug] = useState("");
  const [customTitle, setCustomTitle] = useState(title || "");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const handlePublish = async () => {
    if (!slug.trim() || !customTitle.trim()) {
      toast({
        title: "שגיאה",
        description: "יש למלא כותרת וכתובת URL",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לפרסם",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true);

    try {
      // Get the user's custom domain from their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('custom_domain')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      const customDomain = profile?.custom_domain || null;
      console.log('Publishing with custom domain:', customDomain);

      // Check if slug already exists for this domain
      let existingPageQuery = supabase
        .from('published_pages')
        .select('id')
        .eq('slug', slug.trim());

      // If we have a custom domain, check for pages with that domain
      // If no custom domain, check for pages with no custom domain
      if (customDomain) {
        existingPageQuery = existingPageQuery.eq('custom_domain', customDomain);
      } else {
        existingPageQuery = existingPageQuery.is('custom_domain', null);
      }

      const { data: existingPage, error: checkError } = await existingPageQuery.maybeSingle();

      if (checkError) {
        console.error('Error checking existing page:', checkError);
        throw checkError;
      }

      if (existingPage) {
        toast({
          title: "שגיאה",
          description: "כתובת URL זו כבר קיימת עבור הדומיין הזה",
          variant: "destructive"
        });
        setIsPublishing(false);
        return;
      }

      // Publish the page with the custom domain
      const { error } = await supabase
        .from('published_pages')
        .insert({
          slug: slug.trim(),
          title: customTitle.trim(),
          html_content: htmlContent,
          project_id: projectId,
          user_id: user.id,
          custom_domain: customDomain
        });

      if (error) {
        console.error('Error publishing page:', error);
        throw error;
      }

      // Construct the published URL based on whether we have a custom domain
      let baseUrl;
      if (customDomain) {
        baseUrl = `https://${customDomain}`;
      } else {
        baseUrl = 'https://page.neriyabudraham.co.il';
      }
      
      const fullUrl = `${baseUrl}/${slug.trim()}`;
      setPublishedUrl(fullUrl);

      toast({
        title: "הדף פורסם בהצלחה! 🎉",
        description: `הדף זמין בכתובת: ${fullUrl}`,
      });

    } catch (error: any) {
      console.error('Error publishing page:', error);
      toast({
        title: "שגיאה בפרסום",
        description: error.message || "אירעה שגיאה בפרסום הדף",
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setSlug("");
    setCustomTitle(title || "");
    setPublishedUrl("");
    onClose();
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publishedUrl);
    toast({
      title: "הועתק!",
      description: "הקישור הועתק ללוח",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            פרסום דף
          </DialogTitle>
        </DialogHeader>
        
        {!publishedUrl ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-gray-300">
                כותרת הדף
              </Label>
              <Input
                id="title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="כותרת הדף"
                className="mt-1 bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="slug" className="text-sm font-medium text-gray-300">
                כתובת URL (slug)
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-page"
                className="mt-1 bg-gray-800 border-gray-600 text-white"
                dir="ltr"
              />
              <p className="text-xs text-gray-400 mt-1">
                רק אותיות באנגלית, מספרים ומקפים
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">הדף פורסם בהצלחה!</span>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
              <p className="text-sm text-gray-300 mb-2">הדף שלך זמין בכתובת:</p>
              <div className="flex items-center gap-2">
                <code className="text-blue-400 font-mono bg-gray-700 px-3 py-2 rounded flex-1 text-sm">
                  {publishedUrl}
                </code>
                <Button
                  onClick={copyUrl}
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  העתק
                </Button>
                <Button
                  onClick={() => window.open(publishedUrl, '_blank')}
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          {!publishedUrl ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                ביטול
              </Button>
              <Button 
                onClick={handlePublish}
                disabled={isPublishing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isPublishing ? "מפרסם..." : "פרסם"}
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleClose}
              className="bg-green-600 hover:bg-green-700"
            >
              סגור
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
