'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Star, Truck, Sparkles } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import type { ChatProduct } from '@/lib/chatProducts';

interface ProductCardProps {
  product: Partial<ChatProduct> & { id: string; name: string; price: number };
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const getValidImageSrc = (src?: string) => {
    if (!src) return '/placeholder.png';
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('/')) {
      return src;
    }
    return `/${src}`;
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: getValidImageSrc(product.image),
      category: product.category || 'general',
      stockStatus: (product.stockStatus as any) || 'in-stock',
    });
    toast.success('Сагсанд нэмэгдлээ 🛒');
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('mn-MN').format(price) + '₮';

  const hasDiscount =
    product.originalPrice && product.originalPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const isReady = product.stockStatus === 'in-stock' || (product.stock ?? 0) > 0;

  return (
    <div className="w-full bg-white rounded-[20px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-100/80 my-1 not-prose group">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100">
          <Image
            src={getValidImageSrc(product.image)}
            alt={product.name}
            fill
            sizes="240px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.featured && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FF5000] text-white text-[10px] font-bold shadow-sm">
                <Sparkles className="w-2.5 h-2.5" /> Онцлох
              </span>
            )}
            {hasDiscount && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">
                -{discountPct}%
              </span>
            )}
          </div>
          {product.isCargo && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/75 text-white text-[10px] font-semibold backdrop-blur-sm">
              + Карго
            </span>
          )}
        </div>

        <div className="p-3.5">
          {product.category && (
            <p className="text-[10px] font-semibold text-[#FF5000] uppercase tracking-wide mb-1 truncate">
              {product.category}
            </p>
          )}
          <h4 className="font-bold text-slate-900 text-[13px] line-clamp-2 mb-2 leading-snug min-h-[2.5rem]">
            {product.name}
          </h4>

          <div className="flex items-center gap-1 mb-2.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < Math.round(product.rating || 0)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 fill-slate-200'
                }`}
              />
            ))}
            {(product.rating ?? 0) > 0 && (
              <span className="text-[10px] text-slate-400 ml-0.5">{product.rating?.toFixed(1)}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-3">
            <Truck className={`w-3 h-3 ${isReady ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span className={`text-[10px] font-medium ${isReady ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isReady ? 'Бэлэн' : 'Захиалга'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-black text-[#FF5000] text-[15px] block leading-none">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-slate-400 line-through">
                  {formatPrice(product.originalPrice!)}
                </span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              className="p-2.5 bg-[#FF5000] text-white rounded-xl hover:bg-[#E64500] active:scale-95 transition-all shadow-md shadow-orange-500/25 shrink-0"
              aria-label="Сагсанд нэмэх"
            >
              <ShoppingCart className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}
