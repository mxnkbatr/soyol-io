import { getCollection } from './mongodb';
import { sendPushToUser } from './fcm';
import { ObjectId } from 'mongodb';

export async function notifyVendorProductSold(
  productId: string,
  productName: string,
  qty: number,
  orderId: string,
) {
  try {
    const productsCollection = await getCollection('products');
    const product = await productsCollection.findOne(
      { _id: new ObjectId(productId) },
      { projection: { vendorId: 1 } }
    );
    if (!product?.vendorId) return; // not a vendor product

    const notificationsCollection = await getCollection('notifications');
    const title = `🛍️ "${productName}" ${qty}ш зарагдлаа!`;
    const message = `#${orderId.slice(-6)} захиалгаар ${qty}ш худалдагдлаа.`;

    await notificationsCollection.insertOne({
      userId: product.vendorId,
      title,
      message,
      type: 'sale',
      isRead: false,
      link: `/admin/orders`,
      createdAt: new Date(),
    });

    await sendPushToUser({
      userId: product.vendorId,
      title,
      body: message,
      data: {
        type: 'product_sold',
        orderId,
        productId,
      },
    });
  } catch (err) {
    console.error('[VendorNotifications] Failed to notify vendor:', err);
  }
}

/**
 * Notifies a vendor when their store registration is approved, rejected, or suspended.
 */
export async function notifyVendorStoreStatus(
  vendorId: string,
  status: 'active' | 'rejected' | 'suspended',
  storeName: string
) {
  try {
    const notificationsCollection = await getCollection('notifications');
    let title = '';
    let message = '';
    let link = '';

    if (status === 'active') {
      title = "✅ Дэлгүүр баталгаажлаа!";
      message = `Таны «${storeName}» дэлгүүр идэвхжиж, бараа нэмэх боломжтой боллоо.`;
      link = '/vendor/dashboard';
    } else if (status === 'rejected') {
      title = "❌ Дэлгүүр цуцлагдлаа";
      message = `Таны «${storeName}» дэлгүүрийн хүсэлт татгалзсан байна. Дэлгэрэнгүй мэдээлэл авахыг хүсвэл холбогдоно уу.`;
      link = '/vendor/register';
    } else if (status === 'suspended') {
      title = "🚫 Дэлгүүр түдгэлзлээ";
      message = `Таны «${storeName}» дэлгүүрийн үйл ажиллагааг түр зогсоолоо.`;
      link = '/vendor/dashboard';
    } else {
      return;
    }

    // 1. Insert In-App Notification
    await notificationsCollection.insertOne({
      userId: vendorId,
      title,
      message,
      type: 'system',
      isRead: false,
      link,
      createdAt: new Date(),
    });

    // 2. Send FCM Push Notification
    await sendPushToUser({
      userId: vendorId,
      title,
      body: message,
      data: {
        type: 'store_status',
        status,
      }
    });

    console.log(`[StoreStatusNotify] Notified vendor ${vendorId} for status: ${status}`);
  } catch (err) {
    console.error('[StoreStatusNotify] Failed to notify vendor:', err);
  }
}

/**
 * Sends in-app and push low-stock alerts to a vendor.
 */
export async function notifyVendorLowStock(
  vendorId: string,
  productId: string,
  productName: string,
  remainingQty: number
) {
  try {
    const notificationsCollection = await getCollection('notifications');
    const title = `⚠️ "${productName}" барааны үлдэгдэл бага байна`;
    const message = remainingQty === 0
      ? "Бараа дууслаа! Нөөц яаралтай нэмнэ үү."
      : `Зөвхөн ${remainingQty}ш үлдлээ. Нөөц нэмэхийг санал болгож байна.`;

    // 1. In-App Notification
    await notificationsCollection.insertOne({
      userId: vendorId,
      title,
      message,
      type: 'system',
      isRead: false,
      link: '/vendor/products',
      createdAt: new Date(),
    });

    // 2. FCM Push Notification
    await sendPushToUser({
      userId: vendorId,
      title,
      body: message,
      data: {
        type: 'low_stock',
        productId,
      }
    });

    console.log(`[LowStockNotify] Notified vendor ${vendorId} of low stock on product ${productId}`);
  } catch (err) {
    console.error('[LowStockNotify] Failed to notify vendor of low stock:', err);
  }
}