import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Address, User } from '@/models/User';
import { getAuthToken } from '@/lib/getAuthToken';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env variable is not set');
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

async function getUser(req: Request) {
    const token = await getAuthToken();

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

export async function GET(req: Request) {
    const userId = await getUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const savedAddresses = user.addresses || [];
    
    try {
        const ordersCollection = await getCollection('orders');
        const userOrders = await ordersCollection.find({ userId: userId }).toArray();
        
        // Extract shipping addresses from orders
        const orderAddresses: Address[] = userOrders
            .filter(o => o.shipping && o.shipping.address)
            .map(o => ({
                id: `order-${o._id.toString()}`,
                label: 'Өмнөх захиалга',
                city: o.shipping.city || '',
                district: o.shipping.district || '',
                khoroo: '1',
                street: o.shipping.address || '',
                isDefault: false,
                note: 'Захиалгын түүхээс'
            }));

        // Deduplicate: remove order addresses that are very similar to saved ones
        const uniqueOrderAddresses = orderAddresses.filter(oa => {
            const isDuplicate = savedAddresses.some(sa => 
                sa.street.toLowerCase() === oa.street.toLowerCase() && 
                sa.city.toLowerCase() === oa.city.toLowerCase()
            );
            return !isDuplicate;
        });

        // Further deduplicate between order addresses themselves
        const finalOrderAddresses: Address[] = [];
        uniqueOrderAddresses.forEach(oa => {
            const isDuplicate = finalOrderAddresses.some(foa => 
                foa.street.toLowerCase() === oa.street.toLowerCase()
            );
            if (!isDuplicate) finalOrderAddresses.push(oa);
        });

        return NextResponse.json({ addresses: [...savedAddresses, ...finalOrderAddresses] });
    } catch (err) {
        console.error('Error fetching order addresses:', err);
        return NextResponse.json({ addresses: savedAddresses });
    }
}

export async function POST(req: Request) {
    const userId = await getUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();

    // Basic validation
    if (!data.city || !data.district || !data.khoroo || !data.street) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newAddress: Address = {
        id: new ObjectId().toString(),
        city: data.city,
        district: data.district,
        khoroo: data.khoroo,
        street: data.street,
        entrance: data.entrance,
        floor: data.floor,
        door: data.door,
        note: data.note,
        isDefault: data.isDefault || false
    };

    const usersCollection = await getCollection<User>('users');

    // If new address is default, unset others
    if (newAddress.isDefault) {
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { "addresses.$[].isDefault": false } }
        );
    } else {
        // If it's the first address, make it default
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user?.addresses || user.addresses.length === 0) {
            newAddress.isDefault = true;
        }
    }

    await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $push: { addresses: newAddress } }
    );

    return NextResponse.json(newAddress);
}
