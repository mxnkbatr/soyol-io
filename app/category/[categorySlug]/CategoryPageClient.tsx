'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  Star,
  ShoppingCart,
  Grid,
  List,
  Package,
  ArrowRight,
  Heart,
  ChevronRight,
  Zap,
  TrendingUp,
  Clock
} from 'lucide-react';
import type { Category, Product } from '@/types/marketplace';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@store/cartStore';
import toast from 'react-hot-toast';

interface Props {
  initialCategory: Category;
  initialProducts: Product[];
  categorySlug: string;
}

export default function CategoryPageClient({ initialCategory, initialProducts, categorySlug }: Props) {
  const [category] = useState<Category>(initialCategory);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isSorting, setIsSorting] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleSortChange = async (newSort: string) => {
    setSortBy(newSort);
    setIsSorting(true);
    try {
      const res = await fetch(`/api/products?categorySlug=${categorySlug}&sortBy=${newSort}&limit=40`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      // keep existing
    } finally {
      setIsSorting(false);
    }
  };

  // Client-side sort fallback
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'popular': return (b.totalReviews || 0) - (a.totalReviews || 0);
      default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product as any);
    toast.success(`${product.name} сагсанд нэмэгдлээ!`, {
      duration: 2000,
      position: 'top-right',
      style: {
        background: '#1e293b',
        color: 'white',
        fontWeight: 'bold',
        borderRadius: '12px',
        padding: '16px',
      },
      icon: '🛒',
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden bg-slate-900 pt-32 pb-24 md:pt-40 md:pb-32 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-600/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-8 font-medium">
            <Link href="/" className="hover:text-white transition-colors">Нүүр</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-bold">{category.name}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-500 text-xs font-black uppercase tracking-widest mb-4">
                <Zap className="w-3.5 h-3.5" /> Discovery Mode
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-[0.9]">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed">
                  {category.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shrink-0">
              <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center text-3xl shadow-lg shadow-orange-500/20">
                {category.icon || '🛍️'}
              </div>
              <div>
                <p className="text-white font-black text-2xl">{sortedProducts.length}</p>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Бараа байна</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-12 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar w-full md:w-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Эрэмбэлэх:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-transparent text-sm font-black text-orange-600 focus:outline-none cursor-pointer"
              >
                <option value="newest">Шинэ бараа</option>
                <option value="popular">Алдартай</option>
                <option value="price-asc">Үнэ: Бага → Их</option>
                <option value="price-desc">Үнэ: Их → Бага</option>
              </select>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <p className="text-sm text-slate-400 font-medium">
              Нийт <span className="text-slate-900 font-black">{sortedProducts.length}</span> үр дүн
            </p>
          </div>
        </div>

        {/* Subcategories */}
        {category.children && category.children.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <TrendingUp className="w-4 h-4" /> Дэд ангиллууд
            </h3>
            <div className="flex flex-wrap gap-4">
              {category.children.map((subcat) => (
                <Link
                  key={subcat.id}
                  href={`/category/${subcat.slug}`}
                  className="group flex items-center gap-3 px-6 py-3.5 bg-white rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all shadow-sm hover:shadow-md"
                >
                  <span className="text-xl group-hover:scale-125 transition-transform">{subcat.icon || '📦'}</span>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-orange-600">{subcat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[40px] border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Бараа олдсонгүй</h3>
            <p className="text-slate-500 max-w-xs mx-auto mb-8">Уучлаарай, одоогоор энэ ангилалд бараа байхгүй байна.</p>
            <Link href="/" className="inline-flex items-center gap-2 px-8 py-3.5 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition shadow-lg shadow-orange-500/30">
              Нүүр хуудас руу буцах <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className={`relative ${isSorting ? 'opacity-60 pointer-events-none' : ''} transition-opacity`}>
            {isSorting && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6'
              : 'space-y-4'
            }>
              <AnimatePresence mode="popLayout">
                {sortedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
                    className="group bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <Link href={`/product/${product.id}`} className="block relative aspect-square w-full overflow-hidden bg-slate-50">
                      <Image
                        src={(product.images && product.images.length > 0) ? product.images[0] : '/soyol-logo.png'}
                        alt={product.name}
                        fill
                        className="object-cover object-center transition-transform duration-500 lg:group-hover:scale-105"
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        priority={index < 4}
                      />

                      <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-10 group-hover:translate-x-0 transition-transform duration-300">
                        <button className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-xl shadow-md transition-colors">
                          <Heart className="w-4 h-4" />
                        </button>
                      </div>

                      {product.featured && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                          Онцлох
                        </div>
                      )}

                      {product.stockStatus === 'pre-order' && (
                        <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Захиалгаар
                        </div>
                      )}
                    </Link>

                    <div className="p-4">
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                        ))}
                        <span className="text-[10px] font-black text-slate-400 ml-1">({product.totalReviews})</span>
                      </div>

                      <Link href={`/product/${product.id}`}>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-3 h-10 leading-tight group-hover:text-orange-600 transition-colors">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center justify-between">
                        <p className="text-lg font-black text-slate-900 tracking-tight">
                          {formatPrice(product.price)}
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleAddToCart(e, product)}
                          className="w-9 h-9 bg-slate-900 text-white rounded-xl hover:bg-orange-500 transition-colors flex items-center justify-center shadow-md"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
