import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { currentUser } from '@/lib/auth';
import { sendOrderStatusUpdate } from '@/lib/email';
import { deductInventory } from '@/lib/inventory';
import { notifyOrderStatusUpdate } from '@/lib/orderNotifications';

// Get all orders (Admin only) - REMAINS UNCHANGED
export async function GET(request: Request) {
    try {
         const user = await currentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const targetUserId = searchParams.get('userId');

        const ordersCollection = await getCollection('orders');

        let query: any = {
            $nor: [
                { status: 'pending', paymentMethod: 'qpay' }
            ]
        };
        if (targetUserId) {
            query.userId = targetUserId;
        }

        const orders = await ordersCollection.find(query).sort({ createdAt: -1 }).toArray();
        
        // Populate missing product details (Legacy support)
        const productIds = new Set<string>();
        orders.forEach(order => {
            order.items?.forEach((item: any) => {
                if (item.productId && (!item.name || !item.image || item.name === '' || item.image === '')) {
                    productIds.add(item.productId);
                }
            });
        });

        if (productIds.size > 0) {
            const productsCollection = await getCollection('products');
            const validObjectIds = Array.from(productIds)
                .map(id => {
                    try { return new ObjectId(id); } catch { return null; }
                })
                .filter((id): id is ObjectId => id !== null);

            const products = await productsCollection.find({
                _id: { $in: validObjectIds }
            }).toArray();

            const productMap = new Map(products.map(p => [p._id.toString(), p]));

            orders.forEach(order => {
                order.items?.forEach((item: any) => {
                    if (item.productId && (!item.name || !item.image || item.name === '' || item.image === '')) {
                        const product = productMap.get(item.productId.toString());
                        if (product) {
                            if (!item.name || item.name === '') item.name = product.name;
                            if (!item.image || item.image === '') item.image = product.images?.[0] || product.image;
                            if (!item.price && product.price) item.price = product.price;
                        }
                    }
                });
            });
        }

        return NextResponse.json({ orders });
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Update order (Status, Delivery Estimate, Cancel Reason)
export async function PUT(request: Request) {
    try {
        const user = await currentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { orderId, status, deliveryEstimate, cancelReason } = await request.json();

        if (status) {
            const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!allowedStatuses.includes(status)) {
                return NextResponse.json({ error: 'Буруу статус' }, { status: 400 });
            }
        }

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        const ordersCollection = await getCollection('orders');
        const existingOrder = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

        if (!existingOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const updateData: any = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (deliveryEstimate !== undefined) updateData.deliveryEstimate = deliveryEstimate;

        await ordersCollection.updateOne(
            { _id: new ObjectId(orderId) },
            { $set: updateData }
        );

        // Deduct inventory only if transitioning from pending to an active/confirmed state
        // notifyVendorProductSold() is called internally within deductInventory()
        if (status && status !== 'pending' && status !== 'cancelled' && existingOrder.status === 'pending') {
            if (existingOrder.items && existingOrder.items.length > 0) {
                await deductInventory(orderId, existingOrder.items);
            }
        }

        // Notify customer when order status shifts
        if (status && status !== existingOrder.status) {
            // Send Push & In-App Notification (Fire-and-Forget)
            notifyOrderStatusUpdate(orderId, status, deliveryEstimate, cancelReason).catch((err) => {
                console.error(`[Admin Order Update] Failed to send status update notification for order ${orderId}:`, err);
            });

            // Send Email (Fire-and-Forget)
            (async () => {
                try {
                    const usersCollection = await getCollection('users');
                    let owner = null;
                    
                    if (existingOrder.userId && existingOrder.userId !== 'guest' && /^[0-9a-fA-F]{24}$/.test(existingOrder.userId)) {
                        owner = await usersCollection.findOne({ _id: new ObjectId(existingOrder.userId) });
                    }

                    if (owner?.email || existingOrder.shipping?.email) {
                        await sendOrderStatusUpdate(
                            { ...existingOrder, deliveryEstimate: deliveryEstimate || existingOrder.deliveryEstimate },
                            owner?.email || existingOrder.shipping?.email,
                            status
                        );
                    }
                } catch (e) { 
                    console.error(`[Admin Order Update] Status update email failed for order ${orderId}:`, e); 
                }
            })();
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}