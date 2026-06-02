'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Search, ShoppingCart, Eye, Sparkles,
  Zap, Tag, Globe, Truck, LayoutGrid, Award, Flame,
  Camera, Mic, ChevronRight, Clock, Star, X,
  Phone, Laptop, Watch, Headphones, Gamepad, Heart, Gift, MoreHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatPrice, getStarRating, getApiUrl } from '@lib/utils';
import { useCartStore } from '@store/cartStore';
import toast from 'react-hot-toast';
import UniversalProductCard from '@/components/UniversalProductCard';
import { useTranslation } from '@/hooks/useTranslation';
import { useProducts } from '@/lib/hooks/useProducts';
import { triggerHaptic } from '@/lib/haptics';

interface ProductItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  category: string;
  rating?: number;
  wholesale?: boolean;
  stockStatus?: 'in-stock' | 'pre-order';
}

function SearchContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = searchParams.get('q') ?? '';

  // Use the standard hook for search results
  const {
    products,
    isLoading: isLoadingResults,
    isLoadingMore: isLoadingMoreResults,
    isReachingEnd: isReachingEndResults,
    setSize: setSizeResults,
    size: sizeResults,
  } = useProducts({ q: q || undefined, limit: 12 });

  // Use the standard hook for recommendations
  const {
    products: recommended,
    isLoading: isLoadingRecommended,
    isLoadingMore: isLoadingMoreRecommended,
    isReachingEnd: isReachingEndRecommended,
    setSize: setSizeRecommended,
    size: sizeRecommended,
  } = useProducts({ limit: 10 });

  const [categories, setCategories] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const saved = localStorage.getItem('soyol-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  useEffect(() => {
    fetch(getApiUrl('/api/categories'))
      .then(res => {
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) return res.json();
        throw new Error('Invalid JSON');
      })
      .then(data => setCategories(data.categories || (Array.isArray(data) ? data : [])))
      .catch((err) => console.error('[Search] Categories fetch failed:', err));
  }, []);

  useEffect(() => {
    if (!q.trim()) return;

    setRecentSearches(prev => {
      const updated = [q, ...prev.filter(s => s !== q)].slice(0, 5);
      localStorage.setItem('soyol-recent-searches', JSON.stringify(updated));
      return updated;
    });
  }, [q]);

  const handleAddToCart = (product: any) => {
    addItem(product);
    toast.success(`${product.name} сагсанд нэмэгдлээ!`, {
      duration: 2000,
      position: 'top-right',
      style: {
        background: '#FF7900',
        color: 'white',
        fontWeight: 'bold',
        borderRadius: '12px',
      },
      icon: '🛒',
    });
  };

  const handleTagClick = (text: string) => {
    router.push(`/search?q=${encodeURIComponent(text)}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.015, delayChildren: 0.05 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    }
  };

  /* ─── DISCOVERY VIEW (no query) ─── */
  if (!q.trim()) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] pb-28">

        {/* Native iOS-style Search Header */}
        <div className="lg:hidden bg-white px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('nav', 'search')}</h1>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim();
              if (val) router.push(`/search?q=${encodeURIComponent(val)}`);
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                name="q"
                type="search"
                autoFocus
                defaultValue={q}
                onChange={(e) => {
                  clearTimeout((window as any).mobileSearchTimeout);
                  (window as any).mobileSearchTimeout = setTimeout(() => {
                    const val = e.target.value.trim();
                    if (val) router.replace(`/search?q=${encodeURIComponent(val)}`);
                    else router.replace(`/search`);
                  }, 400);
                }}
                placeholder="Бараа хайх..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#F2F2F7] rounded-[10px] text-[15px] text-gray-900 outline-none placeholder-gray-400"
              />
            </div>
          </form>
        </div>

        <div className="px-4 mt-5 space-y-7">

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <section>
              <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Сүүлд хайсан</h2>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((h, i) => (
                  <Link key={i} href={`/search?q=${encodeURIComponent(h)}`}>
                    <motion.span
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100"
                    >
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {h}
                    </motion.span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Category grid */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-bold text-gray-900">{t('nav', 'allCategories')}</h2>
              <Link href="/categories" className="flex items-center text-[#FF5000] text-sm font-semibold">
                Бүгд <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {categories.length > 0 ? (
              <>
                <motion.div
                  layout
                  className="grid grid-cols-4 gap-x-2 gap-y-5"
                >
                  <AnimatePresence initial={false}>
                    {categories.slice(0, isExpanded ? categories.length : 8).map((cat, idx) => (
                      <Link key={`scat-${idx}-${cat.id || cat._id || ''}`} href={`/categories?selected=${cat.id || cat._id}`}>
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2, delay: isExpanded ? idx * 0.01 : 0 }}
                          whileTap={{ scale: 0.93 }}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div className="w-16 h-16 rounded-[22px] bg-white shadow-sm border border-gray-100 flex items-center justify-center transition-colors active:bg-gray-50">
                            <span className="text-[26px]">{cat.icon || '📦'}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-500 text-center leading-tight line-clamp-2 px-0.5">
                            {cat.name}
                          </span>
                        </motion.div>
                      </Link>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {categories.length > 8 && (
                  <motion.button
                    layout
                    onClick={() => {
                      triggerHaptic();
                      setIsExpanded(!isExpanded);
                    }}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white/60 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-500 active:scale-98 transition-all"
                  >
                    {isExpanded ? 'Хураах' : 'Бүгдийг үзэх'}
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </motion.button>
                )}
              </>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-[22px] bg-white animate-pulse shadow-sm" />
                    <div className="w-12 h-2 bg-gray-200 animate-pulse rounded-full" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recommended products */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[#FF5000] rounded-full" />
              <h2 className="text-[17px] font-bold text-gray-900">Танд санал болгох</h2>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-3"
            >
              {recommended.map((product, index) => (
                <motion.div key={`srec-${product.id || 'empty'}-${index}`} variants={itemVariants}>
                  <UniversalProductCard product={product as any} index={index} />
                </motion.div>
              ))}
              {recommended.length === 0 && Array(4).fill(0).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-white rounded-2xl animate-pulse border border-gray-100 shadow-sm" />
              ))}
            </motion.div>

            {recommended.length > 0 && !isReachingEndRecommended && (
              <button
                onClick={() => {
                  triggerHaptic();
                  setSizeRecommended(sizeRecommended + 1);
                }}
                disabled={isLoadingMoreRecommended}
                className="w-full mt-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-gray-500 font-semibold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isLoadingMoreRecommended ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                    <span>Ачаалж байна...</span>
                  </>
                ) : (
                  'Илүүг үзэх'
                )}
              </button>
            )}
          </section>
        </div>
      </div>
    );
  }

  /* ─── LOADING STATE ─── */
  if (isLoadingResults && q.trim()) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] py-12 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="rounded-full h-12 w-12 border-b-2 border-[#FF5000] mx-auto mb-4"
          />
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Хайж байна...</p>
        </div>
      </div>
    );
  }

  /* ─── RESULTS VIEW ─── */
  return (
    <div className="min-h-screen bg-[#F2F2F7] pt-0 pb-28">
      {/* Sticky search bar on results page */}
      <div className="lg:hidden bg-white px-4 pt-3 pb-3 border-b border-gray-100 sticky top-0 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim();
            if (val) router.push(`/search?q=${encodeURIComponent(val)}`);
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="q"
              type="search"
              defaultValue={q}
              onChange={(e) => {
                clearTimeout((window as any).mobileSearchTimeoutResults);
                (window as any).mobileSearchTimeoutResults = setTimeout(() => {
                  const val = e.target.value.trim();
                  if (val) router.replace(`/search?q=${encodeURIComponent(val)}`);
                  else router.replace(`/search`);
                }, 500);
              }}
              placeholder="Бараа хайх..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#F2F2F7] rounded-[10px] text-[15px] text-gray-900 outline-none placeholder-gray-400"
            />
          </div>
        </form>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-black text-gray-900">"{q}"</h1>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
              {products.length === 0 ? 'Үр дүн олдсонгүй' : `${products.length} бараа`}
            </p>
          </div>
        </motion.div>

        {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[28px] shadow-sm border border-gray-100 px-6">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Search className="w-8 h-8 text-gray-200" strokeWidth={1.5} />
            </div>
            <p className="text-gray-800 font-black text-lg mb-1">Үр дүн олдсонгүй</p>
            <p className="text-gray-400 text-sm max-w-[200px] mx-auto mb-6">Өөр үгээр дахин хайж үзнэ үү</p>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-[#FF5000] text-white font-bold rounded-full shadow-lg shadow-orange-500/30 active:scale-95 transition-all text-sm"
            >
              Нүүр хуудас
            </Link>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          >
            {products.map((product, index) => (
              <motion.div key={`sres-${product.id || 'empty'}-${index}`} variants={itemVariants}>
                <UniversalProductCard product={product as any} index={index} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* View More for Results */}
        {products.length > 0 && !isReachingEndResults && (
          <div className="mt-8 pb-12">
            <button
              onClick={() => {
                triggerHaptic();
                setSizeResults(sizeResults + 1);
              }}
              disabled={isLoadingMoreResults}
              className="w-full py-4 bg-white border border-gray-200 rounded-2xl text-gray-500 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoadingMoreResults ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                  <span>Ачаалж байна...</span>
                </>
              ) : (
                'Илүүг үзэх'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF5000]" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
