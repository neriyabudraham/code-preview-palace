
import { useState, useEffect } from "react";
import { useUserProjects } from "@/hooks/useUserProjects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { HtmlPreview } from "./HtmlPreview";
import { VersionPreview } from "./VersionPreview";
import { PublishDialog } from "./PublishDialog";
import { Edit, Trash2, Eye, Download, Search, Copy, Clock, Globe, Share2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UserProject } from "@/services/userProjectsService";

interface ProjectVersion {
  id: string;
  html: string;
  savedAt: string;
  version: number;
}

interface ProjectManagerProps {
  onEditProject: () => void;
}

export const ProjectManager = ({ onEditProject }: ProjectManagerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [selectedProject, setSelectedProject] = useState<UserProject | null>(null);
  const [showVersionPreview, setShowVersionPreview] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishingProject, setPublishingProject] = useState<UserProject | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { projects, isLoading, deleteProject } = useUserProjects();

  // Separate drafts and published projects
  const drafts = projects.filter(p => p.is_draft);
  const savedProjects = projects.filter(p => !p.is_draft);
  const allItems = [...savedProjects, ...drafts];
  
  const filteredItems = allItems.filter(item => {
    return item.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleDeleteProject = async (projectId: string) => {
    const success = await deleteProject(projectId);
    if (success) {
      toast({
        title: "נמחק בהצלחה",
        description: "הפרויקט נמחק",
      });
    }
  };

  const editProject = (project: UserProject) => {
    // Convert UserProject to the format expected by the editor
    const projectForEditor = {
      id: project.project_id,
      name: project.name,
      html: project.html_content,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      userId: project.user_id
    };
    
    // Store the project to edit in sessionStorage so the editor can pick it up
    sessionStorage.setItem("editingProject", JSON.stringify(projectForEditor));
    // Call the callback to switch tabs
    onEditProject();
    toast({
      title: "עבר לעריכה",
      description: `הפרויקט "${project.name}" נטען לעריכה`,
    });
  };

  const duplicateProject = (project: UserProject) => {
    // Convert to the format expected by the editor with new ID
    const duplicatedProject = {
      id: Date.now().toString(),
      name: `${project.name} - עותק`,
      html: project.html_content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user?.id
    };
    
    sessionStorage.setItem("editingProject", JSON.stringify(duplicatedProject));
    onEditProject();
    
    toast({
      title: "שוכפל בהצלחה",
      description: `נוצר עותק של "${project.name}"`,
    });
  };

  const downloadProject = (project: UserProject) => {
    const blob = new Blob([project.html_content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "הורדה החלה",
      description: `הקובץ ${project.name}.html נשמר למחשב`,
    });
  };

  const handlePublish = (project: UserProject) => {
    setPublishingProject(project);
    setShowPublishDialog(true);
  };

  const getPreviewText = (html: string) => {
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "";
    
    // Extract text content (simple approach)
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const preview = textContent.length > 100 ? textContent.substring(0, 100) + "..." : textContent;
    
    return { title, preview };
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">טוען פרויקטים...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="חפש פרויקטים וטיוטות..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 bg-slate-800/70 border-slate-700 text-white focus:ring-2 focus:ring-violet-500 transition-all h-12"
          />
        </div>
        <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 px-4 py-2 text-sm border border-slate-600">
          {savedProjects.length} פרויקטים {drafts.length > 0 && `• ${drafts.length} טיוטות`}
        </Badge>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="p-8 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 text-center shadow-xl">
          <p className="text-slate-400 text-lg mb-2">
            {searchTerm ? "לא נמצאו פרויקטים התואמים לחיפוש" : "אין פרויקטים שמורים"}
          </p>
          <p className="text-slate-500 text-sm">
            {!searchTerm && "התחל לערוך דפים חדשים ושמור אותם כדי לראות אותם כאן"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((project) => {
            const { title } = getPreviewText(project.html_content);
            const isPublished = project.is_published;
            const isDraft = project.is_draft;
            
            return (
              <Card key={project.id} className={`${isDraft ? 'bg-gradient-to-br from-amber-900/20 via-yellow-900/20 to-amber-800/20 border-amber-700/50' : 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700'} hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden`}>
                {isDraft ? (
                  <div className="aspect-video bg-amber-100/10 border-b border-amber-700/50 relative flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="mx-auto mb-2 text-amber-400" size={32} />
                      <Badge className="bg-amber-600 text-white">
                        טיוטה
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-white border-b border-slate-700 relative">
                    <HtmlPreview html={project.html_content} />
                    {isPublished && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0 shadow-lg">
                          <Globe size={12} className="mr-1" />
                          מפורסם
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1 truncate">{project.name}</h3>
                    {title && title !== project.name && !isDraft && (
                      <p className="text-sm text-violet-400 truncate">"{title}"</p>
                    )}
                    {isDraft && (
                      <p className="text-sm text-amber-400">טיוטה</p>
                    )}
                  </div>
                  
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>נוצר: {formatDate(project.created_at)}</p>
                    {project.updated_at !== project.created_at && (
                      <p>עודכן: {formatDate(project.updated_at)}</p>
                    )}
                    {isPublished && (
                      <p className="flex items-center gap-1 text-emerald-400">
                        <Globe size={12} />
                        מפורסם
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => editProject(project)}
                        className={`flex-1 ${isDraft ? 'bg-gradient-to-r from-amber-600 to-yellow-700 hover:from-amber-700 hover:to-yellow-800' : 'bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800'} text-white shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold`}
                      >
                        <Edit size={14} className="mr-1" />
                        {isDraft ? "ערוך טיוטה" : "ערוך"}
                      </Button>
                      
                      {!isDraft && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateProject(project)}
                          className="flex-1 border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white transition-all duration-200 shadow-md font-medium"
                        >
                          <Copy size={14} className="mr-1" />
                          שכפל
                        </Button>
                      )}
                    </div>
                    
                    {!isDraft && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handlePublish(project)}
                          className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg transition-all duration-200 font-semibold"
                        >
                          <Share2 size={14} className="mr-1" />
                          {isPublished ? "עדכן פרסום" : "פרסם"}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadProject(project)}
                          className="flex-1 border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white transition-all duration-200 shadow-md font-medium"
                        >
                          <Download size={14} className="mr-1" />
                          הורד
                        </Button>
                      </div>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg transition-all duration-200 font-semibold">
                          <Trash2 size={14} className="mr-1" />
                          {isDraft ? "מחק טיוטה" : "מחק פרויקט"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">
                            {isDraft ? "מחיקת טיוטה" : "מחיקת פרויקט"}
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            האם אתה בטוח שברצונך למחוק את "{project.name}"? פעולה זו לא ניתנת לביטול.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            ביטול
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProject(project.project_id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            מחק
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
      )}

      <VersionPreview 
        open={showVersionPreview}
        onOpenChange={setShowVersionPreview}
        version={selectedVersion}
        onRestore={() => {}}
      />

      {publishingProject && (
        <PublishDialog 
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
          project={{
            id: publishingProject.project_id,
            name: publishingProject.name,
            html: publishingProject.html_content,
            createdAt: publishingProject.created_at,
            updatedAt: publishingProject.updated_at
          }}
        />
      )}
    </div>
  );
};
