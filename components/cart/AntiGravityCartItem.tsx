'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import { Trash2, Minus, Plus, Check } from 'lucide-react';
import { useCartStore, type CartItem } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';

interface AntiGravityCartItemProps {
    item: CartItem;
}

export default function AntiGravityCartItem({ item }: AntiGravityCartItemProps) {
    const removeItem = useCartStore((state) => state.removeItem);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const toggleItemSelection = useCartStore((state) => state.toggleItemSelection);

    const [deliveryEstimate, setDeliveryEstimate] = React.useState<string | null>(null);
    const [removing, setRemoving] = useState(false);
    const [imgError, setImgError] = useState(false);

    React.useEffect(() => {
        if (item.stockStatus === 'pre-order') {
            // Static estimate — API дуудахгүй
            const today = new Date();
            const arrival = new Date(today.setDate(today.getDate() + 14));
            const month = arrival.toLocaleString('mn-MN', { month: 'long' });
            const day = arrival.getDate();
            setDeliveryEstimate(`${month}ын ${day}-нд ирэх төлөвтэй`);
        }
    }, [item.id, item.stockStatus]);

    // Animation controls
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemove = async () => {
        setIsRemoving(true);
        setTimeout(async () => {
            await removeItem(item.cartItemId);
        }, 300); // Wait for the exit animation
    };

    const handleUpdateQuantity = async (newQty: number) => {
        if (newQty < 1) return;
        await updateQuantity(item.cartItemId, newQty);
    };

    const discount = item.originalPrice && item.originalPrice > item.price;

    const isPreOrder = item.stockStatus === 'pre-order';

    const dragX = useMotionValue(0);
    const background = useTransform(
        dragX,
        [-80, 0],
        ['rgba(239,68,68,0.15)', 'rgba(255,255,255,0)']
    );
    const trashOpacity = useTransform(dragX, [-80, -30], [1, 0]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={isRemoving ? { opacity: 0, x: -60, scale: 0.95 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative overflow-hidden bg-white"
        >
            <motion.div
                drag="x"
                dragConstraints={{ left: -80, right: 0 }}
                dragElastic={0.08}
                style={{ x: dragX }}
                onDragEnd={(_, info) => {
                    if (info.offset.x < -60) handleRemove();
                    else dragX.set(0);
                }}
                className="relative z-10 flex items-center gap-3 p-4"
            >
                {/* Checkbox (Circular iOS style) */}
                <button
                    onClick={() => toggleItemSelection(item.cartItemId)}
                    className="p-1.5 -ml-1.5 shrink-0 flex-none outline-none cursor-pointer"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <motion.div
                        whileTap={{ scale: 0.85 }}
                        style={{ width: 22, height: 22, minWidth: 22, minHeight: 22 }}
                        className={`rounded-full flex items-center justify-center transition-all duration-200 ${item.selected
                            ? 'bg-[#FF4500] shadow-[0_2px_8px_rgba(255,69,0,0.25)]'
                            : 'bg-white border-2 border-[#D1D1D6]'
                            }`}
                    >
                        {item.selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
                    </motion.div>
                </button>

                {/* Product Image */}
                <div className="w-[68px] h-[68px] rounded-[16px] overflow-hidden bg-[#F6F6F9] shrink-0 flex items-center justify-center border border-[#E5E5EA]/40">
                    <Image
                        src={imgError ? '/soyol-logo.png' : (item.image || '/soyol-logo.png')}
                        onError={() => setImgError(true)}
                        alt={item.name}
                        width={68}
                        height={68}
                        className="object-contain p-1.5"
                    />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.id}`}>
                        <h3 className="text-[13.5px] font-semibold text-[#1C1C1E] leading-tight line-clamp-2 mb-1.5 tracking-tight">
                            {item.name}
                        </h3>
                    </Link>
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <p className="text-[10px] text-[#8E8E93] font-medium mb-2 truncate">
                            {Object.values(item.selectedOptions).join(' / ')}
                        </p>
                    )}
                    <div className="flex items-center justify-between">
                        {isPreOrder ? (
                            <span className="text-[9px] font-bold text-[#FF9500] bg-[#FF9500]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Захиалга
                            </span>
                        ) : (
                            <span className="text-[9px] font-bold text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Бэлэн
                            </span>
                        )}

                        {/* Qty stepper */}
                        <div
                            className="flex items-center bg-[#F2F2F7] rounded-full overflow-hidden"
                            style={{ height: 28 }}
                        >
                            <button
                                onClick={() => handleUpdateQuantity(item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                style={{ width: 28, height: 28, minWidth: 28 }}
                                className={`flex items-center justify-center transition-colors ${item.quantity <= 1 ? 'text-[#C7C7CC]' : 'text-[#3C3C43] active:bg-black/[0.06]'}`}
                            >
                                <Minus className="w-3 h-3" strokeWidth={2.5} />
                            </button>
                            <span style={{ width: 26 }} className="text-center text-[12px] font-bold text-[#1C1C1E] select-none">
                                {item.quantity}
                            </span>
                            <button
                                onClick={() => handleUpdateQuantity(item.quantity + 1)}
                                style={{ width: 28, height: 28, minWidth: 28 }}
                                className="flex items-center justify-center text-[#3C3C43] active:bg-black/[0.06] transition-colors"
                            >
                                <Plus className="w-3 h-3" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Price + Remove */}
                <div className="flex flex-col items-end justify-between self-stretch shrink-0 ml-1 py-0.5 gap-2">
                    <p className="text-[15px] font-bold text-[#1C1C1E] tracking-tight leading-none">
                        {formatPrice(item.price * item.quantity)}
                    </p>
                    <button
                        onClick={handleRemove}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#C7C7CC] active:bg-red-50 active:text-red-500 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

