import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notifyUserNewChatMessage } from "@/lib/adminNotifications";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> } // 1. Defines context for roomId parameter
) {
  try {
    const { roomId } = await context.params; // Extracts roomId from the route params
    const body = await req.json(); // Parses the incoming message payload
    
    // Extract message fields (adjust keys if your payload uses different names, e.g. messageText)
    const { text, senderId } = body; 

    // 2. Fetch the room from the database to find participant IDs
    // (Replace 'chatRooms' with your actual collection name, e.g., 'rooms' or 'chats')
    const chatRoomsCollection = await getCollection("chatRooms"); 
    const room = await chatRoomsCollection.findOne({ _id: new ObjectId(roomId) });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const vendorId = room.vendorId;
    const customerId = room.customerId;

    // ... (YOUR EXISTING CODE TO SAVE THE MESSAGE TO THE DB GOES HERE) ...

    // 3. Trigger offline notification safely in the background
    notifyUserNewChatMessage({
      roomId,
      senderId,
      text,
      vendorId: vendorId.toString(),
      customerId: customerId.toString(),
    }).catch((err) => console.error("Chat FCM trigger error:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST Message error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}