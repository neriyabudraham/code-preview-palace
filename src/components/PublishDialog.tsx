
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Globe, Loader2 } from "lucide-react";

interface PublishDialogProps {
  projectId: string;
  htmlContent: string;
  onPublished?: () => void;
}

export const PublishDialog = ({ projectId, htmlContent, onPublished }: PublishDialogProps) => {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const validateSlug = (slug: string) => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
  };

  const handlePublish = async () => {
    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לפרסם דף",
        variant: "destructive"
      });
      return;
    }

    if (!slug.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין כתובת URL",
        variant: "destructive"
      });
      return;
    }

    if (!validateSlug(slug)) {
      toast({
        title: "שגיאה",
        description: "כתובת URL חייבת להכיל רק אותיות באנגלית, מספרים ומקפים, ולהיות באורך 3-50 תווים",
        variant: "destructive"
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין כותרת לדף",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get user's custom domain if they want to use it
      let domainToUse = null;
      if (useCustomDomain) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('custom_domain, domain_verified')
          .eq('id', user.id)
          .single();

        if (profile?.custom_domain && profile.domain_verified) {
          domainToUse = profile.custom_domain;
        } else if (useCustomDomain) {
          toast({
            title: "שגיאה",
            description: "הדומיין המותאם אישית לא מוגדר או לא מאומת",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }

      // Check if slug already exists
      const { data: existing } = await supabase
        .from('published_pages')
        .select('id')
        .eq('slug', slug.toLowerCase())
        .single();

      if (existing) {
        toast({
          title: "שגיאה",
          description: "כתובת URL זו כבר קיימת, אנא בחר כתובת אחרת",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Create the published page
      const { error } = await supabase
        .from('published_pages')
        .insert({
          project_id: projectId,
          slug: slug.toLowerCase(),
          title: title.trim(),
          html_content: htmlContent,
          user_id: user.id,
          custom_domain: domainToUse
        });

      if (error) {
        console.error('Error publishing page:', error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לפרסם את הדף",
          variant: "destructive"
        });
        return;
      }

      const publishedUrl = domainToUse ? `https://${domainToUse}/${slug}` : `${window.location.origin}/${slug}`;
      
      toast({
        title: "הדף פורסם בהצלחה!",
        description: `הדף שלך זמין בכתובת: ${publishedUrl}`,
      });

      // Reset form and close dialog
      setSlug("");
      setTitle("");
      setDescription("");
      setUseCustomDomain(false);
      setCustomDomain("");
      setOpen(false);
      onPublished?.();

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בפרסום הדף",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Globe className="w-4 h-4 ml-2" />
          פרסם דף
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>פרסם דף</DialogTitle>
          <DialogDescription>
            צור קישור ציבורי לדף שלך
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">כותרת הדף</Label>
            <Input
              id="title"
              placeholder="כותרת מרתקת לדף שלך"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="slug">כתובת URL</Label>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 ml-2">
                {useCustomDomain && customDomain ? `${customDomain}/` : `${window.location.origin}/`}
              </span>
              <Input
                id="slug"
                placeholder="my-awesome-page"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1"
                dir="ltr"
              />
            </div>
            <p className="text-xs text-gray-500">
              רק אותיות באנגלית, מספרים ומקפים (3-50 תווים)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="use-custom-domain"
              checked={useCustomDomain}
              onCheckedChange={setUseCustomDomain}
            />
            <Label htmlFor="use-custom-domain" className="text-sm">
              השתמש בדומיין מותאם אישית
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">תיאור (אופציונלי)</Label>
            <Textarea
              id="description"
              placeholder="תיאור קצר של הדף"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            ביטול
          </Button>
          <Button onClick={handlePublish} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מפרסם...
              </>
            ) : (
              'פרסם'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
