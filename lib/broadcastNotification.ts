import { getCollection } from './mongodb';
import { sendPushToAllUsers } from './fcm';
import { Notification } from '@/models/Notification';

type BroadcastType = Extract<Notification['type'], 'admin_broadcast'>;

export async function broadcastNotificationToAll({
  title,
  message,
  link = '/',
  type = 'admin_broadcast',
  imageUrl,
}: {
  title: string;
  message: string;
  link?: string;
  type?: BroadcastType;
  imageUrl?: string;
}) {
  const fcmResult = await sendPushToAllUsers({
    title,
    body: message,
    imageUrl,
    data: {
      url: link,
      type,
    },
  });

  const notificationsCollection = await getCollection('notifications');
  const notificationData: Omit<Notification, '_id'> = {
    userId: 'all',
    title,
    message,
    type,
    isRead: false,
    link,
    createdAt: new Date(),
  };
  await notificationsCollection.insertOne(notificationData);

  return fcmResult;
}
