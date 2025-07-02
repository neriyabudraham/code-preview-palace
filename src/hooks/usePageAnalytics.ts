
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VisitStats {
  totalVisits: number;
  last30DaysVisits: number;
  isLoading: boolean;
  error: string | null;
}

export const usePageAnalytics = (publishedPageId?: string): VisitStats => {
  const [stats, setStats] = useState<VisitStats>({
    totalVisits: 0,
    last30DaysVisits: 0,
    isLoading: true,
    error: null
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !publishedPageId) {
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, isLoading: true, error: null }));

        // Get total visits
        const { count: totalCount, error: totalError } = await supabase
          .from('page_visits')
          .select('*', { count: 'exact', head: true })
          .eq('published_page_id', publishedPageId);

        if (totalError) {
          throw totalError;
        }

        // Get visits from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: recentCount, error: recentError } = await supabase
          .from('page_visits')
          .select('*', { count: 'exact', head: true })
          .eq('published_page_id', publishedPageId)
          .gte('visited_at', thirtyDaysAgo.toISOString());

        if (recentError) {
          throw recentError;
        }

        setStats({
          totalVisits: totalCount || 0,
          last30DaysVisits: recentCount || 0,
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error('Error fetching page analytics:', error);
        setStats(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load analytics'
        }));
      }
    };

    fetchStats();
  }, [user, publishedPageId]);

  return stats;
};
