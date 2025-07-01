
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { HtmlPreview } from "./HtmlPreview";
import { Edit, Trash2, Eye, Download, Search, Copy, Clock } from "lucide-react";
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
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="חפש פרויקטים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <Badge variant="secondary" className="bg-gray-700 text-gray-300">
          {filteredProjects.length} פרויקטים
        </Badge>
      </div>

      {filteredProjects.length === 0 ? (
        <Card className="p-8 bg-gray-800 border-gray-700 text-center">
          <p className="text-gray-400 text-lg mb-2">
            {searchTerm ? "לא נמצאו פרויקטים התואמים לחיפוש" : "אין פרויקטים שמורים"}
          </p>
          <p className="text-gray-500 text-sm">
            {!searchTerm && "התחל לערוך דפים חדשים ושמור אותם כדי לראות אותם כאן"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const { title } = getPreviewText(project.html);
            
            return (
              <Card key={project.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors overflow-hidden">
                <div className="aspect-video bg-white border-b border-gray-700">
                  <HtmlPreview html={project.html} />
                </div>
                
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-white text-lg mb-1">{project.name}</h3>
                    {title && title !== project.name && (
                      <p className="text-sm text-blue-400">"{title}"</p>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <p>נוצר: {formatDate(project.createdAt)}</p>
                    {project.updatedAt !== project.createdAt && (
                      <p>עודכן: {formatDate(project.updatedAt)}</p>
                    )}
                    {project.versions && project.versions.length > 0 && (
                      <p className="flex items-center gap-1">
                        <Clock size={12} />
                        {project.versions.length} גירסאות
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => editProject(project)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit size={14} className="mr-1" />
                      ערוך
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateProject(project)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Copy size={14} className="mr-1" />
                      שכפל
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadProject(project)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Download size={14} className="mr-1" />
                      הורד
                    </Button>
                    
                    {project.versions && project.versions.length > 0 && (
                      <details className="w-full">
                        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-300 list-none">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            גירסאות קודמות
                          </span>
                        </summary>
                        <div className="mt-2 space-y-1">
                          {project.versions.slice(0, 5).map((version) => (
                            <div key={version.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">
                                גירסה {version.version} - {formatDate(version.savedAt)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => restoreVersion(project, version)}
                                className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                              >
                                שחזר
                              </Button>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="w-full mt-2">
                          <Trash2 size={14} className="mr-1" />
                          מחק
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-800 border-gray-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">מחיקת פרויקט</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            האם אתה בטוח שברצונך למחוק את "{project.name}"? פעולה זו לא ניתנת לביטול.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
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
    </div>
  );
};
