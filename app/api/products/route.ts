import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '18', 10);
    const cursor = searchParams.get('cursor');
    const isAdmin = searchParams.get('admin') === 'true';
    const query: Record<string, any> = {};

    if (searchParams.get('featured') === 'true') query.featured = true;
    if (searchParams.get('isSale') === 'true')
      query.$or = [{ isSale: true }, { discountPercent: { $gt: 0 } }];
    const section = searchParams.get('section');
    if (section) query.sections = section;
    const category = searchParams.get('category');
    if (category) query.category = category;
    const storeHandle = searchParams.get('storeHandle');
    if (storeHandle) query.storeHandle = storeHandle;
    const q = searchParams.get('q');
    if (q) query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
    const minP = searchParams.get('minPrice');
    const maxP = searchParams.get('maxPrice');
    if (minP || maxP) {
      query.price = {};
      if (minP) query.price.$gte = parseFloat(minP);
      if (maxP) query.price.$lte = parseFloat(maxP);
    }
    if (cursor) {
      try { query._id = { $lt: new ObjectId(cursor) }; } catch {}
    }

    const col = await getCollection('products');
    const products = await col
      .find(query).sort({ _id: -1 })
      .limit(isAdmin ? 0 : limit).toArray();

    const serialized = products.map(p => ({
      ...p, id: p._id.toString(), _id: p._id.toString(),
    }));

    if (isAdmin) {
      return NextResponse.json({ products: serialized, nextCursor: null, hasMore: false });
    }
    const hasMore = products.length === limit;
    const nextCursor = hasMore ? products[products.length - 1]._id.toString() : null;
    return NextResponse.json({ products: serialized, nextCursor, hasMore },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Products GET]', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}