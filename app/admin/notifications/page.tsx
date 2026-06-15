'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import {
  Bell,
  Send,
  Loader2,
  Smartphone,
  Clock,
  Search,
  Package,
  X,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { buildFeaturedProductNotification } from '@/lib/productPromotionNotification';

type BroadcastHistory = {
  _id: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
};

type AdminProduct = {
  _id: string;
  name: string;
  price?: number;
  originalPrice?: number;
  discountPercent?: number;
  inventory?: number;
  image?: string | null;
  images?: string[];
  variants?: Array<{ inventory?: number }>;
};

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json());

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('/');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const productPickerRef = useRef<HTMLDivElement>(null);

  const productsUrl = useMemo(() => {
    const params = new URLSearchParams({ admin: 'true', limit: '40' });
    if (productSearch.trim()) params.set('q', productSearch.trim());
    return `/api/products?${params}`;
  }, [productSearch]);

  const { data: productsData, isLoading: loadingProducts } = useSWR(
    showProductList || productSearch ? productsUrl : null,
    fetcher,
  );

  const productResults: AdminProduct[] = productsData?.products || [];

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/admin/broadcast');
      const data = await res.json();
      if (res.ok) {
        setHistory(data.history || []);
      }
    } catch {
      toast.error('Түүх татахад алдаа гарлаа');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (productPickerRef.current && !productPickerRef.current.contains(e.target as Node)) {
        setShowProductList(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const applyProduct = (product: AdminProduct) => {
    const promo = buildFeaturedProductNotification(product, product._id, 'promo');
    setSelectedProduct(product);
    setTitle(promo.title);
    setMessage(promo.body);
    setLink(promo.link);
    setImageUrl(promo.imageUrl);
    setShowProductList(false);
    setProductSearch('');
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setImageUrl(undefined);
    setLink('/');
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Гарчиг болон текст оруулна уу');
      return;
    }

    const confirmed = confirm(
      `Бүх хэрэглэгчийн утсанд мэдэгдэл илгээх үү?\n\n"${title}"\n${message}`,
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || '/',
          productId: selectedProduct?._id,
          imageUrl,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Илгээхэд алдаа гарлаа');
        return;
      }

      const sent = data.fcm?.multicast?.successCount ?? 0;
      toast.success(`Мэдэгдэл илгээгдлээ (${sent} утас)`);
      setTitle('');
      setMessage('');
      setLink('/');
      setImageUrl(undefined);
      setSelectedProduct(null);
      loadHistory();
    } catch {
      toast.error('Сүлжээний алдаа');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 h-full overflow-y-auto scrollbar-hide bg-slate-950 pb-24 lg:pb-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Bell className="w-7 h-7 text-amber-500" />
          Мэдэгдэл илгээх
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Бүх хэрэглэгчийн гар утсанд push мэдэгдэл илгээнэ. Бараа сонговол дархад тухайн бараа руу орно.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Шинэ мэдэгдэл</h2>

          {/* Product picker */}
          <div ref={productPickerRef}>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">
              Бараа сонгох
            </label>

            {selectedProduct ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-amber-500/30">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                  {(selectedProduct.images?.[0] || selectedProduct.image) ? (
                    <Image
                      src={selectedProduct.images?.[0] || selectedProduct.image || ''}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{selectedProduct.name}</p>
                  <p className="text-xs text-amber-400 mt-0.5">
                    {selectedProduct.price ? formatPrice(selectedProduct.price) : '—'}
                    {selectedProduct.inventory != null && (
                      <span className="text-slate-500"> · {selectedProduct.inventory} үлдсэн</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">/product/{selectedProduct._id}</p>
                </div>
                <button
                  type="button"
                  onClick={clearProduct}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Бараа хасах"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductList(true);
                  }}
                  onFocus={() => setShowProductList(true)}
                  placeholder="Барааны нэрээр хайх..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowProductList((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showProductList ? 'rotate-180' : ''}`} />
                </button>

                {showProductList && (
                  <div className="absolute z-20 left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 shadow-xl">
                    {loadingProducts ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                      </div>
                    ) : productResults.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">Бараа олдсонгүй</p>
                    ) : (
                      productResults.map((product) => {
                        const thumb = product.images?.[0] || product.image;
                        return (
                          <button
                            key={product._id}
                            type="button"
                            onClick={() => applyProduct(product)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-900 text-left border-b border-slate-800/80 last:border-0"
                          >
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                              {thumb ? (
                                <Image src={thumb} alt="" fill className="object-cover" sizes="40px" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-4 h-4 text-slate-600" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{product.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {product.price ? formatPrice(product.price) : '—'}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-[10px] text-slate-600 mt-1.5">
              Бараа сонгоход гарчиг, текст, холбоос автоматаар бөглөгдөнө
            </p>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Гарчиг *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Жишээ: 🔥 Өнөөдрийн хямдрал!"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
            <p className="text-[10px] text-slate-600 mt-1 text-right">{title.length}/80</p>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Текст *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="Жишээ: 35% хямдрал · 45,000 ₮ · 12 ширхэг үлдсэн"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
            />
            <p className="text-[10px] text-slate-600 mt-1 text-right">{message.length}/300</p>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">
              Холбоос {selectedProduct ? '(бараа)' : '(заавал биш)'}
            </label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              readOnly={!!selectedProduct}
              placeholder="/product/... эсвэл /"
              className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 ${
                selectedProduct ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {sending ? 'Илгээж байна...' : 'Бүх хэрэглэгчид илгээх'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Утсан дээрх харагдах байдал
            </h2>
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                {imageUrl ? (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
                    <Image src={imageUrl} alt="" fill className="object-cover" sizes="40px" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-sm">S</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 font-bold">Soyol Shop · одоо</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">
                    {title || '🔔 Гарчиг энд харагдана'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-3">
                    {message || 'Мэдэгдлийн текст энд харагдана...'}
                  </p>
                  {selectedProduct && (
                    <p className="text-[10px] text-amber-500/80 mt-2">Дарвал бараа руу орно →</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200/80 space-y-1">
            <p>✅ Бараа сонгоод илгээвэл дархад тухайн бараа нээгдэнэ</p>
            <p>✅ Хямдрал, үнэ, үлдэгдэл автоматаар текстэнд орно</p>
            <p>✅ Бараа онцлох (⭐) үед мөн адил мэдэгдэл очно</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Сүүлийн илгээсэн мэдэгдлүүд
        </h2>

        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Одоогоор илгээгдээгүй</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item._id}
                className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.message}</p>
                  {item.link && item.link !== '/' && (
                    <p className="text-[10px] text-amber-500/70 mt-1">{item.link}</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-600 shrink-0 whitespace-nowrap">
                  {new Date(item.createdAt).toLocaleString('mn-MN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
