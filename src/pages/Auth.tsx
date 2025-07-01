
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  if (user && !loading) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
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
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700/50">
              <TabsTrigger value="signin" className="text-white data-[state=active]:bg-blue-600">
                <LogIn className="w-4 h-4 mr-2" />
                התחברות
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-white data-[state=active]:bg-purple-600">
                <UserPlus className="w-4 h-4 mr-2" />
                הרשמה
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
