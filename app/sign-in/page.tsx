'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, ArrowRight, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import SocialAuthButtons from '@/components/SocialAuthButtons';

function SignInContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_url') || '/';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 8 || !password) {
      toast.error('Бүх талбарыг бөглөнө үү');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Нэвтрэх мэдээлэл буруу байна');
      }

      toast.success('Амжилттай нэвтэрлээ');

      // Update Auth Context immediately
      if (data.user) {
        login(data.user);
      }

      router.push(redirectTo);
      router.refresh();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-start items-center bg-[#F5F5F7] p-4 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] md:pt-24">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Нэвтрэх</h1>
          <p className="text-slate-500 text-sm">
            {mode === 'password' ? 'Нууц үгээр нэвтрэх' : 'OTP кодоор нэвтрэх'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6 bg-slate-100 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${mode === 'password' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
          >
            Нууц үг
          </button>
          <button
            type="button"
            onClick={() => setMode('otp')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${mode === 'otp' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
          >
            OTP код
          </button>
        </div>

        {/* Password mode */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">
                  Утасны дугаар
                </label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#F57E20] transition-colors" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="85552229"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#F57E20]/20 focus:border-[#F57E20] outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400 text-base"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">
                  Нууц үг
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#F57E20] transition-colors" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#F57E20]/20 focus:border-[#F57E20] outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400 text-base"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#F57E20] hover:bg-[#e66d00] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Нэвтрэх
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* OTP mode */}
        {mode === 'otp' && (
          <div>
            {otpStep === 'phone' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1 block mb-2">Утасны дугаар</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="85552229"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-base font-medium outline-none focus:border-[#F57E20] focus:ring-2 focus:ring-[#F57E20]/20"
                  />
                </div>
                <button
                  type="button"
                  disabled={otpLoading}
                  onClick={async () => {
                    setOtpLoading(true);
                    try {
                      const res = await fetch('/api/auth/send-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone }),
                      });
                      if (res.ok) {
                        toast.success('OTP код илгээлээ');
                        setOtpStep('code');
                      } else {
                        const d = await res.json();
                        toast.error(d.error || 'Алдаа гарлаа');
                      }
                    } finally {
                      setOtpLoading(false);
                    }
                  }}
                  className="w-full py-4 bg-[#F57E20] text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'OTP код авах'}
                </button>
              </div>
            )}

            {otpStep === 'code' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 text-center">+976 {phone} руу код илгээлээ</p>
                <input
                  type="number"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="6 оронтой код"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black text-center tracking-[0.5em] outline-none focus:border-[#F57E20]"
                />
                <button
                  type="button"
                  disabled={otpLoading || otpCode.length !== 6}
                  onClick={async () => {
                    setOtpLoading(true);
                    try {
                      const res = await fetch('/api/auth/verify-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone, code: otpCode }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        login(data.user);
                        toast.success('Амжилттай нэвтэрлээ');
                        router.push(redirectTo);
                      } else {
                        toast.error(data.error || 'Код буруу байна');
                      }
                    } finally {
                      setOtpLoading(false);
                    }
                  }}
                  className="w-full py-4 bg-[#F57E20] text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Нэвтрэх'}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpStep('phone')}
                  className="w-full text-sm text-slate-400 font-bold py-2"
                >
                  ← Дугаар өөрчлөх
                </button>
              </div>
            )}
          </div>
        )}

        <SocialAuthButtons mode="signIn" />

        <p className="text-center text-xs text-slate-400 mt-6">
          Бүртгэлгүй юу? <Link href="/sign-up" className="text-[#F57E20] font-bold hover:underline">Бүртгүүлэх</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="w-8 h-8 border-4 border-[#F57E20] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
