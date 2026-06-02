'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Package, Clock, Truck, CheckCircle2, XCircle, ShoppingBag } from "lucide-react";
import { toast } from "react-hot-toast";
import useSWR from "swr";

import { CANCELLABLE_STATUSES, type OrderStatus } from "@/types/order-types";

import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";

const TABS = ['Бүгд', 'Хүлээгдэж буй', 'Баталгаажсан', 'Хүргэлтэнд', 'Дууссан', 'Цуцлагдсан'];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  pending: { label: 'Хүлээгдэж буй', color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock },
  confirmed: { label: 'Баталгаажсан', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package },
  processing: { label: 'Боловсруулагдаж буй', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package },
  shipped: { label: 'Хүргэлтэнд', color: 'text-blue-600', bg: 'bg-blue-50', icon: Truck },
  delivered: { label: 'Хүргэгдсэн', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  cancelled: { label: 'Цуцлагдсан', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
};

export default function MyOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('Бүгд');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/sign-in?redirect_url=/orders');
    }
  }, [isAuthenticated, authLoading, router]);

  const { data, error, isLoading, mutate } = useSWR('/api/orders', fetcher);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (orderId: string) => {
    if (!confirm('Та энэ захиалгыг цуцлахдаа итгэлтэй байна уу?')) return;
    setCancellingId(orderId);

    // Optimistic update — immediately show cancelled in UI
    const previousData = data;
    mutate(
      {
        ...data,
        orders: (data?.orders || []).map((o: { _id: string; status: string }) =>
          o._id === orderId ? { ...o, status: 'cancelled' } : o
        ),
      },
      false // don't revalidate yet
    );

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'cancelled' })
      });
      if (res.ok) {
        toast.success('Захиалга амжилттай цуцлагдлаа');
        mutate(); // revalidate from server
      } else {
        // Rollback optimistic update
        mutate(previousData, false);
        const errData = await res.json();
        toast.error(errData.error || 'Цуцлахад алдаа гарлаа');
      }
    } catch (e) {
      // Rollback optimistic update
      mutate(previousData, false);
      toast.error('Алдаа гарлаа');
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF5000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const orders = data?.orders || [];

  const getStepIndex = (status: string) => {
    if (status === 'pending') return 0;
    if (status === 'confirmed') return 1;
    if (status === 'processing' || status === 'shipped') return 2;
    if (status === 'delivered') return 3;
    return -1;
  };

  const filteredOrders = orders.filter((order: any) => {
    if (activeTab === 'Бүгд') return true;
    if (activeTab === 'Хүлээгдэж буй') return order.status === 'pending';
    if (activeTab === 'Баталгаажсан') return order.status === 'confirmed';
    if (activeTab === 'Хүргэлтэнд') return order.status === 'processing' || order.status === 'shipped';
    if (activeTab === 'Дууссан') return order.status === 'delivered';
    if (activeTab === 'Цуцлагдсан') return order.status === 'cancelled';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md h-14 flex items-center px-4 border-b border-slate-100 sticky top-0 z-50 lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(env(safe-area-inset-top) + 3.5rem)' }}>
        <Link href="/profile" className="p-2 -ml-2 text-slate-900 active:scale-90 transition-transform">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </Link>
        <h1 className="flex-1 text-center text-[16px] font-black text-slate-900 pr-8">
          Миний захиалга
        </h1>
      </div>

      {/* Desktop Header Wrapper (for spacing) */}
      <div className="hidden lg:block h-6" />

      <div className="max-w-3xl mx-auto">
        <div className="hidden lg:flex items-center gap-4 mb-8 px-4">
          <Link href="/profile" className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-[#FF5000] text-slate-400 hover:text-[#FF5000] transition-all">
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </Link>
          <h1 className="text-3xl font-black text-slate-900">Миний захиалга</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white sticky top-[calc(env(safe-area-inset-top)+3.5rem)] lg:top-0 lg:static z-40 px-2 border-b border-slate-100 flex overflow-x-auto scrollbar-hide lg:rounded-2xl lg:mb-6 lg:border lg:shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 whitespace-nowrap px-4 py-4 text-[13px] sm:text-[14px] font-bold relative transition-colors ${activeTab === tab ? 'text-[#FF5000]' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="orderTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#FF5000] rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Order List */}
        <div className="pt-4 px-4 space-y-4">
          {isLoading ? (
            // Skeleton Loading
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 animate-pulse shadow-sm">
                <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                  <div className="h-4 bg-slate-100 rounded w-24" />
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 rounded-2xl" />
              </div>
            ))
          ) : filteredOrders.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order: any) => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const Icon = status.icon;
                const firstItem = order.items?.[0] || {};
                const remainingItems = (order.items?.length || 1) - 1;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={order._id}
                    className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    {/* Top Row */}
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-black text-slate-900 group-hover:text-[#FF5000] transition-colors">#{order._id.slice(-6).toUpperCase()}</span>
                        <span className="text-[11px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString('mn-MN')}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bg} ${status.color}`}>
                        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span className="text-[11px] font-extrabold uppercase tracking-wider">
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Product Row */}
                    <Link href={`/orders/${order._id}`} className="flex gap-4 mb-5">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden shrink-0 relative border border-slate-100 group-hover:border-[#FF5000]/20 transition-colors">
                        <Image
                          src={firstItem.image || 'https://res.cloudinary.com/dc127wztz/image/upload/v1770896452/banner1_nw6nok.png'}
                          alt={firstItem.name || 'Product'}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="text-[15px] font-bold text-slate-900 leading-snug mb-1 group-hover:text-[#FF5000] transition-colors">
                          {firstItem.name || 'Манай бүтээгдэхүүн'}
                          {remainingItems > 0 && <span className="text-slate-400 font-medium text-xs ml-1">гэх мэт {remainingItems + 1} бараа</span>}
                        </h3>
                        <p className="text-[14px] text-slate-500 font-bold">
                          {formatPrice(order.total || order.totalPrice || firstItem.price || 0)}
                        </p>
                      </div>
                    </Link>

                    {/* Order Progress Steps */}
                    {order.status !== 'cancelled' && (
                      <div className="mb-6 px-1">
                        <div className="flex items-center justify-between relative">
                          {/* Background Line */}
                          <div className="absolute top-[9px] left-0 right-0 h-0.5 bg-slate-100 -z-0" />

                          {/* Active Line */}
                          <div 
                            className="absolute top-[9px] left-0 h-0.5 bg-[#FF5000] transition-all duration-700 -z-0" 
                            style={{ 
                              width: `${(Math.max(0, getStepIndex(order.status)) / 3) * 100}%` 
                            }}
                          />

                          {[
                            { id: 'pending', label: 'Захиалсан' },
                            { id: 'confirmed', label: 'Батлагдсан' },
                            { id: 'shipped', label: 'Хүргэлтэнд' },
                            { id: 'delivered', label: 'Дууссан' }
                          ].map((step, idx) => {
                            const currentIdx = getStepIndex(order.status);
                            const isCompleted = idx <= currentIdx;
                            const isActive = idx === currentIdx;

                            return (
                              <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                                <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center transition-all duration-500 ${
                                  isCompleted ? 'bg-[#FF5000] shadow-lg shadow-orange-500/30' : 'bg-white border-2 border-slate-100'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                  )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tight transition-colors duration-500 ${
                                  isCompleted ? 'text-slate-900' : 'text-slate-400'
                                } ${isActive ? 'text-[#FF5000]' : ''}`}>
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottom Row */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Нийт дүн</span>
                        <span className="text-[18px] font-black text-[#FF5000]">
                          {formatPrice(order.total || order.totalPrice || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {CANCELLABLE_STATUSES.includes(order.status as OrderStatus) && (
                          <button
                            onClick={() => handleCancel(order._id)}
                            disabled={cancellingId === order._id}
                            className="px-5 py-2.5 rounded-2xl bg-white text-slate-500 text-[13px] font-bold hover:bg-slate-50 hover:text-red-500 transition-all active:scale-95 border border-slate-200"
                          >
                            {cancellingId === order._id ? 'Түр хүлээнэ үү...' : 'Цуцлах'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            // Empty State
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-20 flex flex-col items-center justify-center text-center"
            >
              <div className="w-24 h-24 rounded-[40px] bg-slate-50 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-orange-100/50 rounded-[40px] animate-pulse" />
                <ShoppingBag className="w-10 h-10 text-slate-300 relative z-10" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Захиалга байхгүй байна</h3>
              <p className="text-[14px] text-slate-500 max-w-[240px] mb-8 font-medium italic">
                Та одоогоор ямар нэгэн захиалга хийгээгүй байна.
              </p>
              <Link
                href="/"
                className="px-8 py-3.5 bg-[#FF5000] text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-95"
              >
                Дэлгүүр хэсэх
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}