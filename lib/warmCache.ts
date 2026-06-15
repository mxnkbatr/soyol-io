import { mutate } from 'swr';
import { extractProductImageUrls, prefetchImages } from '@/lib/imagePrefetch';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

/** Warm SWR cache + prefetch product thumbnails (native app). */
export async function warmAppCache() {
  const endpoints = [
    '/api/banners',
    '/api/products?limit=18',
    '/api/categories',
  ];

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const data = await fetcher(url);
      mutate(url, data, { revalidate: false });
      return { url, data };
    }),
  );

  const productsPayload = results.find(
    (r) => r.status === 'fulfilled' && r.value.url.includes('/api/products'),
  );
  if (productsPayload?.status === 'fulfilled') {
    const products = productsPayload.value.data?.products || [];
    prefetchImages(extractProductImageUrls(products, 24), 280, 60);
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
