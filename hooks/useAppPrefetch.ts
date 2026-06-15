'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { TAB_ROUTES, warmAppCache } from '@/lib/warmCache';

/** Prefetch tab routes + warm API cache on native for instant navigation. */
export function useAppPrefetch() {
  const router = useRouter();

  useEffect(() => {
    TAB_ROUTES.forEach((route) => router.prefetch(route));

    if (Capacitor.isNativePlatform()) {
      warmAppCache();
      const retry = setTimeout(warmAppCache, 3000);
      return () => clearTimeout(retry);
    }
  }, [router]);
}
