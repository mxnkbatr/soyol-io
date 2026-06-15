import { getCollection } from "./mongodb";
import { User, PushToken } from "@/models/User";

let admin: any = null;

/** Android notification channel — must match FCM android.notification.channelId */
export const PUSH_CHANNEL_ID = "soyol_push";

/** APNs hex token биш, жинхэнэ FCM registration token эсэхийг шалгана */
export function isFcmRegistrationToken(token: string): boolean {
  return token.includes(":") && token.length > 80;
}

async function getAllValidFcmTokens(): Promise<string[]> {
  const usersCollection = await getCollection<User>("users");
  const users = await usersCollection
    .find(
      { pushTokens: { $exists: true, $ne: [] } },
      { projection: { pushTokens: 1, notificationPrefs: 1 } },
    )
    .toArray();

  const tokenSet = new Set<string>();
  for (const user of users) {
    if (user.notificationPrefs?.promo === false) continue;
    for (const pt of user.pushTokens || []) {
      if (pt.token && isFcmRegistrationToken(pt.token)) {
        tokenSet.add(pt.token);
      }
    }
  }
  return [...tokenSet];
}

async function sendMulticastBatched(
  firebase: { messaging: () => { sendEachForMulticast: (msg: unknown) => Promise<{ successCount: number; failureCount: number; responses: Array<{ success: boolean; error?: { code?: string } }> }> } },
  tokens: string[],
  payload: ReturnType<typeof buildPushPayload>,
) {
  const batchSize = 500;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const response = await firebase.messaging().sendEachForMulticast({
      ...payload,
      tokens: batch,
    });
    successCount += response.successCount;
    failureCount += response.failureCount;

    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(
            `FCM multicast fail [${batch[idx]?.slice(0, 16)}...]:`,
            resp.error?.code,
          );
        }
      });
    }
  }

  return { successCount, failureCount, tokenCount: tokens.length };
}

async function getFirebaseAdmin() {
  if (typeof window !== "undefined") return null; // Server-side only

  if (admin) return admin;

  const firebaseAdmin = await import("firebase-admin");

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("FCM: Missing Firebase environment variables");
    return null;
  }

  if (!firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  admin = firebaseAdmin;
  return admin;
}

function toStringData(data?: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [key, String(value)]),
  );
}

/** High-priority payload so notifications show when app is closed/background. */
function buildPushPayload({
  title,
  body,
  imageUrl,
  data,
}: {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}) {
  const stringData = toStringData(data);

  return {
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: stringData,
    android: {
      priority: "high" as const,
      notification: {
        channelId: PUSH_CHANNEL_ID,
        sound: "default",
        priority: "high" as const,
        defaultSound: true,
        defaultVibrateTimings: true,
        visibility: "PUBLIC" as const,
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
        "apns-push-type": "alert",
        "apns-topic": "mn.soyol.shop",
      },
      payload: {
        aps: {
          alert: { title, body },
          sound: "default",
          badge: 1,
          "mutable-content": imageUrl ? 1 : 0,
        },
      },
    },
  };
}

export async function sendPushToAllUsers({
  title,
  body,
  imageUrl,
  data,
}: {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}) {
  try {
    const firebase = await getFirebaseAdmin();
    if (!firebase) return;

    const payload = buildPushPayload({ title, body, imageUrl, data });

    // Topic (хэрэглэгчид subscribe хийсэн бол)
    let topicId: string | undefined;
    try {
      topicId = await firebase.messaging().send({ ...payload, topic: "all-users" });
      console.log(`FCM: Sent notification to topic 'all-users':`, topicId);
    } catch (error) {
      console.error("FCM Topic Send Error:", error);
    }

    // MongoDB дээрх бүх FCM token руу шууд илгээх (topic ажиллахгүй үед)
    const tokens = await getAllValidFcmTokens();
    let multicast = { successCount: 0, failureCount: 0, tokenCount: 0 };
    if (tokens.length > 0) {
      multicast = await sendMulticastBatched(firebase, tokens, payload);
      console.log(`FCM: Multicast to ${multicast.tokenCount} tokens:`, multicast);
    } else {
      console.warn("FCM: No valid FCM tokens in database");
    }

    return { topicId, multicast };
  } catch (error) {
    console.error("FCM Send Error:", error);
    throw error;
  }
}

/**
 * Subscribe a token to a specific topic
 */
export async function subscribeTokenToTopic(token: string, topic: string) {
  try {
    const firebase = await getFirebaseAdmin();
    if (!firebase) return;

    const response = await firebase.messaging().subscribeToTopic([token], topic);
    console.log(`FCM: Subscribed token to topic ${topic} (success count: ${response.successCount})`);
    if (response.failureCount > 0) {
      console.error(`FCM: Topic subscribe failures for ${topic}:`, response.errors);
    }
    return response;
  } catch (error) {
    console.error(`FCM: Error subscribing token to topic ${topic}:`, error);
    throw error;
  }
}

/**
 * Unsubscribe a token from a specific topic
 */
export async function unsubscribeTokenFromTopic(token: string, topic: string) {
  try {
    const firebase = await getFirebaseAdmin();
    if (!firebase) return;

    const response = await firebase.messaging().unsubscribeFromTopic([token], topic);
    console.log(`FCM: Unsubscribed token from topic ${topic} (success count: ${response.successCount})`);
    return response;
  } catch (error) {
    console.error(`FCM: Error unsubscribing token from topic ${topic}:`, error);
  }
}

/**
 * Send a push notification to a specific user by their MongoDB userId.
 */
export async function sendPushToUser({
  userId,
  title,
  body,
  imageUrl,
  data,
}: {
  userId: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}) {
  try {
    const firebase = await getFirebaseAdmin();
    if (!firebase) return;

    const { ObjectId } = await import("mongodb");
    const usersCollection = await getCollection<User>("users");
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { pushTokens: 1 } },
    );

    if (!user?.pushTokens || user.pushTokens.length === 0) {
      console.log(`FCM: No tokens for user ${userId}`);
      return;
    }

    const tokens = user.pushTokens
      .map((pt: PushToken) => pt.token)
      .filter((token) => isFcmRegistrationToken(token));

    if (tokens.length === 0) {
      console.log(`FCM: No valid FCM tokens for user ${userId}`);
      return;
    }

    const message = {
      ...buildPushPayload({ title, body, imageUrl, data }),
      tokens,
    };

    const response = await firebase.messaging().sendEachForMulticast(message);

    // Cleanup invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await usersCollection.updateMany(
          { "pushTokens.token": { $in: tokensToRemove } },
          { $pull: { pushTokens: { token: { $in: tokensToRemove } } } } as any,
        );
      }
    }

    console.log(`FCM: Sent to user ${userId} (${tokens.length} devices)`);
  } catch (error) {
    console.error(`FCM Error (user ${userId}):`, error);
  }
}
