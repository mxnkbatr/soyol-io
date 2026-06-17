import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  assertCanJoinCallRoom,
  assertSupportRoomAccess,
  RoomFullError,
} from '@/lib/livekitRoom';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');
    const username = searchParams.get('username');

    if (!room || !username) {
      return NextResponse.json(
        { error: 'Missing "room" or "username" query parameter' },
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
    assertSupportRoomAccess(room, username, userId, role === 'admin');
    await assertCanJoinCallRoom(room, username);

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl: '10m',
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({ token });
  } catch (err: unknown) {
    if (err instanceof RoomFullError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('LiveKit Token Error:', err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
