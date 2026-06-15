import { mutate } from 'swr';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

/** Warm SWR cache so tab switches feel instant (native app). */
export async function warmAppCache() {
  const endpoints = [
    '/api/banners',
    '/api/products?limit=18',
    '/api/categories',
  ];

  await Promise.allSettled(
    endpoints.map(async (url) => {
      const data = await fetcher(url);
      mutate(url, data, { revalidate: false });
    }),
  );
}

export const TAB_ROUTES = [
  '/',
  '/categories',
  '/search',
  '/cart',
  '/profile',
  '/wishlist',
] as const;
