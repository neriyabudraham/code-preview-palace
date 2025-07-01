
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { HtmlPreview } from "./HtmlPreview";
import { VersionPreview } from "./VersionPreview";
import { PublishDialog } from "./PublishDialog";
import { Edit, Trash2, Eye, Download, Search, Copy, Clock, Globe, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectVersion {
  id: string;
  html: string;
  savedAt: string;
  version: number;
}

interface Project {
  id: string;
  name: string;
  html: string;
  createdAt: string;
  updatedAt: string;
  versions?: ProjectVersion[];
}

interface ProjectManagerProps {
  onEditProject: () => void;
}

export const ProjectManager = ({ onEditProject }: ProjectManagerProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showVersionPreview, setShowVersionPreview] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishingProject, setPublishingProject] = useState<Project | null>(null);
  const { toast } = useToast();

  const loadProjects = () => {
    const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
    setProjects(savedProjects);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteProject = (id: string) => {
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    localStorage.setItem("htmlProjects", JSON.stringify(updatedProjects));
    toast({
      title: "נמחק בהצלחה",
      description: "הפרויקט נמחק",
    });
  };

  const editProject = (project: Project) => {
    // Store the project to edit in sessionStorage so the editor can pick it up
    sessionStorage.setItem("editingProject", JSON.stringify(project));
    // Call the callback to switch tabs
    onEditProject();
    toast({
      title: "עבר לעריכה",
      description: `הפרויקט "${project.name}" נטען לעריכה`,
    });
  };

  const duplicateProject = (project: Project) => {
    const duplicatedProject = {
      ...project,
      id: Date.now().toString(),
      name: `${project.name} - עותק`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [] // Reset versions for duplicate
    };
    
    const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
    savedProjects.push(duplicatedProject);
    localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
    setProjects(savedProjects);
    
    toast({
      title: "שוכפל בהצלחה",
      description: `נוצר עותק של "${project.name}"`,
    });
  };

  const downloadProject = (project: Project) => {
    const blob = new Blob([project.html], { type: "text/html" });
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

  const handlePublish = (project: Project) => {
    setPublishingProject(project);
    setShowPublishDialog(true);
  };

  const previewVersion = (project: Project, version: ProjectVersion) => {
    setSelectedProject(project);
    setSelectedVersion(version);
    setShowVersionPreview(true);
  };

  const restoreVersion = (project: Project, version: ProjectVersion) => {
    const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
    const projectIndex = savedProjects.findIndex((p: any) => p.id === project.id);
    
    if (projectIndex !== -1) {
      // Create a new version entry for the current state before restoring
      if (!savedProjects[projectIndex].versions) {
        savedProjects[projectIndex].versions = [];
      }
      
      savedProjects[projectIndex].versions.unshift({
        id: Date.now().toString() + "_current",
        html: savedProjects[projectIndex].html,
        savedAt: savedProjects[projectIndex].updatedAt,
        version: (savedProjects[projectIndex].versions.length || 0) + 1
      });
      
      // Restore the selected version
      savedProjects[projectIndex].html = version.html;
      savedProjects[projectIndex].updatedAt = new Date().toISOString();
      
      localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
      setProjects(savedProjects);
      
      toast({
        title: "גירסה שוחזרה",
        description: `גירסה ${version.version} של "${project.name}" שוחזרה`,
      });
    }
  };

  const handleVersionRestore = () => {
    if (selectedProject && selectedVersion) {
      restoreVersion(selectedProject, selectedVersion);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="חפש פרויקטים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 bg-slate-800/70 border-slate-700 text-white focus:ring-2 focus:ring-violet-500 transition-all h-12"
          />
        </div>
        <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 px-4 py-2 text-sm border border-slate-600">
          {filteredProjects.length} פרויקטים
        </Badge>
      </div>

      {filteredProjects.length === 0 ? (
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
          {filteredProjects.map((project) => {
            const { title } = getPreviewText(project.html);
            const isPublished = !!(project as any).publishedUrl;
            
            return (
              <Card key={project.id} className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden">
                <div className="aspect-video bg-white border-b border-slate-700 relative">
                  <HtmlPreview html={project.html} />
                  {isPublished && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0 shadow-lg">
                        <Globe size={12} className="mr-1" />
                        מפורסם
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1 truncate">{project.name}</h3>
                    {title && title !== project.name && (
                      <p className="text-sm text-violet-400 truncate">"{title}"</p>
                    )}
                  </div>
                  
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>נוצר: {formatDate(project.createdAt)}</p>
                    {project.updatedAt !== project.createdAt && (
                      <p>עודכן: {formatDate(project.updatedAt)}</p>
                    )}
                    {isPublished && (
                      <p className="flex items-center gap-1 text-emerald-400">
                        <Globe size={12} />
                        פורסם: {formatDate((project as any).publishedAt)}
                      </p>
                    )}
                    {project.versions && project.versions.length > 0 && (
                      <p className="flex items-center gap-1 text-blue-400">
                        <Clock size={12} />
                        {project.versions.length} גירסאות
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => editProject(project)}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
                      >
                        <Edit size={14} className="mr-1" />
                        ערוך
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateProject(project)}
                        className="flex-1 border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white transition-all duration-200 shadow-md font-medium"
                      >
                        <Copy size={14} className="mr-1" />
                        שכפל
                      </Button>
                    </div>
                    
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
                    
                    {project.versions && project.versions.length > 0 && (
                      <details className="w-full">
                        <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300 list-none p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                          <span className="flex items-center gap-2 justify-center font-medium">
                            <Clock size={12} />
                            גירסאות קודמות ({project.versions.length})
                          </span>
                        </summary>
                        <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                          {project.versions.slice(0, 5).map((version) => (
                            <div key={version.id} className="flex items-center justify-between text-xs bg-slate-700/20 p-3 rounded border border-slate-600/30">
                              <span className="text-slate-400 truncate">
                                גירסה {version.version} - {formatDate(version.savedAt)}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => previewVersion(project, version)}
                                  className="h-6 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-600"
                                >
                                  <Eye size={12} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => restoreVersion(project, version)}
                                  className="h-6 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-600"
                                >
                                  שחזר
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg transition-all duration-200 font-semibold">
                          <Trash2 size={14} className="mr-1" />
                          מחק פרויקט
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">מחיקת פרויקט</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            האם אתה בטוח שברצונך למחוק את "{project.name}"? פעולה זו לא ניתנת לביטול.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            ביטול
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteProject(project.id)}
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
        onRestore={handleVersionRestore}
      />

      {publishingProject && (
        <PublishDialog 
          isOpen={showPublishDialog}
          onClose={() => setShowPublishDialog(false)}
          htmlContent={publishingProject.html}
          projectId={publishingProject.id}
          title={publishingProject.name}
        />
      )}
    </div>
  );
};
