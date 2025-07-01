
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CodeEditor } from "./CodeEditor";
import { HtmlPreview } from "./HtmlPreview";
import { Save, Play, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>דף HTML חדש</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
        }
        p {
            font-size: 1.2rem;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>ברוכים הבאים לעורך HTML!</h1>
        <p>התחל לערוך את הקוד בצד שמאל וראה את התוצאות בזמן אמת!</p>
        <p>אתה יכול לשמור את הדף ולצפות בו מאוחר יותר.</p>
    </div>
</body>
</html>`;

export const HtmlEditor = () => {
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [fileName, setFileName] = useState("דף חדש");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if there's an editing project in sessionStorage
    const editingProject = sessionStorage.getItem("editingProject");
    if (editingProject) {
      try {
        const project = JSON.parse(editingProject);
        setHtmlCode(project.html);
        setFileName(project.name);
        setCurrentProjectId(project.id);
        // Clear the sessionStorage after loading
        sessionStorage.removeItem("editingProject");
        
        toast({
          title: "פרויקט נטען",
          description: `הפרויקט "${project.name}" נטען לעריכה`,
        });
      } catch (error) {
        console.error("Error loading project:", error);
      }
    }
  }, [toast]);

  const handleSave = () => {
    if (!fileName.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הזן שם לקובץ",
        variant: "destructive",
      });
      return;
    }

    const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
    
    if (currentProjectId) {
      // Update existing project
      const projectIndex = savedProjects.findIndex((p: any) => p.id === currentProjectId);
      if (projectIndex !== -1) {
        savedProjects[projectIndex] = {
          ...savedProjects[projectIndex],
          name: fileName,
          html: htmlCode,
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      // Create new project or update by name
      const project = {
        id: Date.now().toString(),
        name: fileName,
        html: htmlCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existingIndex = savedProjects.findIndex((p: any) => p.name === fileName);
      if (existingIndex !== -1) {
        savedProjects[existingIndex] = { ...savedProjects[existingIndex], ...project, id: savedProjects[existingIndex].id };
      } else {
        savedProjects.push(project);
        setCurrentProjectId(project.id);
      }
    }

    localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
    
    toast({
      title: "נשמר בהצלחה!",
      description: `הקובץ "${fileName}" נשמר`,
    });
  };

  const handleReset = () => {
    setHtmlCode(DEFAULT_HTML);
    setFileName("דף חדש");
    setCurrentProjectId(null);
    toast({
      title: "אופס!",
      description: "הקוד אופס למצב הבסיסי",
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gray-800 border-gray-700">
        <div className="flex items-center gap-4 mb-4">
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="שם הקובץ..."
            className="flex-1 bg-gray-700 border-gray-600 text-white"
          />
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <Save size={16} className="mr-2" />
            שמור
          </Button>
          <Button onClick={handleReset} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
            <RotateCcw size={16} className="mr-2" />
            איפוס
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-300px)]">
        <Card className="p-4 bg-gray-800 border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-400 mr-3">עורך הקוד</span>
          </div>
          <CodeEditor value={htmlCode} onChange={setHtmlCode} />
        </Card>

        <Card className="p-4 bg-gray-800 border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Play size={16} className="text-green-400" />
            <span className="text-sm text-gray-400">תצוגה מקדימה</span>
          </div>
          <HtmlPreview html={htmlCode} />
        </Card>
      </div>
    </div>
  );
};
