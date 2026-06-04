'use client';

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ShoppingCart, TrendingUp, Package, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import StatCard from '@/components/admin/StatCard';
import { formatPrice } from '@/lib/utils';
import { motion } from 'framer-motion';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminDashboardPage() {
  const { user } = useAuth();

  // Fetch dashboard data
  const { data: ordersData, error: ordersError } = useSWR('/api/admin/orders?limit=5', fetcher, { refreshInterval: 15000 });
  const { data: productsData, error: productsError } = useSWR('/api/products?admin=true', fetcher, { refreshInterval: 60000 });

  const orders = ordersData?.orders || [];
  const products = productsData?.products || [];
  const loadingOrders = !ordersData && !ordersError;
  const loadingProducts = !productsData && !productsError;

  // Calculate Stats
  const todayOrders = (() => {
    const today = new Date();
    return orders.filter((o: any) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
    }).length;
  })();

  const revenue = orders
    .filter((o: any) => o.status === 'delivered')
    .reduce((sum: number, o: any) => sum + (o.total || o.totalPrice || 0), 0);

  const inventoryLow = products.filter((p: any) => (p.inventory || 0) < 5);

  // Day formatting
  const todayStr = new Date().toLocaleDateString('mn-MN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 h-full overflow-y-auto scrollbar-hide bg-slate-950 pb-24 lg:pb-8">
      {/* Header Greeting */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            Сайн байна уу, {user?.name || 'Админ'} <span className="text-xl md:text-2xl animate-wave">👋</span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Өнөөдөр: {todayStr}</p>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Өнөөдрийн захиалга"
          value={loadingOrders ? '...' : todayOrders}
          icon={ShoppingCart}
          color="blue"
          href="/admin/orders"
        />
        <StatCard
          title="Орлого"
          value={loadingOrders ? '...' : formatPrice(revenue)}
          icon={TrendingUp}
          color="emerald"
          href="/admin/orders"
        />
        <StatCard
          title="Бараа"
          value={loadingProducts ? '...' : products.length}
          icon={Package}
          color="amber"
          href="/admin/products"
        />
        <StatCard
          title="Дууссан"
          value={loadingProducts ? '...' : inventoryLow.length}
          icon={AlertCircle}
          color="red"
          href="/admin/products?filter=low-stock"
        />
      </div>

      {/* Two-column layout for Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-xl overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold text-white">Сүүлийн захиалгууд</h2>
            <Link href="/admin/orders" className="text-xs md:text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium transition-colors">
              Бүх <ArrowRight className="w-3 md:w-4 h-3 md:h-4" />
            </Link>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider">
                  <th className="p-3 md:p-4 border-b border-slate-800">Захиалга#</th>
                  <th className="p-3 md:p-4 border-b border-slate-800">Огноо</th>
                  <th className="p-3 md:p-4 border-b border-slate-800">Дүн</th>
                  <th className="p-3 md:p-4 border-b border-slate-800 text-right">Төлөв</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" /></td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">Захиалга олдсонгүй</td>
                  </tr>
                ) : (
                  orders.slice(0, 5).map((order: any) => (
                    <tr key={order._id} className="hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 last:border-0">
                      <td className="p-3 md:p-4 text-xs md:text-sm font-medium text-white">{order._id.substring(0, 8).toUpperCase()}</td>
                      <td className="p-3 md:p-4 text-[10px] md:text-sm text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 md:p-4 text-xs md:text-sm font-bold text-amber-400">{formatPrice(order.total || order.totalPrice || 0)}</td>
                      <td className="p-3 md:p-4 text-right">
                        {order.status === 'pending' && <span className="px-2 py-0.5 rounded-md text-[9px] md:text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">Хүлээгдэж</span>}
                        {order.status === 'confirmed' && <span className="px-2 py-0.5 rounded-md text-[9px] md:text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/20">Батлагдсан</span>}
                        {order.status === 'delivered' && <span className="px-2 py-0.5 rounded-md text-[9px] md:text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Хүргэгдсэн</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-xl">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Дуусч байгаа бараа <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 text-xs font-black">{inventoryLow.length}</span>
            </h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {loadingProducts ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-red-500 mx-auto" /></div>
            ) : inventoryLow.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Бүх бараа хангалттай үлдэгдэлтэй байна.</div>
            ) : (
              <div className="space-y-4">
                {inventoryLow.slice(0, 5).map((p: any) => {
                  const stock = p.inventory || 0;
                  const isOut = stock === 0;
                  const pColor = isOut ? 'bg-red-500' : 'bg-orange-500';
                  const width = isOut ? '0%' : `${Math.max(5, (stock / 5) * 100)}%`;

                  return (
                    <Link href={`/admin/products/${p._id}`} key={p._id} className="block group">
                      <div className="flex justify-between items-start mb-1 text-sm">
                        <span className="text-slate-300 font-medium truncate pr-4 group-hover:text-white transition-colors">{p.name}</span>
                        <span className={`font-bold ${isOut ? 'text-red-500' : 'text-orange-500'}`}>{stock}ш</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full ${pColor} rounded-full`}
                        />
                      </div>
                    </Link>
                  );
                })}
                {inventoryLow.length > 5 && (
                  <div className="pt-2 text-center">
                    <Link href="/admin/products" className="text-xs text-slate-500 hover:text-white transition-colors">
                      Цааш харах ({inventoryLow.length - 5})
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
