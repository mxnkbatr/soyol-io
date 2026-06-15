'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import SafeImage, { PRODUCT_PLACEHOLDER } from '@/components/SafeImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { type Product } from '@/models/Product';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import ProductBadge from '@/components/ProductBadge';
import { warmProductPage } from '@/lib/imagePrefetch';

interface MobileProductCardProps {
    product: Product;
}

export default function MobileProductCard({ product }: MobileProductCardProps) {
    const router = useRouter();
    const { convertPrice, currency } = useLanguage();
    const addItem = useCartStore((state) => state.addItem);
    const price = convertPrice(product.price);
    const [activeIdx, setActiveIdx] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const isDragging = useRef(false);

    // Build images array
    const allImages: string[] = (() => {
        const combined: string[] = [];
        if (product.image) combined.push(product.image);
        if (product.images?.length) {
            product.images.forEach(img => {
                if (!combined.includes(img)) combined.push(img);
            });
        }
        return combined.length > 0 ? combined : ['/placeholder.png'];
    })();

    const hasMultiple = allImages.length > 1;

    // Prices
    const formattedPrice = price.toLocaleString();

    return (
        <motion.div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-white rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex flex-col h-full transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
        >
            <Link
                href={`/product/${product.id}`}
                className="flex flex-col h-full"
                prefetch
                onTouchStart={() => warmProductPage(router, product.id, allImages)}
                onMouseEnter={() => warmProductPage(router, product.id, allImages)}
                onClick={(e) => { if (isDragging.current) e.preventDefault(); }}
            >
                {/* Image Section */}
                <div className="relative aspect-square overflow-hidden bg-[#F9F9F9] m-2 rounded-[18px]">
                    <motion.div
                        animate={{ scale: isHovered ? 1.05 : 1 }}
                        transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                        className="w-full h-full relative"
                    >
                        {hasMultiple ? (
                            <motion.div
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.1}
                                onDragStart={() => { isDragging.current = true; }}
                                onDragEnd={(_, info) => {
                                    if (Math.abs(info.offset.x) > 50) {
                                        if (info.offset.x < 0 && activeIdx < allImages.length - 1) setActiveIdx(p => p + 1);
                                        else if (info.offset.x > 0 && activeIdx > 0) setActiveIdx(p => p - 1);
                                    }
                                    setTimeout(() => { isDragging.current = false; }, 10);
                                }}
                                animate={{ x: `-${activeIdx * 100}%` }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="flex w-full h-full"
                            >
                                {allImages.map((img, i) => (
                                    <div key={i} className="w-full h-full shrink-0 relative">
                                        <SafeImage
                                            src={img}
                                            alt={product.name}
                                            fill
                                            sizes="(max-width: 768px) 50vw"
                                            className="object-cover"
                                            quality={60}
                                            priority={i === 0}
                                            fallbackSrc={PRODUCT_PLACEHOLDER}
                                        />
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <SafeImage
                                src={allImages[0]}
                                alt={product.name}
                                fill
                                sizes="(max-width: 768px) 50vw"
                                className="object-cover"
                                quality={60}
                                fallbackSrc={PRODUCT_PLACEHOLDER}
                            />
                        )}
                    </motion.div>

                    {/* Glassmorphism Badges */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                        {product.stockStatus === 'in-stock' && (
                            <div className="px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-sm transition-opacity duration-300">
                                <span className="text-[10px] font-medium text-gray-800 tracking-wider">БЭЛЭН</span>
                            </div>
                        )}
                        {product.stockStatus === 'pre-order' && (
                            <div className="px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-sm transition-opacity duration-300">
                                <span className="text-[10px] font-medium text-blue-600 tracking-wider">ЗАХИАЛГА</span>
                            </div>
                        )}
                    </div>

                    {/* Dot Indicators */}
                    {hasMultiple && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                            {allImages.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 rounded-full transition-all duration-300 ${activeIdx === i ? 'w-4 bg-white shadow-sm' : 'w-1 bg-white/40'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="p-4 pt-2 flex flex-col flex-1 justify-between gap-3">
                    <div className="space-y-1.5">
                        <h3 className="text-[15px] font-medium text-gray-800 line-clamp-2 leading-snug tracking-tight">
                            {product.name} {product.isCargo && " + Карго"}
                        </h3>
                    </div>

                    <div className="flex items-end justify-between">
                        {/* Price Section */}
                        <div className="flex flex-col">
                            {product.originalPrice && product.originalPrice > product.price && (
                                <span className="text-[11px] font-medium text-gray-400 line-through mb-0.5">
                                    {(product.originalPrice || 0).toLocaleString()}₮
                                </span>
                            )}
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-xl font-bold text-gray-900">
                                    {formattedPrice}
                                </span>
                                <span className="text-lg font-bold text-[#FF5722]">₮</span>
                            </div>
                        </div>

                        {/* Animated Cart Button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addItem({
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                    image: product.image || '',
                                    stockStatus: (product.stockStatus as any) || 'in-stock',
                                    category: product.category || '',
                                    description: product.description || undefined,
                                });
                                toast.success('Сагсанд нэмлээ', {
                                    style: { borderRadius: '14px', background: '#333', color: '#fff', fontSize: '13px' },
                                    duration: 1500,
                                });
                            }}
                            className="relative h-10 flex items-center bg-[#FF5722] text-white rounded-full transition-all duration-300 overflow-hidden px-3 hover:px-4"
                        >
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" strokeWidth={2} />
                                <motion.span
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{
                                        width: isHovered ? 'auto' : 0,
                                        opacity: isHovered ? 1 : 0
                                    }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    className="whitespace-now8 text-[13px] font-bold overflow-hidden"
                                >
                                    Сагслах
                                </motion.span>
                            </div>
                        </motion.button>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

