import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { notifyVendorStoreStatus } from '@/lib/vendorNotifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { role } = await auth();
        if (role !== 'admin') {
            return NextResponse.json({ error: 'Зөвхөн админ хандах боломжтой' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        const storesCollection = await getCollection('stores');

        let query = {};
        if (status) query = { status };

        const stores = await storesCollection.find(query).sort({ createdAt: -1 }).toArray();

        return NextResponse.json(stores);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { role } = await auth();
        if (role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { storeId, status, commissionRate } = body;

        if (!storeId) {
            return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
        }

        const storesCollection = await getCollection('stores');
        const updateData: any = { updatedAt: new Date() };

        if (status) updateData.status = status;
        if (commissionRate !== undefined) updateData.commissionRate = Number(commissionRate);

        const result = await storesCollection.findOneAndUpdate(
            { _id: new ObjectId(storeId) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeDoc = result as any;

        // Notify Vendor about store status change (fire-and-forget)
        if (status) {
            notifyVendorStoreStatus(storeDoc.vendorId, status, storeDoc.name).catch((err) => {
                console.error('[Admin Stores PUT] Notification failed:', err);
            });
        }

        const usersCollection = await getCollection('users'); 

        if (status === 'active') { 
            await usersCollection.updateOne( 
                { _id: new ObjectId(storeDoc.vendorId) }, 
                { $set: { role: 'vendor' } } 
            ); 
        } else if (status === 'suspended') { 
            await usersCollection.updateOne( 
                { _id: new ObjectId(storeDoc.vendorId) }, 
                { $set: { role: 'user' } } 
            ); 
        } 

        return NextResponse.json(result);
    } catch (error) {
        console.error('Store update error:', error);
        return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
    }
}