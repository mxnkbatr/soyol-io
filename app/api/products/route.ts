import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limitParam = parseInt(searchParams.get('limit') || '18', 10);
    const cursor     = searchParams.get('cursor');
    const featured   = searchParams.get('featured') === 'true';
    const isSale     = searchParams.get('isSale') === 'true';
    const section    = searchParams.get('section');
    const category   = searchParams.get('category');
    const storeHandle= searchParams.get('storeHandle');
    const q          = searchParams.get('q');
    const minPrice   = searchParams.get('minPrice');
    const maxPrice   = searchParams.get('maxPrice');
    const isAdmin    = searchParams.get('admin') === 'true';

    const query: Record<string, any> = {};

    if (featured)     query.featured = true;
    if (isSale)       query.$or = [{ isSale: true }, { discountPercent: { $gt: 0 } }];
    if (section)      query.sections = section;
    if (category)     query.category = category;
    if (storeHandle)  query.storeHandle = storeHandle;
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (cursor) {
      try {
        query._id = { $lt: new ObjectId(cursor) };
      } catch {
        // invalid cursor — ignore
      }
    }

    const productsCollection = await getCollection('products');
    const limit = isAdmin ? 0 : limitParam; // 0 = no limit in MongoDB

    const products = await productsCollection
      .find(query)
      .sort({ _id: -1 })
      .limit(limit || 0)
      .toArray();

    const serialized = products.map((p) => ({
      ...p,
      id: p._id.toString(),
      _id: p._id.toString(),
    }));

    if (isAdmin) {
      return NextResponse.json({ products: serialized, nextCursor: null, hasMore: false });
    }

    const hasMore = products.length === limitParam;
    const nextCursor = hasMore ? products[products.length - 1]._id.toString() : null;

    return NextResponse.json(
      { products: serialized, nextCursor, hasMore },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[Products GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}