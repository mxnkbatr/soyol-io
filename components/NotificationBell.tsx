'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { useUser } from '@/context/AuthContext';
import { useNotificationCount } from '@/lib/hooks/useNotificationCount';

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
};

export default function NotificationBell() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  
  // Custom unread count hook
  const { unreadCount, setUnreadCount } = useNotificationCount(user?.id);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);
  const displayList = notifications.slice(0, 5);

  const fetchNotifications = useCallback(async () => {
    if (!isSignedIn || !user?.id) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      // silent fail
    }
  }, [isSignedIn, user?.id]);

  const handleToggle = () => {
    setOpen((o) => !o);
  };

  // Only trigger full notifications loading when the panel is opened
  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));
    }
  }, [open, fetchNotifications]);

  const markAsRead = async (id: string, link?: string) => {
    // 1. Optimistic Update (instantly mark read in local state and close panel)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev: number) => Math.max(0, prev - 1));
    setOpen(false);

    // 2. Perform PATCH request in background
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }

    // 3. Client-side navigation if a valid link exists
    if (link && typeof link === 'string' && link.trim() !== '') {
      router.push(link);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9998,
    background: 'transparent',
  };

  /* ── Signed-out state ── */
  if (!isSignedIn) {
    return (
      <div className="relative" ref={bellRef}>
        <motion.button
          type="button"
          onClick={handleToggle}
          whileHover={{ scale: 1.15, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-1.5 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer"
          aria-label="Мэдэгдэл"
        >
          <Bell className="w-6 h-6 text-[#1C1C1E] group-hover:text-[#FF5000] transition-colors" strokeWidth={1.8} />
        </motion.button>

        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <div style={backdropStyle} onClick={() => setOpen(false)} />

              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute right-[-44px] sm:right-[-90px] top-full mt-3 w-[calc(100vw-32px)] sm:w-[380px] max-w-[400px] z-[100] bg-white sm:bg-white/95 sm:backdrop-blur-3xl rounded-[24px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] border border-[#E5E5EA] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-[#1C1C1E] text-[20px] tracking-tight">Мэдэгдэл</span>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-[30px] h-[30px] rounded-full bg-[#F2F2F7] flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600 active:scale-95"
                  >
                    <X className="w-[18px] h-[18px]" strokeWidth={2.5} />
                  </button>
                </div>
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center">
                    <Bell className="w-5 h-5 text-gray-400" strokeWidth={2} />
                  </div>
                  <p className="text-[14px] font-medium text-gray-500 text-center px-4 leading-relaxed">
                    Дэлгэрэнгүй мэдэгдэл үзэхийн тулд нэвтэрнэ үү.
                  </p>
                </div>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="mt-2 block w-full text-center py-3.5 bg-[#FF5000] text-white text-[15px] font-bold rounded-full shadow-[0_4px_12px_rgba(255,80,0,0.25)] active:scale-[0.98] transition-all"
                >
                  Нэвтрэх
                </Link>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ── Signed-in state ── */
  return (
    <div className="relative" ref={bellRef}>
      <motion.button
        type="button"
        onClick={handleToggle}
        whileHover={{ scale: 1.15, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-1.5 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer"
        aria-label="Мэдэгдэл"
      >
        <Bell className="w-6 h-6 text-[#1C1C1E] group-hover:text-[#FF5000] transition-colors" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF3B30] text-[10px] font-bold text-white ring-2 ring-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div style={backdropStyle} onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-[-44px] sm:right-[-90px] top-full mt-3 w-[calc(100vw-32px)] sm:w-[380px] max-w-[400px] z-[100] bg-white sm:bg-white/95 sm:backdrop-blur-3xl rounded-[24px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] border border-[#E5E5EA] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#1C1C1E] text-[20px] tracking-tight">Мэдэгдэл</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[12px] text-[#FF5000] hover:text-[#e04600] font-semibold transition-colors cursor-pointer"
                    >
                      Бүгдийг унших
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-[30px] h-[30px] rounded-full bg-[#F2F2F7] flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600 active:scale-95"
                  aria-label="Хаах"
                >
                  <X className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[60vh] overflow-y-auto overscroll-contain pb-2">
                {loading ? (
                  <div className="p-10 flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-[#FF5000] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px] font-medium text-gray-400">Уншиж байна...</span>
                  </div>
                ) : displayList.length === 0 ? (
                  <div className="p-10 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center">
                      <Bell className="w-5 h-5 text-gray-300" strokeWidth={2} />
                    </div>
                    <span className="text-[14px] font-medium text-gray-400">Танд мэдэгдэл ирээгүй байна</span>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1.5 px-3">
                    {displayList.map((n, i) => {
                      const dateObj = new Date(n.createdAt);
                      const isToday = new Date().toDateString() === dateObj.toDateString();
                      const timeStr = dateObj.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
                      const displayDate = isToday ? timeStr : `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${timeStr}`;

                      return (
                        <li key={n.id ?? i}>
                          <button
                            type="button"
                            onClick={() => markAsRead(n.id, n.link)}
                            className={`w-full text-left p-3.5 rounded-[18px] active:scale-[0.98] transition-all flex items-start gap-3 ${!n.isRead
                              ? 'bg-[#FF5000]/[0.06] border border-[#FF5000]/10'
                              : 'bg-transparent border border-transparent hover:bg-[#F2F2F7]/60'
                              }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <h4 className={`text-[15px] font-bold tracking-tight leading-snug line-clamp-1 ${!n.isRead ? 'text-[#111]' : 'text-gray-800'}`}>
                                  {n.title}
                                </h4>
                                <span className={`text-[11px] font-semibold whitespace-nowrap pt-1 flex-shrink-0 ${!n.isRead ? 'text-[#FF5000]' : 'text-gray-400'}`}>
                                  {displayDate}
                                </span>
                              </div>
                              <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed tracking-tight pr-4">
                                {n.message}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {displayList.length > 0 && notifications.length > 5 && (
                  <div className="px-3 pt-2">
                    <Link
                      href="/notifications"
                      onClick={() => setOpen(false)}
                      className="block w-full text-center py-3 bg-[#F2F2F7] text-[#111] text-[14px] font-bold rounded-full active:scale-[0.98] transition-all hover:bg-[#E5E5EA]"
                    >
                      Бүгдийг харах
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}