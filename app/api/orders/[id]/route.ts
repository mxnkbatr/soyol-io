import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { notifyOrderStatusUpdate } from "@/lib/orderNotifications";

// Fetch a single order by ID
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const orders = await getCollection("orders");

    let orderObjectId: ObjectId;
    try {
      orderObjectId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { error: "Invalid order ID format" },
        { status: 400 }
      );
    }

    const order = await orders.findOne({ _id: orderObjectId });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Security check: Only allow the owner of the order to view it
    if (order.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// Cancel a single order by ID
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Missing status field" },
        { status: 400 }
      );
    }

    // Only allow cancellation via this endpoint
    if (status !== "cancelled") {
      return NextResponse.json(
        { error: "Invalid status update via this endpoint" },
        { status: 400 }
      );
    }

    const orders = await getCollection("orders");

    let orderObjectId: ObjectId;
    try {
      orderObjectId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { error: "Invalid order ID format" },
        { status: 400 }
      );
    }

    const order = await orders.findOne({ _id: orderObjectId });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Security check: Only allow the owner of the order to cancel it
    if (order.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Баталгаажсан захиалгыг цуцлах боломжгүй" },
        { status: 400 }
      );
    }

    await orders.updateOne(
      { _id: orderObjectId },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      }
    );

    // Send notification to customer
    notifyOrderStatusUpdate(id, "cancelled").catch((err) => {
      console.error("Failed to send cancellation notification:", err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order patch error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}