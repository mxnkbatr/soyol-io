import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import type { ProductDoc } from "@/lib/productPromotionHelpers";
export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 },
      );
    }

    const { getCollection } = await import("@/lib/mongodb");
    const { ObjectId } = await import("mongodb");

    const products = await getCollection("products");
    let query = {};
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      return NextResponse.json(
        { error: "Invalid Product ID" },
        { status: 400 },
      );
    }

    const product = await products.findOne(query);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { getCollection } = await import("@/lib/mongodb");
    const { ObjectId } = await import("mongodb");

    const products = await getCollection("products");

    let objectId: InstanceType<typeof ObjectId>;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { error: "Invalid Product ID" },
        { status: 400 },
      );
    }

    const existingProduct = await products.findOne({ _id: objectId });
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Only allow specific fields to be updated
    const allowedFields = [
      "featured",
      "stockStatus",
      "inventory",
      "name",
      "description",
      "price",
      "originalPrice",
      "discountPercent",
      "category",
      "image",
      "images",
      "brand",
      "model",
      "delivery",
      "paymentMethods",
      "sections",
      "attributes",
      "wholesale",
      "options",
      "variants",
    ];
    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    updateData.updatedAt = new Date();

    const result = await products.updateOne(
      { _id: objectId },
      { $set: updateData },
    );

    // Revalidate
    revalidatePath(`/product/${id}`);
    revalidatePath("/");
    revalidatePath("/admin/products");

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const becameFeatured =
      body.featured === true && !existingProduct.featured;

    if (becameFeatured) {
      const mergedProduct = { ...existingProduct, ...updateData };
      void (async () => {
        try {
          const { sendFeaturedProductNotification } = await import(
            "@/lib/productPromotionNotification"
          );
          await sendFeaturedProductNotification(id, mergedProduct as ProductDoc);
        } catch (err) {
          console.error("[Product Featured] Notification error:", err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      updated: updateData,
      notificationSent: becameFeatured,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}
