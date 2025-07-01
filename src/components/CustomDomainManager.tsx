
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Globe, Copy, ExternalLink, Unlink, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LOVABLE_API_BASE_URL = "https://lovable-api.com/projects/79412567-53d1-4138-833e-28b721f67338/domains";
const LOVABLE_AUTH_TOKEN_URL = "https://lovable-api.com/projects/79412567-53d1-4138-833e-28b721f67338/auth-token";
const LOVABLE_API_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NzQ4NTAwMmYwNWJlMDI2N2VmNDU5ZjViNTEzNTMzYjVjNThjMTIiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoi16DXqNeZ15Qg15DXkdeV15PXqNeU150iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS0RCaG1xcWp4S3ByMC1NOVR3OUhxcVFLRzY2QkVFQ3NMa1UxMzVveVdkaTJxUkVvYz1zOTYtYyIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJzb3VyY2Vfc2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20iLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZ3B0LWVuZ2luZWVyLTM5MDYwNyIsImF1ZCI6ImdwdC1lbmdpbmVlci0zOTA2MDciLCJhdXRoX3RpbWUiOjE3NTEyNjYyNDUsInVzZXJfaWQiOiJPZG51NFg1R1h6VkhpemloZTV1clNROWhBTnMxIiwic3ViIjoiT2RudTRYNUdYelZIaXppaGU1dXJTUTloQU5zMSIsImlhdCI6MTc1MTM5OTM3MiwiZXhwIjoxNzUxNDAyOTcyLCJlbWFpbCI6Im9mZmljZUBuZXJpeWFidWRyYWhhbS5jby5pbCIsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMDY0NzQzODA1MDU0OTk4MjIzMTYiXSwiZW1haWwiOlsib2ZmaWNlQG5lcml5YWJ1ZHJhaGFtLmNvLmlsIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiY3VzdG9tIn19.2VlRA_xujWeYCpLM_agOypp1IuurhX-8FWBAmdjXZDn8rW4c114G-Ghxx5B6TzpE3d5lyTZKXGTYQx6A_hDtF6Q7zwItqAuDfkn8C6Ci1u5HHBROEnt9Yuy39cyuB1Mi_GgNHAgJCMSOTLoDC1nBGTuPW_zU5O2UGjhobqED_zFMCxlMi6Pdm04DCaKtTuvHhmzfq5BG46ZzMoCBe69RuLFuPYmi5nWiWqhSXcjmxaGX2CG2ZwEMiuPXiAq0gYXblRUa5I95InmEHO-ksR9JKJ2GbSeDsUGtZKWMDxKYkpdLtncdpWsd_GeLYQIQWYkGPpdxqEV-5PVFuO5Tvb8p-Q";

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
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('custom_domain, domain_verified')
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

  const getAuthToken = async () => {
    try {
      console.log('Getting fresh auth token from Lovable API');
      
      const response = await fetch(LOVABLE_AUTH_TOKEN_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Origin': 'https://lovable.dev',
          'Referer': 'https://lovable.dev/'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to get auth token:', response.status, errorText);
        throw new Error(`Failed to get auth token: ${response.status}`);
      }

      const result = await response.json();
      console.log('Got fresh auth token:', result);
      return result.token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  };

  const addDomainToLovableAPI = async (domainToAdd: string) => {
    try {
      console.log('Adding domain to Lovable API:', domainToAdd);
      
      // Get fresh auth token first
      const authToken = await getAuthToken();
      
      const response = await fetch(LOVABLE_API_BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: domainToAdd
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to add domain to Lovable API:', response.status, errorText);
        throw new Error(`Failed to add domain: ${response.status}`);
      }

      const result = await response.json();
      console.log('Domain added to Lovable API successfully:', result);
      return result;
    } catch (error) {
      console.error('Error adding domain to Lovable API:', error);
      throw error;
    }
  };

  const checkDomainInLovableAPI = async (domainToCheck: string) => {
    try {
      console.log('Checking domain in Lovable API:', domainToCheck);
      
      // Get fresh auth token first
      const authToken = await getAuthToken();
      
      const response = await fetch(LOVABLE_API_BASE_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to check domains in Lovable API:', response.status, errorText);
        throw new Error(`Failed to check domains: ${response.status}`);
      }

      const domains = await response.json();
      console.log('Domains from Lovable API:', domains);

      // Check if the domain exists and is active
      const domainEntry = domains.find((d: any) => d.domain === domainToCheck);
      if (domainEntry && domainEntry.status === 'active') {
        console.log('Domain is verified and active:', domainEntry);
        return true;
      } else {
        console.log('Domain not found or not active:', domainEntry);
        return false;
      }
    } catch (error) {
      console.error('Error checking domain in Lovable API:', error);
      throw error;
    }
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
      
      // First, add the domain to Lovable API
      await addDomainToLovableAPI(fullDomain);
      
      // Then check if it's verified
      const isVerified = await checkDomainInLovableAPI(fullDomain);
      
      // Use upsert to either insert or update the profile record
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          custom_domain: fullDomain,
          domain_verified: isVerified,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Supabase error saving domain:', error);
        throw error;
      }

      setCurrentDomain(fullDomain);
      setIsDomainVerified(isVerified);

      toast({
        title: "נשמר בהצלחה!",
        description: isVerified 
          ? "הדומיין המותאם אישית נשמר ומאומת! הוא מוכן לשימוש."
          : "הדומיין המותאם אישית נשמר. יש להגדיר את רשומת ה-DNS כדי להשלים את ההגדרה",
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
      // Check domain status via Lovable API
      const isVerified = await checkDomainInLovableAPI(fullDomain);
      
      // Update the database with the verification status
      const { error } = await supabase
        .from('profiles')
        .update({
          domain_verified: isVerified,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .eq('custom_domain', fullDomain);

      if (error) {
        console.error('Error updating domain verification status:', error);
        throw error;
      }

      setIsDomainVerified(isVerified);
      
      toast({
        title: isVerified ? "דומיין מאומת!" : "דומיין לא מאומת",
        description: isVerified 
          ? "הדומיין שלך מוגדר בהצלחה ופועל" 
          : "הדומיין עדיין לא מאומת. אנא וודא שהגדרת את רשומת ה-DNS",
        variant: isVerified ? "default" : "destructive"
      });
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
      
      const { error } = await supabase
        .from('profiles')
        .update({
          custom_domain: null,
          domain_verified: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error disconnecting domain:', error);
        throw error;
      }

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
                {isLoading ? "שומר ובודק..." : "שמור דומיין"}
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

            {isDomainVerified && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">הדומיין מאומת ופעיל!</span>
                </div>
                <p className="text-sm text-green-300 mt-2">
                  הדומיין שלך מוגדר בהצלחה. כל הדפים שתפרסם יהיו זמינים בדומיין המותאם שלך.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
