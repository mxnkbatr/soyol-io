"use client";

import Link from "next/link";
import {
  Sparkles,
  Package,
  Clock,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  Tag,
} from "lucide-react";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useProducts } from "@/lib/hooks/useProducts";
import { isReadyProduct, isPreOrderProduct } from "@/lib/productFilters";
import { type Product } from "@/models/Product";
import { triggerHaptic } from "@/lib/haptics";

// Dynamic imports for performance optimization
const PremiumProductGrid = dynamic(() => import("@/components/PremiumProductGrid"), { ssr: true });
const MobileHero = dynamic(() => import("@/components/MobileHero"), { ssr: true });
const MobileProductGrid = dynamic(() => import("@/components/MobileProductGrid"), { ssr: true });
const BannerSlider = dynamic(() => import("@/components/BannerSlider"), { ssr: false });
const SpecialProductsCarousel = dynamic(() => import("@/components/SpecialProductsCarousel"), { ssr: false });
const MobileFeaturedCarousel = dynamic(() => import("@/components/MobileFeaturedCarousel"), { ssr: false });
const InfiniteScrollTrigger = dynamic(() => import("@/components/InfiniteScrollTrigger"), { ssr: false });
const BottomSheet = dynamic(() => import("@/components/ui/BottomSheet"), { ssr: false });

type FilterType = "all" | "Бэлэн" | "Захиалга";
type SortType = "newest" | "price-low" | "price-high" | "name-az";

