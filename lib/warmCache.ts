import { mutate } from 'swr';
import {
  extractProductImageUrls,
  prefetchImages,
  prefetchProductDetailImages,
} from '@/lib/imagePrefetch';
import { DETAIL_IMAGE_QUALITY, DETAIL_IMAGE_WIDTH } from '@/lib/imageLoader';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

type WarmOptions = {
  aggressive?: boolean;
};

/** Warm SWR cache + prefetch hero images (especially for native app). */
export async function warmAppCache(options?: WarmOptions) {
  const aggressive = options?.aggressive === true;
  const productLimit = aggressive ? 40 : 18;
  const imageLimit = aggressive ? 40 : 24;
  const priority = aggressive ? 'high' : 'low';

  const endpoints = [
    '/api/banners',
    `/api/products?limit=${productLimit}`,
    '/api/products?featured=true&limit=12',
    '/api/categories',
  ];

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const data = await fetcher(url);
      mutate(url, data, { revalidate: false });
      return { url, data };
    }),
  );

  const bannerPayload = results.find(
    (r) => r.status === 'fulfilled' && r.value.url.includes('/api/banners'),
  );
  if (bannerPayload?.status === 'fulfilled') {
    const bannerUrls =
      bannerPayload.value.data?.banners?.map((b: { image?: string }) => b.image) ||
      [];
    prefetchImages(bannerUrls, DETAIL_IMAGE_WIDTH, DETAIL_IMAGE_QUALITY, priority);
  }

  const productUrls: string[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    if (!result.value.url.includes('/api/products')) continue;
    productUrls.push(
      ...extractProductImageUrls(result.value.data?.products || [], imageLimit),
    );
  }

  const uniqueProductUrls = [...new Set(productUrls)].slice(0, imageLimit);
  if (uniqueProductUrls.length > 0) {
    prefetchImages(uniqueProductUrls, 280, 60, priority);
    prefetchProductDetailImages(uniqueProductUrls.slice(0, aggressive ? 12 : 8), {
      priority,
      limit: aggressive ? 12 : 8,
    });
  }
}

export const TAB_ROUTES = [
  '/',
  '/categories',
  '/search',
  '/cart',
  '/profile',
  '/wishlist',
] as const;
