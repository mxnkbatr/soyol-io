import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, tool, stepCountIs, convertToModelMessages, zodSchema } from 'ai';
import { z } from 'zod';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { User } from '@/models/User';

// DeepSeek Provider (OpenAI Compatible)
const deepseekProvider = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// OpenRouter Provider (Backup)
const openrouterProvider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const modelMessages = await convertToModelMessages(messages);

    // Identify which model to use
    let aiModel;
    const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

    console.log(`[AI Chat] Keys status: DeepSeek=${hasDeepSeek}, OpenRouter=${hasOpenRouter}`);

    if (hasDeepSeek) {
      console.log('[AI Chat] Using DeepSeek (deepseek-chat)');
      aiModel = deepseekProvider.chat('deepseek-chat');
    } else if (hasOpenRouter) {
      console.log('[AI Chat] Falling back to OpenRouter (google/gemini-2.0-flash-001)');
      aiModel = openrouterProvider.chat('google/gemini-2.0-flash-001');
    } else {
      console.error('[AI Chat] No AI API keys found in environment variables!');
      return new Response(JSON.stringify({ 
        error: 'AI API keys are missing. Please set DEEPSEEK_API_KEY or OPENROUTER_API_KEY.' 
      }), { status: 500 });
    }

    // LOGGING for debug
    try {
      const fs = await import('fs');
      const path = await import('path');
      const logPath = path.join(process.cwd(), 'debug-log.txt');
      fs.appendFileSync(logPath, `\n\n--- AI Request ${new Date().toISOString()} | Model: ${hasDeepSeek ? 'DeepSeek' : 'OpenRouter'} ---\n`);
    } catch (e) {}

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
          ${i + 1}. ID: ${a.id} | [${a.label || 'Хаяг ' + (i + 1)}] ${a.isDefault ? '(Үндсэн)' : ''}
             - ${a.city}, ${a.district}, ${a.street}
          `).join('\n')}
          Утас: ${user.phone || 'Бүртгэлгүй'}
          `;
        }
      } catch (err) {
        console.error('Failed to fetch user context:', err);
      }
    }

    const result = await streamText({
      model: aiModel,
      system: `
    Та бол "Soyol Video Shop" онлайн дэлгүүрийн мэргэжлийн борлуулалтын зөвлөх AI байна. 
    Чиний гол үүрэг бол хэрэглэгчийг ойлгож, тэдэнд тохирсон барааг санал болгож, худалдан авалт хийхэд нь туслах юм. 
    Манай дэлгүүр нь Taobao, Temu шиг бүх төрлийн бараа зардаг e-commerce платформ юм.

    ### [ЧИНИЙ ЗАН ТӨЛӨВ]
    1. Эелдэг, залуулаг, тусламтгай бай. "Cool" бөгөөд мэргэжлийн бай.
    2. Хэрэглэгчийг байцаах хэрэггүй. Хэрэв хэрэглэгч тодорхой бус хүсэлт тавибал (жишээ нь: "Бэлэг авмаар байна") шууд эрэгтэй, эмэгтэй, хүүхдэд тохирох эсвэл хамгийн трэнд байгаа 3 өөр шилдэг барааг санал болгоод, дараа нь тодруулах асуулт асуу.
    3. Нуршуу урт текстээс татгалз. Хариулт чинь 2-3 өгүүлбэрт багтах ёстой. Маш товч бөгөөд тодорхой бай.

    ### [БАРУУНЫ САНАЛ БОЛГОХ ФОРМАТ]
    Хэрэглэгчид бараа санал болгохдоо текстийнхээ доор заавал энэ кодыг шинэ мөрөнд хавсарга. Энэ код нь UI дээр зурагтай карт болж харагдана:
    [PRODUCT_CARD: id="ID", name="Нэр", price="Үнэ", image="URL"]
    
    ЖИЧ:
    1. 'searchProducts' эсвэл бусад хайлтын tool-ийг ашиглан бодит датабаазаас мэдээллийг авч ашиглана.
    2. Хэрэглэгч "хямд", "үнэтэй", эсвэл тодорхой үнийн дүн хэлбэл 'searchProducts' tool-ийн үнийн шүүлтүүрийг (minPrice, maxPrice) ашигла.
    3. Хэрэв тодорхой ангилал хэлбэл (жишээ нь: "Sony", "Гутал") 'searchProducts' tool-ийн 'category' эсвэл 'searchQuery' ашиглан шүүлт хий.
    4. Хэзээ ч барааны ID эсвэл мэдээллийг өөрөөсөө зохиож болохгүй. Зөвхөн tool-ийн буцаасан бодит өгөгдлийг ашигла.

    [ҮЙЛДЛҮҮД БА TOOLS]
    - Бараа санал болгохын өмнө заавал хайлтын tool ашигла.
    - Хэрэглэгч сагсанд нэмэхийг хүсвэл 'addToCart' ашигла.
    - Хуудас хооронд шилжихийг хүсвэл 'navigateToPage' ашигла.

    Боломжууд (Tools):
    - 'getShopCategories': Ангиллуудыг харах.
    - 'getNewestProducts': Шинэ бараануудыг харах.
    - 'searchProducts': Бараа хайх (нэр, ангилал, үнээр шүүх боломжтой).
    - 'checkInventory': Үлдэгдэл шалгах.
    - 'addToCart': Сагсанд нэмэх.
    - 'navigateToPage': Хуудас руу шилжих.
    
    Контекст:
    - Өнөөдөр: ${new Date().toLocaleDateString('mn-MN')}.
    ${userContext ? '- ' + userContext : ''}
    `,
      stopWhen: stepCountIs(8),
      messages: modelMessages,
      toolChoice: 'auto',
      tools: {
        addToCart: tool({
          description: 'Хэрэглэгчийн сагсанд бараа нэмэх. Барааны ID болон тоо ширхэг шаардлагатай.',
          inputSchema: zodSchema(z.object({
            productId: z.string(),
          })),
          execute: async ({ productId }: { productId: string }) => {
            if (!productId) return 'Error: productId is missing.';

            try {
              const productsCollection = await getCollection('products');
              let product;
              try {
                const { ObjectId } = await import('mongodb');
                product = await productsCollection.findOne({ _id: new ObjectId(productId) });
              } catch (e) {
                product = await productsCollection.findOne({ _id: productId as any });
              }

              if (!product) {
                return 'Product not found with that ID.';
              }

              const productData = {
                id: product._id.toString(),
                name: product.name,
                price: product.price,
                image: product.image || '',
                quantity: 1
              };

              return `[ACTION:ADD_TO_CART_DATA:${JSON.stringify(productData)}:END_ACTION] Added ${product.name} to cart.`;
            } catch (error) {
              console.error('Add to cart error:', error);
              return 'Error adding to cart.';
            }
          },
        }),
        navigateToPage: tool({
          description: 'Хэрэглэгчийг өөр хуудас руу шилжүүлэх (жишээ нь: сагс, захиалга, нүүр хуудас).',
          inputSchema: zodSchema(z.object({
            page: z.string().describe('The page to navigate to (home, cart, orders, checkout, profile, wishlist). REQUIRED.'),
          })),
          execute: async ({ page }: { page: string }) => {
            if (!page) return 'Error: page argument is missing.';

            let path = '/';
            const p = page.toLowerCase();
            if (p.includes('cart')) path = '/cart';
            else if (p.includes('order')) path = '/orders';
            else if (p.includes('checkout')) path = '/checkout';
            else if (p.includes('profile')) path = '/profile';
            else if (p.includes('wishlist')) path = '/wishlist';
            else path = '/';

            return `[ACTION:NAVIGATE:${path}:END_ACTION] Navigating to ${path}.`;
          },
        }),
        checkInventory: tool({
          description: 'Барааны үлдэгдэл эсвэл дэлгэрэнгүй мэдээллийг шалгах.',
          inputSchema: zodSchema(z.object({
            productName: z.string().describe('The name of the product to check. REQUIRED.'),
          })),
          execute: async ({ productName }: { productName: string }) => {
            if (!productName) return 'Error: productName is missing.';
            try {
              const productsCollection = await getCollection('products');
              const product = await productsCollection.findOne({
                $or: [
                  { name: { $regex: new RegExp(productName, 'i') } }
                ]
              });

              if (product) {
                return `Inventory Status for ${product.name}: ${product.inventory ?? 0} units available. Price: ${product.price}₮.`;
              } else {
                return `Product ${productName} not found in inventory.`;
              }
            } catch (error) {
              return 'Error checking inventory.';
            }
          },
        }),
        searchProducts: tool({
          description: 'Дэлгүүрээс бараа хайх. Нэр, ангилал, үнээр шүүж болно.',
          inputSchema: zodSchema(z.object({
            searchQuery: z.string().optional().describe('Хайх үг (нэр эсвэл тайлбар)'),
            category: z.string().optional().describe('Барааны ангилал'),
            minPrice: z.number().optional().describe('Доод үнэ'),
            maxPrice: z.number().optional().describe('Дээд үнэ'),
          })),
          execute: async ({ searchQuery, category, minPrice, maxPrice }: { searchQuery?: string; category?: string; minPrice?: number; maxPrice?: number }) => {
            try {
              const productsCollection = await getCollection('products');
              const query: any = {};

              if (searchQuery) {
                const regex = new RegExp(searchQuery.split(' ').join('|'), 'i');
                query.$or = [
                  { name: { $regex: regex } },
                  { description: { $regex: regex } }
                ];
              }

              if (category) {
                query.category = { $regex: new RegExp(category, 'i') };
              }

              if (minPrice !== undefined || maxPrice !== undefined) {
                query.price = {};
                if (minPrice !== undefined) query.price.$gte = minPrice;
                if (maxPrice !== undefined) query.price.$lte = maxPrice;
              }

              const products = await productsCollection.find(query).limit(10).toArray();

              return products.map(p => ({
                id: p._id.toString(),
                name: p.name,
                price: p.price,
                stock: p.inventory ?? 0,
                description: p.description || '',
                image: p.image || '',
                category: p.category || ''
              }));
            } catch (error) {
              console.error('Search error:', error);
              return [];
            }
          },
        }),
        getShopCategories: tool({
          description: 'Дэлгүүрийн бүх барааны ангиллуудыг харах.',
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            try {
              const productsCollection = await getCollection('products');
              const categories = await productsCollection.distinct('category');
              return `Боломжит ангиллууд: ${categories.filter(Boolean).join(', ')}`;
            } catch (error) {
              return 'Error fetching categories.';
            }
          },
        }),
        getNewestProducts: tool({
          description: 'Хамгийн сүүлд нэмэгдсэн бараануудыг харах.',
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            try {
              const productsCollection = await getCollection('products');
              const products = await productsCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
              return products.map(p => ({
                id: p._id.toString(),
                name: p.name,
                price: p.price,
                image: p.image || ''
              }));
            } catch (error) {
              return 'Error fetching newest products.';
            }
          },
        }),
      },
    });

    try {
      return result.toUIMessageStreamResponse();
    } catch (innerError: any) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        fs.appendFileSync(path.join(process.cwd(), 'debug-log.txt'), `\n\nERROR:\n${JSON.stringify(innerError, Object.getOwnPropertyNames(innerError), 2)}`);
      } catch (e) {}
      throw innerError;
    }
  } catch (error: any) {
    // Enhanced Error Logging
    console.error('Chat API Error Details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
      stack: error.stack,
    });

    try {
      const fs = await import('fs');
      const path = await import('path');
      fs.appendFileSync(path.join(process.cwd(), 'debug-log.txt'), `\n\nOUTER ERROR:\n${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    } catch (e) {}

    // Check for specific error types
    if (error.message?.includes('API key')) {
      console.error('CRITICAL: API Key missing or invalid');
    } else if (error.status === 429 || error.message?.includes('Quota') || error.message?.includes('429')) {
      console.error('CRITICAL: Quota exceeded (429)');
      return new Response("Уучлаарай, систем хэт ачаалалтай байна. Та хэсэг хугацааны дараа дахин оролдоно уу. (Quota Exceeded)", { status: 200 });
    } else if (error.status === 404 || /model not found/i.test(error.message || '')) {
      console.error('CRITICAL: Model not found (404)');
      return new Response("Түр хүлээгээрэй, холболтоо шалгаж байна...", { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Failed to process chat', details: error.message, stack: error.stack }), { status: 500 });
  }
}