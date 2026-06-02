import useSWRInfinite from 'swr/infinite';
import { useEffect } from 'react';
import { Product } from '@/models/Product';

interface ProductsResponse {
  products: Product[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useProducts(filters: Record<string, any> = {}) {
  const getKey = (pageIndex: number, previousPageData: ProductsResponse | null) => {
    // Reached the end
    if (previousPageData && !previousPageData.nextCursor) return null;

    // Build query string
    const params = new URLSearchParams();

    // Add base filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    // Add limit (default to 18 if not provided in filters)
    if (!filters.limit) {
      params.set('limit', '18');
    }

    // Add cursor if not the first page
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set('cursor', previousPageData.nextCursor);
    }

    return `/api/products?${params.toString()}`;
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<ProductsResponse>(
    getKey,
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateFirstPage: false,
      persistSize: true,
      dedupingInterval: 30000,      // cache for 30s — instant back-navigation
      revalidateOnFocus: false,     // don't re-fetch when app regains focus
    }
  );

  const filtersKey = JSON.stringify(filters);

  // Reset to page 1 when filters change to avoid showing stale data from previous filters
  useEffect(() => {
    setSize(1);
  }, [filtersKey, setSize]);

  // SAFE GUARD: Safe map that skips undefined/null pages
  const products = data
    ? data.flatMap(page => page && Array.isArray(page.products) ? page.products : [])
    : [];
    
  const isLoadingInitialData = !data && !error;
  const isLoadingMore = size > 1 && typeof data?.[size - 1] === 'undefined';
  
  // SAFE GUARD: Safe check to prevent reading .length of undefined
  const isEmpty = data?.[0] && Array.isArray(data[0].products) 
    ? data[0].products.length === 0 
    : false;

  // SAFE GUARD: Ensure array boundaries are checked
  const isReachingEnd =
    isEmpty || (data && data[data.length - 1] && !data[data.length - 1].hasMore);
    
  const isRefreshing = isValidating && data && data.length === size;

  return {
    products,
    error,
    isLoading: isLoadingInitialData,
    isLoadingMore,
    size,
    setSize,
    isReachingEnd,
    isRefreshing,
    mutate,
  };
}