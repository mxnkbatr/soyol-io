import { optimizeCloudinaryUrl } from './imageLoader';

const preloaded = new Set<string>();

function toOptimizedUrl(url: string, width: number, quality = 65): string {
  if (url.includes('res.cloudinary.com')) {
    return optimizeCloudinaryUrl(url, { width, quality });
  }
  return url;
}

/** Warm browser cache for product thumbnails (native + web). */
export function prefetchImages(
  urls: (string | null | undefined)[],
  width = 320,
  quality = 65,
) {
  if (typeof window === 'undefined') return;

  for (const raw of urls) {
    const url = raw?.trim();
    if (!url) continue;

    const src = toOptimizedUrl(url, width, quality);
    if (preloaded.has(src)) continue;
    preloaded.add(src);

    const img = new window.Image();
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.src = src;
  }
}

export function extractProductImageUrls(
  products: Array<{ image?: string | null; images?: string[] }>,
  limit = 20,
): string[] {
  const urls: string[] = [];
  for (const p of products) {
    if (p.image) urls.push(p.image);
    if (p.images?.[0] && p.images[0] !== p.image) urls.push(p.images[0]);
    if (urls.length >= limit) break;
  }
  return urls.slice(0, limit);
}
