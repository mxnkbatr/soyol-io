"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import Image from "next/image";
import {
  X,
  Heart,
  ShoppingBag,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  ArrowRight,
  Star,
  ChevronLeft,
  ChevronRight,
  Share2,
  Clock,
  Check,
  Package,
  CreditCard,
  ChevronDown,
  Headphones,
} from "lucide-react";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, isWithin24Hours } from "@/lib/utils";
import { Product } from "@/models/Product";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";
import RelatedProducts from "./RelatedProducts";
import ProductReviews from "./ProductReviews";
import { openExternalLink } from "@/lib/openExternalLink";

export type ProductDetailData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice?: number;
  discount?: number;
  discountPercent?: number;
  image: string | null;
  images?: string[];
  category: string;
  stockStatus: string;
  inventory?: number;
  shippingOrigin?: string;
  shippingDestination?: string;
  dispatchTime?: string;
  sizeGuideUrl?: string;
  brand?: string;
  model?: string;
  delivery?: string;
  paymentMethods?: string;
  createdAt?: string;
  updatedAt?: string;
  sections?: string[];
  featured?: boolean;
  isCargo?: boolean;
  relatedProducts?: Product[];
  attributes?: Record<string, any>;
  reviews?: any[];
  options?: any[];
  variants?: any[];
  subcategory?: string;
  deliveryFee?: number;
  rating?: number;
};

/* ─── haptic helper ─── */
async function haptic(style: "light" | "medium" | "heavy" = "light") {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: style === "heavy" ? ImpactStyle.Heavy : style === "medium" ? ImpactStyle.Medium : style === "light" ? ImpactStyle.Light : ImpactStyle.Light });
  } catch {}
}

/* ─── spring config presets ─── */
const SPRING_SNAP = { type: "spring", stiffness: 400, damping: 35 } as const;
const SPRING_GENTLE = { type: "spring", stiffness: 280, damping: 30 } as const;

