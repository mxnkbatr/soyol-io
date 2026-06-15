import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildSectionMongoQuery } from '@/lib/productFilters';

export const dynamic = 'force-dynamic';

function mergeQuery(base: Record<string, unknown>, extra: Record<string, unknown> | null) {
  if (!extra) return base;
  const keys = Object.keys(base);
  if (keys.length === 0) return extra;
  return { $and: [base, extra] };
}

const LIST_PROJECTION = {
  name: 1,
  price: 1,
  image: 1,
  images: 1,
  sections: 1,
  stockStatus: 1,
  originalPrice: 1,
  discountPercent: 1,
  category: 1,
  inventory: 1,
  featured: 1,
  isSale: 1,
  isCargo: 1,
  createdAt: 1,
  updatedAt: 1,
  brand: 1,
  deliveryFee: 1,
  salesCount: 1,
};

function serializeListProduct(p: Record<string, unknown> & { _id: ObjectId }) {
  const images = Array.isArray(p.images) ? (p.images as string[]).slice(0, 1) : [];
  return {
    ...p,
    id: p._id.toString(),
    _id: p._id.toString(),
    images,
    image: (p.image as string | undefined) || images[0] || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '18', 10);
    const cursor = searchParams.get('cursor');
    const isAdmin = searchParams.get('admin') === 'true';
    let query: Record<string, unknown> = {};

    if (searchParams.get('featured') === 'true') query.featured = true;
    if (searchParams.get('isSale') === 'true') {
      query.$or = [{ isSale: true }, { discountPercent: { $gt: 0 } }];
    }

    const section = searchParams.get('section');
    const sectionQuery = section ? buildSectionMongoQuery(section) : null;
    if (sectionQuery) {
      query = mergeQuery(query, sectionQuery);
    }

    const stockStatus = searchParams.get('stockStatus');
    if (stockStatus) query.stockStatus = stockStatus;

    const category = searchParams.get('category');
    if (category) query.category = category;
    const storeHandle = searchParams.get('storeHandle');
    if (storeHandle) query.storeHandle = storeHandle;
    const q = searchParams.get('q');
    if (q) {
      const searchOr = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
      query = mergeQuery(query, { $or: searchOr });
    }
    const minP = searchParams.get('minPrice');
    const maxP = searchParams.get('maxPrice');
    if (minP || maxP) {
      const priceFilter: Record<string, number> = {};
      if (minP) priceFilter.$gte = parseFloat(minP);
      if (maxP) priceFilter.$lte = parseFloat(maxP);
      query.price = priceFilter;
    }
    if (cursor) {
      try {
        query = mergeQuery(query, { _id: { $lt: new ObjectId(cursor) } });
      } catch {
        /* invalid cursor */
      }
    }

    const col = await getCollection('products');
    const effectiveLimit = isAdmin
      ? parseInt(searchParams.get('limit') || '200', 10)
      : limit;
    const products = await col
      .find(query, isAdmin ? undefined : { projection: LIST_PROJECTION })
      .sort({ _id: -1 })
      .limit(effectiveLimit)
      .toArray();

    const serialized = isAdmin
      ? products.map((p) => ({ ...p, id: p._id.toString(), _id: p._id.toString() }))
      : products.map((p) => serializeListProduct(p as Record<string, unknown> & { _id: ObjectId }));

    if (isAdmin) {
      return NextResponse.json(
        { products: serialized, nextCursor: null, hasMore: false },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const hasMore = products.length === limit;
    const nextCursor = hasMore ? products[products.length - 1]._id.toString() : null;
    return NextResponse.json(
      { products: serialized, nextCursor, hasMore },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (error) {
    console.error('[Products GET]', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}