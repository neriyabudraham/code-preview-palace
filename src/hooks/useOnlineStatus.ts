
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useOnlineStatus() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const updateOnlineStatus = async (isOnline: boolean = true) => {
      try {
        await supabase
          .from('user_online_status')
          .upsert({
            user_id: user.id,
            is_online: isOnline,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    // Set user as online immediately
    updateOnlineStatus(true);

    // Update status every 30 seconds while active
    intervalRef.current = setInterval(() => {
      updateOnlineStatus(true);
    }, 30000);

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(true);
      } else {
        updateOnlineStatus(false);
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set user as offline when component unmounts
      updateOnlineStatus(false);
    };
  }, [user]);

  return null;
}
