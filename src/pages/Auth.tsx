import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Navigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, LogIn, UserPlus, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const { user, signIn, signUp, resetPassword, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("signin");
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Check if this is a password reset redirect
  useEffect(() => {
    const mode = searchParams.get('mode');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (mode === 'reset' && accessToken && refreshToken) {
      // User clicked reset link in email
      setShowResetForm(true);
    }
  }, [searchParams]);

  // Redirect if already logged in
  if (user && !loading && !showResetForm) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "שגיאת התחברות",
            description: "אימייל או סיסמה שגויים",
            variant: "destructive"
          });
        } else {
          toast({
            title: "שגיאה",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "התחברת בהצלחה!",
          description: "ברוך הבא בחזרה",
        });
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהתחברות",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast({
        title: "שגיאה",
        description: "הסיסמאות אינן תואמות",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: "שגיאה",
        description: "הסיסמה חייבת להכיל לפחות 6 תווים",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "שגיאה",
            description: "משתמש עם אימייל זה כבר קיים במערכת",
            variant: "destructive"
          });
        } else {
          toast({
            title: "שגיאה",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "נרשמת בהצלחה!",
          description: "בדוק את האימייל שלך לאישור החשבון",
        });
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהרשמה",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        toast({
          title: "שגיאה",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "נשלח מייל איפוס!",
          description: "בדוק את האימייל שלך לקישור איפוס הסיסמה",
        });
        setActiveTab("signin");
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשליחת מייל האיפוס",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      toast({
        title: "שגיאה",
        description: "הסיסמאות אינן תואמות",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "שגיאה",
        description: "הסיסמה חייבת להכיל לפחות 6 תווים",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "שגיאה",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "הסיסמה עודכנה!",
          description: "הסיסמה שלך עודכנה בהצלחה",
        });
        setShowResetForm(false);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון הסיסמה",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading && !showResetForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (showResetForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              איפוס סיסמה
            </CardTitle>
            <CardDescription className="text-gray-400">
              הזן את הסיסמה החדשה שלך
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium text-gray-300">
                  סיסמה חדשה
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="new-password"
                    type="password"
                    required
                    placeholder="לפחות 6 תווים"
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirm-new-password" className="text-sm font-medium text-gray-300">
                  אישור סיסמה
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-new-password"
                    type="password"
                    required
                    placeholder="אישור סיסמה חדשה"
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                disabled={isLoading}
              >
                {isLoading ? "מעדכן..." : "עדכן סיסמה"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            HTML Editor Pro
          </CardTitle>
          <CardDescription className="text-gray-400">
            התחבר או הירשם כדי להמשיך
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-700/50">
              <TabsTrigger value="signin" className="text-white data-[state=active]:bg-blue-600">
                <LogIn className="w-4 h-4 mr-2" />
                התחברות
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-white data-[state=active]:bg-purple-600">
                <UserPlus className="w-4 h-4 mr-2" />
                הרשמה
              </TabsTrigger>
              <TabsTrigger value="reset" className="text-white data-[state=active]:bg-orange-600">
                <RotateCcw className="w-4 h-4 mr-2" />
                איפוס סיסמה
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signin-email" className="text-sm font-medium text-gray-300">
                    אימייל
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      required
                      placeholder="your@email.com"
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="signin-password" className="text-sm font-medium text-gray-300">
                    סיסמה
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      required
                      placeholder="סיסמה"
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  disabled={isLoading}
                >
                  {isLoading ? "מתחבר..." : "התחבר"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm font-medium text-gray-300">
                    אימייל
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      required
                      placeholder="your@email.com"
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-sm font-medium text-gray-300">
                    סיסמה
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      placeholder="לפחות 6 תווים"
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-gray-300">
                    אישור סיסמה
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      required
                      placeholder="אישור סיסמה"
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  disabled={isLoading}
                >
                  {isLoading ? "נרשם..." : "הירשם"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="reset">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="text-sm font-medium text-gray-300">
                    אימייל
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      required
                      placeholder="your@email.com"
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
                  disabled={isLoading}
                >
                  {isLoading ? "שולח..." : "שלח מייל איפוס"}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  נשלח לך קישור לאיפוס הסיסמה לאימייל שלך
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
