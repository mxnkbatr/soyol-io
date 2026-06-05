'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    BarChart3, Package, Layers, ShoppingCart, MessageCircle,
    ArrowLeft, Menu, X, Building2, LogOut, Image as ImageIcon, TrendingUp, Users, Video
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();

    // Fetch pending orders
    const { data: pendingData } = useSWR(
        '/api/admin/orders?status=pending',
        fetcher,
        { refreshInterval: 30000 }
    );
    const pendingCount = pendingData?.orders?.length || 0;

    // Fetch unread messages
    const { data: messagesData } = useSWR(
        '/api/messages/unread', // Assuming this endpoint exists, or filter from all
        fetcher,
        { refreshInterval: 30000 }
    );
    const unreadMessagesCount = messagesData?.count || 0;

    const navItems = [
        { href: '/admin', icon: BarChart3, label: 'Хяналтын самбар', shortcut: null },
        { href: '/admin/analytics', icon: TrendingUp, label: 'Орлогын тайлан', shortcut: null },
        { href: '/admin/users', icon: Users, label: 'Хэрэглэгчид', shortcut: null },
        { href: '/admin/products', icon: Package, label: 'Бүтээгдэхүүн', shortcut: 'G + P' },
        { href: '/admin/banners', icon: ImageIcon, label: 'Беннер удирдлага', shortcut: 'G + B' },
        { href: '/admin/orders', icon: ShoppingCart, label: 'Захиалгууд', badge: pendingCount, badgeColor: 'bg-red-500', shortcut: 'G + O' },
        { href: '/admin/categories', icon: Layers, label: 'Ангилал', shortcut: null },
        { href: '/admin/messages', icon: MessageCircle, label: 'Мессеж', badge: unreadMessagesCount, badgeColor: 'bg-blue-500', shortcut: 'G + M' },
        { href: '/admin/video', icon: Video, label: 'Видео дуудлага', shortcut: null },
    ];

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname === href || pathname.startsWith(href + '/');
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/sign-in');
        } catch {
            toast.error('Гарахад алдаа гарлаа');
        }
    };

    const SidebarContent = () => (
        <div className="h-full flex flex-col p-6">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <span className="text-white font-black text-xl">S</span>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white leading-none">Soyol</h2>
                    <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</p>
                    </div>
                </div>
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-hide">
                {navItems.map(({ href, icon: Icon, label, badge, badgeColor, shortcut }) => {
                    const active = isActive(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setSidebarOpen(false)}
                            className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all ${active
                                ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 shadow-lg shadow-amber-500/5'
                                : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="text-sm font-bold">{label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {shortcut && (
                                    <span className="text-[9px] font-mono text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
                                        {shortcut}
                                    </span>
                                )}
                                {!!badge && badge > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${badgeColor}`}>
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom - Profile & Back link */}
            <div className="pt-6 border-t border-white/5 mt-4 space-y-2">
                <Link
                    href="/"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold">Сайт руу буцах</span>
                </Link>

                {/* Admin Profile Details */}
                <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        <span className="text-amber-500 font-bold text-sm">
                            {user?.name?.[0]?.toUpperCase() || 'A'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{user?.name || 'Админ'}</p>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Администратор</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Системээс гарах"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-slate-950 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <SidebarContent />
            </aside>

            {/* Mobile Bottom Tab Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800/80 flex items-center justify-around px-2 py-1.5 lg:hidden pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-2 shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
                {[
                    { href: '/admin', icon: BarChart3, label: 'Хяналт' },
                    { href: '/admin/orders', icon: ShoppingCart, label: 'Захиалга', badge: pendingCount, badgeColor: 'bg-red-500' },
                    { href: '/admin/products', icon: Package, label: 'Бараа' },
                    { href: '/admin/video', icon: Video, label: 'Видео' },
                ].map((tab) => {
                    const active = isActive(tab.href);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-all ${
                                active ? 'text-amber-500' : 'text-slate-400 active:text-slate-200'
                            }`}
                        >
                            <div className="relative">
                                <Icon className="w-5 h-5" />
                                {!!tab.badge && tab.badge > 0 && (
                                    <span className={`absolute -top-1.5 -right-2.5 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white ${tab.badgeColor || 'bg-amber-500'} scale-90`}>
                                        {tab.badge > 99 ? '99+' : tab.badge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-bold mt-1 tracking-tight">{tab.label}</span>
                        </Link>
                    );
                })}
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-white active:text-slate-200 transition-all"
                >
                    <Menu className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-1 tracking-tight">Цэс</span>
                </button>
            </nav>
        </>
    );
}
