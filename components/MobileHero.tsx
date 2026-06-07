'use client';

import { useState, useEffect, useCallback } from 'react';
import SafeImage, { BANNER_PLACEHOLDER } from '@/components/SafeImage';
import { motion, AnimatePresence } from 'framer-motion';

import { Banner } from '@/models/Banner';

import { Flame, Package, Globe, Tag } from 'lucide-react';

export default function MobileHero() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextSlide = useCallback(() => {
        if (banners.length === 0) return;
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, [banners.length]);

    useEffect(() => {
        fetch('/api/banners')
            .then(res => res.json())
            .then(data => setBanners(data.banners || []))
            .catch(err => console.error('Error fetching banners:', err))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [nextSlide, banners.length]);

    if (isLoading || banners.length === 0) {
        return (
            <div className="mx-4 mt-4 relative rounded-[28px] overflow-hidden bg-slate-100 animate-pulse aspect-[16/9]" />
        );
    }

    return (
        <section className="relative w-full bg-transparent lg:hidden mb-8 mt-3 px-4">
            {/* Native Paging Banner Header */}
            <div className="relative rounded-[24px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.03)] bg-white border border-[#E5E5EA]/50">
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            const swipe = info.offset.x;
                            if (swipe < -50 && currentIndex < banners.length - 1) {
                                setCurrentIndex(currentIndex + 1);
                            } else if (swipe > 50 && currentIndex > 0) {
                                setCurrentIndex(currentIndex - 1);
                            }
                        }}
                        animate={{ x: `-${currentIndex * 100}%` }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute inset-0 flex h-full cursor-grab active:cursor-grabbing"
                    >
                        {banners.map((banner, index) => (
                            <div key={index} className="relative h-full w-full shrink-0 flex-[0_0_100%]">
                                <SafeImage
                                    src={banner.image || ''}
                                    alt={banner.title || `Banner ${index + 1}`}
                                    width={1200}
                                    height={675}
                                    priority={index === 0}
                                    className="h-full w-full object-cover"
                                    sizes="100vw"
                                    fallbackSrc={BANNER_PLACEHOLDER}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
                            </div>
                        ))}
                    </motion.div>

                    {/* iOS Style Pill Indicators */}
                    <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5">
                        {banners.map((_, index) => (
                            <motion.div
                                key={index}
                                initial={false}
                                animate={{
                                    width: index === currentIndex ? 16 : 5,
                                    backgroundColor: index === currentIndex ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)"
                                }}
                                className="h-1 rounded-full backdrop-blur-md shadow-sm"
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Premium Minimalist Quick Actions */}
            <div className="mt-6 flex justify-between items-start gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { name: 'Шинэ', icon: Flame, color: 'text-rose-500', href: '/new-arrivals' },
                    { name: 'Бэлэн', icon: Package, color: 'text-[#FF4500]', href: '/ready-to-ship' },
                    { name: 'Захиалга', icon: Globe, color: 'text-blue-500', href: '/pre-order' },
                    { name: 'Хямдрал', icon: Tag, color: 'text-red-500', href: '/sale', highlight: true },
                ].map((item) => (
                    <motion.a
                        key={item.name}
                        href={item.href}
                        whileTap={{ scale: 0.94 }}
                        className="flex flex-col items-center gap-2 flex-1 min-w-[76px] select-none"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <motion.div
                            animate={item.highlight ? { scale: [1, 1.03, 1] } : {}}
                            transition={item.highlight ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : {}}
                            className={`relative w-14 h-14 rounded-2xl bg-white border border-[#E5E5EA]/60 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-300`}
                        >
                            <item.icon className={`w-5.5 h-5.5 ${item.color}`} strokeWidth={1.5} />

                            {/* Pro-grade Glass Highlight */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
                        </motion.div>
                        <span className="text-[12px] font-semibold text-gray-800 tracking-tight text-center leading-tight">
                            {item.name}
                        </span>
                    </motion.a>
                ))}
            </div>
        </section>
    );
}
