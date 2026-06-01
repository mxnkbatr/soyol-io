import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkPayment } from '@/lib/qpay';
import { ObjectId } from 'mongodb';
import { deductInventory } from '@/lib/inventory';
import { notifyOrderStatusUpdate, notifyOrderPlaced } from '@/lib/orderNotifications';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ invoiceId: string }> }
) {
    try {
        const { invoiceId } = await params;

        if (!invoiceId) {
            return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });
        }

        // 1. Check QPay Status
        const paymentStatus = await checkPayment(invoiceId);

        if (paymentStatus.paid) {
            // 2. Update Order Status
            const ordersCollection = await getCollection('orders');
            const order = await ordersCollection.findOne({ qpayInvoiceId: invoiceId });

            if (order && order.status === 'pending') {
                await ordersCollection.updateOne(
                    { _id: order._id },
                    {
                        $set: {
                            status: 'confirmed',
                            paidAt: paymentStatus.paidAt,
                            updatedAt: new Date()
                        }
                    }
                );

                const orderIdStr = order._id.toString();

                // Deduct inventory since order is now confirmed
                try {
                    if (order.items && order.items.length > 0) {
                        await deductInventory(orderIdStr, order.items);
                    }
                } catch (e) {
                    console.error('[QPay Check] Failed to deduct inventory:', e);
                }

                // Notify Admin
                try {
                    const { notifyAdminNewOrder } = await import('@/lib/adminNotifications');
                    await notifyAdminNewOrder(
                        orderIdStr, 
                        order.shipping?.fullName || 'Хэрэглэгч', 
                        order.total || order.totalPrice || 0
                    );
                } catch (e) {
                    console.error('[QPay Check] Failed to notify admin:', e);
                }

                // Notify Customer (Order received first, then payment confirmed - Non-blocking)
                notifyOrderPlaced(orderIdStr).catch((err) => {
                    console.error('[QPay Check] Failed to send order placed notification:', err);
                });

                notifyOrderStatusUpdate(orderIdStr, 'confirmed').catch((err) => {
                    console.error('[QPay Check] Failed to send status update notification:', err);
                });
            }
        }

        return NextResponse.json(paymentStatus);
    } catch (error: any) {
        console.error('[QPay Check API] Error:', error);
        return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
    }
}