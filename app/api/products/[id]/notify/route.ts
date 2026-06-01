import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        let productObjectId: ObjectId;
        try {
            productObjectId = new ObjectId(id);
        } catch {
            return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });
        }

        const productsCollection = await getCollection('products');

        // Add the authenticated user's ID to the restockWatchers set
        await productsCollection.updateOne(
            { _id: productObjectId },
            { $addToSet: { restockWatchers: userId } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Notify API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}