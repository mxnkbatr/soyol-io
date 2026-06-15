import { getCollection } from '@/lib/mongodb';
import { sendPushToUser } from '@/lib/fcm';

const DEDUP_MS = 45_000;

export function extractCallRoomName(
  roomName?: string | null,
  body?: string,
): string | null {
  if (roomName?.trim()) return roomName.trim();
  if (!body) return null;
  const match = body.match(/(support-[A-Za-z0-9_-]+|room-[A-Za-z0-9_-]+)/i);
  return match?.[1] ?? null;
}

export function isUserCallMessage(
  messageType: string,
  body: string,
  senderRole?: string | null,
): boolean {
  if (senderRole === 'admin') return false;
  if (messageType === 'call_invite') return true;
  return /дуудлага эхэллээ|call started/i.test(body);
}

function buildAdminCallPath(roomName: string): string {
  if (roomName.startsWith('support-')) {
    return `/admin/call/${roomName}`;
  }
  if (roomName.startsWith('room-')) {
    return `/admin/call/${roomName.replace(/^room-/, '')}`;
  }
  return `/admin/call/${roomName}`;
}

async function shouldSkipDuplicate(roomName: string): Promise<boolean> {
  const locks = await getCollection('call_push_locks');
  const since = new Date(Date.now() - DEDUP_MS);
  const existing = await locks.findOne({ roomName, createdAt: { $gte: since } });
  if (existing) return true;
  await locks.insertOne({ roomName, createdAt: new Date() });
  return false;
}

/** Бүх admin-д орж ирж буй дуудлагын FCM мэдэгдэл илгээнэ */
export async function notifyAdminsIncomingCall({
  roomName,
  callerName,
  isVoice = false,
}: {
  roomName: string;
  callerName: string;
  isVoice?: boolean;
}) {
  try {
    if (!roomName) return;
    if (await shouldSkipDuplicate(roomName)) {
      console.log(`[Call Push] Skipped duplicate for ${roomName}`);
      return;
    }

    const usersCollection = await getCollection('users');
    const notificationsCollection = await getCollection('notifications');
    const admins = await usersCollection.find({ role: 'admin' }).toArray();

    if (!admins.length) {
      console.warn('[Call Push] No admin users found');
      return;
    }

    const title = isVoice ? '📞 Дуут дуудлага!' : '📹 Видео дуудлага!';
    const body = `${callerName} таныг дуудаж байна`;
    const link = buildAdminCallPath(roomName);

    const notifications = admins.map((admin) => ({
      userId: admin._id.toString(),
      title,
      message: body,
      type: 'incoming_call',
      isRead: false,
      link,
      createdAt: new Date(),
    }));

    await notificationsCollection.insertMany(notifications);

    await Promise.allSettled(
      admins.map((admin) =>
        sendPushToUser({
          userId: admin._id.toString(),
          title,
          body,
          data: {
            url: link,
            type: 'incoming_call',
            roomName,
          },
        }),
      ),
    );

    console.log(`[Call Push] Notified ${admins.length} admins for ${roomName}`);
  } catch (error) {
    console.error('[Call Push] Failed to notify admins:', error);
  }
}
