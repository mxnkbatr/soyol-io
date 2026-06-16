'use client';

import { useGoogleLogin } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface SocialAuthButtonsProps {
  mode: 'signIn' | 'signUp';
}

// Apple icon
function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

// Google icon SVG
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// Facebook icon SVG
function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function GoogleLoginButton({
  mode,
  onLoading,
  disabled,
}: {
  mode: 'signIn' | 'signUp';
  onLoading: (loading: boolean) => void;
  disabled?: boolean;
}) {
  const { login } = useAuth();
  const router = useRouter();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        });

        const data = await res.json();
        if (res.ok) {
          login(data.user, data.token);
          if (data.isNewUser) {
            toast.success('Мэдээллээ бөглөнө үү!');
            router.push('/complete-profile');
          } else {
            toast.success('Амжилттай нэвтэрлээ!');
            router.push('/profile');
          }
        } else {
          toast.error(data.error || 'Нэвтрэхэд алдаа гарлаа');
        }
      } catch (error) {
        console.error('Google auth error:', error);
        toast.error('Сервертэй холбогдож чадсангүй');
      } finally {
        onLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google login failed:', error);
      toast.error('Google-ээр нэвтрэхэд алдаа гарлаа');
      onLoading(false);
    },
  });

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onLoading(true);
        googleLogin();
      }}
      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-2xl transition-all font-bold text-sm text-slate-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <GoogleIcon />
      Google-ээр {mode === 'signIn' ? 'нэвтрэх' : 'бүртгүүлэх'}
    </button>
  );
}

export default function SocialAuthButtons({ mode }: SocialAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | 'apple' | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const { login } = useAuth();
  const router = useRouter();

  const handleAppleLogin = async () => {
    try {
      setLoadingProvider('apple');
      const { Capacitor } = await import('@capacitor/core');

      if (Capacitor.isNativePlatform()) {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        const result = await SignInWithApple.authorize({
          clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || 'mn.soyol.shop',
          redirectURI: 'https://soyol-io.vercel.app/api/auth/apple',
          scopes: 'email name',
        });

        const identityToken = result.response?.identityToken;
        if (!identityToken) {
          toast.error('Apple-ээс нэвтрэх токен ирээгүй. Тохиргоо (Sign In with Apple) шалгана уу.');
          return;
        }

        const res = await fetch('/api/auth/apple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            identityToken,
            fullName: {
              givenName: result.response?.givenName,
              familyName: result.response?.familyName,
            },
            email: result.response?.email,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          login(data.user, data.token);
          if (data.isNewUser) {
            router.push('/complete-profile');
          } else {
            toast.success('Амжилттай нэвтэрлээ!');
            router.push('/profile');
          }
        } else {
          toast.error(data.error || 'Apple-ээр нэвтрэхэд алдаа гарлаа');
        }
      } else {
        toast.error('Apple нэвтрэлт зөвхөн iOS дээр ажилладаг');
      }
    } catch (error: unknown) {
      console.error('Apple login error:', error);
      const pluginMessage =
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as { message: string }).message === 'string'
          ? (error as { message: string }).message
          : null;
      toast.error(
        pluginMessage && pluginMessage.length > 0
          ? pluginMessage
          : 'Apple-ээр нэвтрэхэд алдаа гарлаа',
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">эсвэл</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleAppleLogin}
        disabled={!!loadingProvider}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-black hover:bg-gray-900 rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed font-bold text-sm text-white shadow-sm"
      >
        {loadingProvider === 'apple' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <AppleIcon />
        )}
        Apple-ээр {mode === 'signIn' ? 'нэвтрэх' : 'бүртгүүлэх'}
      </button>

      {googleClientId ? (
        <GoogleLoginButton
          mode={mode}
          disabled={!!loadingProvider && loadingProvider !== 'google'}
          onLoading={(loading) => setLoadingProvider(loading ? 'google' : null)}
        />
      ) : (
        <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
          <p className="text-[10px] text-orange-600 font-medium text-center">
            Google Login тохируулаагүй байна.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setLoadingProvider('facebook');
          toast.error('Удахгүй нэмэгдэх болно');
          setLoadingProvider(null);
        }}
        disabled={!!loadingProvider}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-[#1877F2] hover:bg-[#166FE5] rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed font-bold text-sm text-white shadow-sm"
      >
        {loadingProvider === 'facebook' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <FacebookIcon />
        )}
        Facebook-ээр {mode === 'signIn' ? 'нэвтрэх' : 'бүртгүүлэх'}
      </button>
    </div>
  );
}
