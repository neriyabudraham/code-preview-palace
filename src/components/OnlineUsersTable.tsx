
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Circle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface OnlineUser {
  user_id: string;
  last_seen: string;
  is_online: boolean;
  updated_at: string;
}

export function OnlineUsersTable() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOnlineUsers();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('online-users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_online_status'
        },
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe();

    // Update every minute to refresh "last seen" times
    const interval = setInterval(fetchOnlineUsers, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchOnlineUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_online_status')
        .select('*')
        .order('last_seen', { ascending: false });

      if (error) throw error;
      setOnlineUsers(data || []);
    } catch (error) {
      console.error('Error fetching online users:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת רשימת המשתמשים המקוונים",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getLastSeenText = (lastSeen: string, isOnline: boolean) => {
    if (isOnline) {
      return "מקוון כעת";
    }
    
    try {
      return formatDistanceToNow(new Date(lastSeen), { 
        addSuffix: true, 
        locale: he 
      });
    } catch {
      return "לא ידוע";
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

  const onlineCount = onlineUsers.filter(user => user.is_online).length;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          משתמשים מקוונים
          <Badge variant="secondary" className="bg-green-600 text-white">
            {onlineCount} מקוונים
          </Badge>
        </CardTitle>
        <CardDescription className="text-gray-400">
          מעקב אחר פעילות המשתמשים בזמן אמת
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-gray-300">סטטוס</TableHead>
              <TableHead className="text-gray-300">משתמש</TableHead>
              <TableHead className="text-gray-300">נראה לאחרונה</TableHead>
              <TableHead className="text-gray-300">עודכן</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {onlineUsers.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Circle 
                      className={`w-3 h-3 ${
                        user.is_online 
                          ? 'text-green-500 fill-green-500' 
                          : 'text-gray-500 fill-gray-500'
                      }`}
                    />
                    <Badge 
                      variant={user.is_online ? "default" : "secondary"}
                      className={user.is_online ? "bg-green-600" : "bg-gray-600"}
                    >
                      {user.is_online ? "מקוון" : "לא מקוון"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-white font-mono text-sm">
                  {user.user_id.substring(0, 8)}...
                </TableCell>
                <TableCell className="text-gray-400">
                  {getLastSeenText(user.last_seen, user.is_online)}
                </TableCell>
                <TableCell className="text-gray-400">
                  {new Date(user.updated_at).toLocaleString('he-IL')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {onlineUsers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            אין משתמשים מקוונים כרגע
          </div>
        )}
      </CardContent>
    </Card>
  );
}
