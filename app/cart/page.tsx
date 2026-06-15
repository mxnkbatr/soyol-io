'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Check, Clock, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import AntiGravityCartItem from '@/components/cart/AntiGravityCartItem';
import TaobaoStickyFooter from '@/components/cart/TaobaoStickyFooter';
import UniversalProductCard from '@/components/UniversalProductCard';

import NativeHeader from '@/components/ui/NativeHeader';

export default function CartPage() {
    const { items, getTotalItems } = useCartStore();
    const { t } = useTranslation();

    const { data } = useSWR('/api/products?limit=4', (url) =>
        fetch(url).then(r => r.json())
    );
    const suggested = data?.products || [];

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] native-header-offset pb-28 flex flex-col items-center relative overflow-hidden lg:pt-0">
                <NativeHeader title={t('cart', 'title')} />

                <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-orange-400/8 blur-[90px] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    className="text-center w-full max-w-[400px] flex flex-col items-center px-6 relative z-10"
                >
                    {/* Icon */}
                    <motion.div
                        animate={{ y: [0, -7, 0] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="relative mb-8 mt-6"
                    >
                        <div className="w-28 h-28 rounded-[32px] bg-white shadow-[0_12px_40px_rgba(255,69,0,0.12)] flex items-center justify-center">
                            <ShoppingBag className="w-12 h-12 text-[#FF4500]" strokeWidth={1.5} />
                        </div>
                        <motion.span
                            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.8 }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#FF4500] block shadow-md shadow-orange-300/50"
                        />
                    </motion.div>

                    {/* Text */}
                    <h2 className="text-[22px] font-bold text-gray-900 tracking-tight mb-2 text-center">
                        Таны сагс хоосон байна
                    </h2>
                    <p className="text-[14px] text-gray-400 leading-relaxed text-center max-w-[220px] mb-9">
                        Сонирхсон бараагаа сагсандаа нэмж эхлээрэй
                    </p>

                    <Link href="/" className="w-full mb-10 block">
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="w-full py-4 bg-[#FF4500] text-white rounded-2xl font-bold text-[16px] shadow-[0_6px_20px_rgba(255,69,0,0.25)] flex items-center justify-center gap-2"
                        >
                            {t('cart', 'continueShopping')}
                            <ArrowRight className="w-5 h-5" strokeWidth={2} />
                        </motion.button>
                    </Link>

                    {/* Suggested Products */}
                    <div className="w-[100vw] px-4 overflow-x-hidden md:w-full md:px-0 text-left">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1 h-5 bg-[#FF4500] rounded-full" />
                            <span className="text-[16px] font-bold text-gray-900">Танд санал болгох</span>
                        </div>

                        <motion.div
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            variants={{
                                hidden: { opacity: 0 },
                                show: {
                                    opacity: 1,
                                    transition: {
                                        staggerChildren: 0.1
                                    }
                                }
                            }}
                            className="flex sm:grid sm:grid-cols-2 gap-4 pb-20 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
                        >
                            {suggested.length > 0
                                ? suggested.slice(0, 4).map((p: any, idx: number) => (
                                    <motion.div
                                        key={p.id}
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            show: { opacity: 1, y: 0 }
                                        }}
                                        transition={{ duration: 0.5 }}
                                        className="w-[160px] sm:w-auto shrink-0 snap-start"
                                    >
                                        <UniversalProductCard product={p} index={idx} disableInitialAnimation />
                                    </motion.div>
                                ))
                                : [1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-[160px] sm:w-auto shrink-0 snap-start aspect-square bg-white rounded-[28px] p-4 border border-gray-100 shadow-sm animate-pulse flex flex-col gap-3">
                                        <div className="flex-1 bg-gray-50 rounded-2xl" />
                                        <div className="h-4 w-3/4 bg-gray-100 rounded-full" />
                                        <div className="h-5 w-1/2 bg-gray-200 rounded-full" />
                                    </div>
                                ))
                            }
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        );
    }

    const readyItems = items.filter(i => i.stockStatus !== 'pre-order');
    const preOrderItems = items.filter(i => i.stockStatus === 'pre-order');

    return (
        <div className="min-h-screen bg-[#F2F2F7] native-header-offset pb-[calc(env(safe-area-inset-bottom)+260px)] lg:pb-[260px] lg:pt-0">
            <NativeHeader
                title={t('cart', 'title')}
                subtitle={`${getTotalItems()} бараа`}
            />

            <div className="max-w-2xl mx-auto px-4 mt-6">


                {/* Cart Sections */}
                <div className="space-y-10">
                    {/* Ready to Ship Section */}
                    {readyItems.length > 0 && (
                        <section>
                        <div className="flex items-center gap-2 mb-3.5 px-1">
                                <div className="w-2 h-2 rounded-full bg-[#34C759]" style={{ boxShadow: '0 0 8px rgba(52,199,89,0.4)' }} />
                                <span className="text-[12px] font-bold text-[#3C3C43] uppercase tracking-wider">Бэлэн бараанууд</span>
                                <div className="ml-auto text-[10px] font-bold text-[#34C759] bg-[#34C759]/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5" strokeWidth={3} /> Маргааш хүргэнэ
                                </div>
                            </div>
                            <div className="bg-white rounded-[20px] border border-[#E5E5EA]/45 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden divide-y divide-[#E5E5EA]/55">
                                <AnimatePresence mode="popLayout">
                                    {readyItems.map((item, index) => {
                                        // Cast to any to inspect dynamic fields without compilation blocks
                                        const anyItem = item as any;
                                        const variantId = anyItem.variantId || anyItem.selectedVariantId || anyItem.variant?.id || '';
                                        const optionPart = anyItem.selectedOptions ? JSON.stringify(anyItem.selectedOptions) : '';
                                        const stableKey = `${item.id}-${variantId}-${optionPart}-${index}`;

                                        return (
                                            <AntiGravityCartItem key={stableKey} item={item} />
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </section>
                    )}

                    {/* Pre-order Section */}
                    {preOrderItems.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-3.5 px-1">
                                <div className="w-2 h-2 rounded-full bg-[#FF9500]" style={{ boxShadow: '0 0 8px rgba(255,149,0,0.4)' }} />
                                <span className="text-[12px] font-bold text-[#3C3C43] uppercase tracking-wider">Захиалгын бараанууд</span>
                                <div className="ml-auto text-[10px] font-bold text-[#FF9500] bg-[#FF9500]/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" strokeWidth={2.5} /> 14 хоногт ирнэ
                                </div>
                            </div>
                            <div className="bg-white rounded-[20px] border border-[#E5E5EA]/45 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden divide-y divide-[#E5E5EA]/55">
                                <AnimatePresence mode="popLayout">
                                    {preOrderItems.map((item, index) => {
                                        // Cast to any to inspect dynamic fields without compilation blocks
                                        const anyItem = item as any;
                                        const variantId = anyItem.variantId || anyItem.selectedVariantId || anyItem.variant?.id || '';
                                        const optionPart = anyItem.selectedOptions ? JSON.stringify(anyItem.selectedOptions) : '';
                                        const stableKey = `${item.id}-${variantId}-${optionPart}-${index}`;

                                        return (
                                            <AntiGravityCartItem key={stableKey} item={item} />
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </section>
                    )}
                </div>

                {/* Inline Payment/Checkout Summary moved ABOVE suggested products */}
                <div className="mt-6">
                    <TaobaoStickyFooter />
                </div>

                {/* Recommendation Guide */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-5 px-1.5">
                        <h3 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest">Танд санал болгох</h3>
                        <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pb-8">
                        {suggested.length > 0
                            ? suggested.slice(0, 4).map((p: any, index: number) => (
                                <UniversalProductCard key={p.id} product={p} index={index} />
                            ))
                            : [1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="aspect-[3/4] bg-white rounded-[32px] border border-slate-100/50 shadow-sm animate-pulse flex flex-col p-4 gap-3"
                                >
                                    <div className="flex-1 bg-slate-50 rounded-2xl" />
                                    <div className="h-3 w-3/4 bg-slate-50 rounded-full" />
                                    <div className="h-4 w-1/2 bg-slate-50 rounded-full" />
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}