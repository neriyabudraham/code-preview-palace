
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Globe, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const CustomDomainManager = () => {
  const [customDomain, setCustomDomain] = useState("");
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDomainVerified, setIsDomainVerified] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load current domain configuration
  useEffect(() => {
    const loadDomainConfig = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('custom_domain, domain_verified')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
          return;
        }

        if (profile) {
          setCurrentDomain(profile.custom_domain);
          setIsDomainVerified(profile.domain_verified || false);
          setCustomDomain(profile.custom_domain || "");
        }
      } catch (error) {
        console.error('Error in loadDomainConfig:', error);
      }
    };

    loadDomainConfig();
  }, [user]);

  const handleSaveDomain = async () => {
    if (!user) return;

    if (!customDomain.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין דומיין",
        variant: "destructive"
      });
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(customDomain.trim())) {
      toast({
        title: "שגיאה",
        description: "פורמט הדומיין לא תקין",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          custom_domain: customDomain.trim(),
          domain_verified: false
        });

      if (error) {
        throw error;
      }

      setCurrentDomain(customDomain.trim());
      setIsDomainVerified(false);

      toast({
        title: "נשמר בהצלחה!",
        description: "הדומיין המותאם אישית נשמר. יש להגדיר את רשומת ה-DNS כדי להשלים את ההגדרה",
      });
    } catch (error) {
      console.error('Error saving domain:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת הדומיין",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyDNSRecord = () => {
    navigator.clipboard.writeText("185.158.133.1");
    toast({
      title: "הועתק!",
      description: "כתובת ה-IP הועתקה ללוח",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">דומיין מותאם אישית</h2>
              <p className="text-slate-400">הגדר דומיין משלך לדפים המפורסמים</p>
            </div>
          </div>

          {currentDomain && (
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">הדומיין הנוכחי:</p>
                  <p className="text-lg font-semibold text-white">{currentDomain}</p>
                </div>
                <Badge 
                  variant={isDomainVerified ? "default" : "destructive"}
                  className={isDomainVerified ? "bg-green-600" : "bg-orange-600"}
                >
                  {isDomainVerified ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      מאומת
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-1" />
                      לא מאומת
                    </>
                  )}
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300">
                כתובת הדומיין:
              </label>
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="example.com או subdomain.example.com"
                className="bg-slate-700 border-slate-600 text-white"
                dir="ltr"
              />
              <p className="text-xs text-slate-400 mt-1">
                הזן את הדומיין או תת-הדומיין שלך (ללא http:// או https://)
              </p>
            </div>

            <Button
              onClick={handleSaveDomain}
              disabled={isLoading || !customDomain.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? "שומר..." : "שמור דומיין"}
            </Button>
          </div>
        </div>
      </Card>

      {currentDomain && (
        <Card className="bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-slate-900 border-blue-700/50 p-6">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              הוראות חיבור DNS
            </h3>
            
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
              <p className="text-sm text-slate-300 mb-3">
                להשלמת החיבור, יש להוסיף רשומת A בהגדרות ה-DNS של הדומיין:
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-700 rounded p-3">
                  <div>
                    <span className="text-sm text-slate-400">רשומת A:</span>
                    <code className="block text-white font-mono">{currentDomain} → 185.158.133.1</code>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyDNSRecord}
                    className="border-slate-600 text-slate-300 hover:bg-slate-600"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-slate-400 space-y-1">
                <p>• היכנס לפאנל הניהול של הדומיין שלך</p>
                <p>• הוסף רשומת A עם השם "{currentDomain}" המצביעה לכתובת 185.158.133.1</p>
                <p>• השינוי עשוי לקחת עד 48 שעות להפצה מלאה</p>
              </div>
            </div>

            {!isDomainVerified && (
              <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">הדומיין עדיין לא מאומת</span>
                </div>
                <p className="text-sm text-orange-300 mt-2">
                  לאחר הגדרת רשומת ה-DNS, הדפים שלך יהיו זמינים בדומיין החדש תוך מספר שעות.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
