
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Copy, ExternalLink, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const CustomDomainManager = () => {
  const [subdomain, setSubdomain] = useState("");
  const [domain, setDomain] = useState("");
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();
  const { user, session } = useAuth();

  // Load current domain configuration
  useEffect(() => {
    const loadDomainConfig = async () => {
      if (!user || !session) {
        console.log('No user or session available for loading domain config');
        return;
      }

      try {
        console.log('Loading domain config for user:', user.id);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('custom_domain')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
          toast({
            title: "שגיאה",
            description: "לא ניתן לטעון את הגדרות הדומיין",
            variant: "destructive"
          });
          return;
        }

        if (profile) {
          setCurrentDomain(profile.custom_domain);
          
          // Parse existing domain into subdomain and domain parts
          if (profile.custom_domain) {
            const parts = profile.custom_domain.split('.');
            if (parts.length >= 3) {
              setSubdomain(parts[0]);
              setDomain(parts.slice(1).join('.'));
            } else {
              setSubdomain('');
              setDomain(profile.custom_domain);
            }
          }
          
          console.log('Loaded domain config:', profile);
        } else {
          // Profile doesn't exist yet, but that's OK - it will be created when saving domain
          console.log('No profile found for user, will create when saving domain');
        }
      } catch (error) {
        console.error('Error in loadDomainConfig:', error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בטעינת הגדרות הדומיין",
          variant: "destructive"
        });
      }
    };

    loadDomainConfig();
  }, [user, session, toast]);

  const getFullDomain = () => {
    if (subdomain.trim() && domain.trim()) {
      return `${subdomain.trim()}.${domain.trim()}`;
    } else if (domain.trim()) {
      return domain.trim();
    }
    return '';
  };

  const handleSaveDomain = async () => {
    if (!user || !session) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לשמור דומיין",
        variant: "destructive"
      });
      return;
    }

    const fullDomain = getFullDomain();
    if (!fullDomain) {
      toast({
        title: "שגיאה",
        description: "יש להזין דומיין",
        variant: "destructive"
      });
      return;
    }

    // Improved domain validation that supports subdomains
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(fullDomain)) {
      toast({
        title: "שגיאה",
        description: "פורמט הדומיין לא תקין. דוגמה: example.com או subdomain.example.com",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Saving domain for user:', user.id, 'Domain:', fullDomain);
      
      // Use upsert to either insert or update the profile record
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          custom_domain: fullDomain,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Supabase error saving domain:', error);
        throw error;
      }

      setCurrentDomain(fullDomain);

      toast({
        title: "נשמר בהצלחה! 🎉",
        description: "הדומיין המותאם אישית נשמר ומוכן לשימוש",
      });
    } catch (error: any) {
      console.error('Error saving domain:', error);
      
      let errorMessage = "אירעה שגיאה בשמירת הדומיין";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = `שגיאה: ${error.code}`;
      }

      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectDomain = async () => {
    if (!user || !session) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לנתק דומיין",
        variant: "destructive"
      });
      return;
    }

    setIsDisconnecting(true);

    try {
      console.log('Disconnecting domain for user:', user.id);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          custom_domain: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error disconnecting domain:', error);
        throw error;
      }

      setCurrentDomain(null);
      setSubdomain("");
      setDomain("");

      toast({
        title: "דומיין נותק בהצלחה",
        description: "הדומיין המותאם אישית הוסר. הדפים יפורסמו תחת הדומיין הברירת מחדל",
      });
    } catch (error: any) {
      console.error('Error disconnecting domain:', error);
      
      let errorMessage = "אירעה שגיאה בניתוק הדומיין";
      
      if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyDNSRecord = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "הועתק!",
      description: "הטקסט הועתק ללוח",
    });
  };

  // Show loading state if no session yet
  if (!session) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </Card>
      </div>
    );
  }

  const fullDomain = getFullDomain();

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
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="default"
                    className="bg-green-600"
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    מחובר
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisconnectDomain}
                    disabled={isDisconnecting}
                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                  >
                    <Unlink className="w-4 h-4 mr-1" />
                    {isDisconnecting ? "מנתק..." : "נתק"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-300">
                  תת-דומיין (אופציונלי):
                </label>
                <Input
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="page, www, blog..."
                  className="bg-slate-700 border-slate-600 text-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-300">
                  דומיין עיקרי:
                </label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                  className="bg-slate-700 border-slate-600 text-white"
                  dir="ltr"
                />
              </div>
            </div>
            
            {fullDomain && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                <p className="text-sm text-slate-400 mb-2">הדומיין המלא שיוגדר:</p>
                <div className="flex items-center gap-2">
                  <code className="text-white font-mono bg-slate-700 px-3 py-2 rounded flex-1">
                    {fullDomain}
                  </code>
                  <Button
                    onClick={() => copyDNSRecord(fullDomain)}
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-600"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={handleSaveDomain}
              disabled={isLoading || !fullDomain}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? "שומר..." : "שמור דומיין"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-slate-900 border-blue-700/50 p-6">
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            הוראות חיבור DNS
          </h3>
          
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
            <p className="text-sm text-slate-300 mb-4">
              להשלמת החיבור, יש להוסיף רשומת A בהגדרות ה-DNS של הדומיין:
            </p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-slate-400 border-b border-slate-600 pb-2">
                <div>סוג רשומה</div>
                <div>שם מארח</div>
                <div>ערך נדרש</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="bg-slate-700 rounded px-3 py-2 text-white font-mono text-sm">
                  A
                </div>
                <div className="bg-slate-700 rounded px-3 py-2 text-white font-mono text-sm flex items-center gap-2">
                  <span className="truncate">{currentDomain || fullDomain || "@"}</span>
                  <Button
                    onClick={() => copyDNSRecord(currentDomain || fullDomain || "@")}
                    size="sm"
                    variant="ghost"
                    className="p-1 h-6 w-6 hover:bg-slate-600"
                  >
                    <Copy size={12} />
                  </Button>
                </div>
                <div className="bg-slate-700 rounded px-3 py-2 text-white font-mono text-sm flex items-center gap-2">
                  <span>185.158.133.1</span>
                  <Button
                    onClick={() => copyDNSRecord("185.158.133.1")}
                    size="sm"
                    variant="ghost"
                    className="p-1 h-6 w-6 hover:bg-slate-600"
                  >
                    <Copy size={12} />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-slate-400 space-y-1">
              <p>• היכנס לפאנל הניהול של הדומיין שלך</p>
              <p>• הוסף רשומת A עם השם "{currentDomain || fullDomain || "הדומיין שלך"}" המצביעה לכתובת 185.158.133.1</p>
              <p>• השינוי עשוי לקחת עד 48 שעות להפצה מלאה</p>
              <p>• לאחר הגדרת ה-DNS, כל הדפים שלך יהיו זמינים תחת הדומיין החדש</p>
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400">
              <Globe className="w-5 h-5" />
              <span className="font-semibold">הדומיין מוכן לשימוש</span>
            </div>
            <p className="text-sm text-green-300 mt-2">
              לאחר הגדרת רשומת ה-DNS בספק הדומיין שלך, כל הדפים המפורסמים יהיו זמינים 
              תחת הדומיין המותאם אישית שלך תוך מספר שעות.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
