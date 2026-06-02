import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env variable is not set');
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

async function getUser(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = (payload.sub || payload.userId) as string | undefined;
        if (!userId) return null;
        return userId;
    } catch {
        return null;
    }
}

// FIXED: Signature changed from params: any to params: Promise<{ id: string }>
export async function PUT(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    const userId = await getUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await req.json();

    const usersCollection = await getCollection('users');

    // If setting as default, unset others first
    if (data.isDefault) {
        // Unset all other addresses' isDefault
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { "addresses.$[].isDefault": false } }
        );
    }

    // Build update object
    const updateSet: any = {};
    if (data.label !== undefined) updateSet["addresses.$.label"] = data.label;
    if (data.city) updateSet["addresses.$.city"] = data.city;
    if (data.district) updateSet["addresses.$.district"] = data.district;
    if (data.khoroo) updateSet["addresses.$.khoroo"] = data.khoroo;
    if (data.street) updateSet["addresses.$.street"] = data.street;
    if (data.entrance !== undefined) updateSet["addresses.$.entrance"] = data.entrance;
    if (data.floor !== undefined) updateSet["addresses.$.floor"] = data.floor;
    if (data.door !== undefined) updateSet["addresses.$.door"] = data.door;
    if (data.note !== undefined) updateSet["addresses.$.note"] = data.note;
    if (data.isDefault !== undefined) updateSet["addresses.$.isDefault"] = data.isDefault;

    if (Object.keys(updateSet).length === 0) {
        return NextResponse.json({ message: 'No fields to update' });
    }

    const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId), "addresses.id": id },
        { $set: updateSet }
    );

    if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    const userId = await getUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const usersCollection = await getCollection('users');

    const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { addresses: { id: id } } as any }
    );

    if (result.modifiedCount === 0) {
        return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}