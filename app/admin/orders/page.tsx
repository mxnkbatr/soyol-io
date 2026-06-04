'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
    Loader2, Package, Search,
    MapPin, Phone, Check, CheckCircle2, Truck, ChevronRight,
    ShoppingCart, X, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { mn } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { formatPrice } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface OrderItem {
    id: string;
    productId?: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    variantId?: string;
    selectedOptions?: Record<string, string>;
}

interface Order {
    _id: string;
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    khoroo?: string;
    street?: string;
    apartment?: string;
    entrance?: string;
    floor?: string;
    door?: string;
    notes?: string;
    items: OrderItem[];
    total?: number;
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
    createdAt: string;
    deliveryEstimate?: string;
    deliveryMethod?: string;
    shipping?: {
        fullName: string;
        phone: string;
        city?: string;
        district?: string;
        khoroo?: string;
        street?: string;
        apartment?: string;
        entrance?: string;
        floor?: string;
        door?: string;
        address?: string;
    };
}

type OrderStatus = Order['status'];

export default function AdminOrdersPage() {
    const { data, mutate, error } = useSWR('/api/admin/orders', fetcher, { refreshInterval: 15000 });
    const orders: Order[] = data?.orders || [];
    const loading = !data && !error;

    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'delivered' | 'cancelled'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [quickUpdating, setQuickUpdating] = useState<string | null>(null);

    // Bulk Selection
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    // Edit form state for side panel
    const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
    const [editEstimate, setEditEstimate] = useState('');
    const [updating, setUpdating] = useState(false);

    const filteredOrders = useMemo(() => {
        return orders
            .filter(o => activeTab === 'all' || o.status === activeTab)
            .filter(o => {
                if (!searchTerm) return true;
                const s = searchTerm.toLowerCase();
                return (
                    o._id.toLowerCase().includes(s) ||
                    (o.shipping?.fullName || o.fullName || '').toLowerCase().includes(s) ||
                    (o.shipping?.phone || o.phone || '').includes(s)
                );
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, activeTab, searchTerm]);

    const selectedOrder = useMemo(() => {
        return orders.find(o => o._id === selectedOrderId) || null;
    }, [orders, selectedOrderId]);

    const counts = useMemo(() => ({
        all: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
    }), [orders]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!selectedOrderId) return;

        // Don't trigger inside inputs
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;

        if (e.key === 'Escape') {
            setSelectedOrderId(null);
            return;
        }

        const currentIndex = filteredOrders.findIndex(o => o._id === selectedOrderId);
        if (currentIndex === -1) return;

        if (e.key === 'j' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % filteredOrders.length;
            openOrderDetails(filteredOrders[nextIndex]);
        } else if (e.key === 'k' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = (currentIndex - 1 + filteredOrders.length) % filteredOrders.length;
            openOrderDetails(filteredOrders[prevIndex]);
        }
    }, [selectedOrderId, filteredOrders]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, estimate?: string) => {
        try {
            const res = await fetch('/api/admin/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    status: newStatus,
                    deliveryEstimate: estimate || ''
                })
            });

            if (!res.ok) throw new Error('Update failed');
            toast.success('Төлөв шинэчлэгдлээ');
            mutate(); // Re-fetch
        } catch {
            toast.error('Алдаа гарлаа');
        }
    };

    const handleStatusQuickChange = async (orderId: string, newStatus: OrderStatus) => {
        setQuickUpdating(orderId);
        await updateOrderStatus(orderId, newStatus);
        setQuickUpdating(null);
    };

    const handleBulkAction = async (newStatus: OrderStatus) => {
        if (selectedOrderIds.size === 0) return;

        let successCount = 0;
        for (const orderId of selectedOrderIds) {
            try {
                const res = await fetch('/api/admin/orders', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, status: newStatus })
                });
                if (res.ok) successCount++;
            } catch {
                console.error(`Failed to update ${orderId}`);
            }
        }

        if (successCount > 0) {
            toast.success(`${successCount} захиалга шинэчлэгдлээ`);
            setSelectedOrderIds(new Set());
            mutate();
        } else {
            toast.error('Шинэчлэхэд алдаа гарлаа');
        }
    };

    const toggleBulkSelectAll = () => {
        if (selectedOrderIds.size === filteredOrders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(filteredOrders.map(o => o._id)));
        }
    };

    const toggleBulkSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedOrderIds(newSet);
    };

    const openOrderDetails = (order: Order) => {
        setSelectedOrderId(order._id);
        setEditStatus(order.status);
        if (!order.deliveryEstimate) {
            const hasPreOrder = order.items.some((item: any) => item.stockStatus === 'pre-order');
            setEditEstimate(hasPreOrder ? '7-14 хоногт ирнэ' : 'Маргааш хүргэнэ');
        } else {
            setEditEstimate(order.deliveryEstimate);
        }
    };

    const handlePanelUpdate = async () => {
        if (!selectedOrder) return;
        setUpdating(true);
        await updateOrderStatus(selectedOrder._id, editStatus, editEstimate);
        setUpdating(false);
        setSelectedOrderId(null);
    };

    const getStatusBadgeClass = (status: OrderStatus) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'confirmed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
        }
    };

    const getStatusLabel = (status: OrderStatus) => {
        switch (status) {
            case 'pending': return 'Шинэ';
            case 'confirmed': return 'Баталгаажсан';
            case 'delivered': return 'Хүргэгдсэн';
            case 'cancelled': return 'Цуцлагдсан';
        }
    };

    return (
        <div className="flex flex-col min-w-0 flex-1 overflow-hidden bg-slate-950 relative h-screen">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl shrink-0 z-20">
                <div className="px-6 sm:px-8 py-5 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            Захиалгууд
                            {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">Төлөв өөрчлөх болон дэлгэрэнгүй харах</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Нэр, утас, захиалгын ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-64 pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            {(['all', 'pending', 'confirmed', 'delivered', 'cancelled'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setActiveTab(status)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${activeTab === status
                                        ? status === 'cancelled'
                                            ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-lg shadow-red-500/10'
                                            : 'bg-amber-500/20 text-amber-500 border-amber-500/50 shadow-lg shadow-amber-500/10'
                                        : 'bg-slate-900 text-slate-400 border-transparent hover:bg-slate-800 hover:text-white'
                                        }`}
                                >
                                    {status === 'all' ? 'Бүгд' : status === 'cancelled' ? 'Цуцлагдсан' : getStatusLabel(status as 'pending' | 'confirmed' | 'delivered')}
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === status
                                        ? status === 'cancelled' ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/30 text-amber-300'
                                        : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {counts[status]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Toolbar */}
                <AnimatePresence>
                    {selectedOrderIds.size > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-amber-500 text-slate-950 px-6 sm:px-8 overflow-hidden"
                        >
                            <div className="py-2.5 flex items-center justify-between">
                                <div className="text-sm font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    {selectedOrderIds.size} захиалга сонгогдлоо
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleBulkAction('confirmed')}
                                        className="px-3 py-1.5 bg-slate-950/10 hover:bg-slate-950/20 rounded-lg text-sm font-bold transition-colors"
                                    >Баталгаажуулах</button>
                                    <button
                                        onClick={() => handleBulkAction('delivered')}
                                        className="px-3 py-1.5 bg-slate-950/10 hover:bg-slate-950/20 rounded-lg text-sm font-bold transition-colors"
                                    >Хүргэгдсэн</button>
                                    <button
                                        onClick={() => setSelectedOrderIds(new Set())}
                                        className="p-1.5 ml-2 hover:bg-slate-950/10 rounded-lg transition-colors"
                                    ><X className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative scrollbar-hide">
                <div className="max-w-6xl mx-auto space-y-4 pb-20">
                    {filteredOrders.length === 0 ? ( 
                      <div className="py-20 text-center bg-slate-900 rounded-3xl border border-dashed border-slate-800 shadow-xl">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package className="w-8 h-8 text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Захиалга байхгүй байна</h3>
                        </div>
                    ) : ( 
                      <> 
                        {/* MOBILE — md-с дээш нуугдана */} 
                        <div className="md:hidden space-y-3"> 
                          {filteredOrders.map((order) => ( 
                            <div 
                              key={order._id} 
                              onClick={() => openOrderDetails(order)} 
                              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform" 
                            > 
                              <div className="flex items-start justify-between mb-3"> 
                                <div> 
                                  <p className="font-bold text-white text-sm">{order.fullName}</p> 
                                  <p className="text-xs text-slate-500 mt-0.5">{order.phone}</p> 
                                </div> 
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(order.status)}`}> 
                                  {getStatusLabel(order.status)} 
                                </span> 
                              </div> 
                              <div className="flex items-center justify-between"> 
                                <div> 
                                  <p className="font-black text-amber-500 text-base">{formatPrice(order.totalPrice || order.total || 0)}</p> 
                                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">#{order._id.slice(-8).toUpperCase()}</p> 
                                </div> 
                                <div className="flex gap-2" onClick={e => e.stopPropagation()}> 
                                  {order.status === 'pending' && ( 
                                    <button 
                                      onClick={() => handleStatusQuickChange(order._id, 'confirmed')} 
                                      disabled={quickUpdating === order._id} 
                                      className="px-4 py-2 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-xl border border-blue-500/20 disabled:opacity-50" 
                                    > 
                                      {quickUpdating === order._id ? <Loader2 className="w-3 h-3 animate-spin" /> : '✓ Батлах'} 
                                    </button> 
                                  )} 
                                  {order.status === 'confirmed' && ( 
                                    <>
                                      <a 
                                        href={`tel:${order.phone}`}
                                        className="px-4 py-2 bg-green-500/20 text-green-400 text-xs font-bold rounded-xl border border-green-500/20 flex items-center justify-center gap-1.5"
                                      >
                                        <Phone className="w-3.5 h-3.5" /> Залгах
                                      </a>
                                      <button 
                                        onClick={() => handleStatusQuickChange(order._id, 'delivered')} 
                                        disabled={quickUpdating === order._id} 
                                        className="px-4 py-2 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 disabled:opacity-50" 
                                      > 
                                        {quickUpdating === order._id ? <Loader2 className="w-3 h-3 animate-spin" /> : '🚚 Хүргэх'} 
                                      </button> 
                                    </>
                                  )} 
                                </div> 
                              </div> 
                            </div> 
                          ))} 
                        </div> 
 
                        {/* DESKTOP TABLE — mobile-д нуугдана */} 
                        <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl"> 
                          <div className="overflow-x-auto"> 
                            <table className="w-full text-left border-collapse"> 
                                <thead>
                                    <tr className="bg-slate-950 border-b border-slate-800">
                                        <th className="px-4 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                                                onChange={toggleBulkSelectAll}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/20"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">ID / Огноо</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Хэрэглэгч</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Дүн / Бараа</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Төлөв</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Шуурхай үйлдэл</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredOrders.map((order) => {
                                        const totalAmt = order.totalPrice || order.total || 0;
                                        return (
                                            <tr
                                                key={order._id}
                                                onClick={() => openOrderDetails(order)}
                                                className={`group cursor-pointer transition-colors ${selectedOrderId === order._id ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'}`}
                                            >
                                                <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedOrderIds.has(order._id)}
                                                        onChange={(e) => toggleBulkSelect(order._id, e as any)}
                                                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/20"
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="font-mono text-sm text-white font-bold group-hover:text-amber-500 transition-colors">#{order._id.slice(-8).toUpperCase()}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: mn })}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-sm font-bold text-white">{order.shipping?.fullName || order.fullName || 'Нэргүй'}</p>
                                                    <p className="text-xs font-mono text-slate-400 mt-1">{order.shipping?.phone || order.phone}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-sm font-black text-amber-500">{formatPrice(totalAmt)}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{order.items.length} төрөл бараа</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(order.status)}`}>
                                                        {getStatusLabel(order.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                        {order.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleStatusQuickChange(order._id, 'confirmed')}
                                                                disabled={quickUpdating === order._id}
                                                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/20 disabled:opacity-50 transition-colors"
                                                            >
                                                                {quickUpdating === order._id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Батлах'}
                                                            </button>
                                                        )}
                                                        {order.status === 'confirmed' && (
                                                            <>
                                                                <a
                                                                    href={`tel:${order.shipping?.phone || order.phone}`}
                                                                    className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold rounded-lg border border-green-500/20 flex items-center gap-1.5 transition-colors"
                                                                >
                                                                    <Phone className="w-3.5 h-3.5" /> Залгах
                                                                </a>
                                                                <button
                                                                    onClick={() => handleStatusQuickChange(order._id, 'delivered')}
                                                                    disabled={quickUpdating === order._id}
                                                                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 disabled:opacity-50 transition-colors"
                                                                >
                                                                    {quickUpdating === order._id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Хүргэх'}
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => openOrderDetails(order)}
                                                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-auto opacity-0 group-hover:opacity-100"
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table> 
                          </div> 
                        </div> 
                      </> 
                    )}
                </div>
            </main>

            {/* Sliding Side Panel Overlay */}
            <AnimatePresence>
                {selectedOrder && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedOrderId(null)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        />

                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 shadow-2xl border-l border-slate-800 flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900 z-10 sticky top-0">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        Захиалга дэлгэрэнгүй
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1 opacity-70">#{selectedOrder._id}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrderId(null)}
                                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold"
                                >
                                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 border border-slate-700 rounded bg-slate-950 text-[10px]">Esc</kbd>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                                {/* Instructions */}
                                <div className="text-[10px] text-slate-500 flex justify-between px-1 hidden sm:flex">
                                    <span className="flex items-center gap-1"><kbd className="px-1 border border-slate-700 rounded font-mono">J</kbd> дараагийнхруу</span>
                                    <span className="flex items-center gap-1"><kbd className="px-1 border border-slate-700 rounded font-mono">K</kbd> өмнөхрүү</span>
                                </div>

                                {/* Status Card */}
                                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Захиалгын төлөв</label>
                                            <select
                                                value={editStatus}
                                                onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 appearance-none transition-all"
                                            >
                                                <option value="pending">Хүлээгдэж байна</option>
                                                <option value="confirmed">Баталгаажсан</option>
                                                <option value="delivered">Хүргэгдсэн</option>
                                                <option value="cancelled">Цуцлагдсан</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Хүргэлт</label>
                                            <input
                                                type="text"
                                                value={editEstimate}
                                                onChange={(e) => setEditEstimate(e.target.value)}
                                                placeholder="Жишээ: Маргааш хүргэнэ"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:font-normal"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {['Өнөөдөр', 'Маргааш', '7 хоногт', '14 хоногт'].map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setEditEstimate(t)}
                                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] rounded border border-slate-700 font-bold transition-colors"
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Customer details */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1">Хүргэлтийн мэдээлэл</h4>
                                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 divide-y divide-slate-800">
                                        <div className="pb-3 flex items-start justify-between gap-4">
                                            <div className="flex gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                                    <span className="text-amber-500 font-bold">{(selectedOrder.fullName || 'З').charAt(0).toUpperCase()}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{selectedOrder.fullName || 'Зочин'}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-sm font-mono text-slate-400">{selectedOrder.phone}</p>
                                                        <button 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(selectedOrder.phone);
                                                                toast.success('Утас хуулагдлаа');
                                                            }}
                                                            className="p-1 hover:bg-slate-800 rounded transition-colors"
                                                            title="Хуулах"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                                        </button>
                                                        {Capacitor.isNativePlatform() ? (
                                                            <button
                                                                onClick={() => {
                                                                    window.location.href = `tel:${selectedOrder.phone}`;
                                                                }}
                                                                className="p-1 hover:bg-green-800 bg-green-900/50 rounded transition-colors flex items-center justify-center"
                                                                title="Залгах"
                                                            >
                                                                <Phone className="w-3.5 h-3.5 text-green-400" />
                                                            </button>
                                                        ) : (
                                                            <a
                                                                href={`tel:${selectedOrder.phone}`}
                                                                className="p-1 hover:bg-green-800 bg-green-900/50 rounded transition-colors flex items-center justify-center"
                                                                title="Залгах"
                                                            >
                                                                <Phone className="w-3.5 h-3.5 text-green-400" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-3">
                                            <div className="flex gap-4 text-sm text-slate-300 relative group/addr">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MapPin className="w-4 h-4 text-amber-500" />
                                                </div>
                                                <div className="leading-relaxed flex-1">
                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                                        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Хот / Аймаг</span>
                                                            <span className="text-white font-bold">{selectedOrder.shipping?.city || selectedOrder.city}</span>
                                                        </div>
                                                        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Дүүрэг / Сум</span>
                                                            <span className="text-white font-bold">{selectedOrder.shipping?.district || selectedOrder.district}</span>
                                                        </div>
                                                        
                                                        {(selectedOrder.shipping?.khoroo || selectedOrder.khoroo) && (
                                                            <div className="col-span-1 p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Хороо / Баг</span>
                                                                <span className="text-white font-bold">{selectedOrder.shipping?.khoroo || selectedOrder.khoroo}-р хороо</span>
                                                            </div>
                                                        )}

                                                        {(selectedOrder.shipping?.street || selectedOrder.street) && (
                                                            <div className="col-span-1 p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Гудамж / Ойролцоох</span>
                                                                <span className="text-white font-bold">{selectedOrder.shipping?.street || selectedOrder.street}</span>
                                                            </div>
                                                        )}

                                                        {(selectedOrder.shipping?.apartment || selectedOrder.apartment || selectedOrder.shipping?.entrance || selectedOrder.entrance || selectedOrder.shipping?.floor || selectedOrder.floor || selectedOrder.shipping?.door || selectedOrder.door) && (
                                                            <div className="col-span-2 p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Байр, Орц, Давхар, Хаалга</span>
                                                                <div className="flex flex-wrap gap-4 mt-1">
                                                                    {(selectedOrder.shipping?.apartment || selectedOrder.apartment) && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[8px] text-slate-600 font-bold uppercase">Байр</span>
                                                                            <span className="text-white font-bold">{selectedOrder.shipping?.apartment || selectedOrder.apartment}</span>
                                                                        </div>
                                                                    )}
                                                                    {(selectedOrder.shipping?.entrance || selectedOrder.entrance) && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[8px] text-slate-600 font-bold uppercase">Орц</span>
                                                                            <span className="text-white font-bold">{selectedOrder.shipping?.entrance || selectedOrder.entrance}</span>
                                                                        </div>
                                                                    )}
                                                                    {(selectedOrder.shipping?.floor || selectedOrder.floor) && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[8px] text-slate-600 font-bold uppercase">Давхар</span>
                                                                            <span className="text-white font-bold">{selectedOrder.shipping?.floor || selectedOrder.floor}</span>
                                                                        </div>
                                                                    )}
                                                                    {(selectedOrder.shipping?.door || selectedOrder.door) && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[8px] text-slate-600 font-bold uppercase">Хаалга</span>
                                                                            <span className="text-white font-bold">{selectedOrder.shipping?.door || selectedOrder.door}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(!selectedOrder.khoroo && !selectedOrder.shipping?.khoroo && !selectedOrder.street && !selectedOrder.shipping?.street) && (
                                                            <div className="col-span-2 p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Захиалгын хаяг (Дэлгэрэнгүй)</span>
                                                                <span className="text-white font-bold leading-snug">{selectedOrder.shipping?.address || selectedOrder.address}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 opacity-0 group-hover/addr:opacity-100 transition-opacity absolute -right-2 top-0">
                                                    <button 
                                                        onClick={() => {
                                                            const addr = `${selectedOrder.shipping?.city || selectedOrder.city}, ${selectedOrder.shipping?.district || selectedOrder.district}, ${selectedOrder.shipping?.khoroo || selectedOrder.khoroo || ''} ${selectedOrder.shipping?.street || selectedOrder.street || ''} ${selectedOrder.shipping?.apartment || selectedOrder.apartment || ''} ${selectedOrder.shipping?.entrance ? selectedOrder.shipping.entrance + '-р орц' : ''} ${selectedOrder.shipping?.door ? selectedOrder.shipping.door + '-р хаалга' : ''}`.replace(/\s+/g, ' ').trim();
                                                            navigator.clipboard.writeText(addr);
                                                            toast.success('Хаяг хуулагдлаа');
                                                        }}
                                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-lg border border-slate-700 transition-all active:scale-90"
                                                        title="Бүтэн хаяг хуулах"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => {
                                                            const itemsText = selectedOrder.items.map(i => `- ${i.name || 'Бараа'}${i.selectedOptions ? ' (' + Object.values(i.selectedOptions).join(', ') + ')' : ''} x${i.quantity}`).join('\n');
                                                            const addr = `${selectedOrder.shipping?.city || selectedOrder.city}, ${selectedOrder.shipping?.district || selectedOrder.district}, ${selectedOrder.shipping?.khoroo || selectedOrder.khoroo || ''} ${selectedOrder.shipping?.street || selectedOrder.street || ''} ${selectedOrder.shipping?.apartment || selectedOrder.apartment || ''} ${selectedOrder.shipping?.entrance ? selectedOrder.shipping.entrance + '-р орц' : ''} ${selectedOrder.shipping?.door ? selectedOrder.shipping.door + '-р хаалга' : ''}`.replace(/\s+/g, ' ').trim();
                                                            const summary = `ЗАХИАЛГА #${selectedOrder._id.slice(-6).toUpperCase()}\n\nХҮЛЭЭН АВАГЧ: ${selectedOrder.fullName || 'Зочин'}\nУТАС: ${selectedOrder.phone}\nХАЯГ: ${addr}\n\nБАРАА:\n${itemsText}\n\nНИЙТ: ${selectedOrder.totalPrice || selectedOrder.total}₮`;
                                                            navigator.clipboard.writeText(summary);
                                                            toast.success('Захиалгын хураангуй хуулагдлаа');
                                                        }}
                                                        className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg border border-amber-600 transition-all active:scale-90"
                                                        title="Захиалгын мэдээлэл хуулах (Түгээгчид)"
                                                    >
                                                        <Truck className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            {selectedOrder.notes && (
                                                <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-sm italic text-slate-400 relative">
                                                    <div className="absolute -top-2 left-4 px-2 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-amber-500/50">Тэмдэглэл</div>
                                                    "{selectedOrder.notes}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1">
                                        Захиалгын бараанууд ({selectedOrder.items.length})
                                    </h4>
                                    <div className="space-y-4">
                                        {selectedOrder.items.map((item, idx) => {
                                            const itemPrice = item.price || (idx === 0 && selectedOrder.items.length === 1 ? (selectedOrder.total || selectedOrder.totalPrice || 0) / item.quantity : 0);
                                            return (
                                                <div key={idx} className="flex gap-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 group/item hover:border-slate-700 transition-all duration-300">
                                                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 shadow-inner group-hover/item:scale-105 transition-transform duration-500">
                                                        <Image src={item.image || '/soyol-logo.png'} alt={item.name || 'Бараа'} fill className="object-contain p-2" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                        <div>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="text-[15px] font-bold text-white line-clamp-2 leading-tight">
                                                                    {item.name || 'Тодорхойгүй бараа'}
                                                                </p>
                                                            </div>
                                                            
                                                            {/* Variants / Options */}
                                                            {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 ? (
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {Object.entries(item.selectedOptions).map(([key, val]) => (
                                                                        <div key={key} className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/50 flex flex-col">
                                                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider leading-none mb-1">{key === 'color' ? 'Өнгө' : key === 'size' ? 'Хэмжээ' : key}</span>
                                                                            <span className="text-[11px] text-amber-500 font-bold leading-none">{val}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-slate-600 mt-2 italic font-medium opacity-60">Сонголт байхгүй</p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
                                                            <p className="text-xs font-bold text-slate-500">
                                                                <span className="text-white">{item.quantity}</span> ш × {formatPrice(itemPrice)}
                                                            </p>
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-amber-500 tracking-tight">
                                                                    {formatPrice(itemPrice * item.quantity)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        {itemPrice === 0 && (
                                                            <p className="text-[9px] text-red-500 px-2 py-0.5 bg-red-500/10 rounded mt-2 flex items-center gap-1.5 w-fit font-bold">
                                                                <AlertCircle className="w-3 h-3" /> Үнэ тодорхойгүй
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Нийт төлбөр</p>
                                    <p className="text-xl font-black text-white">{formatPrice(selectedOrder.total || selectedOrder.totalPrice || 0)}</p>
                                </div>

                                <button
                                    onClick={handlePanelUpdate}
                                    disabled={updating || (editStatus === selectedOrder.status && editEstimate === selectedOrder.deliveryEstimate)}
                                    className="flex-1 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black transition-all disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
                                >
                                    {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    Шинэчлэх
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
