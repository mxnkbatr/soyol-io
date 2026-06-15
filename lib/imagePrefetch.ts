import {
  CARD_IMAGE_QUALITY,
  CARD_IMAGE_WIDTH,
  DETAIL_IMAGE_QUALITY,
  DETAIL_IMAGE_WIDTH,
  optimizeCloudinaryUrl,
} from './imageLoader';

const preloaded = new Set<string>();

function toOptimizedUrl(url: string, width: number, quality = 65): string {
  if (url.includes('res.cloudinary.com')) {
    return optimizeCloudinaryUrl(url, { width, quality });
  }
  return url;
}

export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality = 65,
): string {
  return toOptimizedUrl(url.trim(), width, quality);
}

export function isImageCached(
  url: string | null | undefined,
  width: number,
  quality = 65,
): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  return preloaded.has(toOptimizedUrl(raw, width, quality));
}

/** Warm browser cache for images (native + web). */
export function prefetchImages(
  urls: (string | null | undefined)[],
  width = CARD_IMAGE_WIDTH,
  quality = CARD_IMAGE_QUALITY,
  priority: 'high' | 'low' = 'low',
) {
  if (typeof window === 'undefined') return;

  for (const raw of urls) {
    const url = raw?.trim();
    if (!url) continue;

    const src = toOptimizedUrl(url, width, quality);
    if (preloaded.has(src)) continue;

    const img = new window.Image();
    img.decoding = 'async';
    img.fetchPriority = priority;
    const markReady = () => preloaded.add(src);
    img.onload = markReady;
    img.onerror = () => preloaded.delete(src);
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      markReady();
    }
  }
}

export function collectProductImages(
  product: { image?: string | null; images?: string[] },
): string[] {
  const combined: string[] = [];
  if (product.image) combined.push(product.image);
  product.images?.forEach((img) => {
    if (img && !combined.includes(img)) combined.push(img);
  });
  return combined;
}

/** Prefetch gallery images at product-detail resolution. */
export function prefetchProductDetailImages(
  urls: (string | null | undefined)[],
  options?: { priority?: 'high' | 'low'; limit?: number },
) {
  const limit = options?.limit ?? 6;
  prefetchImages(
    urls.slice(0, limit),
    DETAIL_IMAGE_WIDTH,
    DETAIL_IMAGE_QUALITY,
    options?.priority ?? 'low',
  );
}

/** Call on card hover/tap before navigating to product detail. */
export function warmProductPage(
  router: { prefetch: (href: string) => void },
  productId: string,
  images: (string | null | undefined)[],
) {
  router.prefetch(`/product/${productId}`);
  prefetchProductDetailImages(images, { priority: 'high', limit: 6 });
}

export function extractProductImageUrls(
  products: Array<{ image?: string | null; images?: string[] }>,
  limit = 20,
): string[] {
  const urls: string[] = [];
  for (const p of products) {
    const imgs = collectProductImages(p);
    for (const img of imgs) {
      if (!urls.includes(img)) urls.push(img);
      if (urls.length >= limit) break;
    }
    if (urls.length >= limit) break;
  }
  return urls.slice(0, limit);
}
