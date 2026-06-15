import { formatPrice } from '@/lib/utils';

export type ProductDoc = {
  name?: string;
  price?: number;
  originalPrice?: number;
  discountPercent?: number;
  inventory?: number;
  image?: string | null;
  images?: string[];
  variants?: Array<{ inventory?: number }>;
};

export function getProductStock(product: ProductDoc): number | null {
  if (product.variants?.length) {
    return product.variants.reduce((sum, v) => sum + (v.inventory ?? 0), 0);
  }
  if (typeof product.inventory === 'number') return product.inventory;
  return null;
}

export function getProductDiscountPercent(product: ProductDoc): number | null {
  if (product.discountPercent && product.discountPercent > 0) {
    return Math.round(product.discountPercent);
  }
  const price = product.price;
  const original = product.originalPrice;
  if (price && original && original > price) {
    return Math.round(((original - price) / original) * 100);
  }
  return null;
}

export function buildFeaturedProductNotification(
  product: ProductDoc,
  productId: string,
  style: 'featured' | 'promo' = 'featured',
) {
  const name = product.name?.trim() || 'Бараа';
  const discount = getProductDiscountPercent(product);
  const stock = getProductStock(product);
  const price = product.price;

  const title = style === 'promo' ? `🔥 ${name}` : `⭐ Онцлох: ${name}`;

  const parts: string[] = [];
  if (discount && discount > 0) {
    parts.push(`${discount}% хямдрал`);
  }
  if (price) {
    parts.push(formatPrice(price));
  }
  if (stock !== null) {
    if (stock === 0) {
      parts.push('Удахгүй дуусна');
    } else if (stock <= 5) {
      parts.push(`зөвхөн ${stock} ширхэг үлдсэн!`);
    } else {
      parts.push(`${stock} ширхэг үлдсэн`);
    }
  }

  const body = parts.length > 0 ? parts.join(' · ') : 'Одоо үзээрэй!';

  return {
    title,
    body,
    imageUrl: product.images?.[0] || product.image || undefined,
    link: `/product/${productId}`,
  };
}
