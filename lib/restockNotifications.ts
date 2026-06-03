import { getCollection } from './mongodb';
import { sendPushToUser } from './fcm';
import { ObjectId } from 'mongodb';

export async function notifyRestockWatchers(productId: string, productName: string) {
  try {
    const productsCollection = await getCollection('products');
    const product = await productsCollection.findOne(
      { _id: new ObjectId(productId) },
      { projection: { restockWatchers: 1 } }
    );
    
    const watchers: string[] = product?.restockWatchers || [];
    if (watchers.length === 0) return;

    const notificationsCollection = await getCollection('notifications');
    const title = `✅ "${productName}" дахин бэлэн боллоо!`;
    const message = 'Та урьдчилан сонирхсон бараа одоо захиалах боломжтой болсон байна.';

    for (const watcherId of watchers) {
      // In-app notification
      await notificationsCollection.insertOne({
        userId: watcherId,
        title,
        message,
        type: 'restock_personal',
        isRead: false,
        link: `/product/${productId}`,
        createdAt: new Date(),
      });

      // FCM push (check prefs)
      const usersCollection = await getCollection('users');
      const user = await usersCollection.findOne(
        { _id: new ObjectId(watcherId) },
        { projection: { notificationPrefs: 1 } }
      );
      if (user?.notificationPrefs?.stock !== false) {
        await sendPushToUser({
          userId: watcherId,
          title,
          body: message,
          data: { url: `/product/${productId}`, type: 'restock', productId },
        });
      }
    }

    // Clear watchers after notifying
    await productsCollection.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { restockWatchers: [] } }
    );
  } catch (err) {
    console.error('[RestockNotify] Error:', err);
  }
}