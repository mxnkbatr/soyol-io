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
    const usersCollection = await getCollection('users');
    
    const title = `✅ "${productName}" дахин бэлэн боллоо!`;
    const message = 'Та урьдчилан сонирхсон бараа одоо захиалах боломжтой болсон байна.';

    // 1. Bulk fetch user preferences
    const watcherObjectIds = watchers.map(id => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    }).filter((id): id is ObjectId => id !== null);

    const users = await usersCollection.find(
      { _id: { $in: watcherObjectIds } },
      { projection: { notificationPrefs: 1 } }
    ).toArray();

    const userPrefsMap = new Map(users.map(u => [u._id.toString(), u.notificationPrefs]));

    // 2. Bulk insert in-app notifications
    const newNotifications = watchers.map(watcherId => ({
      userId: watcherId,
      title,
      message,
      type: 'restock_personal' as const,
      isRead: false,
      link: `/product/${productId}`,
      createdAt: new Date(),
    }));

    await notificationsCollection.insertMany(newNotifications);

    // 3. Send FCM pushes in parallel (Promise.allSettled ensures one failure doesn't block others)
    const pushPromises = watchers.map(async (watcherId) => {
      const prefs = userPrefsMap.get(watcherId);
      if (prefs?.stock !== false) {
        await sendPushToUser({
          userId: watcherId,
          title,
          body: message,
          data: { url: `/product/${productId}`, type: 'restock', productId },
        });
      }
    });

    await Promise.allSettled(pushPromises);

    // Clear watchers after notifying
    await productsCollection.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { restockWatchers: [] } }
    );
  } catch (err) {
    console.error('[RestockNotify] Error:', err);
  }
}