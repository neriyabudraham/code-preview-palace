
import { useState } from "react";
import { HtmlEditor } from "@/components/HtmlEditor";
import { ProjectManager } from "@/components/ProjectManager";
import { PublishedPagesManager } from "@/components/PublishedPagesManager";
import { CustomDomainManager } from "@/components/CustomDomainManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Code, FolderOpen, LogOut, User, Globe2, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [activeTab, setActiveTab] = useState("editor");
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleEditProject = () => {
    setActiveTab("editor");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "התנתקת בהצלחה",
        description: "להתראות!",
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהתנתקות",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                HTML Editor Pro
              </h1>
              <p className="text-gray-300 text-sm mt-1">
                עורך HTML עם תצוגה מקדימה בזמן אמת
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-600">
                <User className="w-4 h-4 text-blue-400" />
                <span>{user?.email}</span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="destructive"
                size="sm"
                className="font-medium"
              >
                <LogOut className="w-4 h-4 mr-2" />
                התנתק
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/80 border-gray-600 shadow-lg backdrop-blur-sm h-12">
            <TabsTrigger 
              value="editor" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white font-medium transition-all duration-200"
            >
              <Code size={16} />
              עריכה
            </TabsTrigger>
            <TabsTrigger 
              value="projects" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white font-medium transition-all duration-200"
            >
              <FolderOpen size={16} />
              הפרויקטים שלי
            </TabsTrigger>
            <TabsTrigger 
              value="published" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white font-medium transition-all duration-200"
            >
              <Globe2 size={16} />
              דפים מפורסמים
            </TabsTrigger>
            <TabsTrigger 
              value="domain" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white font-medium transition-all duration-200"
            >
              <Globe size={16} />
              דומיין מותאם
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="editor" className="mt-6">
            <HtmlEditor />
          </TabsContent>
          
          <TabsContent value="projects" className="mt-6">
            <ProjectManager onEditProject={handleEditProject} />
          </TabsContent>
          
          <TabsContent value="published" className="mt-6">
            <PublishedPagesManager />
          </TabsContent>
          
          <TabsContent value="domain" className="mt-6">
            <CustomDomainManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
