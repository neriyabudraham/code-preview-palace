import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminUsersList } from "./AdminUsersList";
import { OnlineUsersTable } from "./OnlineUsersTable";
import { WebhookLogsList } from "./WebhookLogsList";
import { AdminAnalytics } from "./AdminAnalytics";
import { UsersManagement } from "./UsersManagement";
import { Shield, Users, Globe, Activity, BarChart3, UserCog, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useNavigate } from "react-router-dom";

export function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Track admin user online status
  useOnlineStatus();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin status:', error);
          toast({
            title: "שגיאה",
            description: "אירעה שגיאה בבדיקת הרשאות מנהל",
            variant: "destructive"
          });
          return;
        }

        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, toast]);

  const handleBackToMain = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <CardTitle className="text-2xl">גישה נדחתה</CardTitle>
            <CardDescription className="text-gray-400">
              אין לך הרשאות מנהל לגשת לאזור זה
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="container mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                לוח בקרה למנהלים
              </h1>
              <p className="text-gray-400 mt-2">
                ניהול משתמשים, מעקב פעילות ואנליטיקה
              </p>
            </div>
            
            <Button
              onClick={handleBackToMain}
              variant="outline"
              className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              חזור לדף הראשי
            </Button>
          </div>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800 border-gray-700">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 size={16} />
              אנליטיקה
            </TabsTrigger>
            <TabsTrigger value="users-management" className="flex items-center gap-2">
              <UserCog size={16} />
              ניהול משתמשים
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-2">
              <Shield size={16} />
              מנהלים
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users size={16} />
              משתמשים מקוונים
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Globe size={16} />
              Webhook Logs
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity size={16} />
              פעילות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="users-management" className="mt-6">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="admins" className="mt-6">
            <AdminUsersList />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <OnlineUsersTable />
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <WebhookLogsList />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">פעילות אחרונה</CardTitle>
                <CardDescription className="text-gray-400">
                  מעקב אחר פעילות המשתמשים באתר
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">בקרוב...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
