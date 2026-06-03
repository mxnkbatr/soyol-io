'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type SearchResultProduct = {
  id: string;
  name: string;
  price: number;
  images?: string[];
  image?: string | null;
  category?: string;
  isCargo?: boolean;
};

interface SearchDropdownProps {
  results: SearchResultProduct[];
  isVisible: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
  isLoading?: boolean;
}

const SearchDropdown = ({
  results,
  isVisible,
  onClose,
  onMouseDown,
  isLoading = false,
}: SearchDropdownProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="listbox"
          aria-label="Хайлтын илэрц"
          onMouseDown={(e) => {
            e.preventDefault();
            onMouseDown?.();
          }}
          className="absolute top-full left-0 w-full mt-2 rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-[100] bg-white/90 backdrop-blur-xl"
        >
          <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
                <span className="inline-block w-5 h-5 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Түр хүлээнэ үү...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-gray-800 mb-1">Илэрц олдсонгүй</p>
                <p className="text-sm text-gray-500">Өөр түлхүүр үгээр дахин хайна уу</p>
              </div>
            ) : (
              <div className="p-2">
                {results.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    onClick={onClose}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-black/[0.03] transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 relative border border-gray-100/50">
                      <Image
                        src={(product.images && product.images.length > 0) ? product.images[0] : (product.image || '/soyol-logo.png')}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug">
                        {product.name} {product.isCargo && " + Карго"}
                      </span>
                      <span className="text-[#FF4500] font-bold text-sm mt-1">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchDropdown;
