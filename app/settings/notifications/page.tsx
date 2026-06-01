'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ShoppingBag, Truck, Tag, PackageCheck, MessageSquare, Mail } from 'lucide-react';

export default function NotificationsSettingsPage() {
    const [settings, setSettings] = useState([
        { id: 'order', icon: ShoppingBag, label: 'Захиалгын мэдэгдэл', enabled: true },
        { id: 'delivery', icon: Truck, label: 'Хүргэлтийн мэдэгдэл', enabled: true },
        { id: 'promo', icon: Tag, label: 'Урамшуулал & Хямдрал', enabled: true },
        { id: 'stock', icon: PackageCheck, label: 'Бараа ирсэн мэдэгдэл', enabled: false },
        { id: 'chat', icon: MessageSquare, label: 'Чат мэдэгдэл', enabled: true },
        { id: 'email', icon: Mail, label: 'И-мэйл мэдэгдэл', enabled: false },
    ]);

    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        fetch('/api/notifications/preferences')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load preferences');
                return res.json();
            })
            .then((data) => {
                if (!active) return;
                if (data.prefs) {
                    setSettings((prev) =>
                        prev.map((s) => ({
                            ...s,
                            enabled: data.prefs[s.id as keyof typeof data.prefs] ?? s.enabled,
                        }))
                    );
                }
            })
            .catch((err) => {
                console.error('Error fetching settings:', err);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const toggleSetting = async (id: string, currentEnabled: boolean) => {
        if (updatingId) return; // Prevent concurrent requests
        setUpdatingId(id);

        const updatedPrefs = settings.reduce((acc, curr) => {
            acc[curr.id] = curr.id === id ? !currentEnabled : curr.enabled;
            return acc;
        }, {} as Record<string, boolean>);

        try {
            const res = await fetch('/api/notifications/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prefs: updatedPrefs }),
            });

            if (!res.ok) throw new Error('Failed to save settings');

            const data = await res.json();
            if (data.prefs) {
                setSettings((prev) =>
                    prev.map((s) => ({
                        ...s,
                        enabled: data.prefs[s.id] ?? s.enabled,
                    }))
                );

                setToast('Хадгалагдлаа');
                setTimeout(() => setToast(null), 2500);
            }
        } catch (err) {
            console.error('Failed to update preference:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F5] font-sans">
                {/* Header */}
                <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
                    <Link href="/profile" className="p-2 -ml-2 text-[#1A1A1A]">
                        <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                    </Link>
                    <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
                        Мэдэгдэл
                    </h1>
                </div>
                <div className="p-4 mt-2 flex flex-col items-center justify-center min-h-[300px] gap-3">
                    <div className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[14px] text-gray-500 font-medium">Уншиж байна...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F5] font-sans pb-10">
            {/* Header */}
            <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
                <Link href="/profile" className="p-2 -ml-2 text-[#1A1A1A]">
                    <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                </Link>
                <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
                    Мэдэгдэл
                </h1>
            </div>

            <div className="p-4 mt-2">
                <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                    {settings.map((item, index) => (
                        <div
                            key={item.id}
                            className={`flex items-center justify-between px-4 h-[64px] ${index !== settings.length - 1 ? 'border-b border-[#F5F5F5]' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-[40px] h-[40px] rounded-[10px] flex items-center justify-center ${item.enabled ? 'bg-orange-50' : 'bg-gray-50'}`}>
                                    <item.icon className="w-5 h-5" style={{ color: item.enabled ? '#FF6B00' : '#999999' }} strokeWidth={1.5} />
                                </div>
                                <span className="text-[15px] font-bold text-[#1A1A1A]">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {updatingId === item.id && (
                                    <div className="w-4 h-4 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                                )}
                                <button
                                    disabled={updatingId !== null}
                                    onClick={() => toggleSetting(item.id, item.enabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${item.enabled ? 'bg-[#FF6B00]' : 'bg-[#E5E5E5]'} ${updatingId !== null ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="px-4 mt-4 text-[13px] text-[#999999] leading-relaxed">
                    Мэдэгдлийн тохиргоог асааснаар танд хэрэгтэй мэдээллүүдийг цаг алдалгүй хүлээн авах боломжтой болно.
                </p>
            </div>

            {/* Success Toast */}
            {toast && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '40px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#1C1C1E',
                        color: '#FFF',
                        padding: '12px 24px',
                        borderRadius: '9999px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        zIndex: 9999,
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                    {toast}
                </div>
            )}
        </div>
    );
}