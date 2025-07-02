
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VersionPreview } from "./VersionPreview";
import { useProjectVersions } from "@/hooks/useProjectVersions";
import { ProjectVersion } from "@/services/projectVersionsService";
import { History, Eye, Trash2, Clock } from "lucide-react";
import { useState } from "react";

interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onRestoreVersion: (html: string, name: string) => void;
}

export const VersionHistory = ({ 
  open, 
  onOpenChange, 
  projectId, 
  onRestoreVersion 
}: VersionHistoryProps) => {
  const { versions, isLoading, deleteVersion } = useProjectVersions(projectId);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = (version: ProjectVersion) => {
    setSelectedVersion(version);
    setShowPreview(true);
  };

  const handleRestore = () => {
    if (selectedVersion) {
      onRestoreVersion(selectedVersion.html_content, selectedVersion.name);
      setShowPreview(false);
      onOpenChange(false);
    }
  };

  const handleDelete = async (version: ProjectVersion, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteVersion(version.id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <History size={20} />
              היסטוריית גירסאות
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">
                טוען היסטוריה...
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <History size={48} className="mx-auto mb-4 opacity-50" />
                <p>אין גירסאות שמורות עדיין</p>
                <p className="text-sm mt-2">גירסאות יישמרו אוטומטית כשתערוך את הפרויקט</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => handlePreview(version)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="border-blue-400 text-blue-400">
                            גירסה {version.version_number}
                          </Badge>
                          {version.is_draft && (
                            <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                              טיוטה
                            </Badge>
                          )}
                          <span className="font-medium">{version.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock size={14} />
                          <span>
                            נשמר: {new Date(version.created_at).toLocaleDateString("he-IL", {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-600 text-blue-300 hover:bg-blue-600 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(version);
                          }}
                        >
                          <Eye size={16} className="mr-1" />
                          תצוגה
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-300 hover:bg-red-600 hover:text-white"
                          onClick={(e) => handleDelete(version, e)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <VersionPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        version={selectedVersion ? {
          version: selectedVersion.version_number,
          html: selectedVersion.html_content,
          savedAt: selectedVersion.created_at
        } : null}
        onRestore={handleRestore}
      />
    </>
  );
};
