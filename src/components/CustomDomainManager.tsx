
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Globe, Copy, ExternalLink, Unlink, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { query } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";

export const CustomDomainManager = () => {
  const [subdomain, setSubdomain] = useState("");
  const [domain, setDomain] = useState("");
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [isDomainVerified, setIsDomainVerified] = useState(false);
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
        const result = await query(
          'SELECT custom_domain, domain_verified FROM profiles WHERE id = $1',
          [user.id]
        );

        const profile = result.rows[0];

        if (profile) {
          setCurrentDomain(profile.custom_domain);
          setIsDomainVerified(profile.domain_verified || false);
          
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
      await query(`
        INSERT INTO profiles (id, email, custom_domain, domain_verified, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id)
        DO UPDATE SET 
          custom_domain = $3,
          domain_verified = $4,
          updated_at = $5
      `, [user.id, user.email, fullDomain, false, new Date().toISOString()]);

      setCurrentDomain(fullDomain);
      setIsDomainVerified(false);

      // Send webhook notification
      try {
        const response = await fetch('/api/supabase/functions/v1/domain-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            userId: user.id,
            domain: fullDomain,
            action: 'domain_added'
          })
        });
        console.log('Domain webhook sent successfully');
      } catch (webhookError) {
        console.error('Error sending domain webhook:', webhookError);
        // Don't fail the main operation if webhook fails
      }

      toast({
        title: "נשמר בהצלחה!",
        description: "הדומיין המותאם אישית נשמר. יש להגדיר את רשומת ה-DNS כדי להשלים את ההגדרה",
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

  const handleCheckDomain = async () => {
    const fullDomain = getFullDomain();
    if (!fullDomain || !user) {
      toast({
        title: "שגיאה",
        description: "יש להזין דומיין תקין ולהתחבר למערכת",
        variant: "destructive"
      });
      return;
    }

    setIsCheckingDomain(true);
    
    try {
      // For now, we'll just refresh the domain status from the database
      // In a real implementation, you'd check DNS records here
      const result = await query(
        'SELECT domain_verified FROM profiles WHERE id = $1 AND custom_domain = $2',
        [user.id, fullDomain]
      );

      const profile = result.rows[0];

      if (profile) {
        setIsDomainVerified(profile.domain_verified || false);
        toast({
          title: profile.domain_verified ? "דומיין מאומת!" : "דומיין לא מאומת",
          description: profile.domain_verified 
            ? "הדומיין שלך מוגדר בהצלחה ופועל" 
            : "הדומיין עדיין לא מאומת. אנא וודא שהגדרת את רשומת ה-DNS",
          variant: profile.domain_verified ? "default" : "destructive"
        });
      } else {
        toast({
          title: "הדומיין לא נמצא",
          description: "יש לשמור את הדומיין לפני בדיקתו",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error checking domain:', error);
      toast({
        title: "שגיאה בבדיקת הדומיין",
        description: "לא ניתן לבדוק את סטטוס הדומיין כרגע",
        variant: "destructive"
      });
    } finally {
      setIsCheckingDomain(false);
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
      
      await query(`
        UPDATE profiles 
        SET custom_domain = NULL, domain_verified = false, updated_at = $1 
        WHERE id = $2
      `, [new Date().toISOString(), user.id]);

      setCurrentDomain(null);
      setIsDomainVerified(false);
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

            <div className="flex gap-3">
              <Button
                onClick={handleSaveDomain}
                disabled={isLoading || !fullDomain}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isLoading ? "שומר..." : "שמור דומיין"}
              </Button>
              
              {currentDomain && (
                <Button
                  onClick={handleCheckDomain}
                  disabled={isCheckingDomain}
                  variant="outline"
                  className="border-green-600 text-green-400 hover:bg-green-900/20"
                >
                  <Search className="w-4 h-4 mr-1" />
                  {isCheckingDomain ? "בודק..." : "בדוק דומיין"}
                </Button>
              )}
            </div>
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
                    <span className="truncate">{currentDomain}</span>
                    <Button
                      onClick={() => copyDNSRecord(currentDomain)}
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
                  ניתן ללחוץ על "בדוק דומיין" כדי לבדוק את הסטטוס.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
