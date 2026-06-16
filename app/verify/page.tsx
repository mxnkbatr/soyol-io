'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';

function VerifyContent() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const [devCode, setDevCode] = useState(searchParams.get('code'));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login } = useAuth();

  useEffect(() => {
    if (!phone) {
      toast.error('No phone number provided');
      router.push('/sign-in');
    }
    inputRefs.current[0]?.focus();
  }, [phone, router]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if complete
    if (newCode.every((digit) => digit !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otp: string) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      toast.success('Successfully logged in!');
      login(data.user, data.token);

      const redirectUrl = searchParams.get('redirect_url') || '/';
      router.push(redirectUrl);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      if (data.code) {
        toast.success(`Code sent! Dev: ${data.code}`, { duration: 5000, icon: '🔓' });
        setDevCode(data.code);
      } else {
        toast.success('Code sent!');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12">
        <button
          onClick={() => router.back()}
          className="mb-8 p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-[#F57E20]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Баталгаажуулах</h1>
          <p className="text-slate-500 text-sm">
            <span className="font-bold text-slate-900">{phone}</span> дугаар руу илгээсэн 6 оронтой кодыг оруулна уу.
          </p>
          {devCode && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium border border-blue-100 animate-pulse">
              Testing Code: <span className="font-bold text-lg tracking-wider">{devCode}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 mb-8">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { if (el) inputRefs.current[index] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className={`w-12 h-14 text-center text-xl font-bold bg-slate-50 border rounded-xl outline-none transition-all
                ${digit ? 'border-[#F57E20] ring-1 ring-[#F57E20]/20 bg-white' : 'border-slate-200 focus:border-[#F57E20] focus:bg-white'}
              `}
            />
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center text-[#F57E20]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Код ирэхгүй байна уу? <button onClick={handleResend} className="text-[#F57E20] font-bold hover:underline" disabled={isLoading}>Дахин илгээх</button>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]"><Loader2 className="w-8 h-8 animate-spin text-[#F57E20]" /></div>}>
      <VerifyContent />
    </Suspense>
  );
}
