'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SafeImage, { BANNER_PLACEHOLDER } from '@/components/SafeImage';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Banner } from '@/models/Banner';
import { getApiUrl } from '@/lib/utils';

export default function BannerSlider() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    if (banners.length === 0) return;
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    if (banners.length === 0) return;
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (currentIndex >= banners.length && banners.length > 0) {
      setCurrentIndex(0);
    }
  }, [banners.length, currentIndex]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await fetch(getApiUrl('/api/banners'));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Ensure standard JSON content-type to avoid parsing HTML as JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new TypeError("Oops, we haven't got JSON!");
        }

        const data = await response.json();
        setBanners(data.banners || []);
      } catch (err) {
        console.error('Error fetching banners:', err);
        // Fallback to empty array if fetch fails
        setBanners([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    if (isHovered || banners.length <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide, isHovered, banners.length]);

  const variants: Variants = {
    enter: (_direction: number) => ({
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      opacity: 1,
    },
    exit: (_direction: number) => ({
      zIndex: 0,
      opacity: 0,
    }),
  };

  if (isLoading || banners.length === 0) {
    return (
      <div className="w-full max-w-[1600px] mx-auto rounded-[2rem] bg-gray-100 animate-pulse aspect-[21/9] sm:aspect-[21/7] lg:aspect-[21/6]" />
    );
  }

  return (
    <section
      className="relative w-full max-w-[1600px] mx-auto overflow-hidden rounded-[2rem] shadow-2xl bg-gray-100 aspect-[21/9] sm:aspect-[21/7] lg:aspect-[21/6] group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ opacity: { duration: 0.3, ease: 'easeInOut' } }}
          className="absolute inset-0 w-full h-full"
        >
          <div className="relative h-full w-full">
            <SafeImage
              src={banners[currentIndex]?.image || ''}
              alt={banners[currentIndex]?.title || `Banner ${currentIndex + 1}`}
              width={1600}
              height={686}
              priority={currentIndex === 0}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1600px) 100vw, 1600px"
              fallbackSrc={BANNER_PLACEHOLDER}
            />
          </div>

          {/* Subtle Overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <div className="absolute inset-0 z-10 flex items-center justify-between px-4 sm:px-8 pointer-events-none">
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
          whileTap={{ scale: 0.9 }}
          onClick={prevSlide}
          className="p-3 rounded-full bg-white/70 backdrop-blur-md text-gray-800 shadow-lg pointer-events-auto transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
          whileTap={{ scale: 0.9 }}
          onClick={nextSlide}
          className="p-3 rounded-full bg-white/70 backdrop-blur-md text-gray-800 shadow-lg pointer-events-auto transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        {banners.map((_: Banner, index: number) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className="group relative p-2"
          >
            <div className={`h-1.5 rounded-full transition-all duration-500 ${index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
              }`} />
            {index === currentIndex && (
              <motion.div
                layoutId="active-indicator"
                className="absolute inset-0 rounded-full bg-white/20 blur-sm"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Autoplay Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full z-20">
        <motion.div
          key={currentIndex}
          initial={{ width: 0 }}
          animate={{ width: isHovered ? '0%' : '100%' }}
          transition={{ duration: isHovered ? 0 : 5, ease: 'linear' }}
          className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        />
      </div>
    </section>
  );
}
