
import { useState, useEffect } from "react";
import { HtmlEditor } from "@/components/HtmlEditor";
import { ProjectManager } from "@/components/ProjectManager";
import { PublishedPagesManager } from "@/components/PublishedPagesManager";
import { CustomDomainManager } from "@/components/CustomDomainManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Code, FolderOpen, LogOut, User, Globe2, Globe, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [activeTab, setActiveTab] = useState("editor");
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', user.id)
          .single();

        setIsAdmin(!!data);
      } catch (error) {
        // User is not an admin, which is fine
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

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

  const handleAdminClick = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                HTML Editor Pro
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                עורך HTML עם תצוגה מקדימה בזמן אמת
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <User className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              
              {isAdmin && (
                <Button
                  onClick={handleAdminClick}
                  variant="outline"
                  size="sm"
                  className="border-purple-600 text-purple-400 hover:bg-purple-600"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  ניהול
                </Button>
              )}
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
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
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Code size={16} />
              עריכה
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen size={16} />
              הפרויקטים שלי
            </TabsTrigger>
            <TabsTrigger value="published" className="flex items-center gap-2">
              <Globe2 size={16} />
              דפים מפורסמים
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
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
