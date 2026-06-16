'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, Loader2, Lock, User, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import SocialAuthButtons from '@/components/SocialAuthButtons';

export default function SignUpPage() {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        age: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.phone || !formData.age || !formData.password) {
            toast.error('Бүх талбарыг бөглөнө үү');
            return;
        }

        if (formData.phone.length < 8) {
            toast.error('Утасны дугаар буруу байна');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Бүртгэл үүсгэхэд алдаа гарлаа');
            }

            toast.success('Бүртгэл амжилттай үүслээ');

            // Auto-login if user data returned
            if (data.user) {
                login(data.user, data.token);
                router.push('/');
            } else {
                router.push('/sign-in');
            }
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Бүртгүүлэх</h1>
                    <p className="text-slate-500 text-sm">Шинэ хэрэглэгч үүсгэх</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">Нэр</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#F57E20] transition-colors" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Таны нэр"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#F57E20]/20 focus:border-[#F57E20] outline-none transition-all font-medium text-slate-900 text-base"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">Утас</label>
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

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">Нас</label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#F57E20] transition-colors" />
                            <input
                                type="number"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                placeholder="25"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#F57E20]/20 focus:border-[#F57E20] outline-none transition-all font-medium text-slate-900 text-base"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">Нууц үг</label>
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

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-[#F57E20] hover:bg-[#e66d00] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Бүртгүүлэх
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <SocialAuthButtons mode="signUp" />

                <p className="text-center text-xs text-slate-400 mt-6">
                    Аль хэдийн бүртгэлтэй юу? <Link href="/sign-in" className="text-[#F57E20] font-bold hover:underline">Нэвтрэх</Link>
                </p>
            </div>
        </div>
    );
}
