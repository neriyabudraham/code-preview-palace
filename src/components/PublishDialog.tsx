
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Share2, Globe, CheckCircle, Link, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
}

export const PublishDialog = ({ open, onOpenChange, project }: PublishDialogProps) => {
  const [publishedUrl, setPublishedUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);
  const { toast } = useToast();

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

  const handlePublish = async () => {
    if (!customSlug.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין סיומת לדף",
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
    
    // Simulate publishing process
    setTimeout(() => {
      // Generate the custom URL with the user's domain
      const url = `https://page.neriyabudraham.co.il/${customSlug.trim()}`;
      setPublishedUrl(url);
      setIsPublishing(false);
      
      // Mark project as published in localStorage
      const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
      const projectIndex = savedProjects.findIndex((p: any) => p.id === project.id);
      if (projectIndex !== -1) {
        savedProjects[projectIndex].publishedUrl = url;
        savedProjects[projectIndex].customSlug = customSlug.trim();
        savedProjects[projectIndex].publishedAt = new Date().toISOString();
        localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
      }
      
      const actionText = isUpdatingExisting ? "עודכן" : "פורסם";
      toast({
        title: `${actionText} בהצלחה! 🎉`,
        description: `הפרויקט "${project.name}" ${isUpdatingExisting ? 'עודכן' : 'זמין'} בכתובת המותאמת אישית`,
      });
      
      setIsUpdatingExisting(true);
    }, 2000);
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
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  הערה חשובה
                </p>
                <p className="text-amber-700 dark:text-amber-400">
                  הפרסום כרגע הוא לדמו בלבד. לפרסום אמיתי יש צורך בהגדרת שרת שיטפל בסיומות המותאמות אישית.
                </p>
              </div>
            </div>
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
                  הפרויקט יפורסם תחת הדומיין שלך עם הסיומת שתבחר
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                    כתובת הפרסום:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg border">
                      https://page.neriyabudraham.co.il/
                    </span>
                    <Input 
                      value={customSlug} 
                      onChange={(e) => setCustomSlug(e.target.value)}
                      placeholder={isUpdatingExisting ? "הסיומת הנוכחית" : "grid"}
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
                  הפרויקט שלך זמין כעת בכתובת המותאמת אישית
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
