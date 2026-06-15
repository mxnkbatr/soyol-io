import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool, stepCountIs, convertToModelMessages, zodSchema } from 'ai';
import { z } from 'zod';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { User } from '@/models/User';
import {
  searchChatProducts,
  buildProductRecommendationsBlock,
  buildProductCardMarkers,
} from '@/lib/chatProducts';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || process.env.Deepseek_API,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const modelMessages = await convertToModelMessages(messages);

    const session = await auth();
    let userContext = '';

    if (session?.userId) {
      try {
        const users = await getCollection<User>('users');
        const user = await users.findOne({ _id: new ObjectId(session.userId) });
        if (user?.addresses?.length) {
          userContext = `
Хэрэглэгчийн хадгалсан хаягууд:
${user.addresses.map((a, i) => `
${i + 1}. [${a.label || 'Хаяг ' + (i + 1)}] ${a.isDefault ? '(Үндсэн)' : ''} — ${a.city}, ${a.district}, ${a.street}
`).join('')}
Утас: ${user.phone || 'Бүртгэлгүй'}`;
        }
      } catch (err) {
        console.error('Failed to fetch user context:', err);
      }
    }

    const result = await streamText({
      model: openrouter.chat('google/gemini-2.5-flash'),
      system: `Та "Soyol Video Shop" дэлгүүрийн мэргэжлийн AI худалдааны зөвлөх.

## Үүрэг
- Хэрэглэгчийн хүсэлтийг ойлгож, дэлгүүрийн БОДИТ бараанаас тохирохыг санал болго.
- Худалдан авалт, сагс, хүргэлт, төлбөрт тусла.
- Хэзээ ч зохиомол бараа, үнэ, ID бүү өг.

## Зан төлөв
- Монгол хэлээр, эелдэг, товч, мэргэжлийн.
- 2-4 өгүүлбэрт багтаа. Урт жагсаалт бүү бич.
- Эхлээд санал, дараа нь нэг тодруулах асуулт.

## Бараа санал болгох дүрэм (ЗААВАЛ)
1. Санал болгохоос ӨМНӨ 'recommendProducts' эсвэл 'searchProducts' tool ашигла.
2. Tool-ийн буцаасан бараануудыг хэрэглэгчид танилцуул.
3. Tool буцаасан _display блокыг хариултынхаа ТӨГСГӨЛД яг хэвээр хавсарга (UI карт болно).
4. Нэг удаад 3-6 бараа санал болго.

## Tools
- recommendProducts: Ерөнхий санал (бэлэг, тренд, хямдрал гэх мэт)
- searchProducts: Нэр/ангилал/үнээр хайх
- getShopCategories: Ангиллууд
- getNewestProducts: Шинэ бараа
- getSaleProducts: Хямдралтай бараа
- checkInventory: Үлдэгдэл шалгах
- addToCart: Сагсанд нэмэх
- navigateToPage: Хуудас руу шилжүүлэх

Өнөөдөр: ${new Date().toLocaleDateString('mn-MN')}.
${userContext}`,
      stopWhen: stepCountIs(8),
      messages: modelMessages,
      toolChoice: 'auto',
      tools: {
        recommendProducts: tool({
          description:
            'Хэрэглэгчийн ерөнхий хүсэлтэд тохирсон бараа санал болгох (бэлэг, тренд, хямд, шинэ гэх мэт).',
          inputSchema: zodSchema(
            z.object({
              intent: z.string().describe('Хэрэглэгчийн хүсэлт, жишээ: "эмэгтэйд бэлэг", "хямд утас"'),
              maxPrice: z.number().optional().describe('Дээд үнэ (₮)'),
              category: z.string().optional().describe('Ангилал'),
            }),
          ),
          execute: async ({ intent, maxPrice, category }) => {
            const products = await searchChatProducts({
              searchQuery: intent,
              category,
              maxPrice,
              limit: 6,
            });

            if (!products.length) {
              return { found: 0, message: 'Тохирох бараа олдсонгүй. Өөр түлхүүр үгээр дахин хайна уу.' };
            }

            return {
              found: products.length,
              products,
              message: `${products.length} бараа олдлоо.`,
              _display: buildProductRecommendationsBlock(products),
              _hint: buildProductCardMarkers(products),
            };
          },
        }),
        searchProducts: tool({
          description: 'Дэлгүүрээс бараа хайх. Нэр, ангилал, үнээр шүүж болно.',
          inputSchema: zodSchema(
            z.object({
              searchQuery: z.string().optional().describe('Хайх үг'),
              category: z.string().optional().describe('Ангилал'),
              minPrice: z.number().optional().describe('Доод үнэ'),
              maxPrice: z.number().optional().describe('Дээд үнэ'),
            }),
          ),
          execute: async ({ searchQuery, category, minPrice, maxPrice }) => {
            const products = await searchChatProducts({
              searchQuery,
              category,
              minPrice,
              maxPrice,
              limit: 6,
            });

            return {
              found: products.length,
              products,
              _display: buildProductRecommendationsBlock(products),
            };
          },
        }),
        getSaleProducts: tool({
          description: 'Хямдралтай бараануудыг харуулах.',
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            const products = await searchChatProducts({ onSale: true, limit: 6 });
            return {
              found: products.length,
              products,
              _display: buildProductRecommendationsBlock(products),
            };
          },
        }),
        getNewestProducts: tool({
          description: 'Хамгийн сүүлд нэмэгдсэн бараанууд.',
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            const productsCollection = await getCollection('products');
            const docs = await productsCollection
              .find({})
              .project({
                name: 1, price: 1, originalPrice: 1, image: 1, images: 1,
                category: 1, rating: 1, inventory: 1, stockStatus: 1,
                featured: 1, isCargo: 1, description: 1,
              })
              .sort({ createdAt: -1 })
              .limit(6)
              .toArray();

            const products = docs.map((p) => ({
              id: p._id.toString(),
              name: p.name,
              price: p.price ?? 0,
              originalPrice: p.originalPrice,
              image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || '',
              category: p.category || '',
              rating: p.rating ?? 0,
              stock: p.inventory ?? 0,
              stockStatus: p.stockStatus || 'in-stock',
              featured: !!p.featured,
              isCargo: !!p.isCargo,
              description: (p.description || '').slice(0, 120),
            }));

            return {
              found: products.length,
              products,
              _display: buildProductRecommendationsBlock(products),
            };
          },
        }),
        getShopCategories: tool({
          description: 'Дэлгүүрийн бүх барааны ангиллууд.',
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            const productsCollection = await getCollection('products');
            const categories = await productsCollection.distinct('category');
            return `Ангиллууд: ${categories.filter(Boolean).slice(0, 20).join(', ')}`;
          },
        }),
        addToCart: tool({
          description: 'Хэрэглэгчийн сагсанд бараа нэмэх.',
          inputSchema: zodSchema(z.object({ productId: z.string() })),
          execute: async ({ productId }) => {
            if (!productId) return 'Error: productId is missing.';

            try {
              const productsCollection = await getCollection('products');
              let product;
              try {
                product = await productsCollection.findOne({ _id: new ObjectId(productId) });
              } catch {
                product = await productsCollection.findOne({ _id: productId as any });
              }

              if (!product) return 'Бараа олдсонгүй.';

              const productData = {
                id: product._id.toString(),
                name: product.name,
                price: product.price,
                image: product.image || '',
                quantity: 1,
              };

              return `[ACTION:ADD_TO_CART_DATA:${JSON.stringify(productData)}:END_ACTION] "${product.name}" сагсанд нэмэгдлээ.`;
            } catch (error) {
              console.error('Add to cart error:', error);
              return 'Сагсанд нэмэхэд алдаа гарлаа.';
            }
          },
        }),
        navigateToPage: tool({
          description: 'Хэрэглэгчийг хуудас руу шилжүүлэх.',
          inputSchema: zodSchema(
            z.object({
              page: z.string().describe('home, cart, orders, checkout, profile, wishlist'),
            }),
          ),
          execute: async ({ page }) => {
            const p = page.toLowerCase();
            let path = '/';
            if (p.includes('cart')) path = '/cart';
            else if (p.includes('order')) path = '/orders';
            else if (p.includes('checkout')) path = '/checkout';
            else if (p.includes('profile')) path = '/profile';
            else if (p.includes('wishlist')) path = '/wishlist';
            else if (p.includes('sale') || p.includes('хямд')) path = '/sale';

            return `[ACTION:NAVIGATE:${path}:END_ACTION] ${path} хуудас руу шилжүүлж байна.`;
          },
        }),
        checkInventory: tool({
          description: 'Барааны үлдэгдэл шалгах.',
          inputSchema: zodSchema(z.object({ productName: z.string() })),
          execute: async ({ productName }) => {
            const products = await searchChatProducts({ searchQuery: productName, limit: 1 });
            if (!products.length) return `"${productName}" олдсонгүй.`;
            const p = products[0];
            return `${p.name}: ${p.stock > 0 ? `${p.stock} ширхэг үлдсэн` : 'Дууссан'}, үнэ ${p.price}₮`;
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error?.message);

    if (error.status === 429 || error.message?.includes('429')) {
      return new Response('Уучлаарай, систем ачаалалтай байна. Хэсэг хугацааны дараа дахин оролдоно уу.', { status: 200 });
    }

    return new Response(
      JSON.stringify({ error: 'Failed to process chat', details: error.message }),
      { status: 500 },
    );
  }
}
