import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield } from "lucide-react";

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
  created_by: string | null;
}

interface UserData {
  id: string;
  email: string;
}

export function AdminUsersList() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת רשימת המנהלים",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין כתובת אימייל",
        variant: "destructive"
      });
      return;
    }

    setIsAddingAdmin(true);
    try {
      // First, check if user exists in auth.users
      const { data: userData, error: userError } = await supabase.rpc('get_user_by_email', {
        email_input: newAdminEmail
      }) as { data: UserData[] | null, error: any };

      if (userError) {
        console.error('Error fetching user:', userError);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בחיפוש המשתמש",
          variant: "destructive"
        });
        return;
      }

      if (!userData || userData.length === 0) {
        toast({
          title: "שגיאה",
          description: "משתמש עם כתובת אימייל זו לא נמצא במערכת",
          variant: "destructive"
        });
        return;
      }

      const user = userData[0];

      // Add to admin_users table
      const { error } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          email: newAdminEmail.trim()
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "שגיאה",
            description: "משתמש זה כבר מנהל במערכת",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "הצלחה",
        description: "מנהל חדש נוסף בהצלחה",
      });

      setNewAdminEmail("");
      setIsDialogOpen(false);
      fetchAdminUsers();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהוספת המנהל",
        variant: "destructive"
      });
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const removeAdmin = async (adminId: string, email: string) => {
    if (!confirm(`האם אתה בטוח שברצונך להסיר את ${email} מרשימת המנהלים?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      toast({
        title: "הצלחה",
        description: "המנהל הוסר בהצלחה",
      });

      fetchAdminUsers();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהסרת המנהל",
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              רשימת מנהלים
            </CardTitle>
            <CardDescription className="text-gray-400">
              ניהול הרשאות מנהלים במערכת
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-600">
                <UserPlus className="w-4 h-4 mr-2" />
                הוסף מנהל
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>הוסף מנהל חדש</DialogTitle>
                <DialogDescription className="text-gray-400">
                  הזן את כתובת האימייל של המשתמש שברצונך להפוך למנהל
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    אימייל
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="col-span-3 bg-gray-700 border-gray-600 text-white"
                    placeholder="example@domain.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={addAdmin} 
                  disabled={isAddingAdmin}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isAddingAdmin ? "מוסיף..." : "הוסף מנהל"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-gray-300">אימייל</TableHead>
              <TableHead className="text-gray-300">תאריך הוספה</TableHead>
              <TableHead className="text-gray-300">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adminUsers.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="text-white">{admin.email}</TableCell>
                <TableCell className="text-gray-400">
                  {new Date(admin.created_at).toLocaleDateString('he-IL')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdmin(admin.id, admin.email)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
