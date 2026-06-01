import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { checkPayment } from '@/lib/qpay';
import { deductInventory } from '@/lib/inventory';
import { notifyOrderStatusUpdate, notifyOrderPlaced } from '@/lib/orderNotifications';

export async function GET(req: NextRequest) {
    return POST(req);
}

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get('order_id');
        const body = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
        }

        let orderObjectId: ObjectId;
        try {
            orderObjectId = new ObjectId(orderId);
        } catch {
            return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 });
        }

        const ordersCollection = await getCollection('orders');
        const order = await ordersCollection.findOne({ _id: orderObjectId });

        if (!order || order.status !== 'pending') {
            return NextResponse.json({ success: true }); // Already processed or not found
        }

        // QPay-с шууд баталгаажуул
        if (!order.qpayInvoiceId) {
            return NextResponse.json({ error: 'No invoice found' }, { status: 400 });
        }

        const paymentStatus = await checkPayment(order.qpayInvoiceId);
        if (!paymentStatus.paid) {
            return NextResponse.json({ success: true }); // Not actually paid yet
        }

        await ordersCollection.updateOne(
            { _id: orderObjectId },
            {
                $set: {
                    status: 'confirmed',
                    paidAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        // Deduct inventory since order is now confirmed
        try {
            if (order.items && order.items.length > 0) {
                await deductInventory(orderId, order.items);
            }
        } catch (e) {
            console.error('[QPay Callback] Failed to deduct inventory:', e);
        }

        // Notify Admin
        try {
            const { notifyAdminNewOrder } = await import('@/lib/adminNotifications');
            await notifyAdminNewOrder(
                orderId, 
                order.shipping?.fullName || 'Хэрэглэгч', 
                order.total || order.totalPrice || 0
            );
        } catch (e) {
            console.error('[QPay Callback] Failed to notify admin:', e);
        }

        // Notify Customer (Order received first, then payment confirmed)
        notifyOrderPlaced(orderId).catch((err) => {
            console.error('[QPay Callback] Failed to send order placed notification:', err);
        });

        notifyOrderStatusUpdate(orderId, 'confirmed').catch((err) => {
            console.error('[QPay Callback] Failed to send status update notification:', err);
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[QPay Callback] Error:', error);
        return NextResponse.json({ error: 'Callback failed' }, { status: 500 });
    }
}