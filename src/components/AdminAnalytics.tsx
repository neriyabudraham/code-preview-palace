
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Users, Globe, FileText, TrendingUp } from "lucide-react";

interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  totalPublishedPages: number;
  totalPageVisits: number;
  recentVisits: Array<{
    slug: string;
    title: string | null;
    visits: number;
  }>;
}

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalProjects: 0,
    totalPublishedPages: 0,
    totalPageVisits: 0,
    recentVisits: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get total users from profiles table
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total projects
      const { count: projectsCount } = await supabase
        .from('user_projects')
        .select('*', { count: 'exact', head: true });

      // Get total published pages
      const { count: publishedCount } = await supabase
        .from('published_pages')
        .select('*', { count: 'exact', head: true });

      // Get total page visits
      const { count: visitsCount } = await supabase
        .from('page_visits')
        .select('*', { count: 'exact', head: true });

      // Get recent popular pages
      const { data: recentVisits } = await supabase
        .from('page_visits')
        .select(`
          slug,
          published_pages!inner(title)
        `)
        .order('visited_at', { ascending: false })
        .limit(100);

      // Process recent visits to group by slug
      const visitCounts: { [key: string]: { slug: string; title: string | null; visits: number } } = {};
      
      recentVisits?.forEach((visit) => {
        const slug = visit.slug;
        if (visitCounts[slug]) {
          visitCounts[slug].visits++;
        } else {
          visitCounts[slug] = {
            slug,
            title: (visit.published_pages as any)?.title || null,
            visits: 1
          };
        }
      });

      const topVisits = Object.values(visitCounts)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);

      setAnalytics({
        totalUsers: usersCount || 0,
        totalProjects: projectsCount || 0,
        totalPublishedPages: publishedCount || 0,
        totalPageVisits: visitsCount || 0,
        recentVisits: topVisits
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת נתוני האנליטיקה",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-gray-400 text-sm font-medium">משתמשים רשומים</p>
                <p className="text-2xl font-bold text-white">{analytics.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-gray-400 text-sm font-medium">פרויקטים</p>
                <p className="text-2xl font-bold text-white">{analytics.totalProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Globe className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-gray-400 text-sm font-medium">דפים מפורסמים</p>
                <p className="text-2xl font-bold text-white">{analytics.totalPublishedPages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-gray-400 text-sm font-medium">סה"כ ביקורים</p>
                <p className="text-2xl font-bold text-white">{analytics.totalPageVisits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            דפים פופולריים
          </CardTitle>
          <CardDescription className="text-gray-400">
            הדפים הנפוצים ביותר לפי מספר הביקורים
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recentVisits.length > 0 ? (
            <div className="space-y-4">
              {analytics.recentVisits.map((visit, index) => (
                <div key={visit.slug} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div>
                    <p className="text-white font-medium">
                      {visit.title || visit.slug}
                    </p>
                    <p className="text-gray-400 text-sm">/{visit.slug}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{visit.visits}</p>
                    <p className="text-gray-400 text-sm">ביקורים</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              אין נתוני ביקורים עדיין
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
