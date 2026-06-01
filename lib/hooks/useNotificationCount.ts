import { useState, useEffect, useCallback } from 'react';

export function useNotificationCount(userId?: string) {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchCount = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications?userId=${userId}&countOnly=true`);
      const data = await res.json();
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('[useNotificationCount] Failed to fetch count:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch on mount
    fetchCount();

    // Poll every 60 seconds
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [userId, fetchCount]);

  return { unreadCount, setUnreadCount, fetchCount };
}