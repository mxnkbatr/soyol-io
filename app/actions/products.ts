'use server';

import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/auth';
import { sendPushToAllUsers } from '@/lib/fcm';

export type ProductFormData = {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  sections?: string[];
  image: string;
  images?: string[];
  category: string;
  subcategory?: string;
  stockStatus: string;
  inventory: number;
  salesCount?: number;
  shippingOrigin?: string;
  shippingDestination?: string;
  dispatchTime?: string;
  sizeGuideUrl?: string;
  brand?: string;
  model?: string;
  delivery?: string;
  deliveryFee?: number;
  paymentMethods?: string;
  attributes?: Record<string, string>;
  options?: { id: string; name: string; values: string[] }[];
  variants?: {
    id: string;
    options: Record<string, string>;
    inventory: number;
    price?: number;
    image?: string;
  }[];
  featured?: boolean;
  isCargo?: boolean;
};

export async function createProduct(data: ProductFormData) {
  try {
    const user = await currentUser();
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Зөвшөөрөлгүй' };
    }

    const products = await getCollection('products');
    
    // Create a clean data object
    const productData: any = { ...data };
    
    // Ensure numeric types
    productData.inventory = Number(productData.inventory) || 0;
    productData.price = Number(productData.price) || 0;
    if (productData.originalPrice !== undefined) productData.originalPrice = Number(productData.originalPrice) || 0;
    if (productData.discountPercent !== undefined) productData.discountPercent = Number(productData.discountPercent) || 0;
    if (productData.salesCount !== undefined) productData.salesCount = Number(productData.salesCount) || 0;
    if (productData.deliveryFee !== undefined) productData.deliveryFee = Number(productData.deliveryFee) || 0;

    const result = await products.insertOne({
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Fire-and-forget: notify all users about the new product
    sendPushToAllUsers({
      title: '🔥 Шинэ бараа ирлээ!',
      body: `${productData.name} яг одоо бэлэн байна.${productData.price ? ` Үнэ: ${productData.price}₮` : ''}`,
      imageUrl: productData.image,
      data: {
        url: `/product/${result.insertedId.toString()}`,
        productId: result.insertedId.toString(),
        type: 'new_product',
      },
    }).catch((err) => console.error('FCM: Background send error:', err));

    // Save global notification to Database for the in-app notification history
    (async () => {
      try {
        const notifications = await getCollection('notifications');
        await notifications.insertOne({
          userId: 'all',
          title: '🔥 Шинэ бараа ирлээ!',
          message: `${productData.name} яг одоо бэлэн байна.${productData.price ? ` Үнэ: ${productData.price}₮` : ''}`,
          type: 'new_product',
          isRead: false,
          link: `/product/${result.insertedId.toString()}`,
          createdAt: new Date(),
        });
      } catch (err) {
        console.error('FCM: Failed to save global product notification in DB:', err);
      }
    })().catch((err) => console.error('FCM: IIFE error:', err));

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/ready-to-ship');
    revalidatePath('/pre-order');
    revalidatePath('/admin/products');

    return { success: true, productId: result.insertedId.toString() };
  } catch (error) {
    console.error('Error creating product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create product' };
  }
}

export async function deleteProduct(productId: string) {
  try {
   const user = await currentUser();
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Зөвшөөрөлгүй' };
    }

    const products = await getCollection('products');
    await products.deleteOne({ _id: new ObjectId(productId) });

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/ready-to-ship');
    revalidatePath('/pre-order');
    revalidatePath('/admin/products');

    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}

export async function getAllProducts() {
  try {
    const products = await getCollection('products');
    const results = await products.find({}).sort({ createdAt: -1 }).toArray();
    return JSON.parse(JSON.stringify(results));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function updateProduct(productId: string, data: Partial<ProductFormData>) {
  try {
    const user = await currentUser();
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Зөвшөөрөлгүй' };
    }

    const products = await getCollection('products');
    const existingProduct = await products.findOne({ _id: new ObjectId(productId) });

    if (!existingProduct) {
      return { success: false, error: 'Бараа олдсонгүй' };
    }

    const previousInventory = Number(existingProduct.inventory) || 0;

    // Create a clean update object with only provided fields
    const updateData: any = { ...data };
    
    // Ensure numeric types
    if (updateData.inventory !== undefined) updateData.inventory = Number(updateData.inventory) || 0;
    if (updateData.price !== undefined) updateData.price = Number(updateData.price) || 0;
    if (updateData.originalPrice !== undefined) updateData.originalPrice = Number(updateData.originalPrice) || 0;
    if (updateData.discountPercent !== undefined) updateData.discountPercent = Number(updateData.discountPercent) || 0;
    if (updateData.salesCount !== undefined) updateData.salesCount = Number(updateData.salesCount) || 0;
    if (updateData.deliveryFee !== undefined) updateData.deliveryFee = Number(updateData.deliveryFee) || 0;

    // Remove _id if it accidentally exists in data
    delete updateData._id;

    await products.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    const newInventory = updateData.inventory !== undefined ? updateData.inventory : previousInventory;
    const isRestocked = previousInventory === 0 && newInventory > 0;

    if (isRestocked) {
      const productName = updateData.name || existingProduct.name;
      const productImages = updateData.images || existingProduct.images;
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
                console.error(`[Admin Product Restock Action] Error notifying watcher ${watcher}:`, watcherErr);
              }
            }

            // Clear the watchers array to prevent repeated notifications on future updates
            await products.updateOne(
              { _id: new ObjectId(productId) },
              { $set: { restockWatchers: [] } }
            );
          }
        } catch (err) {
          console.error('[Admin Product Restock Action] Notification error:', err);
        }
      })();
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/ready-to-ship');
    revalidatePath('/pre-order');
    revalidatePath(`/product/${productId}`);
    revalidatePath('/admin/products');

    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error: 'Failed to update product' };
  }
}