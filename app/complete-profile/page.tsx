'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, Loader2, Lock, User, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function CompleteProfilePage() {
    const { user, isAuthenticated, isLoading: authLoading, login } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({ name: '', phone: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Pre-fill name from Google account
    useEffect(() => {
        if (user?.name) {
            setFormData(prev => ({ ...prev, name: user.name || '' }));
        }
    }, [user]);

    // If not authenticated, redirect to sign-in
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/sign-in');
        }
    }, [authLoading, isAuthenticated, router]);

    // If user already has phone and password set, redirect to home
    useEffect(() => {
        if (!authLoading && user?.phone) {
            router.push('/');
        }
    }, [authLoading, user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.phone || !formData.password) {
            toast.error('Бүх талбарыг бөглөнө үү');
            return;
        }

        if (formData.phone.length < 8) {
            toast.error('Утасны дугаар буруу байна');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/complete-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Алдаа гарлаа');
            }

            toast.success('Бүртгэл амжилттай!');
            if (data.user) {
                login(data.user, data.token);
            }
            router.push('/');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
                <div className="w-8 h-8 border-4 border-[#F57E20] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col justify-start items-center bg-[#F5F5F7] p-4 pt-16 md:pt-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', duration: 0.6 }}
                            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#F57E20] to-[#e66d00] mb-4 shadow-lg shadow-orange-500/20"
                        >
                            <Sparkles className="w-7 h-7 text-white" />
                        </motion.div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2">
                            Мэдээллээ бөглөнө үү
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Утасны дугаар болон нууц үгээ тохируулна уу
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">
                                Нэр
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#F57E20] transition-colors" />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Таны нэр"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#F57E20]/20 focus:border-[#F57E20] outline-none transition-all font-medium text-slate-900 text-base"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">
                                Утасны дугаар
                            </label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#F57E20] transition-colors" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="85552229"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#F57E20]/20 focus:border-[#F57E20] outline-none transition-all font-medium text-slate-900 text-base"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">
                                Нууц үг
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#F57E20] transition-colors" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#F57E20]/20 focus:border-[#F57E20] outline-none transition-all font-medium text-slate-900 text-base"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-[#F57E20] hover:bg-[#e66d00] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Үргэлжлүүлэх
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
