'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminKeyboardShortcuts from '@/components/admin/AdminKeyboardShortcuts';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }
    if (!isAdmin) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, isAdmin, router]);

  if (!isLoaded || !isSignedIn || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminSidebar />
      <AdminKeyboardShortcuts />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {children}
      </div>
    </div>
  );
}
