import { getCollection } from "./mongodb";
import { ObjectId } from "mongodb";
import { notifyVendorProductSold } from "./vendorNotifications";

const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || "5", 10);

interface OrderItem {
  id?: string;
  productId?: string;
  quantity: number;
  variantId?: string;
  selectedOptions?: Record<string, string>;
  name?: string;
  [key: string]: unknown;
}

/**
 * Deducts stock from each product (or variant) in the order.
 * Idempotent: uses an `inventoryDeducted` flag on the order document
 * so calling this more than once for the same order is a no-op.
 */
export async function deductInventory(
  orderId: string,
  items: OrderItem[],
): Promise<void> {
  if (!items || items.length === 0) return;

  let orderObjectId: ObjectId;
  try {
    orderObjectId = new ObjectId(orderId);
  } catch {
    console.error(`[Inventory] Invalid orderId: ${orderId}`);
    return;
  }

  const ordersCollection = await getCollection("orders");

  // Atomic idempotency check: only set the flag if it isn't already set.
  // matchedCount === 0  →  flag was already true, so we skip.
  const guard = await ordersCollection.updateOne(
    { _id: orderObjectId, inventoryDeducted: { $ne: true } },
    { $set: { inventoryDeducted: true } },
  );

  if (guard.matchedCount === 0) {
    console.log(`[Inventory] Already deducted for order ${orderId}, skipping.`);
    return;
  }

  const productsCollection = await getCollection("products");

  for (const item of items) {
    const productId = item.productId ?? item.id;
    if (!productId) continue;

    let productObjectId: ObjectId;
    try {
      productObjectId = new ObjectId(productId);
    } catch {
      console.warn(`[Inventory] Skipping invalid productId: ${productId}`);
      continue;
    }

    const qty = Math.max(1, item.quantity ?? 1);

    try {
      if (item.variantId) {
        // Decrement the specific variant's inventory
        await productsCollection.updateOne(
          { _id: productObjectId, "variants.id": item.variantId },
          {
            $inc: {
              "variants.$.inventory": -qty,
              salesCount: qty,
            },
          },
        );
      } else {
        // Decrement the top-level product inventory
        await productsCollection.updateOne(
          { _id: productObjectId },
          {
            $inc: {
              inventory: -qty,
              salesCount: qty,
            },
          },
        );
      }

      // Notify vendor about the sale (non-blocking)
      const productName = item.name || "Бараа";
      notifyVendorProductSold(productObjectId.toString(), productName, qty, orderId).catch((err) => {
        console.error(`[Inventory] Failed to send sale notification for product ${productId}:`, err);
      });

      // Post-deduction low-stock / sold-out check (non-blocking)
      ;(async () => {
        try {
          const updated = await productsCollection.findOne(
            { _id: productObjectId },
            { projection: { inventory: 1, name: 1, vendorId: 1 } }
          );
          if (!updated) return;

          const updatedInventory = updated.inventory ?? 0;

          if (updatedInventory <= LOW_STOCK_THRESHOLD) {
            const { sendPushToUser } = await import('./fcm');
            const { getCollection: gc } = await import('./mongodb');
            const notificationsCollection = await gc('notifications');
            const usersCollection = await gc('users');

            // 1. Notify vendor if product has a vendorId (fire-and-forget)
            if (updated.vendorId) {
              const { notifyVendorLowStock } = await import('./vendorNotifications');
              notifyVendorLowStock(
                updated.vendorId,
                productObjectId.toString(),
                updated.name,
                updatedInventory
              ).catch((err) => {
                console.error('[Inventory] Failed to notify vendor of low stock:', err);
              });
            }

            // 2. Notify all admins
            const isSoldOut = updatedInventory <= 0;
            const title = isSoldOut
              ? `🚫 "${updated.name}" дууслаа!`
              : `⚠️ "${updated.name}" бараа дуусаж байна`;
            const message = isSoldOut
              ? `Бараа дууслаа! Нөөц яаралтай нэмнэ үү.`
              : `Зөвхөн ${updatedInventory}ш үлдлээ. Нөөц нэмэхийг санал болгож байна.`;

            const admins = await usersCollection.find({ role: 'admin' }).toArray();
            for (const admin of admins) {
              const adminId = admin._id.toString();
              if (adminId === updated.vendorId) continue; // skip if vendor IS admin
              await notificationsCollection.insertOne({
                userId: adminId,
                title,
                message,
                type: 'stock',
                isRead: false,
                link: `/admin/products`,
                createdAt: new Date(),
              });
              sendPushToUser({
                userId: adminId,
                title,
                body: message,
                data: { type: 'low_stock', productId: productObjectId.toString() },
              }).catch(() => {});
            }
          }
        } catch (checkErr) {
          console.error('[Inventory] Low-stock check failed:', checkErr);
        }
      })();

    } catch (itemError) {
      // Log but continue — one bad item should not block the rest
      console.error(
        `[Inventory] Failed to deduct product ${productId} (order ${orderId}):`,
        itemError,
      );
    }
  }

  console.log(
    `[Inventory] Deducted inventory for order ${orderId} (${items.length} item(s)).`,
  );
}