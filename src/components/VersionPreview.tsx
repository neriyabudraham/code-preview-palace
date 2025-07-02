
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HtmlPreview } from "./HtmlPreview";
import { RotateCcw, X } from "lucide-react";

interface VersionPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: any;
  onRestore: () => void;
}

export const VersionPreview = ({ open, onOpenChange, version, onRestore }: VersionPreviewProps) => {
  if (!version) return null;

  const handleRestore = () => {
    onRestore();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>תצוגת גירסה {version.version}</span>
            <div className="flex gap-2">
              <Button 
                onClick={handleRestore}
                variant="success"
              >
                <RotateCcw size={16} className="mr-2" />
                שחזר גירסה זו
              </Button>
              <Button 
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <X size={16} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            נשמר: {new Date(version.savedAt).toLocaleDateString("he-IL", {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          
          <div className="border border-gray-600 rounded-lg overflow-hidden" style={{ height: '60vh' }}>
            <HtmlPreview html={version.html} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
