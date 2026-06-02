import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
    try {
        const { userId, role } = await auth();
        // Ensure the user is an admin
        if (!userId || role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const productsCollection = await getCollection('products');

        const newProduct = {
            ...body,
            inventory: Number(body.inventory) || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await productsCollection.insertOne(newProduct);
        const insertedId = result.insertedId.toString();

        // Notify all users about the new product (non-blocking, fire-and-forget)
        ;(async () => {
            try {
                const { sendPushToAllUsers } = await import('@/lib/fcm');
                const notificationTitle = '🔥 Шинэ бараа ирлээ!';
                const notificationBody = `${newProduct.name} яг одоо бэлэн байна.${newProduct.price ? ` Үнэ: ${newProduct.price}₮` : ''}`;
                const imageUrl = newProduct.images?.[0] || newProduct.image || undefined;

                await sendPushToAllUsers({
                    title: notificationTitle,
                    body: notificationBody,
                    imageUrl,
                    data: {
                        url: `/product/${insertedId}`,
                        productId: insertedId,
                        type: 'new_product',
                    },
                });

                const notificationsCollection = await getCollection('notifications');
                await notificationsCollection.insertOne({
                    userId: 'all',
                    title: notificationTitle,
                    message: notificationBody,
                    type: 'new_product',
                    isRead: false,
                    link: `/product/${insertedId}`,
                    createdAt: new Date(),
                });
            } catch (err) {
                console.error('[Admin Product] Notification error:', err);
            }
        })();

        return NextResponse.json({ success: true, productId: insertedId }, { status: 201 });
    } catch (error) {
        console.error('[Admin] Failed to create product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { userId, role } = await auth();
        // Ensure the user is an admin
        if (!userId || role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { productId, ...updatedFields } = body;

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        const productsCollection = await getCollection('products');
        const existingProduct = await productsCollection.findOne({ _id: new ObjectId(productId) });

        if (!existingProduct) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const previousInventory = Number(existingProduct.inventory) || 0;

        // Process fields to avoid mutating structural metadata unnecessarily
        const fieldsToUpdate = { ...updatedFields };
        if (fieldsToUpdate.inventory !== undefined) {
            fieldsToUpdate.inventory = Number(fieldsToUpdate.inventory) || 0;
        }
        fieldsToUpdate.updatedAt = new Date();

        await productsCollection.updateOne(
            { _id: new ObjectId(productId) },
            { $set: fieldsToUpdate }
        );

        const newInventory = fieldsToUpdate.inventory !== undefined ? fieldsToUpdate.inventory : previousInventory;
        const isRestocked = previousInventory === 0 && newInventory > 0;

        if (isRestocked) {
            const productName = fieldsToUpdate.name || existingProduct.name;
            const productImages = fieldsToUpdate.images || existingProduct.images;
            const imageUrl = productImages?.[0] || undefined;

            // Notify all users about restocked product (non-blocking, fire-and-forget)
            ;(async () => {
                try {
                    const { sendPushToAllUsers } = await import('@/lib/fcm');
                    await sendPushToAllUsers({
                        title: '✅ Бараа нөөцлөгдлөө!',
                        body: `${productName} дахин бэлэн боллоо!`,
                        imageUrl,
                        data: {
                            url: `/product/${productId}`,
                            productId,
                            type: 'restock',
                        },
                    });

                    const notificationsCollection = await getCollection('notifications');
                    await notificationsCollection.insertOne({
                        userId: 'all',
                        title: '✅ Бараа нөөцлөгдлөө!',
                        message: `${productName} дахин бэлэн боллоо!`,
                        type: 'product',
                        isRead: false,
                        link: `/product/${productId}`,
                        createdAt: new Date(),
                    });

                    // ── Personal restock watchers alert block ──
                    const watchers = existingProduct.restockWatchers || [];
                    if (watchers.length > 0) {
                        const { sendPushToUser } = await import('@/lib/fcm');
                        for (const watcher of watchers) {
                            try {
                                await sendPushToUser({
                                    userId: watcher,
                                    title: `✅ ${productName} дахин бэлэн боллоо!`,
                                    body: "Таны хүлээж байсан бараа нэмэгдлээ. Яараарай!",
                                    imageUrl,
                                    data: {
                                        url: `/product/${productId}`,
                                        type: 'restock_personal'
                                    }
                                });

                                await notificationsCollection.insertOne({
                                    userId: watcher,
                                    title: `✅ ${productName} дахин бэлэн боллоо!`,
                                    message: "Таны хүлээж байсан бараа нэмэгдлээ. Яараарай!",
                                    type: 'product',
                                    isRead: false,
                                    link: `/product/${productId}`,
                                    createdAt: new Date(),
                                });
                            } catch (watcherErr) {
                                console.error(`[Admin Product Restock] Error notifying watcher ${watcher}:`, watcherErr);
                            }
                        }

                        // Clear the watchers array to prevent repeated notifications on future updates
                        await productsCollection.updateOne(
                            { _id: new ObjectId(productId) },
                            { $set: { restockWatchers: [] } }
                        );
                    }
                } catch (err) {
                    console.error('[Admin Product Restock] Notification error:', err);
                }
            })();
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Admin] Failed to update product:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}