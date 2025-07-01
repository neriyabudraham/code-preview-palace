
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Share2 } from "lucide-react";
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
      
      toast({
        title: "פורסם בהצלחה!",
        description: `הפרויקט "${project.name}" פורסם בהצלחה`,
      });
    }, 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publishedUrl);
    toast({
      title: "הועתק!",
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
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">פרסום פרויקט</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
            <p className="text-gray-400 text-sm">
              נוצר: {new Date(project.createdAt).toLocaleDateString("he-IL")}
            </p>
          </div>

          {!publishedUrl ? (
            <div className="text-center py-6">
              <Button 
                onClick={handlePublish}
                disabled={isPublishing}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <Share2 size={16} className="mr-2" />
                {isPublishing ? "מפרסם..." : "פרסם עכשיו"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">קישור לדף שפורסם:</label>
                <div className="flex gap-2">
                  <Input 
                    value={publishedUrl} 
                    readOnly 
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button 
                    onClick={copyLink}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={openLink}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg transition-all duration-200"
                >
                  <ExternalLink size={16} className="mr-2" />
                  פתח דף
                </Button>
                
                <Button 
                  onClick={shareLink}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200"
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
