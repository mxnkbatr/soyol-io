import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import { notifyAdminsIncomingCall } from '@/lib/callNotifications';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');
    const username = searchParams.get('username') || `user_${Math.floor(Math.random() * 10000)}`;

    if (!room) {
      return NextResponse.json(
        { error: 'Missing "room" query parameter' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl: '10m', // Token expires in 10 minutes
    });

    // FIXED: added canPublishData: true permission grant
    at.addGrant({ 
      roomJoin: true, 
      room, 
      canPublish: true, 
      canSubscribe: true,
      canPublishData: true
    });

    const token = await at.toJwt();

    if (room.startsWith('support-') && !username.startsWith('admin-')) {
      notifyAdminsIncomingCall({
        roomName: room,
        callerName: username,
        isVoice: false,
      }).catch((err) => console.error('[Call Push] token GET hook error:', err));
    }

    return NextResponse.json({ token });
  } catch (err: any) {
    console.error('LiveKit Token Error:', err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}