export default function HomePage() {
  const { currency, convertPrice } = useLanguage();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("name-az");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  // Scroll-hide filter bar
  const [filterBarVisible, setFilterBarVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Scroll direction tracking for filter bar hide/show
  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 60) {
        setFilterBarVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        setFilterBarVisible(false);
      } else if (currentY < lastScrollY.current - 5) {
        setFilterBarVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Home filter should follow business category tags first (sections: Бэлэн / Захиалга)
  // and fallback to stockStatus only when sections are missing.
  const {
    products: allProducts,
    isLoading: loading,
    isLoadingMore,
    isReachingEnd,
    size,
    setSize,
    error,
    mutate,
  } = useProducts({
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    limit: 40,
    ...(activeFilter !== "all" ? { section: activeFilter } : {}),
  });

  // Fetch featured products separately for carousels to keep them consistent across tabs
  const { products: featuredProducts, isLoading: loadingFeatured } =
    useProducts({ featured: true });

  // Normalize display stockStatus for badges
  const hasSection = (p: Product, label: string) =>
    Array.isArray((p as any).sections) && (p as any).sections.includes(label);

  const normalizedProducts = allProducts.map((p) => {
    const ready = isReadyProduct(p);
    const preorder = isPreOrderProduct(p);

    if (ready) return { ...p, stockStatus: "in-stock" as const };
    if (preorder) return { ...p, stockStatus: "pre-order" as const };
    return p;
  });

  let filteredProducts = [...normalizedProducts];

  if (activeFilter === "Бэлэн") {
    filteredProducts = normalizedProducts.filter((p) => isReadyProduct(p));
  } else if (activeFilter === "Захиалга") {
    filteredProducts = normalizedProducts.filter((p) => isPreOrderProduct(p));
  }

  // Apply price filter
  const minPriceNum = minPrice ? parseFloat(minPrice) : 0;
  const maxPriceNum = maxPrice ? parseFloat(maxPrice) : Infinity;

  if (minPrice || maxPrice) {
    filteredProducts = filteredProducts.filter(
      (p) => p.price >= minPriceNum && p.price <= maxPriceNum,
    );
  }

  // Sort by selected option (newest, price, name). Same list for all/ready/preorder tabs.
  let sortedProducts: Product[];
  const sortFunction = (a: Product, b: Product) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "name-az":
        return a.name.localeCompare(b.name);
      case "newest":
      default:
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
    }
  };

  if (activeFilter === "all") {
    sortedProducts = [...filteredProducts].sort(sortFunction);
  } else {
    sortedProducts = [...filteredProducts].sort(sortFunction);
  }

  // Get min and max prices for the current filter (converted to current currency)
  const prices = filteredProducts.map((p) => convertPrice(p.price));
  const suggestedMin =
    prices.length > 0
      ? Math.floor(Math.min(...prices) / (currency === "USD" ? 10 : 1000)) *
      (currency === "USD" ? 10 : 1000)
      : 0;
  const suggestedMax =
    prices.length > 0
      ? Math.ceil(Math.max(...prices) / (currency === "USD" ? 10 : 1000)) *
      (currency === "USD" ? 10 : 1000)
      : currency === "USD"
        ? 1000
        : 1000000;

  return (
    <>
      <div className="min-h-screen bg-[#F2F2F7] relative selection:bg-orange-500 selection:text-white pb-20 lg:pb-0">

      {/* MOBILE HERO */}
      <div className="lg:hidden">
        <MobileHero />
      </div>

      {/* Mobile Featured Products Carousel - Only on Mobile */}
      <div className="lg:hidden">
        {!loadingFeatured && featuredProducts.length > 0 && (
          <MobileFeaturedCarousel products={featuredProducts as any} />
        )}
      </div>

      {/* Hero Section with Filter Tabs */}
      <section className="pt-0 pb-4 sm:pt-0 sm:pb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-1 sm:px-4 md:px-6 lg:px-8">
          {/* Banner Slider - Always Visible on Desktop, Hidden on Mobile as we have MobileHero */}
          <div className="mb-12 hidden lg:block">
            <BannerSlider />
          </div>

          {/* Special Products Carousel */}
          {!loadingFeatured && featuredProducts.length > 0 && (
            <SpecialProductsCarousel products={featuredProducts as any} />
          )}

          {/* === MOBILE: Native-style Category Tabs + Sort === */}
          <div
            className="lg:hidden sticky z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100"
            style={{ top: "calc(52px + env(safe-area-inset-top, 0px))" }}
          >
            {/* Category Tabs Row - iOS UISegmentedControl Style */}
            <div className="px-4 pt-3.5 pb-1.5">
              <div className="bg-[#767680]/12 rounded-[9px] p-0.5 flex relative">
                {(["all", "Бэлэн", "Захиалга"] as const).map((f) => {
                  const isActive = activeFilter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        triggerHaptic();
                        setActiveFilter(f as FilterType);
                      }}
                      className="flex-1 relative py-1.5 text-[13px] font-bold select-none cursor-pointer transition-all duration-150"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSegmentControl"
                          className="absolute inset-0 bg-white rounded-[7px]"
                          style={{
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.06)"
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className={`relative z-10 block text-center transition-colors duration-150 ${
                        isActive ? "text-[#1C1C1E] font-bold" : "text-[#8E8E93] font-semibold hover:text-[#1C1C1E]"
                      }`}>
                        {f === "all" ? "Бүгд" : f}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort + Filter Row */}
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-xs text-gray-400 font-medium">
                {sortedProducts.length} бараа
              </span>
              <div className="flex-1" />
              {/* Sort select — styled natively */}
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 active:scale-95 transition-transform" onClick={() => triggerHaptic()}>
                <ArrowUpDown
                  className="w-3.5 h-3.5 text-gray-500"
                  strokeWidth={2}
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="text-xs font-semibold text-gray-700 bg-transparent outline-none cursor-pointer appearance-none"
                >
                  <option value="name-az">А-Я</option>
                  <option value="newest">Шинэ</option>
                  <option value="price-low">Хямд эхэлж</option>
                  <option value="price-high">Үнэтэй эхэлж</option>
                </select>
              </div>
              {/* Price filter button */}
              <button
                onClick={() => {
                  triggerHaptic();
                  setShowPriceFilter(!showPriceFilter);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${showPriceFilter || minPrice || maxPrice
                    ? "bg-[#FF4500] text-white"
                    : "bg-gray-100 text-gray-700"
                  }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
                Үнэ{minPrice || maxPrice ? " •" : ""}
              </button>
            </div>

          </div>

          {/* === DESKTOP: Old Filter Bar (unchanged) === */}
          <div
            className="hidden lg:flex items-center justify-between gap-4 mb-6 px-3 lg:px-0 flex-wrap sticky top-[52px] z-30 bg-white/80 backdrop-blur-md lg:bg-transparent py-2 lg:py-0 rounded-2xl lg:rounded-none"
            style={{ top: "calc(52px + env(safe-area-inset-top))" }}
          >
            <div className="flex items-center gap-2 lg:gap-3 flex-wrap overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl font-bold text-xs lg:text-sm transition-all duration-300 whitespace-nowrap ${activeFilter === "all"
                    ? "bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/25"
                    : "bg-white/50 text-gray-600 hover:bg-white border border-gray-100"
                  }`}
              >
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Sparkles
                    className="w-3 h-3 lg:w-3.5 lg:h-3.5"
                    strokeWidth={1.2}
                  />
                  <span>Бүгд</span>
                </div>
              </motion.button>

              {["Бэлэн", "Захиалга"].map((section) => {
                const Icon =
                  section === "Бэлэн"
                    ? Package
                    : section === "Захиалга"
                      ? Clock
                      : Tag;
                const isActive = activeFilter === section;

                return (
                  <motion.button
                    key={section}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveFilter(section as any)}
                    className={`px-4 py-2 lg:px-5 lg:py-2.5 rounded-2xl font-bold text-xs lg:text-sm transition-all duration-300 whitespace-nowrap ${isActive
                        ? "bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/25"
                        : "bg-white/50 text-gray-600 hover:bg-white border border-gray-100"
                      }`}
                  >
                    <div className="flex items-center gap-1.5 lg:gap-2">
                      <Icon
                        className="w-3 h-3 lg:w-3.5 lg:h-3.5"
                        strokeWidth={1.2}
                      />
                      <span>{section}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 lg:gap-3 ml-auto">
              <div className="flex items-center gap-2">
                <ArrowUpDown
                  className="w-4 h-4 text-gray-400"
                  strokeWidth={1.5}
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="px-3 py-2 lg:px-4 lg:py-2.5 text-xs lg:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 cursor-pointer"
                >
                  <option value="name-az">{t("filters", "nameAZ")}</option>
                  <option value="price-low">
                    {t("filters", "priceLowHigh")}
                  </option>
                  <option value="price-high">
                    {t("filters", "priceHighLow")}
                  </option>
                </select>
              </div>

              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPriceFilter(!showPriceFilter)}
                  className={`flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 text-xs lg:text-sm font-bold rounded-2xl transition-all duration-300 ${showPriceFilter || minPrice || maxPrice
                      ? "bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/25"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-[#FF4500]/20"
                    }`}
                >
                  <SlidersHorizontal
                    className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                    strokeWidth={1.2}
                  />
                  <span className="hidden sm:inline">
                    {t("filters", "price")}
                  </span>
                  {(minPrice || maxPrice) && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                      1
                    </span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {showPriceFilter && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-72 lg:w-80 bg-white rounded-xl shadow-2xl shadow-orange-100/20 border border-orange-100/50 p-4 lg:p-5 z-50"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <SlidersHorizontal
                            className="w-4 h-4 text-orange-500"
                            strokeWidth={1.5}
                          />
                          {t("filters", "priceFilter")}
                        </h3>
                        <button
                          onClick={() => setShowPriceFilter(false)}
                          className="p-1 hover:bg-gray-100 rounded-full transition"
                        >
                          <X
                            className="w-4 h-4 text-gray-400"
                            strokeWidth={1.5}
                          />
                        </button>
                      </div>

                      <div className="space-y-4 lg:space-y-5">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                              {t("filters", "minPrice")}
                            </span>
                            <span className="text-base lg:text-lg font-bold text-gray-900">
                              {currency === "USD" ? "$" : ""}
                              {minPrice || suggestedMin.toLocaleString()}
                              {currency === "MNT" ? "₮" : ""}
                            </span>
                          </div>
                          <div className="w-8 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 mx-2" />
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                              {t("filters", "maxPrice")}
                            </span>
                            <span className="text-base lg:text-lg font-bold text-gray-900">
                              {currency === "USD" ? "$" : ""}
                              {maxPrice || suggestedMax.toLocaleString()}
                              {currency === "MNT" ? "₮" : ""}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <input
                              type="number"
                              value={minPrice}
                              onChange={(e) => setMinPrice(e.target.value)}
                              placeholder={suggestedMin.toLocaleString()}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                            />
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              value={maxPrice}
                              onChange={(e) => setMaxPrice(e.target.value)}
                              placeholder={suggestedMax.toLocaleString()}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setMinPrice("");
                              setMaxPrice("");
                            }}
                            className="flex-1 px-3 py-2 text-xs lg:text-sm font-medium bg-gray-100 rounded-lg"
                          >
                            {t("filters", "clear")}
                          </button>
                          <button
                            onClick={() => setShowPriceFilter(false)}
                            className="flex-1 px-3 py-2 text-xs lg:text-sm font-bold text-white bg-orange-500 rounded-lg"
                          >
                            {t("filters", "apply")}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {error ? (
            <div className="text-center py-20 px-4">
              <p className="text-red-500">Error loading products.</p>
            </div>
          ) : loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3 px-3 lg:hidden"
            >
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.03)]"
                  >
                    <div className="aspect-square bg-[#F7F7F5] animate-pulse rounded-t-[20px]" />
                    <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2.5">
                      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-5/6" />
                      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-1/2" />
                      <div className="flex justify-between items-end mt-2">
                        <div className="h-5 bg-gray-100 rounded animate-pulse w-16" />
                        <div className="w-[34px] h-[34px] bg-gray-100 rounded-[12px] animate-pulse shrink-0" />
                      </div>
                    </div>
                  </div>
                ))}
            </motion.div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No products found.</p>
            </div>
          ) : (
            <>
              {/* Desktop Grid - Unified with featured first */}
              <div className="hidden lg:block">
                <PremiumProductGrid
                  products={sortedProducts.filter((p) => !p.featured)}
                  statusBadgeMode={
                    activeFilter === "Бэлэн"
                      ? "ready"
                      : activeFilter === "Захиалга"
                        ? "preorder"
                        : "default"
                  }
                />
              </div>

              {/* Mobile Grid - Regular products only (featured shown in carousel) */}
              <div className="lg:hidden">
                <MobileProductGrid
                  products={sortedProducts.filter((p) => !p.featured)}
                  statusBadgeMode={
                    activeFilter === "Бэлэн"
                      ? "ready"
                      : activeFilter === "Захиалга"
                        ? "preorder"
                        : "default"
                  }
                />
              </div>

              {/* Infinite Scroll Trigger */}
              <InfiniteScrollTrigger
                onLoadMore={() => setSize(size + 1)}
                hasMore={!isReachingEnd}
                isLoading={!!isLoadingMore}
              />
            </>
          )}
        </div>
      </section>

      {/* Footer CTA (Desktop only or adjusted) */}
      <section className="py-10 sm:py-12 bg-gray-50 border-t border-gray-200 mb-16 lg:mb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            {t("footer", "title")}
          </h3>
          {/* ... footer links */}
        </div>
      </section>
      </div>
      {/* Mobile Price Filter - Bottom Sheet (Moved outside sticky for correct fixed positioning) */}
      <BottomSheet
        isOpen={showPriceFilter}
        onClose={() => setShowPriceFilter(false)}
        title="Үнээр шүүх"
      >
        <div className="space-y-8 pt-2">
          {/* Native-style Price Inputs */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-tight ml-2">Үнийн интервал</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₮</div>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder={suggestedMin?.toLocaleString()}
                    className="w-full pl-8 pr-4 py-4 text-[17px] font-semibold bg-black/[0.03] border-transparent rounded-[18px] outline-none focus:bg-black/[0.01] focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-gray-300"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₮</div>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder={suggestedMax?.toLocaleString()}
                    className="w-full pl-8 pr-4 py-4 text-[17px] font-semibold bg-black/[0.03] border-transparent rounded-[18px] outline-none focus:bg-black/[0.01] focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Large Native Action Buttons */}
          <div className="flex flex-col gap-3 pb-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic();
                setShowPriceFilter(false);
              }}
              className="w-full py-4.5 text-[17px] font-bold text-white bg-[#FF4500] rounded-[18px] shadow-xl shadow-[#FF4500]/20 active:opacity-90 transition-all"
            >
              Үр дүнг харах
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic();
                setMinPrice("");
                setMaxPrice("");
              }}
              className="w-full py-4 text-[15px] font-bold text-gray-500 bg-black/[0.04] rounded-[18px] transition-all"
            >
              Бүгдийг арилгах
            </motion.button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
