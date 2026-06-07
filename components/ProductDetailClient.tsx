'use client';

import ProductDetailView from './ProductDetailView';
import type { ProductDetailData } from './ProductDetailView';

export type { ProductDetailData };

export function ProductDetailClient({
  product,
  initialReviews,
}: {
  product: ProductDetailData;
  initialReviews: any[];
}) {
  return <ProductDetailView product={product} initialReviews={initialReviews} />;
}

export default ProductDetailClient;
