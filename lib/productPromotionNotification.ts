import { getCollection } from '@/lib/mongodb';
import { Notification } from '@/models/Notification';
import { buildFeaturedProductNotification, type ProductDoc } from '@/lib/productPromotionHelpers';

export async function sendFeaturedProductNotification(
  productId: string,
  product: ProductDoc,
) {
  const { title, body, imageUrl, link } = buildFeaturedProductNotification(
    product,
    productId,
  );

  const { sendPushToAllUsers } = await import('@/lib/fcm');
  const fcmResult = await sendPushToAllUsers({
    title,
    body,
    imageUrl,
    data: {
      url: link,
      productId,
      type: 'product_featured',
    },
  });

  const notificationsCollection = await getCollection('notifications');
  const notificationData: Omit<Notification, '_id'> = {
    userId: 'all',
    title,
    message: body,
    type: 'product_featured',
    isRead: false,
    link,
    createdAt: new Date(),
  };
  await notificationsCollection.insertOne(notificationData);

  return fcmResult;
}
