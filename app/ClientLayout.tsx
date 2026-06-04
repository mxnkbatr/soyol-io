'use client';

import { SWRConfig } from 'swr';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import FloatingChatButton from '@/components/FloatingChatButton';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import LuxuryNavbar from "@/components/LuxuryNavbar";
import Footer from "@/components/Footer";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { motion, AnimatePresence } from 'framer-motion';

const swrDefaults = {
  revalidateOnFocus: false,
  dedupingInterval: 120000,
  errorRetryCount: 2,
};

function PushInit() {
  usePushNotifications();
  return null;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Offline status banner logic
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Интернет холболт сэргэлээ", {
        icon: '📡',
        style: { borderRadius: '12px', background: '#1c1c1e', color: '#fff', fontWeight: '600' }
      });
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // iOS-style swipe-to-go-back gesture detection (Mobile Native & Touch WebView)
  useEffect(() => {
    if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && !('ontouchstart' in window)) return;

    let touchStartX = 0;
    let touchStartY = 0;
    const thresholdX = 80; // Swipe distance threshold to trigger back navigation
    const maxEdgeDistance = 35; // Touch must start within 35px of left edge
    const maxAngleDev = 30; // Max allowed vertical angle deviation (mostly horizontal swipe)

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const dx = endX - touchStartX;
      const dy = endY - touchStartY;

      if (
        touchStartX <= maxEdgeDistance &&
        dx > thresholdX &&
        Math.abs(dy) < Math.abs(dx) * Math.tan((maxAngleDev * Math.PI) / 180)
      ) {
        import('@capacitor/haptics').then((m) => {
          m.Haptics.impact({ style: 'light' as any }).catch(() => {});
        }).catch(() => {});
        window.history.back();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    document.documentElement.classList.add('cap-native');
    return () => {
      document.documentElement.classList.remove('cap-native');
    };
  }, []);

  // Hide native splash screen once the web UI is ready
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        // give the first paint a moment on slow devices
        setTimeout(() => {
          if (!cancelled) SplashScreen.hide().catch(() => {});
        }, 600);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Add subtle "native feel" haptics on taps
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let Haptics: any = null;
    import('@capacitor/haptics')
      .then((m) => {
        Haptics = m.Haptics;
      })
      .catch(() => {});

    const handler = (e: Event) => {
      if (!Haptics) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const el = target.closest?.('button,a,[role="button"],[data-haptic]');
      if (!el) return;
      // avoid haptics for disabled buttons
      if ((el as HTMLButtonElement).disabled) return;

      Haptics.impact({ style: 'medium' }).catch(() => {});
    };

    // capturing makes it feel instant
    window.addEventListener('pointerup', handler, { capture: true });
    return () => window.removeEventListener('pointerup', handler, { capture: true } as any);
  }, []);

  const isAdminRoute = !!pathname && pathname.startsWith("/admin");
  const isSupportPage = pathname === '/support';

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <SWRConfig value={swrDefaults}>
        <LanguageProvider>
          <AuthProvider>
            <PushInit />
            <ErrorBoundary>
              <AnimatePresence>
                {isOffline && (
                  <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-[#FF3B30] text-white px-4 py-2.5 text-center text-[11px] font-bold shadow-md flex items-center justify-center gap-2"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    Интернет холболт тасарлаа. Холболтоо шалгана уу!
                  </motion.div>
                )}
              </AnimatePresence>

              {!isAdminRoute && !isSupportPage && <LuxuryNavbar />}
              <main className={isAdminRoute 
                ? "min-h-screen relative z-0 cap-admin-fullscreen" 
                : isSupportPage
                ? "min-h-screen relative z-0"
                : "min-h-screen relative z-0 mobile-nav-pb"
              }>
                {children}
              </main>
              {!isAdminRoute && !isSupportPage && <Footer />}
              <FloatingChatButton />
              <Toaster position="top-right" reverseOrder={false} />
            </ErrorBoundary>
          </AuthProvider>
        </LanguageProvider>
      </SWRConfig>
    </GoogleOAuthProvider>
  );
}
