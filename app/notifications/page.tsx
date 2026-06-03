'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell } from 'lucide-react';
import { useUser } from '@/context/AuthContext';

type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
};

export default function NotificationsPage() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    fetchAll();
  }, [isSignedIn, fetchAll, router]);

  const markRead = async (id: string, link?: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    }).catch(console.error);
    if (link) router.push(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white h-[56px] flex items-center px-4 shadow-sm sticky top-0 z-50">
        <Link href="/" className="p-2 -ml-2 text-[#1A1A1A]">
          <ChevronLeft className="w-6 h-6" strokeWidth={2} />
        </Link>
        <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">Мэдэгдэл</h1>
      </div>

      <div className="p-4 mt-2 flex flex-col gap-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-[#FF5000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Bell className="w-10 h-10 text-gray-300" />
            <p className="text-gray-400 text-[14px]">Мэдэгдэл байхгүй байна</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button key={n.id} onClick={() => markRead(n.id, n.link)}
              className={`w-full text-left p-4 rounded-[16px] transition-all ${!n.isRead ? 'bg-[#FF5000]/[0.06] border border-[#FF5000]/10' : 'bg-white border border-transparent'}`}>
              <h4 className="font-bold text-[15px] text-[#111]">{n.title}</h4>
              <p className="text-[13px] text-gray-500 mt-1">{n.message}</p>
              <span className="text-[11px] text-gray-400 mt-1 block">
                {new Date(n.createdAt).toLocaleString('mn-MN')}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}