'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package, Heart, MapPin, Bell, ShieldCheck,
  ChevronRight, LogOut, Camera, KeyRound, Eye,
  EyeOff, CheckCircle, Clock, XCircle,
  Lock, Link2, Loader2, Truck
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

import NativeHeader from '@/components/ui/NativeHeader';
import SafeImage, { PRODUCT_PLACEHOLDER } from '@/components/SafeImage';

type Tab = 'orders' | 'password';

interface OrderItem {
  productId?: string;
  name?: string;
  image?: string;
  price?: number;
  quantity?: number;
}

interface Order {
  _id: string;
  total?: number;
  totalPrice?: number;
  status: string;
  createdAt: string;
  items?: OrderItem[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout, refreshUser } = useAuth();
  const wishlistCount = useWishlistStore(state => state.getTotalItems());
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  // Stats
  const [orders, setOrders] = useState<Order[]>([]);
  const [addressCount, setAddressCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch('/api/orders').then(r => r.json()),
      fetch('/api/user/addresses').then(r => r.json()),
    ]).then(([ordersData, addressData]) => {
      setOrders(ordersData.orders || []);
      setAddressCount(addressData.addresses?.length || 0);
    }).catch(() => { }).finally(() => setDataLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Амжилттай гарлаа');
    } catch {
      toast.error('Гарахад алдаа гарлаа');
    }
  };

  const handlePhotoUpload = async () => {
    try {
      let imageDataUrl: string;

      if (Capacitor.isNativePlatform()) {
        const photo = await CapCamera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt,
        });
        imageDataUrl = photo.dataUrl!;
      } else {
        // Web fallback: file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        await new Promise<void>((resolve) => {
          input.onchange = () => resolve();
          input.click();
        });
        if (!input.files?.[0]) return;
        const reader = new FileReader();
        imageDataUrl = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(input.files![0]);
        });
      }

      // Upload to Cloudinary
      const formData = new FormData();
      const blob = await fetch(imageDataUrl).then(r => r.blob());
      formData.append('file', blob, 'profile.jpg');
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();

      if (data.secure_url) {
        await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: data.secure_url }),
        });
        toast.success('Зураг амжилттай шинэчлэгдлээ');
        router.refresh();
      }
    } catch (error: any) {
      if (error?.message !== 'User cancelled photos app') {
        toast.error('Зураг оруулахад алдаа гарлаа');
      }
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Шинэ нууц үг таарахгүй байна');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast.success(data.message || 'Нууц үг амжилттай солигдлоо');
        setTimeout(() => setPwSuccess(false), 5000);
      } else {
        toast.error(data.error || 'Алдаа гарлаа');
      }
    } catch {
      toast.error('Сервертэй холбогдож чадсангүй');
    } finally {
      setPwLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'shipped': return <Truck className="w-4 h-4 text-blue-500" />;
      case 'confirmed': return <Package className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Хүлээгдэж байна',
      confirmed: 'Баталгаажсан',
      processing: 'Боловсруулж байна',
      shipped: 'Илгээгдсэн',
      completed: 'Хүргэгдсэн',
      delivered: 'Хүргэгдсэн',
      cancelled: 'Цуцлагдсан',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      case 'shipped':
      case 'processing':
      case 'confirmed': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.phone || '?')[0];

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'orders', label: 'Захиалгууд', icon: Package },
    { id: 'password', label: 'Нууц үг', icon: KeyRound },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-[120px] native-header-offset lg:pt-0 font-sans">
      <NativeHeader title="Профайл" showBack={false} />

        {/* ─── PROFILE HERO ─── */}
        <div className="bg-white px-4 py-8 flex flex-col items-center border-b border-gray-100">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full border-2 border-gray-100 shadow-sm bg-gray-50 flex items-center justify-center overflow-hidden">
              {user.imageUrl ? (
                <Image src={user.imageUrl} alt={user.name || 'User'} width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <span className="text-[36px] font-extrabold text-gray-300">{initials}</span>
              )}
            </div>
            <button
              onClick={handlePhotoUpload}
              disabled={photoUploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#FF5000] rounded-full flex items-center justify-center shadow-lg border-2 border-white active:scale-90 transition-transform disabled:opacity-60"
            >
              {photoUploading
                ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Camera className="w-4 h-4 text-white" strokeWidth={2.5} />}
            </button>
          </div>

          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-1">{user.name || 'Хэрэглэгч'}</h1>
          <p className="text-[14px] text-gray-500 font-medium mb-3">{user.phone || user.email || ''}</p>
          
          {user.role === 'admin' && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold tracking-widest rounded-full uppercase">АДМИН</span>
          )}
        </div>

      {/* ─── STATS ROW ─── */}
      <div className="relative z-20 px-4 -mt-4 mb-5">
        <div className="bg-white rounded-2xl shadow-sm p-3 grid grid-cols-3 divide-x divide-gray-100">
          <div className="flex flex-col items-center gap-0.5 py-1">
            <span className="text-[22px] font-bold text-gray-900">{dataLoading ? '—' : orders.length}</span>
            <span className="text-[11px] text-gray-400 font-medium">Захиалга</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-1">
            <span className="text-[22px] font-bold text-gray-900">{wishlistCount}</span>
            <span className="text-[11px] text-gray-400 font-medium">Хадгалсан</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-1">
            <span className="text-[22px] font-bold text-gray-900">{dataLoading ? '—' : addressCount}</span>
            <span className="text-[11px] text-gray-400 font-medium">Хаяг</span>
          </div>
        </div>
      </div>

      {/* ─── TAB BAR (iOS segmented control) ─── */}
      <div className="px-4 mb-4">
        <div className="bg-[#E5E5EA] rounded-[10px] p-[3px] flex gap-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-[7px] rounded-[8px] text-[12px] font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <div className="px-4 space-y-4">

        {/* ORDERS — default view with products */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {dataLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#FF6B00]" />
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] py-16 flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-[#FFF0E6] rounded-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-[#FF6B00]" strokeWidth={1.5} />
                </div>
                <p className="text-[15px] font-bold text-[#1A1A1A]">Захиалга байхгүй байна</p>
                <p className="text-[13px] text-[#999]">Та дэлгүүрчилж эхэлцгээе</p>
                <Link href="/" className="mt-2 px-6 py-2.5 bg-[#FF6B00] text-white rounded-full text-[13px] font-bold">
                  Дэлгүүр үзэх
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const firstItem = order.items?.[0];
                  const moreCount = Math.max(0, (order.items?.length || 0) - 1);
                  return (
                    <Link
                      key={order._id}
                      href={`/orders/${order._id}`}
                      className="block bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden active:scale-[0.99] transition-transform"
                    >
                      <div className="px-4 py-3 border-b border-[#F5F5F5] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className="text-[13px] font-bold text-[#1A1A1A]">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>

                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="relative w-16 h-16 rounded-xl bg-[#F6F6F9] overflow-hidden shrink-0 border border-[#F0F0F0]">
                          <SafeImage
                            src={firstItem?.image || PRODUCT_PLACEHOLDER}
                            alt={firstItem?.name || 'Бараа'}
                            fill
                            sizes="64px"
                            quality={60}
                            className="object-cover"
                            fallbackSrc={PRODUCT_PLACEHOLDER}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-[#1A1A1A] leading-snug line-clamp-2">
                            {firstItem?.name || 'Захиалсан бараа'}
                          </p>
                          {moreCount > 0 && (
                            <p className="text-[11px] text-[#999] mt-0.5">+{moreCount} бараа</p>
                          )}
                          <p className="text-[12px] text-[#999] mt-1">
                            {new Date(order.createdAt).toLocaleDateString('mn-MN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            }).replace(/\//g, '.')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[15px] font-bold text-[#FF6B00]">
                            {formatPrice(Number(order.total || order.totalPrice || 0))}
                          </p>
                          <ChevronRight className="w-4 h-4 text-[#CCC] ml-auto mt-1" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Menu links */}
            <div>
              <h2 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Холбоосууд</h2>
              <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                <MenuLink icon={Package} iconBg="#FFF0E6" iconColor="#FF6B00" label="Бүх захиалга" href="/orders" subtitle={`${orders.length} захиалга`} />
                <MenuDiv />
                <MenuLink icon={Heart} iconBg="#FFF0F5" iconColor="#EC4899" label="Хадгалсан бараа" href="/wishlist" />
                <MenuDiv />
                <MenuLink icon={MapPin} iconBg="#EEF2FF" iconColor="#6366F1" label="Миний хаягууд" href="/addresses" subtitle={`${addressCount} хаяг`} />
                <MenuDiv />
                <MenuLink icon={Bell} iconBg="#F0F5FF" iconColor="#3B82F6" label="Мэдэгдэл" href="/settings/notifications" />
                <MenuDiv />
                <MenuLink icon={ShieldCheck} iconBg="#F5F0FF" iconColor="#8B5CF6" label="Нууцлал & Аюулгүй байдал" href="/settings/security" />
              </div>
            </div>

            <ConnectedAccounts />

            <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
              <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 h-[64px] active:bg-gray-50 transition-colors">
                <div className="w-[42px] h-[42px] rounded-[10px] bg-[#FFF5F5] flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-[#FF3B30]" strokeWidth={2} />
                </div>
                <span className="text-[15px] font-bold text-[#FF3B30]">Гарах</span>
              </button>
            </div>

            <p className="text-center text-[11px] text-gray-300 font-medium tracking-wide pb-2">Soyol v1.0</p>
          </div>
        )}

        {/* PASSWORD */}
        {activeTab === 'password' && (
          <div className="space-y-4">
            {/* Info card */}
            <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-4 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FFF3E8] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#1A1A1A]">Нууцлалаа хамгаалаарай</p>
                <p className="text-[12px] text-[#999] mt-0.5">Хамгийн багадаа 6 тэмдэгт оруулна уу</p>
              </div>
            </div>

            {pwSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-[14px] px-4 py-3 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <p className="text-[13px] text-green-700 font-bold">Нууц үг амжилттай солигдлоо!</p>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">

              {/* Current password */}
              <div>
                <label className="text-[11px] font-bold text-[#999] uppercase tracking-wider ml-1 mb-2 block">Одоогийн нууц үг</label>
                <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-4 h-[56px] flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#FF6B00]/30 transition-all">
                  <Lock className="w-4 h-4 text-[#CCCCCC] shrink-0" strokeWidth={1.5} />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Одоогийн нууц үгээ оруулна уу"
                    required
                    className="flex-1 text-[15px] text-[#1A1A1A] placeholder-[#CCCCCC] bg-transparent outline-none"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="text-[#CCC] p-1">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="text-[11px] font-bold text-[#999] uppercase tracking-wider ml-1 mb-2 block">Шинэ нууц үг</label>
                <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-4 h-[56px] flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#FF6B00]/30 transition-all">
                  <Lock className="w-4 h-4 text-[#CCCCCC] shrink-0" strokeWidth={1.5} />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Шинэ нууц үг"
                    required
                    className="flex-1 text-[15px] text-[#1A1A1A] placeholder-[#CCCCCC] bg-transparent outline-none"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="text-[#CCC] p-1">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && newPassword.length < 6 && (
                  <p className="text-[12px] text-red-500 ml-1 mt-1">Хамгийн багадаа 6 тэмдэгт байх ёстой</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="text-[11px] font-bold text-[#999] uppercase tracking-wider ml-1 mb-2 block">Нууц үг давтах</label>
                <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-4 h-[56px] flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#FF6B00]/30 transition-all">
                  <Lock className="w-4 h-4 text-[#CCCCCC] shrink-0" strokeWidth={1.5} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Шинэ нууц үгээ дахин оруулна уу"
                    required
                    className="flex-1 text-[15px] text-[#1A1A1A] placeholder-[#CCCCCC] bg-transparent outline-none"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-[#CCC] p-1">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[12px] text-red-500 ml-1 mt-1">Нууц үг таарахгүй байна</p>
                )}
                {confirmPassword && confirmPassword === newPassword && newPassword.length >= 6 && (
                  <p className="text-[12px] text-[#22C55E] ml-1 mt-1 font-medium">✓ Нууц үг таарч байна</p>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="w-full h-[52px] bg-[#FF6B00] text-white font-bold text-[16px] rounded-[14px] flex items-center justify-center gap-2 transition-opacity active:opacity-80 disabled:opacity-50"
                >
                  {pwLoading
                    ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : 'Нууц үг солих'
                  }
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Google Icon ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Facebook Icon ──────────────────────────────────────────────────────────
function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// ─── Connected Accounts ─────────────────────────────────────────────────────
interface LinkedAccounts {
  google: { linked: boolean; email?: string };
  facebook: { linked: boolean; email?: string };
}

function GoogleLinkButton({ 
  isLinked, 
  email, 
  isBusy, 
  onConnect, 
  onUnlink 
}: { 
  isLinked: boolean; 
  email?: string; 
  isBusy: boolean; 
  onConnect: () => void; 
  onUnlink: () => void; 
}) {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('/api/user/link-social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'google', access_token: tokenResponse.access_token }),
        });

        const data = await res.json();
        if (res.ok) {
          toast.success('Амжилттай холбогдлоо!');
          window.location.reload(); // Simplest way to refresh linked state
        } else {
          toast.error(data.error || 'Холбоход алдаа гарлаа');
        }
      } catch (error) {
        toast.error('Сервертэй холбогдож чадсангүй');
      }
    },
    onError: () => {
      toast.error('Google-ээр холбоход алдаа гарлаа');
    },
  });

  if (isBusy) return <Loader2 className="w-5 h-5 text-[#999] animate-spin shrink-0" />;

  if (isLinked) {
    return (
      <button
        onClick={onUnlink}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-[10px] text-[12px] font-bold text-red-600 transition-colors shrink-0"
      >
        <XCircle className="w-3.5 h-3.5" />
        Салгах
      </button>
    );
  }

  return (
    <button
      onClick={() => googleLogin()}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F5] hover:bg-[#EBEBEB] rounded-[10px] text-[12px] font-bold text-[#1A1A1A] transition-colors shrink-0"
    >
      <Link2 className="w-3.5 h-3.5" />
      Холбох
    </button>
  );
}

function ConnectedAccounts() {
  const { user } = useAuth();
  const [linked, setLinked] = useState<LinkedAccounts | null>(null);
  const [busy, setBusy] = useState<'google' | 'facebook' | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<'google' | 'facebook' | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    fetch('/api/user/link-social')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setLinked(data))
      .catch(() => {});
  }, []);

  const handleConnect = async (provider: 'google' | 'facebook') => {
    if (provider === 'facebook') {
      toast.error('Удахгүй нэмэгдэх болно');
    }
  };

  const handleDisconnect = async (provider: 'google' | 'facebook') => {
    setConfirmUnlink(null);
    setBusy(provider);
    try {
      const res = await fetch('/api/user/link-social', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (res.ok) {
        setLinked(prev => prev ? { ...prev, [provider]: { linked: false } } : null);
        toast.success(data.message || 'Холболт салгагдлаа');
      } else {
        toast.error(data.error || 'Алдаа гарлаа');
      }
    } catch {
      toast.error('Сервертэй холбогдож чадсангүй');
    } finally {
      setBusy(null);
    }
  };

  const providers: { key: 'google' | 'facebook'; label: string; icon: React.ReactNode }[] = [
    { key: 'google', label: 'Google', icon: <GoogleIcon /> },
    { key: 'facebook', label: 'Facebook', icon: <FacebookIcon /> },
  ];

  return (
    <div>
      <h2 className="text-[11px] font-bold text-[#999] uppercase tracking-wider ml-1 mb-2">
        Холбогдсон данс
      </h2>
      <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        {confirmUnlink && (
          <div className="px-4 py-4 bg-red-50 border-b border-red-100 flex flex-col gap-3">
            <p className="text-[13px] font-bold text-red-700">
              {confirmUnlink === 'google' ? 'Google' : 'Facebook'} холболтыг салгах уу?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDisconnect(confirmUnlink)}
                className="flex-1 py-2 bg-red-500 text-white text-[13px] font-bold rounded-[10px] active:opacity-80 transition-opacity"
              >
                Тийм, салгах
              </button>
              <button
                onClick={() => setConfirmUnlink(null)}
                className="flex-1 py-2 bg-[#F0F0F0] text-[#333] text-[13px] font-bold rounded-[10px] active:opacity-80 transition-opacity"
              >
                Болих
              </button>
            </div>
          </div>
        )}

        {providers.map((p, i) => {
          const isLinked = linked?.[p.key]?.linked;
          const email = linked?.[p.key]?.email;
          const isBusy = busy === p.key;

          // Skip rendering Google link if Client ID is missing
          if (p.key === 'google' && !googleClientId) {
            return (
              <div key={p.key} className={`flex items-center justify-between px-4 h-[72px] ${i < providers.length - 1 ? 'border-b border-[#F5F5F5]' : ''} opacity-60`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[10px] bg-[#F5F5F5] flex items-center justify-center shrink-0">
                    {p.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#1A1A1A]">{p.label}</p>
                    <p className="text-[11px] text-[#BBBBBB] mt-0.5">Тохируулаагүй байна</p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={p.key}
              className={`flex items-center justify-between px-4 h-[72px] ${i < providers.length - 1 ? 'border-b border-[#F5F5F5]' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-[10px] bg-[#F5F5F5] flex items-center justify-center shrink-0">
                  {p.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-[#1A1A1A]">{p.label}</p>
                  {isLinked && email
                    ? <p className="text-[11px] text-[#999] mt-0.5 truncate max-w-[170px]">{email}</p>
                    : <p className="text-[11px] text-[#BBBBBB] mt-0.5">Холбоогүй байна</p>
                  }
                </div>
              </div>

              {p.key === 'google' ? (
                <GoogleLinkButton 
                  isLinked={!!isLinked} 
                  email={email} 
                  isBusy={isBusy} 
                  onConnect={() => {}} 
                  onUnlink={() => setConfirmUnlink('google')} 
                />
              ) : isBusy ? (
                <Loader2 className="w-5 h-5 text-[#999] animate-spin shrink-0" />
              ) : isLinked ? (
                <button
                  onClick={() => setConfirmUnlink(p.key)}
                  disabled={!!busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-[10px] text-[12px] font-bold text-red-600 transition-colors disabled:opacity-60 shrink-0"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Салгах
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(p.key)}
                  disabled={!!busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F5] hover:bg-[#EBEBEB] rounded-[10px] text-[12px] font-bold text-[#1A1A1A] transition-colors disabled:opacity-60 shrink-0"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Холбох
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MenuLink & MenuDiv ─────────────────────────────────────────────────────
function MenuLink({
  icon: Icon, iconBg, iconColor, label, href, subtitle
}: {
  icon: any; iconBg: string; iconColor: string; label: string; href: string; subtitle?: string;
}) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 h-[64px] active:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={2} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[15px] font-bold text-[#1A1A1A] leading-tight truncate">{label}</span>
          {subtitle && <span className="text-[12px] text-[#999] mt-0.5">{subtitle}</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#CCCCCC] shrink-0 ml-2" strokeWidth={2} />
    </Link>
  );
}

function MenuDiv() {
  return <div className="ml-[72px] h-[1px] bg-[#F5F5F5]" />;
}
