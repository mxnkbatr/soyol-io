'use client';

import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ShoppingBag, ChevronRight, Check, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice, formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function TaobaoStickyFooter() {
    const router = useRouter();
    const items = useCartStore((state) => state.items);
    const toggleAllSelection = useCartStore((state) => state.toggleAllSelection);
    const selectedTotalItems = useCartStore((state) => state.getSelectedTotalItems());
    const selectedTotalPrice = useCartStore((state) => state.getSelectedTotalPrice());
    const selectedInStockPrice = useCartStore((state) => state.getSelectedTotalPriceByStatus('in-stock'));
    const selectedPreOrderPrice = useCartStore((state) => state.getSelectedTotalPriceByStatus('pre-order'));

    if (items.length === 0) return null;

    const allSelected = items.length > 0 && items.every((item) => item.selected);

    // Price animation hook
    const motionPrice = useMotionValue(selectedTotalPrice);
    const springPrice = useSpring(motionPrice, { stiffness: 100, damping: 20 });
    const displayPrice = useTransform(springPrice, (v) =>
        Math.round(v).toLocaleString('mn-MN')
    );

    useEffect(() => {
        motionPrice.set(selectedTotalPrice);
    }, [selectedTotalPrice, motionPrice]);

    return (
        <div className="w-full max-w-2xl mx-auto mb-10 z-[60]">
            <div className="w-full">
                <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 220, delay: 0.15 }}
                    className="bg-white rounded-[28px] border border-[#E5E5EA]/60 overflow-hidden"
                    style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}
                >
                    <div className="px-5 py-4 flex flex-col gap-4">

                        {/* Select all + subtotal pills */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => toggleAllSelection(!allSelected)}
                                className="flex items-center gap-2.5"
                            >
                                <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-200 ${allSelected ? 'bg-[#FF4500] shadow-[0_2px_8px_rgba(255,69,0,0.25)]' : 'border-2 border-[#D1D1D6] bg-white'
                                    }`}>
                                    {allSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
                                </div>
                                <span className="text-[14px] font-medium text-[#3C3C43]">Бүгдийг сонгох</span>
                            </button>

                            <div className="flex gap-1.5">
                                {selectedInStockPrice > 0 && (
                                    <div className="flex items-center gap-1 bg-[#34C759]/10 px-2.5 py-1 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                                        <span className="text-[11px] font-bold text-[#34C759]">
                                            Бэлэн: {formatCurrency(selectedInStockPrice)}₮
                                        </span>
                                    </div>
                                )}
                                {selectedPreOrderPrice > 0 && (
                                    <div className="flex items-center gap-1 bg-[#FF9500]/10 px-2.5 py-1 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF9500]" />
                                        <span className="text-[11px] font-bold text-[#FF9500]">
                                            Захиалга: {formatCurrency(selectedPreOrderPrice)}₮
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hairline divider */}
                        <div className="h-px bg-[#F2F2F7]" />

                        {/* Total + checkout */}
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] text-[#8E8E93] font-medium tracking-wide uppercase">
                                    Нийт ({selectedTotalItems} бараа)
                                </p>
                                <div className="flex items-baseline gap-0.5 mt-1">
                                    <motion.span className="text-[26px] font-black text-[#1C1C1E] tracking-tight leading-none">
                                        {displayPrice}
                                    </motion.span>
                                    <span className="text-[16px] font-bold text-[#FF4500] ml-0.5 leading-none">₮</span>
                                </div>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { if (selectedTotalItems === 0) return; router.push('/checkout'); }}
                                disabled={selectedTotalItems === 0}
                                className={`h-[54px] px-7 rounded-full flex items-center justify-center gap-2 font-bold text-[16px] transition-all ${selectedTotalItems > 0
                                    ? 'text-white shadow-[0_6px_20px_rgba(255,69,0,0.35)]'
                                    : 'bg-[#F2F2F7] text-[#C7C7CC] cursor-not-allowed'
                                    }`}
                                style={selectedTotalItems > 0 ? { background: 'linear-gradient(135deg, #FF6B00 0%, #FF4500 100%)' } : {}}
                            >
                                Захиалах
                                <ArrowRight className={`w-5 h-5 ${selectedTotalItems > 0 ? 'text-white/80' : 'text-[#C7C7CC]'}`} strokeWidth={2.5} />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

