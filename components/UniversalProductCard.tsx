"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion } from "framer-motion";
import SafeImage, { PRODUCT_PLACEHOLDER } from "@/components/SafeImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Clock } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Product } from "@/models/Product";
import ProductBadge from "@/components/ProductBadge";
import { triggerHaptic, hapticSuccess } from "@/lib/haptics";
import { prefetchImages } from "@/lib/imagePrefetch";
import { isWithin24Hours } from "@/lib/utils";
import { isReadyProduct, isPreOrderProduct } from "@/lib/productFilters";

interface UniversalProductCardProps {
  product: Product;
  index?: number;
  disableInitialAnimation?: boolean;
  statusBadgeMode?: "default" | "ready" | "preorder" | "new" | "sale";
  isAdmin?: boolean;
}

const UniversalProductCard = memo(({
  product: originalProduct,
  index = 0,
  disableInitialAnimation = false,
  statusBadgeMode = "default",
  isAdmin = false,
}: UniversalProductCardProps) => {
  const router = useRouter();
  const product = originalProduct;

  const { isAuthenticated } = useAuth();
  const addItem = useCartStore((state) => state.addItem);
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();
  const isWishlisted = isInWishlist(product.id);

  const isDragging = useRef(false);

  const allImages: string[] = (() => {
    const combined: string[] = [];
    if (product.image) combined.push(product.image);
    if (product.images?.length) {
      product.images.forEach((img) => {
        if (!combined.includes(img)) combined.push(img);
      });
    }
    return combined.length > 0 ? combined : [PRODUCT_PLACEHOLDER];
  })();

  const hasMultiple = allImages.length > 1;

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) *
        100,
      )
      : (product.discountPercent ?? 0);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    addItem(product);
    hapticSuccess();
    toast.success("Сагсанд нэмлээ", {
      style: {
        borderRadius: "10px",
        background: "#FF4500",
        color: "#fff",
        fontWeight: "600",
      },
      duration: 1500,
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Нэвтрэх шаардлагатай", { style: { borderRadius: "10px" } });
      return;
    }
    if (isWishlisted) {
      triggerHaptic();
      removeFromWishlist(product.id);
      toast.success("Хүслээс хассан", { style: { borderRadius: "10px" } });
    } else {
      triggerHaptic();
      addToWishlist({ ...product } as any);
      hapticSuccess();
      toast.success("Хүсэлд нэмсэн", { style: { borderRadius: "10px" } });
    }
  };

  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: "300px" }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group relative reveal-card gpu ${isVisible ? "visible" : ""} active:scale-[0.99] transition-transform`}
      style={{
        touchAction: "manipulation",
        contain: "layout style"
      }}
    >
      <div
        className="block cursor-pointer"
        onMouseEnter={() => prefetchImages([allImages[0]], 320, 60)}
        onTouchStart={() => prefetchImages([allImages[0]], 320, 60)}
        onClick={(e) => {
          router.push(`/product/${product.id}`);
        }}
      >
        <div className="bg-white rounded-[24px] overflow-hidden border border-[#E5E5EA]/45 shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.05)] hover:-translate-y-0.5">
          {/* ── Image area ─────────────────────────────── */}
          <div className="relative aspect-square w-full bg-[#F6F6F9] overflow-hidden rounded-t-[24px]">
            <SafeImage
              src={allImages[0]}
              alt={product.name}
              fill
              className="object-cover object-center transition-transform duration-500 lg:group-hover:scale-[1.03]"
              sizes="(max-width: 1024px) 42vw, 200px"
              quality={60}
              priority={index < 8}
              fallbackSrc={PRODUCT_PLACEHOLDER}
            />

            {/* ── Top-left badges ───────────────────────── */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
              {/* Ready Badge */}
              {(statusBadgeMode === "ready" ||
                (statusBadgeMode === "default" && isReadyProduct(product))) && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-[#34C759]/10 border border-[#34C759]/20 backdrop-blur-md rounded-full shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                    <span className="text-[9px] font-bold text-[#34C759] uppercase tracking-wider leading-none">
                      Бэлэн
                    </span>
                  </div>
                )}

              {/* Order Badge */}
              {(statusBadgeMode === "preorder" ||
                (statusBadgeMode === "default" && isPreOrderProduct(product))) && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-[#FF9500]/10 border border-[#FF9500]/20 backdrop-blur-md rounded-full shadow-sm">
                    <Clock className="w-2.5 h-2.5 text-[#FF9500]" strokeWidth={2.5} />
                    <span className="text-[9px] font-bold text-[#FF9500] uppercase tracking-wider leading-none">
                      Захиалга
                    </span>
                  </div>
                )}

              {statusBadgeMode === "new" && isWithin24Hours(product.createdAt) && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-[#007AFF]/10 border border-[#007AFF]/20 backdrop-blur-md rounded-full shadow-sm">
                  <span className="text-[9px] leading-none">✨</span>
                  <span className="text-[9px] font-bold text-[#007AFF] uppercase tracking-wider leading-none">
                    Шинэ
                  </span>
                </div>
              )}

              {statusBadgeMode === "sale" && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-[#FF3B30]/10 border border-[#FF3B30]/20 backdrop-blur-md rounded-full shadow-sm">
                  <span className="text-[9px] leading-none">🏷️</span>
                  <span className="text-[9px] font-bold text-[#FF3B30] uppercase tracking-wider leading-none">
                    Хямдрал
                  </span>
                </div>
              )}

              {/* Featured / New badge from product metadata (only in default mode to avoid conflict) */}
              {statusBadgeMode === "default" && (
                <ProductBadge
                  isFeatured={
                    product.featured ||
                    product.sections?.includes("Онцгой") ||
                    product.sections?.includes("Онцлох")
                  }
                  sections={product.sections}
                  createdAt={product.createdAt}
                />
              )}
            </div>

            {/* ── Wishlist button ── */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleWishlist}
              className={`absolute bottom-3 right-3 z-30 flex items-center justify-center transition-all w-7 h-7 sm:w-9 sm:h-9 rounded-full border ${isWishlisted
                ? "text-[#FF3B30] bg-[#FF3B30]/5 border-[#FF3B30]/20"
                : "text-[#8E8E93] bg-white/95 backdrop-blur-sm border-[#E5E5EA] shadow-sm active:bg-gray-50"
                }`}
            >
              {/* Mobile Heart */}
              <Heart
                className={`sm:hidden w-4.5 h-4.5 ${isWishlisted ? "fill-[#FF3B30] stroke-[#FF3B30]" : "fill-transparent stroke-[#8E8E93]"}`}
                strokeWidth={1.5}
              />
              {/* Desktop Heart */}
              <Heart
                className={`hidden sm:block w-4 h-4 ${isWishlisted ? "fill-red-500" : ""}`}
                strokeWidth={2}
              />
            </motion.button>
          </div>

          {/* ── Info area ──────────────────────────────── */}
          <div className="px-3.5 pt-3 pb-3.5 sm:px-5 sm:pt-5 sm:pb-5 flex flex-col gap-2.5 sm:gap-4">
            {/* Product name */}
            <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1C1C1E] leading-snug line-clamp-2 min-h-[42px] sm:min-h-[45px] tracking-tight group-hover:text-[#FF4500] transition-colors">
              {product.name} {product.isCargo && " + Карго"}
            </h3>

            {/* Footer Container (Pushed to bottom) */}
            <div className="mt-auto flex flex-col gap-2.5 sm:gap-4">
              {/* Inventory Level (Visible only for low stock <= 10) */}
              {product.inventory !== undefined &&
                product.inventory <= 10 &&
                product.inventory > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 leading-none">
                      Сүүлийн {product.inventory} ширхэг
                    </span>
                    <div className="w-full h-1 bg-[#E5E5EA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF3B30] rounded-full"
                        style={{ width: `${(product.inventory / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

              {/* Desktop: Price section separate */}
              <div className="hidden sm:flex flex-col gap-0.5">
                {product.originalPrice &&
                  product.originalPrice > product.price && (
                    <span className="text-[11px] sm:text-xs text-[#8E8E93] line-through font-medium leading-none">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                <div className="flex items-baseline gap-1">
                  <span className="text-[18px] sm:text-2xl font-bold text-[#FF4500] leading-none tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>

              {/* Desktop: Footer buttons row */}
              <div className="hidden sm:flex items-center gap-2">
                {isAdmin ? (
                  <Link
                    href={`/admin/products/${product.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden lg:flex flex-1 items-center justify-center py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider hover:bg-amber-500 hover:text-white hover:shadow-lg transition-all duration-300"
                  >
                    Засах
                  </Link>
                ) : (
                  <div className="hidden lg:flex flex-1 items-center justify-center py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900 font-bold text-xs uppercase tracking-wider group-hover:bg-gray-900 group-hover:text-white group-hover:shadow-lg transition-all duration-300">
                    Дэлгэрэнгүй
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleAddToCart}
                  className="lg:w-10 lg:h-10 w-9 h-9 flex items-center justify-center bg-[#FF4500] text-white rounded-[12px] shadow-[0_4px_12px_rgba(255,69,0,0.18)] active:bg-[#cc3700] transition-all shrink-0"
                >
                  <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={2} />
                </motion.button>
              </div>

              {/* Mobile: Footer row (Price & Cart Button merged) */}
              <div className="flex sm:hidden items-center justify-between gap-2 mt-1">
                <div className="flex flex-col">
                  {product.originalPrice &&
                    product.originalPrice > product.price && (
                      <span className="text-[11px] text-gray-400 line-through font-medium leading-none mb-1">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  <span className="text-[17px] font-bold text-[#FF4500] leading-none tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleAddToCart}
                    className="w-[32px] h-[32px] flex items-center justify-center bg-[#FF4500] text-white rounded-[10px] shadow-[0_4px_12px_rgba(255,69,0,0.18)] active:bg-[#cc3700] transition-all shrink-0"
                  >
                    <ShoppingCart
                      className="w-[16px] h-[16px]"
                      strokeWidth={2}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default UniversalProductCard;

