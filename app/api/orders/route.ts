import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

import { User } from '@/models/User';
import { sendOrderConfirmation } from '@/lib/email';
import { notifyOrderStatusUpdate, notifyOrderPlaced } from '@/lib/orderNotifications';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneParam = searchParams.get('phone');

    // Guest phone-based tracking — returns strictly partial data to prevent PII harvesting
    if (phoneParam) {
      const orders = await getCollection('orders');
      const results = await orders
        .find({ phone: phoneParam })
        .project({
          _id: 1,
          status: 1,
          createdAt: 1,
        })
        .sort({ createdAt: -1 })
        .toArray();

      const mappedResults = results.map(order => ({
        id: order._id.toString(),
        status: order.status,
        createdAt: order.createdAt,
      }));

      return NextResponse.json({ orders: mappedResults });
    }

    const { userId, phone } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const orders = await getCollection('orders');

    // Find orders by userId OR by matching phone number (catches pre-registration guest orders)
    const query = phone
      ? { $or: [{ userId }, { phone, userId: 'guest' }] }
      : { userId };

    const results = await orders
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ orders: results });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    const userId = authUserId || 'guest';

    const body = await req.json();
    const orders = await getCollection('orders');
    const products = await getCollection('products');

    // Extract phone from shipping info for guest order tracking
    const phone = body.shipping?.phone || body.phone || null;

    // Check for pre-order items
    const hasPreOrder = body.items?.some((item: any) => item.stockStatus === 'pre-order') || false;
    const deliveryEstimate = hasPreOrder ? '7-14 хоног' : 'Өнөөдөр - Маргааш';

    // items-аас server-т нийт үнийг тооцоолох
    const productsCollection = await getCollection('products');
    let serverTotal = 0;

    if (body.items && body.items.length > 0) {
      const { ObjectId } = await import('mongodb');
      const insufficientItems: { name: string; available: number; requested: number }[] = [];

      for (const item of body.items) {
        const productId = item.productId || item.id;
        if (!productId) continue;
        try {
          const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
          if (product) {
            serverTotal += product.price * (item.quantity || 1);

            // Check inventory (skip for pre-order items)
            if (product.stockStatus !== 'pre-order') {
              const availableInventory = product.inventory ?? 0;
              const requestedQty = item.quantity || 1;

              // If product has variants, check variant inventory
              if (item.variantId && product.variants?.length) {
                const variant = product.variants.find((v: any) => v.id === item.variantId);
                const variantInventory = variant?.inventory ?? 0;
                if (requestedQty > variantInventory) {
                  const optionLabel = variant ? Object.values(variant.options).join(' / ') : '';
                  insufficientItems.push({
                    name: `${product.name}${optionLabel ? ` (${optionLabel})` : ''}`,
                    available: variantInventory,
                    requested: requestedQty,
                  });
                }
              } else if (requestedQty > availableInventory) {
                insufficientItems.push({
                  name: product.name,
                  available: availableInventory,
                  requested: requestedQty,
                });
              }
            }
          }
        } catch { continue; }
      }

      // If any items have insufficient inventory, reject the order
      if (insufficientItems.length > 0) {
        const messages = insufficientItems.map(i =>
          `"${i.name}" - ${i.available === 0 ? 'Дууссан байна' : `Зөвхөн ${i.available}ш үлдсэн (${i.requested}ш хүссэн)`}`
        );
        return NextResponse.json(
          { error: `Үлдэгдэл хүрэлцэхгүй байна:\n${messages.join('\n')}` },
          { status: 400 }
        );
      }
    }

    const totalToSave = serverTotal > 0 ? serverTotal : (body.total || 0);

    // Enrich items with product details (name, image, price) before saving
    const enrichedItems = await Promise.all(
      (body.items || []).map(async (item: any) => {
        const productId = item.productId || item.id;
        if (!productId) return item;
        // Only look up if any field is missing
        if (item.name && item.image && item.price) return item;
        try {
          const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
          if (product) {
            return {
              ...item,
              name: item.name || product.name,
              image: item.image || product.images?.[0] || product.image || '',
              price: item.price || product.price || 0,
            };
          }
        } catch { /* invalid objectId, skip */ }
        return item;
      })
    );

    const result = await orders.insertOne({
      userId,
      phone, // Store phone at top level for easy querying
      items: enrichedItems,
      total: totalToSave,
      status: body.status || 'pending',
      deliveryMethod: body.deliveryMethod || 'delivery',
      paymentMethod: body.paymentMethod || 'cash',
      shipping: body.shipping || {},
      shippingCost: body.shippingCost || 0,
      hasPreOrder,
      deliveryEstimate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const currentOrderId = result.insertedId.toString();

    // Admin Notification (Non-blocking)
    if (body.paymentMethod !== 'qpay') {
      try {
        const { notifyAdminNewOrder } = await import('@/lib/adminNotifications');
        await notifyAdminNewOrder(currentOrderId, body.shipping?.fullName || 'Хэрэглэгч', totalToSave);
      } catch (notifError) {
        console.error('Failed to send admin notifications:', notifError);
      }
    }

    // Customer "order received" notification (non-blocking)
    if (userId !== 'guest') {
      (async () => {
        try {
          await notifyOrderPlaced(currentOrderId);
        } catch (e) {
          console.error('Failed to send customer order-received notification:', e);
        }
      })().catch(() => {});
    }

    // Silent Registration: Save address if requested
    if (userId !== 'guest' && body.saveAddress && body.shipping) {
      try {
        const users = await getCollection<User>('users');
        const userObjectId = new ObjectId(userId);

        // Construct new address object
        const newAddress = {
          id: new ObjectId().toString(),
          city: body.shipping.city || '',
          district: body.shipping.district || '',
          label: body.shipping.label || 'Гэр', 
          khoroo: body.shipping.khoroo || '',
          street: body.shipping.street || '',
          apartment: body.shipping.apartment || '',
          entrance: body.shipping.entrance || '',
          floor: body.shipping.floor || '',
          door: body.shipping.door || '',
          note: body.shipping.notes || '',
          isDefault: true,
        };

        // Unset previous default if exists
        await users.updateOne(
          { _id: userObjectId, 'addresses.isDefault': true },
          { $set: { 'addresses.$.isDefault': false } }
        );

        // Add new address
        await users.updateOne(
          { _id: userObjectId },
          {
            $push: { addresses: newAddress } as any,
            $set: { phone: phone || undefined } // Update phone if provided
          }
        );
      } catch (err) {
        console.error('Failed to save address silently:', err);
      }
    }

    // Send Email Confirmation (Non-blocking)
    (async () => {
      try {
        let recipientEmail = body.shipping?.email || body.email;
        if (!recipientEmail && userId !== 'guest' && /^[0-9a-fA-F]{24}$/.test(userId)) {
          const usersCollection = await getCollection('users');
          const owner = await usersCollection.findOne({ _id: new ObjectId(userId) });
          recipientEmail = owner?.email;
        }

        if (recipientEmail) {
          await sendOrderConfirmation({
            id: currentOrderId,
            items: body.items || [],
            totalPrice: totalToSave,
            fullName: body.shipping?.fullName || 'Хэрэглэгч',
            address: body.shipping?.address || '',
            city: body.shipping?.city || ''
          }, recipientEmail);
        }
      } catch (e) { console.error('Email confirmation error:', e); }
    })().catch(e => console.error('Email IIFE error:', e));

    return NextResponse.json({ orderId: currentOrderId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Only allow cancellation for now via this specific endpoint logic
    if (status !== 'cancelled') {
      return NextResponse.json({ error: 'Invalid status update via this endpoint' }, { status: 400 });
    }

    const orders = await getCollection('orders');
    const order = await orders.findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Баталгаажсан захиалгыг цуцлах боломжгүй' },
        { status: 400 }
      );
    }

    await orders.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      }
    );

    // Send notification to customer
    notifyOrderStatusUpdate(orderId, 'cancelled').catch((err) => {
      console.error('Failed to send cancellation notification:', err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order patch error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}