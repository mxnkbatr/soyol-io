import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({ error: 'LiveKit configuration missing' }, { status: 500 });
    }

    // Convert wss:// to https:// for the REST API
    const host = livekitUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
    
    const roomService = new RoomServiceClient(host, apiKey, apiSecret);
    const rooms = await roomService.listRooms();

    const unitRooms = rooms
      .filter(room => room.name.startsWith('room-'))
      .map(room => ({
        name: room.name,
        unitId: room.name.replace('room-', ''),
        numParticipants: room.numParticipants,
        creationTime: Number(room.creationTime),
      }));

    const supportRooms = rooms
      .filter(room => room.name.startsWith('support-'))
      .map(room => ({
        name: room.name,
        clientId: room.name.replace('support-', ''),
        numParticipants: room.numParticipants,
        creationTime: Number(room.creationTime),
      }));

    return NextResponse.json({ unitRooms, supportRooms });
  } catch (error) {
    console.error('Error listing LiveKit rooms:', error);
    return NextResponse.json({ error: 'Failed to list rooms' }, { status: 500 });
  }
}
