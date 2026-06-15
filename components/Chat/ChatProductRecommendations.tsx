'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';
import type { ChatProduct } from '@/lib/chatProducts';

export default function ChatProductRecommendations({ products }: { products: ChatProduct[] }) {
  if (!products.length) return null;

  return (
    <div className="relative -mx-1">
      <div className="flex items-center gap-1.5 mb-2.5 px-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
          Танд санал болгож байна
        </span>
        <span className="text-[10px] text-slate-500 font-medium">({products.length})</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
        {products.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.25 }}
            className="shrink-0 w-[210px] snap-start"
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
      <div className="absolute right-0 top-8 bottom-2 w-10 bg-gradient-to-l from-slate-800 via-slate-800/60 to-transparent pointer-events-none" />
    </div>
  );
}
