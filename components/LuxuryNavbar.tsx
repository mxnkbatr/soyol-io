"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search,
  User,
  Heart,
  ShoppingBag,
  Home,
  Menu,
  X,
  Globe,
  ArrowRight,
  Sparkles,
  Tag,
  TrendingUp,
  Truck,
  Zap,
  Package,
  LogOut,
  LayoutDashboard,
  Video,
  MessageCircle,
  LayoutGrid,
  ChevronRight,
  Info,
  Headphones,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebounce } from "@/lib/hooks/useDebounce";
import LanguageCurrencySelector from "./LanguageCurrencySelector";
import SearchDropdown from "./SearchDropdown";
import NotificationBell from "./NotificationBell";
import { Suspense } from "react";
import { triggerHaptic } from "@/lib/haptics";

function SearchParamsHandler({
  setSearchQuery,
  pathname,
}: {
  setSearchQuery: (q: string) => void;
  pathname: string;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname === "/search") {
      const q = searchParams.get("q");
      setSearchQuery(q ?? "");
    }
  }, [pathname, searchParams, setSearchQuery]);

  return null;
}

export default function LuxuryNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated: isLoggedIn, isAdmin, logout } = useAuth();

  const userEmail = user?.email || user?.phone || "";
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<
    {
      id: string;
      name: string;
      price: number;
      images?: string[];
      image?: string | null;
      category?: string;
    }[]
  >([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [wishlistBump, setWishlistBump] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [hasSaleItems, setHasSaleItems] = useState(true);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const cartItemsCount = useCartStore((state) => state.getTotalItems());
  const wishlistItemsCount = useWishlistStore((state) => state.getTotalItems());

  useEffect(() => {
    if (wishlistItemsCount > 0) {
      setWishlistBump(true);
      const timer = setTimeout(() => setWishlistBump(false), 300);
      return () => clearTimeout(timer);
    }
  }, [wishlistItemsCount]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      )
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  useEffect(() => {
    const q = debouncedSearchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setIsLoadingSearch(true);
    fetch(`/api/products?q=${encodeURIComponent(q)}&limit=8`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSearchResults(data.products || []);
      })
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSearch(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearchQuery]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products?isSale=true&limit=1")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.products) {
          setHasSaleItems(data.products.length > 0);
        }
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      setMobileMenuOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const categories = [
    { name: t("nav", "home"), href: "/", icon: Sparkles },
    { name: t("nav", "newArrivals"), href: "/new-arrivals", icon: TrendingUp },
    { name: t("nav", "readyToShip"), href: "/ready-to-ship", icon: Truck },
    { name: t("nav", "preOrder"), href: "/pre-order", icon: Globe },
    { name: t("nav", "deals"), href: "/deals", icon: Tag },
    ...(hasSaleItems
      ? [{ name: t("nav", "sale"), href: "/sale", icon: Zap }]
      : []),
    { name: t("nav", "about"), href: "/about", icon: Info },
    { name: "Тусламж", href: "/support", icon: Headphones },
  ];

  const mobileNavItems = [
    { name: t("nav", "home") || "Нүүр", href: "/", icon: Home },
    {
      name: t("nav", "categories") || "Категори",
      href: "/categories",
      icon: LayoutGrid,
    },
    { name: t("nav", "search"), href: "/search", icon: Search },
    {
      name: t("nav", "cart"),
      href: "/cart",
      icon: ShoppingBag,
      count: cartItemsCount,
    },
    {
      name: t("nav", "profile"),
      href: isLoggedIn ? "/profile" : "/sign-in",
      icon: User,
    },
  ];

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsHandler
          setSearchQuery={setSearchQuery}
          pathname={pathname}
        />
      </Suspense>

      {/* ── DESKTOP HEADER ────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className={`hidden lg:block fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-black/[0.05] shadow-sm"
          : "bg-white/80 backdrop-blur-xl border-b border-black/[0.02]"
          }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="px-4 sm:px-6 lg:px-8">
            <div
              className={`relative z-50 flex items-center justify-between transition-all duration-200 ${scrolled ? "h-16" : "h-24"
                }`}
            >
              {/* Logo */}
              <Link
                href="/"
                className="flex items-center gap-2 group flex-shrink-0"
              >
                <motion.div className="relative flex flex-col items-start">
                  <motion.h1
                    className="text-2xl font-black tracking-tighter leading-none text-[#FF4500]"
                    whileHover={{
                      scale: 1.05,
                      textShadow: "0 0 12px rgba(255,69,0,0.35)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    Soyol
                  </motion.h1>
                  <motion.span
                    className="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase leading-none ml-0.5 mt-0.5"
                    whileHover={{ color: "#FF5000" }}
                  >
                    Video Shop
                  </motion.span>
                </motion.div>
              </Link>

              {/* Search Bar */}
              <div className="flex-1 max-w-[600px] mx-8">
                <form onSubmit={handleSearch} className="relative w-full">
                  <motion.div
                    className={`relative w-full group rounded-full transition-all duration-300 ${searchFocused
                      ? "bg-white border-2 border-[#FF4500] shadow-md"
                      : "bg-[#f4f4f5] border-2 border-transparent hover:bg-gray-200/50"
                      }`}
                    animate={{
                      scale: searchFocused ? 1.02 : 1,
                      y: searchFocused ? -2 : 0,
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="relative flex items-center rounded-2xl h-full w-full overflow-hidden">
                      <motion.div
                        animate={{
                          scale: searchFocused ? 1.2 : 1,
                          rotate: searchFocused ? 15 : 0,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}
                        className="pl-4"
                      >
                        <Search
                          className={`w-6 h-6 transition-colors duration-300 ${searchFocused
                            ? "text-[#FF4500]"
                            : "text-gray-400 group-hover:text-[#FF4500]"
                            }`}
                          strokeWidth={1.5}
                        />
                      </motion.div>
                      <input
                        type="text"
                        placeholder="Хайх утгаа оруулна уу..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() =>
                          setTimeout(() => setSearchFocused(false), 180)
                        }
                        className="flex-1 px-4 py-3 bg-transparent text-sm font-medium text-gray-900 placeholder-gray-500 tracking-wide focus:outline-none transition-all"
                        autoComplete="off"
                      />
                      <AnimatePresence>
                        {searchQuery && (
                          <motion.button
                            type="button"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            onClick={() => setSearchQuery("")}
                            className="p-1.5 mr-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <X
                              className="w-4 h-4 text-gray-400 hover:text-gray-600"
                              strokeWidth={1.5}
                            />
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          const trimmed = searchQuery.trim();
                          if (trimmed) {
                            e.preventDefault();
                            router.push(
                              `/search?q=${encodeURIComponent(trimmed)}`,
                            );
                          }
                        }}
                        className={`mr-1.5 p-2 rounded-full transition-all duration-300 ${searchFocused || searchQuery
                          ? "bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/25"
                          : "bg-gray-100 text-gray-400 group-hover:bg-[#FF4500] group-hover:text-white"
                          }`}
                      >
                        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </motion.div>
                </form>
                <SearchDropdown
                  results={searchResults}
                  isVisible={searchFocused && searchQuery.trim().length > 0}
                  onClose={() => setSearchFocused(false)}
                  onMouseDown={() => { }}
                  isLoading={isLoadingSearch}
                />
              </div>

              {/* Right Icons */}
              <div
                className="flex items-center gap-1.5 flex-shrink-0"
              >
                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  {isLoggedIn ? (
                    <>
                      <motion.button
                        type="button"
                        onClick={() => setUserMenuOpen((o) => !o)}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-2xl transition-colors group cursor-pointer border border-transparent hover:border-gray-200"
                      >
                        {user?.imageUrl ? (
                          <img
                            src={user.imageUrl}
                            alt=""
                            className="w-8 h-8 rounded-xl object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                            <span className="text-orange-500 font-bold text-xs">
                              {(
                                user?.name?.[0] ||
                                user?.phone?.[0] ||
                                "U"
                              ).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="hidden sm:inline text-sm font-semibold text-gray-700 group-hover:text-[#FF4500] max-w-[120px] truncate">
                          {user?.name || user?.phone || t("nav", "profile")}
                        </span>
                      </motion.button>
                      <AnimatePresence>
                        {userMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.18 }}
                            className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden z-[100]"
                          >
                            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                                {t("nav", "email")}
                              </p>
                              <p className="text-sm text-gray-900 truncate mt-0.5">
                                {userEmail || "—"}
                              </p>
                              {isAdmin && (
                                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-medium">
                                  {t("nav", "admin")}
                                </span>
                              )}
                            </div>
                            <div className="py-1">
                              <Link
                                href="/profile"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50"
                              >
                                <User
                                  className="w-4 h-4 text-gray-500"
                                  strokeWidth={1.2}
                                />
                                Миний профайл
                              </Link>
                              <Link
                                href="/orders"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                              >
                                <Package
                                  className="w-4 h-4 text-gray-500"
                                  strokeWidth={1.2}
                                />
                                {t("nav", "myOrders")}
                              </Link>
                              {isAdmin && (
                                <Link
                                  href="/admin"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                >
                                  <LayoutDashboard
                                    className="w-4 h-4 text-gray-500"
                                    strokeWidth={1.2}
                                  />
                                  {t("nav", "adminPanel")}
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={handleSignOut}
                                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <LogOut
                                  className="w-4 h-4 text-gray-500"
                                  strokeWidth={1.2}
                                />
                                {t("nav", "signOut")}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href="/sign-in"
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <User
                        className="w-6 h-6 text-gray-600 group-hover:text-orange-500"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm font-medium text-gray-600 group-hover:text-orange-500">
                        {t("nav", "signIn")}
                      </span>
                    </Link>
                  )}
                </div>

                <NotificationBell />

                <Link href="/wishlist">
                  <motion.div
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    animate={wishlistBump ? { x: [0, -4, 4, -4, 4, 0] } : {}}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="relative p-2 hover:bg-gray-50 rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-gray-100"
                  >
                    <Heart
                      className={`w-6 h-6 transition-colors ${mounted && wishlistItemsCount > 0
                        ? "text-[#FF4500] fill-orange-50/50"
                        : "text-gray-600 group-hover:text-[#FF4500]"
                        }`}
                      strokeWidth={1.5}
                    />
                    {mounted && wishlistItemsCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white shadow-sm"
                      />
                    )}
                  </motion.div>
                </Link>

                <Link href="/cart">
                  <motion.div
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative p-2 hover:bg-gray-50 rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-gray-100"
                  >
                    <ShoppingBag
                      className={`w-6 h-6 transition-colors ${mounted && cartItemsCount > 0
                        ? "text-[#FF4500]"
                        : "text-gray-600 group-hover:text-[#FF4500]"
                        }`}
                      strokeWidth={1.5}
                    />
                    {mounted && cartItemsCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#FF4500] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                      >
                        {cartItemsCount}
                      </motion.span>
                    )}
                  </motion.div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Category Nav Row */}
        <div className="border-t border-gray-100/50">
          <div className="px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center justify-center gap-1">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = pathname === category.href;
                return (
                  <Link key={category.href} href={category.href}>
                    <motion.div
                      className="relative px-4 py-4 group cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 17,
                      }}
                    >
                      <div
                        className={`flex items-center gap-2 transition-all duration-300 ${isActive
                          ? "text-orange-600"
                          : "text-gray-600 hover:text-orange-500"
                          }`}
                      >
                        <Icon
                          className={`w-4 h-4 transition-colors duration-300 ${isActive
                            ? "text-orange-600"
                            : "group-hover:text-orange-500"
                            }`}
                          strokeWidth={1.2}
                        />
                        <span className="text-sm font-medium tracking-wider">
                          {category.name}
                        </span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-orange-500 rounded-full"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </motion.header>

      {/* ── MOBILE HEADER ─────────────────────────────────────────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E5EA]/80"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 h-[52px]">
          <Link href="/" className="flex flex-col items-start select-none">
            <span className="text-[22px] font-black tracking-tight text-[#FF4500] leading-none">
              Soyol
            </span>
            <span className="text-[7.5px] font-bold tracking-[0.2em] text-gray-400 uppercase leading-[1.2] mt-0.5">
              Video Shop
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              onClick={() => triggerHaptic()}
              className="p-1.5 text-[#1C1C1E] btn-tap-active"
            >
              <Search className="w-5.5 h-5.5" strokeWidth={1.5} />
            </Link>
            <Link href="/wishlist" className="btn-tap-active">
              <div
                onClick={() => triggerHaptic()}
                className="p-1.5 text-[#1C1C1E] relative"
              >
                <Heart className="w-5.5 h-5.5" strokeWidth={1.5} />
                {mounted && wishlistItemsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF3B30] rounded-full ring-2 ring-white shadow-sm" />
                )}
              </div>
            </Link>
            <NotificationBell />
            <button
              onClick={() => {
                triggerHaptic();
                setMobileMenuOpen(true);
              }}
              className="p-1.5 text-[#1C1C1E] cursor-pointer btn-tap-active"
            >
              <Menu className="w-5.5 h-5.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* ── SPACER ─────────────────────────────────────────────────────────── */}
      <div
        className={`transition-all duration-300 ${scrolled ? "h-[52px] lg:h-[124px]" : "h-[52px] lg:h-[180px]"}`}
        style={{
          marginTop: "env(safe-area-inset-top)",
        }}
      />

      {/* ── MOBILE SLIDE MENU ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[101] w-[280px] bg-white shadow-2xl lg:hidden flex flex-col"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="font-bold text-slate-900">
                  {t("nav", "menu")}
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" strokeWidth={1.8} />
                </button>
              </div>

              <div className="px-5 py-6">
                {isLoggedIn ? (
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 active:bg-orange-50 active:border-orange-200 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FF4500]/10 flex items-center justify-center shrink-0 border border-[#FF4500]/20">
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-[#FF4500] font-bold text-lg">
                          {(
                            user?.name?.[0] ||
                            user?.phone?.[0] ||
                            "U"
                          ).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">
                        {user?.name || "Хэрэглэгч"}
                      </p>
                      <p className="text-sm font-medium text-slate-500 truncate">
                        {user?.phone || user?.email || "—"}
                      </p>
                      <p className="text-xs text-[#FF4500] font-semibold mt-0.5">
                        Профайл харах →
                      </p>
                    </div>
                  </Link>
                ) : (
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center w-full py-4 rounded-2xl bg-[#FF4500] text-white font-bold text-sm shadow-lg shadow-[#FF4500]/20 active:scale-[0.98] transition-all"
                  >
                    {t("nav", "signIn")}
                  </Link>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-5">
                <div className="flex flex-col">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = pathname === cat.href;
                    return (
                      <Link
                        key={cat.href}
                        href={cat.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-4 py-4 border-b border-slate-50 transition-colors active:bg-slate-50`}
                      >
                        <Icon
                          className={`w-5 h-5 shrink-0 ${isActive ? "text-[#FF4500]" : "text-slate-400"}`}
                          strokeWidth={isActive ? 2 : 1.5}
                        />
                        <span
                          className={`font-semibold text-[15px] flex-1 ${isActive ? "text-[#FF4500]" : "text-slate-800"}`}
                        >
                          {cat.name}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 ${isActive ? "text-[#FF4500]" : "text-slate-300"}`}
                          strokeWidth={2}
                        />
                      </Link>
                    );
                  })}
                </div>

                {isLoggedIn && (
                  <div className="mt-4 pb-10">
                    <Link
                      href="/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-4 py-4 border-b border-slate-50 text-slate-800"
                    >
                      <Package
                        className="w-5 h-5 text-slate-400"
                        strokeWidth={1.5}
                      />
                      <span className="font-semibold text-[15px]">
                        {t("nav", "myOrders")}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-4 py-4 text-red-500"
                    >
                      <LogOut
                        className="w-5 h-5 opacity-70"
                        strokeWidth={1.5}
                      />
                      <span className="font-semibold text-[15px]">
                        {t("nav", "signOut")}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MOBILE BOTTOM NAV — Tab Bar ───────────────────────────────────── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/80 border-t border-[#E5E5EA]/80 backdrop-blur-xl"
        style={{
          height: "calc(49px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-stretch h-[49px]">
          {mobileNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  triggerHaptic();
                  if (isActive) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="flex-1 flex flex-col items-center justify-center pt-1.5 pb-1 btn-tap-active select-none"
              >
                <div className="relative flex flex-col items-center">
                  <Icon
                    className={`w-[22px] h-[22px] transition-colors duration-150 ${isActive ? "text-[#FF4500]" : "text-[#8E8E93]"
                      }`}
                    strokeWidth={isActive ? 1.8 : 1.5}
                    fill={isActive ? "currentColor" : "none"}
                  />
                  {mounted && item.count !== undefined && item.count > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-[#FF3B30] text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                      {item.count > 9 ? "9+" : item.count}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-0.5 transition-colors duration-150 ${isActive
                    ? "font-semibold text-[#FF4500]"
                    : "font-medium text-[#8E8E93]"
                    }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
