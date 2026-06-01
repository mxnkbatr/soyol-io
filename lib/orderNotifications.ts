import { getCollection } from "./mongodb";
import { sendPushToUser } from "./fcm";
import { ObjectId } from "mongodb";

/**
 * Sends both an in-app notification and an FCM push notification to the user
 * when their order status is updated.
 */
export async function notifyOrderStatusUpdate(
  orderId: string,
  status: string,
  deliveryEstimate?: string,
  cancelReason?: string
) {
  try {
    const ordersCollection = await getCollection("orders");
    const notificationsCollection = await getCollection("notifications");

    let orderObjectId: ObjectId;
    try {
      orderObjectId = new ObjectId(orderId);
    } catch {
      console.error(`[notifyOrderStatusUpdate] Invalid orderId format: ${orderId}`);
      return;
    }

    const order = await ordersCollection.findOne({ _id: orderObjectId });
    if (!order) {
      console.error(`[notifyOrderStatusUpdate] Order not found: ${orderId}`);
      return;
    }

    const userId = order.userId;
    if (!userId || userId === "guest") {
      console.log(`[notifyOrderStatusUpdate] Order ${orderId} belongs to guest or has no userId. Skipping notification.`);
      return;
    }

    let title = "";
    let message = "";

    const shortId = orderId.slice(-6);

    switch (status) {
      case "confirmed":
        title = "✅ Захиалга баталгаажлаа!";
        message = `Таны #${shortId} захиалгын төлбөр баталгаажлаа. Хүргэлт: ${deliveryEstimate || order.deliveryEstimate || "Тодорхойлогдоно"}`;
        break;
      case "processing":
        title = order.hasPreOrder
          ? "📦 Урьдчилан захиалсан бараа ирлээ!"
          : "⚙️ Захиалга бэлтгэгдэж байна";
        message = order.hasPreOrder
          ? `Таны #${shortId} урьдчилан захиалсан бараа ирж, савлагдаж байна. Удахгүй хүргэнэ!`
          : `Таны #${shortId} захиалгыг хүргэлтэд бэлтгэж байна.`;
        break;
      case "shipped":
        title = "📦 Захиалга хүргэлтэд гарлаа!";
        message = `Таны #${shortId} захиалсан бараа хүргэлтэд гарлаа. Түр хүлээнэ үү!`;
        break;
      case "delivered":
        title = "🎉 Захиалга хүргэгдлээ!";
        message = `Таны #${shortId} захиалга хүргэгдлээ. Биднийг сонгосонд баярлалаа!`;
        break;
      case "cancelled":
        title = "❌ Захиалга цуцлагдлаа";
        message = `Таны #${shortId} захиалга цуцлагдлаа.${cancelReason ? ` Шалтгаан: ${cancelReason}` : ''}`;
        break;
      case "pending":
        // Usually we don't notify on pending, but included for completeness
        return; 
      default:
        // Fallback for any custom statuses
        return;
    }

    // 1. Insert in-app notification in DB (Always save regardless of push preferences)
    await notificationsCollection.insertOne({
      userId,
      title,
      message,
      type: "order",
      isRead: false,
      link: `/orders/${orderId}`,
      createdAt: new Date(),
    });

    // 2. Fetch User Notification Preferences efficiently
    const usersCollection = await getCollection("users");
    let shouldSendPush = true;

    try {
      const userDoc = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { notificationPrefs: 1 } }
      );

      if (userDoc?.notificationPrefs) {
        const prefs = userDoc.notificationPrefs;

        // Check if status is controlled by the 'order' push preference
        if (["confirmed", "processing", "shipped", "cancelled"].includes(status)) {
          if (prefs.order === false) {
            shouldSendPush = false;
          }
        }

        // Check if status is controlled by the 'delivery' push preference
        if (["shipped", "delivered"].includes(status)) {
          if (prefs.delivery === false) {
            shouldSendPush = false;
          }
        }
      }
    } catch (prefErr) {
      console.error(`[notifyOrderStatusUpdate] Failed to fetch user preferences for ${userId}:`, prefErr);
    }

    // 3. Send FCM Push Notification only if allowed
    if (shouldSendPush) {
      await sendPushToUser({
        userId,
        title,
        body: message,
        data: {
          url: `/orders/${orderId}`,
          orderId,
          type: "order_status_update",
          status
        }
      });
    } else {
      console.log(`[notifyOrderStatusUpdate] FCM push bypassed for user ${userId} due to preference constraints.`);
    }

    console.log(`[notifyOrderStatusUpdate] Successfully processed notification to user ${userId} for order ${orderId} (${status})`);
  } catch (error) {
    console.error(`[notifyOrderStatusUpdate] Error sending notification for order ${orderId}:`, error);
    // Re-throw to be caught by the caller's .catch() block
    throw error;
  }
}

/**
 * Sends both an in-app and push notification when a user places a new order.
 */
export async function notifyOrderPlaced(orderId: string) {
  try {
    const ordersCollection = await getCollection("orders");
    const notificationsCollection = await getCollection("notifications");

    let orderObjectId: ObjectId;
    try {
      orderObjectId = new ObjectId(orderId);
    } catch {
      console.error(`[notifyOrderPlaced] Invalid orderId format: ${orderId}`);
      return;
    }

    const order = await ordersCollection.findOne({ _id: orderObjectId });
    if (!order) {
      console.error(`[notifyOrderPlaced] Order not found: ${orderId}`);
      return;
    }

    const userId = order.userId;
    if (!userId || userId === "guest") {
      console.log(`[notifyOrderPlaced] Order ${orderId} belongs to guest or has no userId. Skipping notification.`);
      return;
    }

    const shortId = orderId.slice(-6);
    const title = "🛍️ Захиалга хүлээн авлаа!";
    const message = `Таны #${shortId} захиалга амжилттай үүслээ. Удахгүй баталгаажих болно.`;

    // 1. Insert in-app notification in DB (Always)
    await notificationsCollection.insertOne({
      userId,
      title,
      message,
      type: "order",
      isRead: false,
      link: `/orders/${orderId}`,
      createdAt: new Date(),
    });

    // 2. Fetch User Notification Preferences
    const usersCollection = await getCollection("users");
    let shouldSendPush = true;

    try {
      const userDoc = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { notificationPrefs: 1 } }
      );

      if (userDoc?.notificationPrefs) {
        const prefs = userDoc.notificationPrefs;
        if (prefs.order === false) {
          shouldSendPush = false;
        }
      }
    } catch (prefErr) {
      console.error(`[notifyOrderPlaced] Failed to fetch user preferences for ${userId}:`, prefErr);
    }

    // 3. Send FCM Push Notification only if allowed
    if (shouldSendPush) {
      await sendPushToUser({
        userId,
        title,
        body: message,
        data: {
          url: `/orders/${orderId}`,
          orderId,
          type: "order_placed"
        }
      });
    } else {
      console.log(`[notifyOrderPlaced] FCM push bypassed for user ${userId} due to preference constraints.`);
    }

    console.log(`[notifyOrderPlaced] Successfully sent order placed notification to user ${userId} for order ${orderId}`);
  } catch (error) {
    console.error(`[notifyOrderPlaced] Error sending order placed notification for order ${orderId}:`, error);
  }
}