export function ProductDetailClient({
  product,
  initialReviews,
}: {
  product: ProductDetailData;
  initialReviews: any[];
}) {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuth();

  const { data: categoriesData } = useSWR("/api/categories", (url) =>
    fetch(url).then((r) => r.json()),
  );
  const categories = categoriesData?.categories || [];

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [addedToCart, setAddedToCart] = useState(false);
  const [buying, setBuying] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Restock notify states
  const [notifying, setNotifying] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth >= 1024) {
        setShowStickyBar(window.scrollY > 400);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* touch-drag for image gallery */
  const dragX = useMotionValue(0);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (product.options?.length) {
      const initial: Record<string, string> = {};
      product.options.forEach((opt: any) => {
        if (opt.values.length === 1) initial[opt.name] = opt.values[0];
      });
      if (Object.keys(initial).length > 0)
        setSelectedOptions((prev) => ({ ...prev, ...initial }));
    }
  }, [product.options]);

  const selectedVariant = useMemo(() => {
    if (!product.variants?.length) return null;
    return (
      product.variants.find((v: any) =>
        product.options?.every(
          (opt: any) => v.options[opt.name] === selectedOptions[opt.name],
        ),
      ) || null
    );
  }, [selectedOptions, product.variants, product.options]);

  const displayPrice = selectedVariant?.price || product.price;
  const displayInventory = selectedVariant
    ? selectedVariant.inventory
    : (product.inventory ?? 0);
  const isOutOfStock = product.options?.length
    ? !selectedVariant || displayInventory <= 0
    : displayInventory <= 0;

  const isPreorder = product.sections?.includes("Захиалга") || product.stockStatus === "pre-order";
  const isReady = product.sections?.includes("Бэлэн") || product.stockStatus === "in-stock";

  const canAddToCart =
    !isOutOfStock &&
    (!product.options?.length ||
      (product.options.every((o: any) => selectedOptions[o.name]) &&
        selectedVariant &&
        selectedVariant.inventory > 0));

  const { addItem, toggleAllSelection } = useCartStore();

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/user/wishlist?productId=${product.id}`)
      .then((r) => r.json())
      .then((data) => setIsWishlisted(!!data.isWishlisted))
      .catch(() => null);
  }, [product.id, isAuthenticated]);

  const images: string[] = (() => {
    const combined: string[] = [];
    if (product.image) combined.push(product.image);
    if (product.images?.length) {
      product.images.forEach((img) => {
        if (!combined.includes(img)) combined.push(img);
      });
    }
    return combined.length > 0 ? combined : ["/placeholder-product.png"];
  })();

  const discount =
    product.originalPrice && product.originalPrice > displayPrice
      ? Math.round(
          ((product.originalPrice - displayPrice) / product.originalPrice) * 100,
        )
      : 0;

  const categoryObj = categories.find((c: any) => c.id === product.category);
  const categoryName = categoryObj ? categoryObj.name : product.category;

  const handleWishlist = async () => {
    await haptic("medium");
    if (!isAuthenticated)
      return toast.error("Нэвтрэх шаардлагатай");
    const next = !isWishlisted;
    setIsWishlisted(next);
    try {
      await fetch("/api/user/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      toast.success(next ? "Хүсэлд нэмсэн ♥" : "Хүслээс хассан");
    } catch {
      setIsWishlisted(!next);
      toast.error("Алдаа гарлаа");
    }
  };

  const handleShare = async () => {
    await haptic("light");
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url: window.location.href }); } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Холбоос хуулагдлаа");
    }
  };

  const handleNotify = async () => {
    if (!isAuthenticated) {
      haptic("medium");
      toast.error("Нэвтрэх шаардлагатай");
      router.push("/sign-in");
      return;
    }

    setNotifying(true);
    try {
      const res = await fetch(`/api/products/${product.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        haptic("heavy");
        setRequested(true);
        toast.success("Бараа ирэхэд мэдэгдэнэ!");
      } else {
        haptic("heavy");
        toast.error("Мэдэгдэл бүртгэхэд алдаа гарлаа.");
      }
    } catch (error) {
      console.error("Failed to register restock watcher:", error);
      toast.error("Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setNotifying(false);
    }
  };

  const handleAddToCart = async () => {
    if (product.options?.length && !product.options.every((o: any) => selectedOptions[o.name])) {
      await haptic("heavy");
      toast.error("Сонголтуудаа гүйцэд сонгоно уу");
      document.getElementById("product-options-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (isOutOfStock) {
      await haptic("heavy");
      toast.error("Үлдэгдэл хүрэлцэхгүй байна");
      return;
    }
    await haptic("medium");
    addItem(
      {
        ...product,
        image: product.image || "",
        stockStatus: product.stockStatus as any,
        description: product.description || undefined,
        price: displayPrice,
        variantId: selectedVariant?.id,
        selectedOptions: product.options?.length ? selectedOptions : undefined,
      },
      quantity,
      false,
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
    toast.success("Сагсанд нэмлээ!", {
      style: { borderRadius: "12px", background: "#1c1c1e", color: "#fff", fontWeight: "600" },
    });
  };

  const handleBuyNow = async () => {
    if (product.options?.length && !product.options.every((o: any) => selectedOptions[o.name])) {
      await haptic("heavy");
      toast.error("Сонголтуудаа гүйцэд сонгоно уу");
      document.getElementById("product-options-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (isOutOfStock) {
      await haptic("heavy");
      toast.error("Үлдэгдэл хүрэлцэхгүй байна");
      return;
    }
    await haptic("heavy");
    setBuying(true);
    toggleAllSelection(false);
    await addItem(
      {
        ...product,
        image: product.image || "",
        stockStatus: product.stockStatus as any,
        description: product.description || undefined,
        price: displayPrice,
        variantId: selectedVariant?.id,
        selectedOptions: product.options?.length ? selectedOptions : undefined,
      },
      quantity,
      true,
    );
    router.push("/checkout");
  };

  /* swipe image on mobile */
  const handleSwipe = (direction: "left" | "right") => {
    haptic("light");
    if (direction === "left" && activeImageIndex < images.length - 1)
      setActiveImageIndex((p) => p + 1);
    else if (direction === "right" && activeImageIndex > 0)
      setActiveImageIndex((p) => p - 1);
  };

  return (
    <>
      {/* ─── Global CSS injected once ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .nat-root { font-family: -apple-system, 'SF Pro Display', 'Inter', BlinkMacSystemFont, sans-serif; -webkit-font-smoothing: antialiased; }
        .nat-root * { box-sizing: border-box; }
        .nat-sb::-webkit-scrollbar { display: none; }
        .nat-sb { scrollbar-width: none; -ms-overflow-style: none; }
        @keyframes nat-check { 0%{transform:scale(0.4) rotate(-10deg);opacity:0} 60%{transform:scale(1.25) rotate(4deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        .nat-check { animation: nat-check 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes nat-badge-pop { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        .nat-badge-pop { animation: nat-badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .nat-buy-btn { background: linear-gradient(135deg, #FF5000 0%, #FF3000 100%); }
        .nat-buy-btn:active { background: linear-gradient(135deg, #E64800 0%, #CC2800 100%); transform: scale(0.97); }
        .nat-cart-btn:active { transform: scale(0.96); }
        @keyframes nat-shimmer { 0%{opacity:1} 50%{opacity:0.7} 100%{opacity:1} }
        .nat-buying { animation: nat-shimmer 0.8s ease infinite; }
      `}} />

      <div className="nat-root min-h-screen bg-[#F2F2F7]">

        {/* ══════════════════════════════════════
            MOBILE FULL-SCREEN LAYOUT
        ══════════════════════════════════════ */}

        {/* ─── STICKY NATIVE HEADER (mobile) ─── */}
        <div
          className="lg:hidden fixed top-0 left-0 right-0 z-[120] bg-white/90 backdrop-blur-xl border-b border-black/[0.08]"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex items-center justify-between px-4 h-[44px]">
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={SPRING_SNAP}
              onClick={() => { haptic("light"); router.back(); }}
              className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-black/[0.06] active:bg-black/[0.12]"
            >
              <ChevronLeft className="w-4 h-4 text-gray-800" strokeWidth={2.8} />
            </motion.button>

            <p className="text-[15px] font-semibold text-gray-900 truncate max-w-[180px] text-center">{categoryName}</p>

            <div className="flex items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.88 }}
                transition={SPRING_SNAP}
                onClick={handleShare}
                className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-black/[0.06] active:bg-black/[0.12]"
              >
                <Share2 className="w-3.5 h-3.5 text-gray-700" strokeWidth={2.2} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                transition={SPRING_SNAP}
                onClick={handleWishlist}
                className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-black/[0.06] active:bg-black/[0.12]"
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-all duration-200 ${isWishlisted ? "fill-red-500 text-red-500 scale-110" : "text-gray-700"}`}
                  strokeWidth={2.2}
                />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ─── MAIN SCROLL CONTENT ─── */}
        <div
          className="lg:max-w-6xl lg:mx-auto lg:px-6 lg:pb-12 pb-[calc(130px+env(safe-area-inset-bottom,0px))]"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 44px)" }}
        >

          {/* Desktop breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 pt-6 pb-4 text-[13px] text-gray-400">
            <Link href="/" className="hover:text-gray-600 transition-colors">Нүүр</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-600 font-medium">{categoryName}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-800 font-semibold line-clamp-1">{product.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:gap-8 lg:pt-2">

            {/* ════════════════════════════
                IMAGE GALLERY
            ════════════════════════════ */}
            <div className="lg:w-[52%] lg:sticky lg:top-6 lg:self-start">

              {/* Main image box */}
              <div
                className="relative bg-white lg:rounded-2xl overflow-hidden"
                style={{ aspectRatio: "1/1" }}
              >
                {/* Swipe layer (mobile) */}
                <div
                  className="lg:hidden absolute inset-0 z-10"
                  onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    const dx = e.changedTouches[0].clientX - touchStartX.current;
                    if (Math.abs(dx) > 40) handleSwipe(dx < 0 ? "left" : "right");
                  }}
                />

                {/* Image carousel */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeImageIndex}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="absolute inset-0 p-6 lg:p-10 cursor-zoom-in"
                    onClick={() => setShowLightbox(true)}
                  >
                    <Image
                      src={images[activeImageIndex]}
                      alt={product.name}
                      fill
                      className="object-contain pointer-events-none"
                      priority={activeImageIndex === 0}
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Overlayed badges */}
                <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
                  {discount > 0 && (
                    <div className="nat-badge-pop bg-[#FF5000] text-white text-[11px] font-black px-2.5 py-1 rounded-[8px] leading-none shadow-sm">
                      -{discount}%
                    </div>
                  )}
                  {product.sections?.includes("Шинэ") && isWithin24Hours(product.createdAt) && (
                    <div className="nat-badge-pop bg-[#007AFF] text-white text-[11px] font-black px-2.5 py-1 rounded-[8px] leading-none shadow-sm">
                      ШИНЭ
                    </div>
                  )}
                </div>

                {/* Desktop action buttons (top-right) */}
                <div className="hidden lg:flex absolute top-3 right-3 flex-col gap-2 z-20">
                  {[
                    { icon: Share2, action: handleShare },
                    { icon: Heart, action: handleWishlist, active: isWishlisted },
                  ].map(({ icon: Icon, action, active }) => (
                    <motion.button
                      key={Icon.displayName}
                      whileTap={{ scale: 0.88 }}
                      transition={SPRING_SNAP}
                      onClick={action}
                      className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-black/[0.08] shadow-sm hover:shadow-md transition-shadow"
                    >
                      <Icon
                        className={`w-4 h-4 ${(active as any) ? "fill-red-500 text-red-500" : "text-gray-500"}`}
                        strokeWidth={2}
                      />
                    </motion.button>
                  ))}
                </div>

                {/* Desktop prev/next */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => { haptic("light"); setActiveImageIndex(p => Math.max(0, p - 1)); }}
                      disabled={activeImageIndex === 0}
                      className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white rounded-full items-center justify-center border border-black/[0.08] shadow-md disabled:opacity-25 hover:shadow-lg transition-shadow"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => { haptic("light"); setActiveImageIndex(p => Math.min(images.length - 1, p + 1)); }}
                      disabled={activeImageIndex === images.length - 1}
                      className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white rounded-full items-center justify-center border border-black/[0.08] shadow-md disabled:opacity-25 hover:shadow-lg transition-shadow"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </button>
                  </>
                )}

                {/* Mobile dots */}
                {images.length > 1 && (
                  <div className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
                    {images.map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ width: activeImageIndex === i ? 20 : 6, opacity: activeImageIndex === i ? 1 : 0.35 }}
                        transition={SPRING_SNAP}
                        onClick={() => { haptic("light"); setActiveImageIndex(i); }}
                        className="h-[5px] rounded-full bg-[#FF5000]"
                      />
                    ))}
                  </div>
                )}

                {/* Image counter pill */}
                {images.length > 1 && (
                  <div className="lg:hidden absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full z-20">
                    {activeImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>

              {/* Thumbnail row */}
              {images.length > 1 && (
                <div className="flex gap-2.5 mt-3 px-4 lg:px-0 nat-sb overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.9 }}
                      transition={SPRING_SNAP}
                      onClick={() => { haptic("light"); setActiveImageIndex(i); }}
                      className={`relative shrink-0 w-16 h-16 rounded-2xl bg-white overflow-hidden transition-all duration-200 ${
                        activeImageIndex === i
                          ? "ring-2 ring-[#FF5000] ring-offset-1"
                          : "ring-1 ring-black/[0.08] opacity-50 hover:opacity-80"
                      }`}
                    >
                      <Image src={img} alt="" fill className="object-contain p-1.5" sizes="64px" />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* ════════════════════════════
                PRODUCT INFORMATION
            ════════════════════════════ */}
            <div className="lg:w-[48%] flex flex-col gap-3 mt-3 lg:mt-0">

              {/* ── MAIN PRODUCT CARD ── */}
              <div className="bg-white lg:rounded-2xl px-4 pt-5 pb-6 lg:px-7 lg:py-7">

                {/* Brand */}
                {product.brand && (
                  <p className="text-[11px] font-bold text-[#FF5000] uppercase tracking-[0.12em] mb-1.5">
                    {product.brand}
                  </p>
                )}

                {/* Name */}
                <h1 className="text-[17px] lg:text-[20px] font-bold text-gray-900 leading-snug mb-2.5 tracking-[-0.3px]">
                  {product.name}
                  {product.isCargo && (
                    <span className="ml-2 text-[13px] font-semibold text-[#FF5000]">+ Карго</span>
                  )}
                </h1>

                {/* Star rating */}
                {product.rating && product.rating > 0 ? (
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-[13px] h-[13px] ${s <= Math.round(product.rating!) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[12px] font-semibold text-gray-500">{product.rating.toFixed(1)}</span>
                  </div>
                ) : null}

                {/* Price block */}
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-[28px] lg:text-[32px] font-black text-gray-900 tracking-[-1px] leading-none">
                    {formatPrice(displayPrice)}
                  </span>
                  {product.originalPrice && product.originalPrice > displayPrice && (
                    <>
                      <span className="text-[14px] text-gray-400 line-through font-medium mb-0.5">
                        {formatPrice(product.originalPrice)}
                      </span>
                      <span className="text-[13px] font-bold text-[#FF5000] mb-0.5">-{discount}%</span>
                    </>
                  )}
                </div>

                {quantity > 1 && (
                  <p className="text-[12px] text-gray-400 mb-2">
                    {quantity}ш × {formatPrice(displayPrice)} ={" "}
                    <strong className="text-gray-800 font-bold">{formatPrice(displayPrice * quantity)}</strong>
                  </p>
                )}

                {/* Cargo warning */}
                {product.isCargo && (
                  <div className="flex items-center gap-2 text-[#FF5000] text-[12px] font-semibold bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 mb-3">
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    Карго бараа — хүргэлт тусдаа тооцогдоно
                  </div>
                )}

                {/* Stock status pill */}
                <div className="flex items-center gap-2 mb-5">
                  {isOutOfStock ? (
                    <span className="text-[12px] font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                      Дууссан
                    </span>
                  ) : isPreorder ? (
                    <span className="text-[12px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Захиалгаар
                    </span>
                  ) : (
                    <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Бэлэн байна
                    </span>
                  )}
                  {displayInventory > 0 && !isOutOfStock && (
                    <span className="text-[12px] text-gray-400 font-medium">{displayInventory}ш үлдсэн</span>
                  )}
                </div>

                {/* ── OPTIONS / VARIANTS ── */}
                {product.options && product.options.length > 0 && (
                  <div id="product-options-section" className="flex flex-col gap-5 mb-5 pb-5 border-b border-[#F2F2F7]">
                    {product.options.map((option: any) => (
                      <div key={option.id}>
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-[0.1em]">
                            {option.name}
                            {selectedOptions[option.name] && (
                              <span className="ml-1.5 text-gray-800 normal-case font-semibold tracking-normal">
                                — {selectedOptions[option.name]}
                              </span>
                            )}
                          </p>
                          {option.name.includes("Хэмжээ") && product.sizeGuideUrl && (
                            <button
                              type="button"
                              onClick={async () => {
                                const result = await openExternalLink(product.sizeGuideUrl);
                                if (!result.ok) toast.error("Холбоос нээхэд алдаа гарлаа");
                              }}
                              className="text-[11px] text-[#FF5000] font-semibold underline underline-offset-2"
                            >
                              Хэмжээний заавар
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {option.values.map((val: any) => {
                            const isSelected = selectedOptions[option.name] === val;
                            let valImage = "";
                            if (product.variants) {
                              const mv = product.variants.find(
                                (v: any) => v.options[option.name] === val && v.image,
                              );
                              if (mv) valImage = mv.image;
                            }
                            return (
                              <motion.button
                                key={val}
                                whileTap={{ scale: 0.92 }}
                                transition={SPRING_SNAP}
                                onClick={() => {
                                  haptic("light");
                                  setSelectedOptions((p) => ({ ...p, [option.name]: val }));
                                }}
                                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-[12px] border-2 text-[13px] font-semibold transition-all duration-150 ${
                                  isSelected
                                    ? "border-[#FF5000] bg-orange-50 text-[#FF5000]"
                                    : "border-[#E5E5EA] bg-white text-gray-700"
                                }`}
                              >
                                {valImage && (
                                  <div className="w-4 h-4 rounded overflow-hidden shrink-0">
                                    <Image src={valImage} width={16} height={16} alt="" className="object-cover w-full h-full" />
                                  </div>
                                )}
                                {val}
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                      transition={SPRING_SNAP}
                                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF5000] rounded-full flex items-center justify-center"
                                    >
                                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── QUANTITY STEPPER ── */}
                <div className="flex items-center justify-between mb-5 py-3 px-4 bg-[#F2F2F7] rounded-2xl">
                  <p className="text-[13px] font-bold text-gray-700">Тоо ширхэг</p>
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      transition={SPRING_SNAP}
                      onClick={() => { haptic("light"); setQuantity(Math.max(1, quantity - 1)); }}
                      className="w-9 h-9 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center shadow-sm active:bg-gray-50"
                    >
                      <Minus className="w-3.5 h-3.5 text-gray-700" strokeWidth={2.5} />
                    </motion.button>
                    <span className="w-8 text-center text-[16px] font-black text-gray-900">{quantity}</span>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      transition={SPRING_SNAP}
                      onClick={() => { haptic("light"); setQuantity(Math.min(Math.max(displayInventory, 99), quantity + 1)); }}
                      className="w-9 h-9 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center shadow-sm active:bg-gray-50"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-700" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>

                {/* Desktop CTA buttons moved below description/details */}

                {/* ── INFO TILES ── */}
                <div className="grid grid-cols-3 gap-2 py-2">
                  {[
                    {
                      icon: Truck,
                      label: "Шуурхай хүргэлт",
                      sub: "",
                    },
                    {
                      icon: ShieldCheck,
                      label: "Найдвартай төлбөр",
                      sub: "",
                    },
                    {
                      icon: CreditCard,
                      label: "Төлбөр төлөх боломжууд",
                      sub: "",
                    },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-1.5 bg-[#F2F2F7] rounded-2xl py-4 px-1.5 text-center"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm mb-0.5">
                        <Icon className="w-5 h-5 text-[#FF5000]" strokeWidth={1.8} />
                      </div>
                      <p className="text-[11px] font-bold text-gray-900 leading-tight">{label}</p>
                      <p className="text-[10px] text-[#8E8E93] font-medium leading-tight">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── TABS SECTION ── */}
              <div className="bg-white lg:rounded-2xl overflow-hidden">
                {/* Tab headers */}
                <div className="flex border-b border-[#F2F2F7]">
                  {(["desc", "specs", "reviews"] as const).map((tab) => {
                    const labels = { desc: "Дэлгэрэнгүй", specs: "Үзүүлэлт", reviews: "Үнэлгээ" };
                    return (
                      <button
                        key={tab}
                        onClick={() => { haptic("light"); setActiveTab(tab); }}
                        className={`flex-1 py-4 text-[13px] font-bold transition-colors relative ${
                          activeTab === tab ? "text-[#FF5000]" : "text-[#8E8E93] hover:text-gray-700"
                        }`}
                      >
                        {labels[tab]}
                        {activeTab === tab && (
                          <motion.div
                            layoutId="nat-tab-bar"
                            className="absolute bottom-0 left-4 right-4 h-[2.5px] bg-[#FF5000] rounded-t-full"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div className="px-4 py-5 lg:px-7 lg:py-6">
                  <AnimatePresence mode="wait">
                    {activeTab === "desc" && (
                      <motion.div
                        key="desc"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                      >
                        {product.description ? (
                          <>
                            <div
                              className={`text-[14px] text-[#3C3C43]/80 leading-[1.65] overflow-hidden transition-all duration-300 ${descExpanded ? "" : "max-h-[110px]"}`}
                            >
                              {product.description}
                            </div>
                            {product.description.length > 180 && (
                              <button
                                onClick={() => { haptic("light"); setDescExpanded(!descExpanded); }}
                                className="mt-2.5 flex items-center gap-1 text-[13px] font-semibold text-[#FF5000]"
                              >
                                {descExpanded ? "Хаах" : "Бүгдийг үзэх"}
                                <motion.div
                                  animate={{ rotate: descExpanded ? 180 : 0 }}
                                  transition={SPRING_GENTLE}
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </motion.div>
                              </button>
                            )}
                          </>
                        ) : (
                          <p className="text-[14px] text-[#8E8E93] text-center py-6">Дэлгэрэнгүй мэдээлэл ороогүй байна.</p>
                        )}
                      </motion.div>
                    )}

                    {activeTab === "specs" && (
                      <motion.div
                        key="specs"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                      >
                        {product.attributes && Object.keys(product.attributes).length > 0 ? (
                          <div className="flex flex-col divide-y divide-[#F2F2F7]">
                            {Object.entries(product.attributes).map(([k, v]) => (
                              <div key={k} className="flex items-start py-3.5 gap-4">
                                <span className="text-[12px] text-[#8E8E93] font-medium min-w-[110px] shrink-0 pt-0.5">{k}</span>
                                <span className="text-[13px] text-gray-900 font-semibold">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[14px] text-[#8E8E93] text-center py-6">Үзүүлэлтийн мэдээлэл байхгүй байна.</p>
                        )}
                      </motion.div>
                    )}

                    {activeTab === "reviews" && (
                      <motion.div
                        key="reviews"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                      >
                        <ProductReviews productId={product.id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── STATIC CTA BUTTONS (mobile & desktop) ── */}
              <div className="flex gap-3 my-4 px-4 lg:px-0">
                {isOutOfStock && !isPreorder ? (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING_SNAP}
                    onClick={handleNotify}
                    disabled={notifying || requested}
                    className="flex-1 flex items-center justify-center gap-2 h-[50px] rounded-2xl bg-[#1C1C1E] text-white hover:bg-black font-bold text-[15px] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
                  >
                    {notifying ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : requested ? (
                      "✓ Мэдэгдэл бүртгэгдлээ"
                    ) : (
                      <>🔔 Бэлэн болоход мэдэгдүүл</>
                    )}
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      transition={SPRING_SNAP}
                      onClick={handleAddToCart}
                      disabled={!canAddToCart}
                      className={`flex-1 flex items-center justify-center gap-2 h-[50px] rounded-2xl font-bold text-[14px] transition-all duration-200 border-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                        addedToCart
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-[#E5E5EA] bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                      }`}
                    >
                      {addedToCart ? (
                        <><Check className="w-4 h-4 nat-check" strokeWidth={2.5} />Нэмэгдлээ</>
                      ) : (
                        <><ShoppingBag className="w-4 h-4" strokeWidth={2} />Сагсанд нэмэх</>
                      )}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      transition={SPRING_SNAP}
                      onClick={handleBuyNow}
                      disabled={!canAddToCart || buying}
                      className={`flex-[1.5] flex items-center justify-center gap-2 h-[50px] rounded-2xl nat-buy-btn text-white font-black text-[15px] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_24px_rgba(255,80,0,0.35)] cursor-pointer ${buying ? "nat-buying" : ""}`}
                    >
                      {buying ? "Уншиж байна..." : <>Худалдан авах <ArrowRight className="w-4 h-4" strokeWidth={2.5} /></>}
                    </motion.button>
                  </>
                )}

                {isAdmin && (
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center justify-center h-[50px] px-4 rounded-2xl bg-gray-800 text-white font-semibold text-[13px] hover:bg-gray-900 transition-colors whitespace-nowrap"
                  >
                    ✏️ Засварлах
                  </Link>
                )}
              </div>

              {/* Related (desktop) */}
              {product.relatedProducts && product.relatedProducts.length > 0 && (
                <div className="hidden lg:block bg-white rounded-2xl px-7 py-6">
                  <RelatedProducts products={product.relatedProducts} />
                </div>
              )}
            </div>
          </div>

          {/* Related (mobile) */}
          {product.relatedProducts && product.relatedProducts.length > 0 && (
            <div className="lg:hidden mt-3 bg-white px-4 py-5">
              <RelatedProducts products={product.relatedProducts} />
            </div>
          )}
        </div>

        {/* ─── DESKTOP STICKY BUYING BAR ─── */}
        <AnimatePresence>
          {showStickyBar && (
            <motion.div
              initial={{ y: -70, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -70, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="hidden lg:flex fixed left-0 right-0 z-[40] bg-white/95 backdrop-blur-2xl border-b border-black/[0.06] shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
              style={{
                top: "116px",
                height: "72px",
              }}
            >
              <div className="max-w-6xl mx-auto px-6 w-full h-full flex items-center justify-between gap-6">
                {/* Product Info (Image + Title + Category) */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 bg-white rounded-xl overflow-hidden border border-black/[0.06] shrink-0 p-1 flex items-center justify-center">
                    <Image
                      src={images[0]}
                      alt=""
                      width={40}
                      height={40}
                      className="object-contain w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    {product.brand && (
                      <p className="text-[9px] font-bold text-[#FF5000] uppercase tracking-[0.1em] leading-none mb-1">
                        {product.brand}
                      </p>
                    )}
                    <h3 className="text-[13px] font-bold text-gray-900 truncate max-w-[280px] leading-tight">
                      {product.name}
                    </h3>
                  </div>
                </div>

                {/* Price & Quantity & CTAs */}
                <div className="flex items-center gap-5 shrink-0">
                  {isOutOfStock && !isPreorder ? (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      transition={SPRING_SNAP}
                      onClick={handleNotify}
                      disabled={notifying || requested}
                      className="flex items-center justify-center gap-1.5 h-[40px] px-6 rounded-xl bg-[#1C1C1E] text-white hover:bg-black font-bold text-[13px] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {notifying ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : requested ? (
                        "✓ Мэдэгдэл бүртгэгдлээ"
                      ) : (
                        <>🔔 Бэлэн болоход мэдэгдүүл</>
                      )}
                    </motion.button>
                  ) : (
                    <>
                      {/* Price block */}
                      <div className="flex flex-col items-end">
                        <span className="text-[16px] font-black text-gray-900 leading-none">
                          {formatPrice(displayPrice)}
                        </span>
                        {product.originalPrice && product.originalPrice > displayPrice && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] text-gray-400 line-through font-medium leading-none">
                              {formatPrice(product.originalPrice)}
                            </span>
                            <span className="text-[10px] font-extrabold text-[#FF5000] leading-none">
                              -{discount}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quantity selector */}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F2F2F7] rounded-xl">
                        <button
                          onClick={() => { haptic("light"); setQuantity(Math.max(1, quantity - 1)); }}
                          className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm active:bg-gray-100"
                        >
                          <Minus className="w-2.5 h-2.5 text-gray-700" strokeWidth={3} />
                        </button>
                        <span className="w-5 text-center text-[13px] font-extrabold text-gray-900">{quantity}</span>
                        <button
                          onClick={() => { haptic("light"); setQuantity(Math.min(Math.max(displayInventory, 99), quantity + 1)); }}
                          className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm active:bg-gray-100"
                        >
                          <Plus className="w-2.5 h-2.5 text-gray-700" strokeWidth={3} />
                        </button>
                      </div>

                      {/* Cart Button */}
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        transition={SPRING_SNAP}
                        onClick={handleAddToCart}
                        disabled={!canAddToCart}
                        className={`flex items-center justify-center gap-1.5 h-[40px] px-5 rounded-xl font-bold text-[12px] transition-all duration-200 border-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                          addedToCart
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-[#E5E5EA] bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        {addedToCart ? (
                          <><Check className="w-3.5 h-3.5 nat-check" strokeWidth={2.5} /> Нэмэгдлээ</>
                        ) : (
                          <><ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} /> Сагслах</>
                        )}
                      </motion.button>

                      {/* Buy Now Button */}
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        transition={SPRING_SNAP}
                        onClick={handleBuyNow}
                        disabled={!canAddToCart || buying}
                        className={`flex items-center justify-center gap-1.5 h-[40px] px-6 rounded-xl nat-buy-btn text-white font-black text-[13px] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(255,80,0,0.25)] cursor-pointer ${buying ? "nat-buying" : ""}`}
                      >
                        {buying ? "..." : <>Худалдан авах <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></>}
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── LIGHTBOX ── */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowLightbox(false)}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              onClick={() => setShowLightbox(false)}
              className="absolute top-5 right-5 w-9 h-9 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </motion.button>

            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={SPRING_GENTLE}
              className="relative w-full max-w-3xl aspect-square rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src={images[activeImageIndex]} alt="" fill className="object-contain" priority />
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImageIndex(p => Math.max(0, p - 1)); }}
                    disabled={activeImageIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center text-white disabled:opacity-20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImageIndex(p => Math.min(images.length - 1, p + 1)); }}
                    disabled={activeImageIndex === images.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center text-white disabled:opacity-20"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setActiveImageIndex(i); }}
                        className={`h-1 rounded-full transition-all ${i === activeImageIndex ? "w-5 bg-white" : "w-1.5 bg-white/30"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ProductDetailClient;