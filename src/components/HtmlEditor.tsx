import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CodeEditor } from "./CodeEditor";
import { HtmlPreview } from "./HtmlPreview";
import { Save, Play, RotateCcw, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EMPTY_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הדף הזה ריק</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background: #f5f5f5;
            color: #333;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #666;
            font-size: 2rem;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>הדף הזה ריק</h1>
    </div>
</body>
</html>`;

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>דף לדוגמא</title>
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
        .note {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>זהו דף לדוגמא</h1>
        <p>אתה יכול להחליף את הקוד הזה בקוד שלך</p>
        <div class="note">
            <p>זהו רק דף רקע לדוגמא - לא ניתן לשמור אותו</p>
        </div>
    </div>
</body>
</html>`;

export const HtmlEditor = () => {
  const [htmlCode, setHtmlCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isSampleMode, setIsSampleMode] = useState(true);
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
        setIsEditingExisting(true);
        setIsSampleMode(false);
        // Clear the sessionStorage after loading
        sessionStorage.removeItem("editingProject");
        
        toast({
          title: "פרויקט נטען",
          description: `הפרויקט "${project.name}" נטען לעריכה`,
        });
      } catch (error) {
        console.error("Error loading project:", error);
      }
    } else {
      // Show sample page when entering fresh
      setHtmlCode(SAMPLE_HTML);
      setFileName("");
      setCurrentProjectId(null);
      setIsEditingExisting(false);
      setIsSampleMode(true);
    }
  }, [toast]);

  const handleCodeChange = (newCode: string) => {
    if (isSampleMode) {
      // Exit sample mode when user starts typing
      setIsSampleMode(false);
      setHtmlCode(newCode);
    } else {
      setHtmlCode(newCode);
    }
  };

  const handleNewPage = () => {
    setHtmlCode(EMPTY_HTML);
    setFileName("דף חדש");
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setIsSampleMode(false);
    toast({
      title: "דף חדש",
      description: "נוצר דף חדש",
    });
  };

  const handleSave = () => {
    if (isSampleMode) {
      toast({
        title: "לא ניתן לשמור",
        description: "לא ניתן לשמור את דף הדוגמא. התחל לערוך קוד חדש.",
        variant: "destructive",
      });
      return;
    }

    if (!fileName.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הזן שם לקובץ",
        variant: "destructive",
      });
      return;
    }

    const savedProjects = JSON.parse(localStorage.getItem("htmlProjects") || "[]");
    const now = new Date().toISOString();
    
    if (isEditingExisting && currentProjectId) {
      // Update existing project and create version history
      const projectIndex = savedProjects.findIndex((p: any) => p.id === currentProjectId);
      if (projectIndex !== -1) {
        const existingProject = savedProjects[projectIndex];
        
        // Create version history entry
        if (!existingProject.versions) {
          existingProject.versions = [];
        }
        
        // Add current version to history
        existingProject.versions.unshift({
          id: Date.now().toString() + "_v",
          html: existingProject.html,
          savedAt: existingProject.updatedAt,
          version: (existingProject.versions.length || 0) + 1
        });
        
        // Keep only last 10 versions
        if (existingProject.versions.length > 10) {
          existingProject.versions = existingProject.versions.slice(0, 10);
        }
        
        // Update current project
        savedProjects[projectIndex] = {
          ...existingProject,
          name: fileName,
          html: htmlCode,
          updatedAt: now,
        };
      }
    } else {
      // Create new project
      const project = {
        id: Date.now().toString(),
        name: fileName,
        html: htmlCode,
        createdAt: now,
        updatedAt: now,
        versions: []
      };

      savedProjects.push(project);
      setCurrentProjectId(project.id);
      setIsEditingExisting(true);
    }

    localStorage.setItem("htmlProjects", JSON.stringify(savedProjects));
    
    toast({
      title: "נשמר בהצלחה!",
      description: `הקובץ "${fileName}" נשמר`,
    });
  };

  const handleDuplicate = () => {
    if (isSampleMode || !htmlCode.trim()) {
      toast({
        title: "לא ניתן לשכפל",
        description: "אין תוכן לשכפול",
        variant: "destructive",
      });
      return;
    }

    const duplicateName = fileName ? `${fileName} - עותק` : "עותק";
    setFileName(duplicateName);
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    
    toast({
      title: "שוכפל בהצלחה",
      description: "נוצר עותק של הדף הנוכחי",
    });
  };

  const handleReset = () => {
    setHtmlCode(SAMPLE_HTML);
    setFileName("");
    setCurrentProjectId(null);
    setIsEditingExisting(false);
    setIsSampleMode(true);
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
            disabled={isSampleMode}
          />
          <Button onClick={handleNewPage} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
            דף חדש
          </Button>
          <Button onClick={handleDuplicate} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
            <Copy size={16} className="mr-2" />
            שכפל
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" disabled={isSampleMode}>
            <Save size={16} className="mr-2" />
            שמור
          </Button>
          <Button onClick={handleReset} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
            <RotateCcw size={16} className="mr-2" />
            איפוס
          </Button>
        </div>
        {isSampleMode && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-blue-200 text-sm">
            זהו דף לדוגמא - התחל להקליד כדי לערוך קוד חדש
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-300px)]">
        <Card className="p-4 bg-gray-800 border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-400 mr-3">עורך הקוד</span>
            {isSampleMode && <span className="text-xs text-blue-400">(דוגמא)</span>}
          </div>
          <CodeEditor value={htmlCode} onChange={handleCodeChange} />
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
