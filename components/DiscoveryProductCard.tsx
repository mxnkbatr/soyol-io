'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeImage, { PRODUCT_PLACEHOLDER } from '@/components/SafeImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Eye, Package, Clock, TrendingUp, Zap, Sparkles, Star } from 'lucide-react';
import { formatPrice, formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import type { Product } from '@/models/Product';
import ProductBadge from '@/components/ProductBadge';
import { warmProductPage } from '@/lib/imagePrefetch';

import { useAuth } from '@/context/AuthContext';

interface DiscoveryProductCardProps {
  product: Product;
  index?: number;
  showTrendingBadge?: boolean;
  disableInitialAnimation?: boolean;
}

export default function DiscoveryProductCard({
  product,
  index = 0,
  showTrendingBadge = false,
  disableInitialAnimation = false
}: DiscoveryProductCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const isDragging = useRef(false);
  const addItem = useCartStore((state) => state.addItem);

  // Build images array: combine main image + additional images, deduplicate
  const allImages: string[] = (() => {
    const combined: string[] = [];
    if (product.image) combined.push(product.image);
    if (product.images?.length) {
      product.images.forEach(img => {
        if (!combined.includes(img)) combined.push(img);
      });
    }
    return combined.length > 0 ? combined : ['/soyol-logo.png'];
  })();

  const hasMultiple = allImages.length > 1;



  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem(product);
    toast.success('Сагсанд нэмэгдлээ', {
      duration: 2000,
      position: 'top-right',
      style: {
        background: '#1e293b',
        color: 'white',
        fontWeight: '500',
        borderRadius: '16px',
      },
      icon: '✓',
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Нэвтрэх шаардлагатай', {
        duration: 2000,
        position: 'top-right',
        style: {
          borderRadius: '16px',
        },
      });
      return;
    }

    setIsWishlisted(!isWishlisted);
    toast.success(
      isWishlisted ? 'Хүслээс хассан' : 'Хүсэлд нэмсэн',
      {
        duration: 1500,
        position: 'top-right',
        icon: isWishlisted ? '💔' : '❤️',
        style: {
          borderRadius: '16px',
        },
      }
    );
  };

  const InnerCard = () => (
    <motion.div
      whileHover={typeof window !== 'undefined' && window.innerWidth >= 1024 ? { scale: 1.02, y: -4 } : {}}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="relative bg-white rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 h-full flex flex-col touch-action-manipulation"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-50/50 overflow-hidden shrink-0">
        {/* Image Slider */}
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
            className="absolute inset-0"
          >
            <SafeImage
              key={activeIdx}
              src={allImages[activeIdx]}
              alt={product.name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 33vw, 25vw"
              quality={60}
              priority={index < 6 && activeIdx === 0}
              fallbackSrc="/soyol-logo.png"
            />
          </motion.div>
        ) : (
          <motion.div
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            <SafeImage
              src={allImages[0]}
              alt={product.name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 33vw, 25vw"
              quality={60}
              priority={index < 6}
              fallbackSrc="/soyol-logo.png"
            />
          </motion.div>
        )}

        {/* Dot Indicators */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveIdx(i); }}
                className={`rounded-full transition-all duration-300 ${activeIdx === i ? 'w-4 h-1.5 bg-[#FF5000]' : 'w-1.5 h-1.5 bg-slate-300/80'}`}
              />
            ))}
          </div>
        )}

        {/* Status Badges - Minimalist Pill Design (Top Left) */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5 pointer-events-none">
          <ProductBadge
            rating={product.rating}
            sections={product.sections}
            isFeatured={product.featured}
            createdAt={product.createdAt}
            showTrendingBadge={showTrendingBadge}
            className="z-10 shadow-sm scale-95 origin-top-left"
          />
          {product.stockStatus === 'in-stock' && (
            <div className="px-2.5 py-1 bg-emerald-50/90 backdrop-blur-md text-emerald-700 rounded-full flex items-center gap-1.5 border border-emerald-200/50 shadow-sm pointer-events-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">БЭЛЭН</span>
            </div>
          )}
          {product.stockStatus === 'pre-order' && (
            <div className="px-2.5 py-1 bg-blue-50/90 backdrop-blur-md text-blue-700 rounded-full flex items-center gap-1.5 border border-blue-200/50 shadow-sm pointer-events-auto">
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">ЗАХИАЛГА</span>
            </div>
          )}
        </div>

        {/* Wishlist Button - Minimal (Top Right) */}
        <div className="absolute top-2 right-2 z-10">
          <motion.button
            onClick={handleWishlist}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-xl backdrop-blur-md transition-all shadow-sm ${isWishlisted
              ? 'bg-red-500 text-white shadow-red-500/30'
              : 'bg-white/95 text-slate-400 hover:text-red-500 border border-slate-100'
              }`}
          >
            <Heart
              className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`}
              strokeWidth={2}
            />
          </motion.button>
        </div>
      </div>

      {/* Card Content - Premium Typography */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-zinc-900 line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors h-10 overflow-hidden">
            {product.name} {product.isCargo && " + Карго"}
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-zinc-900 tracking-tight">
              {formatPrice(product.price)}
            </p>
            <div className="flex items-center gap-1">
              <StarIcon className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              <span className="text-[10px] font-bold text-slate-400">{product.rating || 0}</span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between pt-2">
          <div className="flex flex-col gap-0.5">
            {product.inventory !== undefined && (
              <p className="text-[10px] font-medium text-gray-400">
                {product.inventory} бараа үлдсэн
              </p>
            )}
            {product.stockStatus === 'pre-order' && (
              <p className="text-[10px] font-bold text-purple-500 italic">
                14 хоног
              </p>
            )}
          </div>

          <motion.button
            onClick={handleQuickAdd}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 md:w-9 md:h-9 bg-[#FF5000] text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20 hover:bg-[#E64500] transition-all"
          >
            <ShoppingCartIcon className="w-4 h-4" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={disableInitialAnimation ? undefined : { opacity: 0, y: 20 }}
      whileInView={disableInitialAnimation ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={disableInitialAnimation ? undefined : {
        duration: 0.5,
        delay: index * 0.05,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      onHoverStart={() => {
        setIsHovered(true);
      }}
      onHoverEnd={() => {
        setIsHovered(false);
      }}
      className="group block h-full"
    >
      {product.id ? (
        <Link
          href={`/product/${product.id}`}
          className="block h-full"
          prefetch
          onTouchStart={() => warmProductPage(router, product.id, allImages)}
          onMouseEnter={() => warmProductPage(router, product.id, allImages)}
          onClick={(e) => { if (isDragging.current) e.preventDefault(); }}
        >
          <InnerCard />
        </Link>
      ) : (
        <div className="block cursor-not-allowed opacity-70 h-full">
          <InnerCard />
        </div>
      )}
    </motion.div>
  );
}

// Minimal Icons
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20">
    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
  </svg>
);

const ShoppingCartIcon = ({ className, strokeWidth }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth || 2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M9 21a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4z" />
  </svg>
);
