import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import ProductDetailClient from "@/components/ProductDetailClient";
import ProductLoading from "./loading";
import { DETAIL_IMAGE_QUALITY, DETAIL_IMAGE_WIDTH, optimizeCloudinaryUrl } from "@/lib/imageLoader";

export const revalidate = 3600;

type ProductResponse = {
  _id: string | ObjectId;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image?: string | null;
  images?: string[];
  category?: string;
  stockStatus?: "in-stock" | "pre-order" | string;
  inventory?: number;
  brand?: string;
  model?: string;
  paymentMethods?: string[];
  sections?: string[];
  attributes?: Record<string, string>;
  options?: any[];
  variants?: any[];
  shippingOrigin?: string;
  shippingDestination?: string;
  dispatchTime?: string;
  sizeGuideUrl?: string;
  wholesale?: boolean;
  featured?: boolean;
  isCargo?: boolean;
  deliveryFee?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  rating?: number;
};

async function fetchProductPageData(id: string) {
  const { getCollection } = await import("@/lib/mongodb");

  let objectId: InstanceType<typeof ObjectId>;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }

  const products = await getCollection("products");
  const product = (await products.findOne(
    { _id: objectId } as any,
    {
      projection: {
        name: 1,
        description: 1,
        price: 1,
        originalPrice: 1,
        discountPercent: 1,
        image: 1,
        images: 1,
        category: 1,
        stockStatus: 1,
        inventory: 1,
        brand: 1,
        model: 1,
        paymentMethods: 1,
        sections: 1,
        attributes: 1,
        options: 1,
        variants: 1,
        shippingOrigin: 1,
        shippingDestination: 1,
        dispatchTime: 1,
        sizeGuideUrl: 1,
        wholesale: 1,
        featured: 1,
        isCargo: 1,
        deliveryFee: 1,
        createdAt: 1,
        updatedAt: 1,
        rating: 1,
      },
    },
  )) as ProductResponse | null;
  if (!product) return null;

  const categories = await getCollection("categories");
  const [relatedProducts, categoryDoc] = await Promise.all([
    products
      .find({
        category: product.category,
        _id: { $ne: objectId },
      } as any)
      .project({
        name: 1,
        image: 1,
        price: 1,
        rating: 1,
        category: 1,
        featured: 1,
        stockStatus: 1,
        isCargo: 1,
        inventory: 1,
      })
      .limit(4)
      .toArray(),
    product.category
      ? categories.findOne({
          $or: [{ id: product.category }, { slug: product.category }],
        } as any)
      : Promise.resolve(null),
  ]);

  return { product, relatedProducts, categoryName: categoryDoc?.name || product.category || "" };
}

const getProductPageData = cache(async (id: string) => fetchProductPageData(id));

function toPlainObjectId(value: string | ObjectId | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.toString();
}

function serializeForClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const data = await getProductPageData(id);
    if (!data) return {};
    const { product } = data;
    return {
      title: product.isCargo ? `${product.name} + Карго` : product.name,
      description: product.description || product.name,
      openGraph: {
        title: product.isCargo ? `${product.name} + Карго` : product.name,
        description: product.description || product.name,
        images: product.images?.[0]
          ? [{ url: product.images[0] }]
          : product.image
            ? [{ url: product.image }]
            : [],
      },
    };
  } catch {
    return {};
  }
}

async function ProductContent({ id }: { id: string }) {
  const data = await getProductPageData(id);
  if (!data) notFound();

  const { product, relatedProducts, categoryName } = data;

  const mappedRelatedProducts = relatedProducts.map((p: any) => ({
    id: toPlainObjectId(p._id),
    name: p.name,
    image: p.image || "",
    price: p.price,
    rating: p.rating || 0,
    category: p.category,
    featured: p.featured,
    stockStatus: p.stockStatus,
    isCargo: p.isCargo || false,
    inventory: p.inventory,
  }));

  const productData = serializeForClient({
    id: toPlainObjectId(product._id),
    name: product.name,
    description: product.description ?? null,
    price: product.price,
    originalPrice: product.originalPrice,
    discountPercent: product.discountPercent,
    image: product.image || null,
    images: product.images || [],
    category: product.category,
    categoryName,
    stockStatus: product.stockStatus || "in-stock",
    inventory: product.inventory ?? 0,
    brand: product.brand || undefined,
    model: product.model || undefined,
    paymentMethods: product.paymentMethods || undefined,
    sections: product.sections || [],
    attributes: product.attributes || {},
    options: product.options || [],
    variants: product.variants || [],
    shippingOrigin: product.shippingOrigin || undefined,
    shippingDestination: product.shippingDestination || undefined,
    dispatchTime: product.dispatchTime || undefined,
    sizeGuideUrl: product.sizeGuideUrl || undefined,
    wholesale: product.wholesale || false,
    featured: product.featured || false,
    isCargo: product.isCargo || false,
    deliveryFee: product.deliveryFee ?? 0,
    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
    rating: product.rating || 0,
    relatedProducts: mappedRelatedProducts,
  });

  const heroImage = product.image || product.images?.[0];
  const preloadHref = heroImage
    ? optimizeCloudinaryUrl(heroImage, {
        width: DETAIL_IMAGE_WIDTH,
        quality: DETAIL_IMAGE_QUALITY,
      })
    : null;

  return (
    <>
      {preloadHref ? (
        <link rel="preload" as="image" href={preloadHref} fetchPriority="high" />
      ) : null}
      <ProductDetailClient product={productData as any} initialReviews={[]} />
    </>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<ProductLoading />}>
      <ProductContent id={id} />
    </Suspense>
  );
}
