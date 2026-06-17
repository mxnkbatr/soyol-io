import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { notifyAdminsIncomingCall } from '@/lib/callNotifications';
import {
  assertCanJoinCallRoom,
  assertSupportRoomAccess,
  isAdminIdentity,
  RoomFullError,
} from '@/lib/livekitRoom';

async function maybeNotifyAdminsForCall(
  roomName: string,
  identity: string,
  displayName?: string,
) {
  if (!roomName.startsWith('support-')) return;
  if (isAdminIdentity(identity)) return;

  await notifyAdminsIncomingCall({
    roomName,
    callerName: displayName || identity,
    isVoice: false,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomName, identity, displayName } = body;

    if (!roomName || !identity) {
      return NextResponse.json(
        { error: 'Missing roomName or identity' },
        { status: 400 },
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 },
      );
    }

    const { userId, role } = await auth();
    assertSupportRoomAccess(
      roomName,
      identity,
      userId,
      role === 'admin',
    );
    await assertCanJoinCallRoom(roomName, identity);

    const ttlSeconds = 3600;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: displayName || identity,
      ttl: ttlSeconds,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    maybeNotifyAdminsForCall(roomName, identity, displayName).catch((err) =>
      console.error('[Call Push] token POST hook error:', err),
    );

    return NextResponse.json({ token, expiresIn: ttlSeconds });
  } catch (err: unknown) {
    if (err instanceof RoomFullError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('LiveKit Token generation error:', err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
