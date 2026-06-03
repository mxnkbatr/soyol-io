import { getCollection } from "@/lib/mongodb";
import { sendPushToUser } from "@/lib/fcm";
import { ObjectId } from "mongodb";

export async function notifyAdminNewOrder(
  orderId: string,
  customerName: string,
  total: number,
) {
  try {
    const usersCollection = await getCollection("users");
    const notificationsCollection = await getCollection("notifications");

    const admins = await usersCollection.find({ role: "admin" }).toArray();

    if (admins.length > 0) {
      const notifications = admins.map((admin) => ({
        userId: admin._id.toString(),
        title: "🛒 Шинэ захиалга баталгаажлаа!",
        message: `${customerName} хэрэглэгчээс - ${total}₮`,
        type: "order",
        isRead: false,
        link: `/admin/orders`,
        createdAt: new Date(),
      }));

      await notificationsCollection.insertMany(notifications);

      // Send FCM push to each admin's phone (non-blocking)
      for (const admin of admins) {
        sendPushToUser({
          userId: admin._id.toString(),
          title: "🛒 Шинэ захиалга!",
          body: `${customerName} - ${total.toLocaleString()}₮`,
          data: { url: "/admin/orders" },
        }).catch((err: unknown) => console.error("FCM admin push error:", err));
      }

      console.log(
        `[AdminNotifications] Sent notifications to ${admins.length} admins for order ${orderId}`,
      );
    }
  } catch (error) {
    console.error("Failed to send admin notifications:", error);
  }
}

/**
 * Sends an offline FCM push notification to the recipient of a chat message,
 * respecting their `notificationPrefs.chat` configuration.
 */
export async function notifyUserNewChatMessage({
  roomId,
  senderId,
  text,
  vendorId,
  customerId,
}: {
  roomId: string;
  senderId: string;
  text: string;
  vendorId: string;
  customerId: string;
}) {
  try {
    // Determine the recipient ID (send to customer if vendor sent it, and vice versa)
    const recipientId = senderId === vendorId ? customerId : vendorId;

    const usersCollection = await getCollection("users");
    const recipient = await usersCollection.findOne(
      { _id: new ObjectId(recipientId) },
      { projection: { notificationPrefs: 1, pushTokens: 1 } }
    );

    // Only send FCM if the recipient has chat notifications enabled and has push tokens
    if (recipient?.notificationPrefs?.chat !== false && recipient?.pushTokens && recipient.pushTokens.length > 0) {
      await sendPushToUser({
        userId: recipientId,
        title: "💬 Шинэ мессеж",
        body: text.slice(0, 100),
        data: { url: `/messages/${roomId}`, type: "chat" },
      });
    }
  } catch (error) {
    console.error("[Chat Notification] Failed to send chat FCM notification:", error);
  }
}