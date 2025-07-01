
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Share2, Globe, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
}

export const PublishDialog = ({ open, onOpenChange, project }: PublishDialogProps) => {
  const [publishedUrl, setPublishedUrl] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  const handlePublish = async () => {
    setIsPublishing(true);
    
    // Simulate publishing process
    setTimeout(() => {
      // Generate a fake published URL for demo purposes
      const url = `https://${project.name.replace(/\s+/g, '-').toLowerCase()}.lovable.app`;
      setPublishedUrl(url);
      setIsPublishing(false);
      
      // Mark project as published in localStorage
      const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
      const projectIndex = savedProjects.findIndex((p: any) => p.id === project.id);
      if (projectIndex !== -1) {
        savedProjects[projectIndex].publishedUrl = url;
        savedProjects[projectIndex].publishedAt = new Date().toISOString();
        localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
      }
      
      toast({
        title: "פורסם בהצלחה! 🎉",
        description: `הפרויקט "${project.name}" זמין כעת באינטרנט`,
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            פרסום פרויקט
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
            <h3 className="text-lg font-semibold mb-2 text-white">{project.name}</h3>
            <p className="text-slate-400 text-sm">
              נוצר: {new Date(project.createdAt).toLocaleDateString("he-IL")}
            </p>
          </div>

          {!publishedUrl ? (
            <div className="text-center py-8">
              <div className="mb-6">
                <Globe size={48} className="mx-auto text-violet-400 mb-4" />
                <p className="text-slate-300 mb-2">מוכן לפרסם את הפרויקט שלך?</p>
                <p className="text-slate-500 text-sm">הפרויקט יהיה זמין באינטרנט עבור כולם</p>
              </div>
              <Button 
                onClick={handlePublish}
                disabled={isPublishing}
                className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white shadow-xl transition-all duration-200 transform hover:scale-105 px-8 py-3 text-lg font-semibold"
              >
                <Share2 size={20} className="mr-2" />
                {isPublishing ? "מפרסם..." : "פרסם עכשיו"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-4">
                <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                <h3 className="text-xl font-semibold text-emerald-400 mb-2">פורסם בהצלחה! 🎉</h3>
                <p className="text-slate-400">הפרויקט שלך זמין כעת באינטרנט</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
                <label className="block text-sm font-medium mb-3 text-slate-300">
                  קישור לדף שפורסם:
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={publishedUrl} 
                    readOnly 
                    className="bg-slate-700/50 border-slate-600 text-white text-sm font-mono"
                  />
                  <Button 
                    onClick={copyLink}
                    variant="outline"
                    className="border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white transition-all duration-200"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={openLink}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg transition-all duration-200 font-semibold"
                >
                  <ExternalLink size={16} className="mr-2" />
                  פתח דף
                </Button>
                
                <Button 
                  onClick={shareLink}
                  variant="outline"
                  className="border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white transition-all duration-200 font-semibold"
                >
                  <Share2 size={16} className="mr-2" />
                  שתף
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
