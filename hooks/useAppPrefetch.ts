'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { TAB_ROUTES, warmAppCache } from '@/lib/warmCache';

/** Prefetch tab routes + warm API/image cache on native for instant navigation. */
export function useAppPrefetch() {
  const router = useRouter();

  useEffect(() => {
    TAB_ROUTES.forEach((route) => router.prefetch(route));

    const native = Capacitor.isNativePlatform();
    let cancelled = false;

    const runWarm = async (aggressive: boolean) => {
      await warmAppCache({ aggressive });
      if (!native || cancelled) return;
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch {
        // ignore
      }
    };

    if (native) {
      void runWarm(true);
      const retry = setTimeout(() => {
        void warmAppCache({ aggressive: true });
      }, 4000);
      return () => {
        cancelled = true;
        clearTimeout(retry);
      };
    }

    void warmAppCache();
    const retry = setTimeout(() => warmAppCache(), 2500);
    return () => clearTimeout(retry);
  }, [router]);
}
