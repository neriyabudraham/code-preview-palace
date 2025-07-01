
import { useState } from "react";
import { HtmlEditor } from "@/components/HtmlEditor";
import { ProjectManager } from "@/components/ProjectManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, FolderOpen } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("editor");

  const handleEditProject = () => {
    setActiveTab("editor");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            HTML Editor Pro
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            עורך HTML עם תצוגה מקדימה בזמן אמת
          </p>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Code size={16} />
              עריכה
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen size={16} />
              הפרויקטים שלי
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="editor" className="mt-6">
            <HtmlEditor />
          </TabsContent>
          
          <TabsContent value="projects" className="mt-6">
            <ProjectManager onEditProject={handleEditProject} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
