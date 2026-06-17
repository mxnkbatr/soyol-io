import { RoomServiceClient } from 'livekit-server-sdk';

export const MAX_CALL_PARTICIPANTS = 2;

export class RoomFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomFullError';
  }
}

export function getLiveKitHost(): string {
  const livekitUrl =
    process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!livekitUrl) {
    throw new Error('LiveKit URL not configured');
  }
  return livekitUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://');
}

export function getRoomServiceClient(): RoomServiceClient {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured');
  }
  return new RoomServiceClient(getLiveKitHost(), apiKey, apiSecret);
}

export function isAdminIdentity(identity: string): boolean {
  return identity.startsWith('admin-');
}

export function isCallerIdentity(identity: string): boolean {
  return (
    identity.startsWith('user-') ||
    identity.startsWith('guest-') ||
    identity.startsWith('user_')
  );
}

export function buildSupportRoomName(userId: string): string {
  return `support-${userId}`;
}

export function buildUserCallIdentity(userId: string): string {
  return `user-${userId}`;
}

export function buildAdminCallIdentity(adminId: string): string {
  return `admin-${adminId}`;
}

/** Ensure 1:1 room exists with max 2 participants. */
export async function ensureCallRoom(roomName: string) {
  const roomService = getRoomServiceClient();
  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: MAX_CALL_PARTICIPANTS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes('already exists')) {
      throw err;
    }
  }
}

/** Reject joins that would put more than 2 people in a call. */
export async function assertCanJoinCallRoom(roomName: string, identity: string) {
  await ensureCallRoom(roomName);

  const roomService = getRoomServiceClient();
  let participants: Array<{ identity?: string }> = [];

  try {
    participants = await roomService.listParticipants(roomName);
  } catch {
    return;
  }

  const identities = participants
    .map((p) => p.identity)
    .filter((id): id is string => Boolean(id));

  if (identities.includes(identity)) return;

  if (identities.length >= MAX_CALL_PARTICIPANTS) {
    throw new RoomFullError('Энэ дуудлага дүүрсэн байна (зөвхөн 2 хүн).');
  }

  const adminCount = identities.filter(isAdminIdentity).length;
  const callerCount = identities.filter(
    (id) => !isAdminIdentity(id),
  ).length;

  if (isAdminIdentity(identity)) {
    if (adminCount >= 1) {
      throw new RoomFullError('Энэ дуудлагад аль хэдийн админ нэгдсэн байна.');
    }
    return;
  }

  if (callerCount >= 1) {
    throw new RoomFullError('Энэ дуудлагад аль хэдийн хэрэглэгч байна.');
  }
}

export function assertSupportRoomAccess(
  roomName: string,
  identity: string,
  userId?: string | null,
  isAdmin = false,
) {
  if (!roomName.startsWith('support-')) return;

  if (isAdmin || isAdminIdentity(identity)) return;

  const roomOwnerId = roomName.slice('support-'.length);
  const identityOwnerId = identity.startsWith('user-')
    ? identity.slice('user-'.length)
    : '';

  if (roomOwnerId && identityOwnerId && roomOwnerId === identityOwnerId) {
    return;
  }

  if (userId && roomName === buildSupportRoomName(userId)) {
    return;
  }

  throw new RoomFullError('Зөвхөн өөрийн дуудлагын өрөөнд нэгдэнэ.');
}
