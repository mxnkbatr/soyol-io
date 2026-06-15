import { getCollection } from '@/lib/mongodb';

export type ChatProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
  stock: number;
  stockStatus: string;
  featured: boolean;
  isCargo: boolean;
  description: string;
};

function normalizeProduct(doc: any): ChatProduct {
  const images = Array.isArray(doc.images) ? doc.images : [];
  return {
    id: doc._id.toString(),
    name: doc.name,
    price: doc.price ?? 0,
    originalPrice: doc.originalPrice,
    image: doc.image || images[0] || '',
    category: doc.category || '',
    rating: doc.rating ?? 0,
    stock: doc.inventory ?? 0,
    stockStatus: doc.stockStatus || 'in-stock',
    featured: !!doc.featured,
    isCargo: !!doc.isCargo,
    description: (doc.description || '').slice(0, 120),
  };
}

export async function searchChatProducts(opts: {
  searchQuery?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  onSale?: boolean;
  limit?: number;
}): Promise<ChatProduct[]> {
  const {
    searchQuery,
    category,
    minPrice,
    maxPrice,
    featured,
    onSale,
    limit = 6,
  } = opts;

  const productsCollection = await getCollection('products');
  const query: Record<string, unknown> = {};

  if (searchQuery?.trim()) {
    const words = searchQuery.trim().split(/\s+/).filter(Boolean);
    query.$or = words.flatMap((word) => {
      const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return [
        { name: { $regex: regex } },
        { description: { $regex: regex } },
        { category: { $regex: regex } },
        { brand: { $regex: regex } },
      ];
    });
  }

  if (category?.trim()) {
    query.category = { $regex: new RegExp(category.trim(), 'i') };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const price: Record<string, number> = {};
    if (minPrice !== undefined) price.$gte = minPrice;
    if (maxPrice !== undefined) price.$lte = maxPrice;
    query.price = price;
  }

  if (featured) query.featured = true;
  if (onSale) query.discountPercent = { $gt: 0 };

  const docs = await productsCollection
    .find(query)
    .project({
      name: 1,
      price: 1,
      originalPrice: 1,
      image: 1,
      images: 1,
      category: 1,
      rating: 1,
      inventory: 1,
      stockStatus: 1,
      featured: 1,
      isCargo: 1,
      description: 1,
      discountPercent: 1,
      createdAt: 1,
    })
    .sort({ featured: -1, rating: -1, createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map(normalizeProduct);
}

export function buildProductRecommendationsBlock(products: ChatProduct[]): string {
  if (!products.length) return '';
  return `[PRODUCT_RECOMMENDATIONS:${JSON.stringify(products)}]`;
}

export function buildProductCardMarkers(products: ChatProduct[]): string {
  return products
    .map(
      (p) =>
        `[PRODUCT_CARD: id="${p.id}", name="${p.name.replace(/"/g, "'")}", price="${p.price}", image="${p.image}"]`,
    )
    .join('\n');
}
