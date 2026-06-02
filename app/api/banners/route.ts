import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// FIXED: Inline destructuring with Promise<{ id: string }>
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Await the dynamic params as required by Next.js 15/16
    const { id } = await params;
    const body = await request.json();
    const banners = await getCollection('banners');

    const updateFields: any = { ...body };
    delete updateFields._id;
    delete updateFields.id;
    updateFields.updatedAt = new Date();

    const result = await banners.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Banners ID API] PUT Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update banner' }, { status: 500 });
  }
}

// FIXED: Inline destructuring with Promise<{ id: string }>
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Await the dynamic params as required by Next.js 15/16
    const { id } = await params;
    const banners = await getCollection('banners');

    const result = await banners.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Banners ID API] DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete banner' }, { status: 500 });
  }
}