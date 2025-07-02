
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Globe, Eye, AlertCircle, CheckCircle } from "lucide-react";

interface WebhookLog {
  id: string;
  user_id: string | null;
  webhook_url: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  created_at: string;
}

export function WebhookLogsList() {
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

  const fetchWebhookLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setWebhookLogs(data || []);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת יומני ה-Webhook",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number | null) => {
    if (!status) {
      return (
        <Badge variant="secondary" className="bg-gray-600">
          <AlertCircle className="w-3 h-3 mr-1" />
          לא ידוע
        </Badge>
      );
    }

    if (status >= 200 && status < 300) {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
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
          <Globe className="w-5 h-5" />
          יומני Webhook
        </CardTitle>
        <CardDescription className="text-gray-400">
          מעקב אחר קריאות Webhook ותגובותיהן
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-gray-300">URL</TableHead>
              <TableHead className="text-gray-300">סטטוס</TableHead>
              <TableHead className="text-gray-300">משתמש</TableHead>
              <TableHead className="text-gray-300">תאריך</TableHead>
              <TableHead className="text-gray-300">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhookLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-white">
                  <div className="max-w-xs truncate" title={log.webhook_url}>
                    {log.webhook_url}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(log.response_status)}
                </TableCell>
                <TableCell className="text-gray-400 font-mono text-sm">
                  {log.user_id ? `${log.user_id.substring(0, 8)}...` : 'לא ידוע'}
                </TableCell>
                <TableCell className="text-gray-400">
                  {new Date(log.created_at).toLocaleString('he-IL')}
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>פרטי Webhook</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          פרטים מלאים על קריאת ה-Webhook
                        </DialogDescription>
                      </DialogHeader>
                      {selectedLog && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">URL:</h4>
                            <code className="bg-gray-700 p-2 rounded block text-sm">
                              {selectedLog.webhook_url}
                            </code>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Payload:</h4>
                            <pre className="bg-gray-700 p-4 rounded text-sm overflow-auto max-h-40">
                              {JSON.stringify(selectedLog.payload, null, 2)}
                            </pre>
                          </div>
                          
                          {selectedLog.response_body && (
                            <div>
                              <h4 className="font-semibold mb-2">Response:</h4>
                              <pre className="bg-gray-700 p-4 rounded text-sm overflow-auto max-h-40">
                                {selectedLog.response_body}
                              </pre>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Status:</span>
                              <div className="mt-1">
                                {getStatusBadge(selectedLog.response_status)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-400">Created:</span>
                              <div className="mt-1 text-white">
                                {new Date(selectedLog.created_at).toLocaleString('he-IL')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {webhookLogs.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            אין יומני Webhook עדיין
          </div>
        )}
      </CardContent>
    </Card>
  );
}
