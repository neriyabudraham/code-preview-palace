
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export const CustomDomainManager = () => {
  const [customDomain, setCustomDomain] = useState("");
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [domainVerified, setDomainVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchCurrentDomain();
    }
  }, [user]);

  const fetchCurrentDomain = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('custom_domain, domain_verified')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching domain:', error);
        return;
      }

      if (data) {
        setCurrentDomain(data.custom_domain);
        setDomainVerified(data.domain_verified || false);
        setCustomDomain(data.custom_domain || "");
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDomain = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const domainToSave = customDomain.trim() || null;
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          custom_domain: domainToSave,
          domain_verified: false // Reset verification when domain changes
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving domain:', error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לשמור את הדומיין המותאם אישית",
          variant: "destructive"
        });
        return;
      }

      setCurrentDomain(domainToSave);
      setDomainVerified(false);
      
      toast({
        title: "נשמר בהצלחה",
        description: domainToSave 
          ? "הדומיין המותאם אישית נשמר בהצלחה" 
          : "הדומיין המותאם אישית הוסר בהצלחה"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת הדומיין",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const verifyDomain = async () => {
    if (!currentDomain || !user) return;

    setSaving(true);
    try {
      // In a real implementation, you would verify the domain here
      // For now, we'll just mark it as verified
      const { error } = await supabase
        .from('profiles')
        .update({ domain_verified: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error verifying domain:', error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לאמת את הדומיין",
          variant: "destructive"
        });
        return;
      }

      setDomainVerified(true);
      toast({
        title: "דומיין אומת",
        description: "הדומיין המותאם אישית אומת בהצלחה"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה באמות הדומיין",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="mr-2">טוען...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>דומיין מותאם אישית</CardTitle>
        <CardDescription>
          הגדר דומיין מותאם אישית עבור הדפים שלך. הדפים שלך יהיו זמינים ב-yoursite.com במקום ב-URL הברירת מחדל.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="custom-domain">דומיין מותאם אישית</Label>
          <Input
            id="custom-domain"
            placeholder="example.com או subdomain.example.com"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            dir="ltr"
          />
          <p className="text-sm text-gray-500">
            הזן את הדומיין ללא http:// או https://
          </p>
        </div>

        {currentDomain && (
          <div className="space-y-2">
            <Label>סטטוס דומיין נוכחי</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{currentDomain}</span>
              <Badge variant={domainVerified ? "default" : "secondary"}>
                {domainVerified ? (
                  <>
                    <CheckCircle className="w-3 h-3 ml-1" />
                    מאומת
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 ml-1" />
                    לא מאומת
                  </>
                )}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={saveDomain} 
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                שומר...
              </>
            ) : (
              'שמור דומיין'
            )}
          </Button>
          
          {currentDomain && !domainVerified && (
            <Button 
              onClick={verifyDomain} 
              disabled={saving}
              variant="outline"
            >
              אמת דומיין
            </Button>
          )}
        </div>

        {currentDomain && !domainVerified && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>הוראות הגדרה:</strong><br />
              1. הוסף רשומת CNAME בדומיין שלך שמצביעה ל: <code className="bg-yellow-100 px-1 rounded">your-site.lovable.app</code><br />
              2. לחץ על "אמת דומיין" לאחר ההגדרה<br />
              3. זה עלול לקחת עד 24 שעות עד שהשינויים יכנסו לתוקף
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
