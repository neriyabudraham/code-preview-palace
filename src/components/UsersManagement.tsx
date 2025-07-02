import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Trash2, Mail, Globe } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  custom_domain: string | null;
  domain_verified: boolean | null;
  last_seen: string | null;
  is_online: boolean;
  login_count: number;
  site_count: number;
  total_page_visits: number;
}

export function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_users_with_stats');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת רשימת המשתמשים",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    try {
      // First delete from database
      const { error: dbError } = await (supabase as any).rpc('delete_user_and_data', {
        _user_id: userId
      });

      if (dbError) throw dbError;

      // Then delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Error deleting from auth:', authError);
        // Continue anyway as the data is already deleted
      }

      toast({
        title: "הצלחה",
        description: `המשתמש ${email} נמחק בהצלחה`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת המשתמש",
        variant: "destructive"
      });
    }
  };

  const toggleDomainVerification = async (userId: string, currentStatus: boolean | null) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await (supabase as any).rpc('update_domain_verification', {
        _user_id: userId,
        _verified: newStatus
      });

      if (error) throw error;

      toast({
        title: "הצלחה",
        description: `סטטוס הדומיין עודכן ל${newStatus ? 'מאומת' : 'לא מאומת'}`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating domain verification:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון סטטוס הדומיין",
        variant: "destructive"
      });
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { email }
      });

      if (error) throw error;

      toast({
        title: "הצלחה",
        description: `אימייל איפוס סיסמה נשלח ל${email}`,
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשליחת אימייל איפוס הסיסמה",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          ניהול משתמשים
        </CardTitle>
        <CardDescription className="text-gray-400">
          ניהול כלל המשתמשים במערכת ופעולות מנהלה
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-300">אימייל</TableHead>
                <TableHead className="text-gray-300">שם מלא</TableHead>
                <TableHead className="text-gray-300">סטטוס</TableHead>
                <TableHead className="text-gray-300">כניסות</TableHead>
                <TableHead className="text-gray-300">אתרים</TableHead>
                <TableHead className="text-gray-300">צפיות</TableHead>
                <TableHead className="text-gray-300">דומיין מותאם</TableHead>
                <TableHead className="text-gray-300">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-white font-medium">{user.email}</TableCell>
                  <TableCell className="text-gray-300">{user.full_name || 'לא הוגדר'}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_online ? "default" : "secondary"}>
                      {user.is_online ? 'מקוון' : 'לא מקוון'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">{user.login_count}</TableCell>
                  <TableCell className="text-gray-300">{user.site_count}</TableCell>
                  <TableCell className="text-gray-300">{user.total_page_visits}</TableCell>
                  <TableCell>
                    {user.custom_domain ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-300 text-sm">{user.custom_domain}</span>
                        <Badge 
                          variant={user.domain_verified ? "default" : "destructive"}
                          className="text-xs w-fit"
                        >
                          {user.domain_verified ? 'מאומת' : 'לא מאומת'}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-gray-500">אין</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendPasswordReset(user.email)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        title="שלח איפוס סיסמה"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      
                      {user.custom_domain && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDomainVerification(user.id, user.domain_verified)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                          title="שנה סטטוס דומיין"
                        >
                          <Globe className="w-4 h-4" />
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            title="מחק משתמש"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                              פעולה זו תמחק את המשתמש {user.email} וכל המידע הקשור אליו באופן מוחלט.
                              לא ניתן לבטל פעולה זו.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white">
                              ביטול
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(user.id, user.email)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              מחק משתמש
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            לא נמצאו משתמשים במערכת
          </div>
        )}
      </CardContent>
    </Card>
  );
}