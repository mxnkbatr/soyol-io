import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGO_DB || 'Buddha';

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not set in .env file');
    process.exit(1);
}

const BROKEN_IMAGE_URL = 'https://images.unsplash.com/photo-1554941068-a252989d3652?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
// A valid Unsplash image for studio lighting
const NEW_IMAGE_URL = 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

async function fixDb() {
    const client = new MongoClient(MONGODB_URI!, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
        tls: true,
        tlsAllowInvalidCertificates: true,
    });

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(MONGO_DB);
        const collection = db.collection('products');

        // 1. Fix Broken Image
        const updateResult = await collection.updateMany(
            { image: BROKEN_IMAGE_URL },
            { $set: { image: NEW_IMAGE_URL } }
        );
        console.log(`Updated ${updateResult.modifiedCount} products with broken images.`);

        // 2. Add Indexes
        console.log('Creating indexes...');
        await collection.createIndex({ createdAt: -1 });
        await collection.createIndex({ category: 1 });
        await collection.createIndex(
            { name: 'text', description: 'text', brand: 'text', category: 'text' },
            { weights: { name: 10, brand: 5, description: 3, category: 1 }, name: 'products_text_search' }
        );

        // stockStatus filter
        await collection.createIndex({ stockStatus: 1 });

        // featured products
        await collection.createIndex({ featured: 1 });

        // vendor products
        await collection.createIndex({ vendorId: 1 });

        // price range filter
        await collection.createIndex({ price: 1 });

        // compound: category + stockStatus (хамгийн их хэрэглэгддэг filter)
        await collection.createIndex({ category: 1, stockStatus: 1 });

        // orders collection indexes
        const ordersCollection = db.collection('orders');
        console.log('Creating orders indexes...');
        await ordersCollection.createIndex({ userId: 1, createdAt: -1 });
        await ordersCollection.createIndex({ status: 1, createdAt: -1 });
        await ordersCollection.createIndex({ phone: 1 });
        await ordersCollection.createIndex({ 'items.vendorId': 1 });

        // users collection indexes
        const usersCollection = db.collection('users');
        console.log('Creating users indexes...');
        await usersCollection.createIndex({ phone: 1 }, { unique: true });
        await usersCollection.createIndex({ role: 1 });

        // notifications collection indexes
        const notificationsCollection = db.collection('notifications');
        console.log('Creating notifications indexes...');
        // Compound index to support the 60s polled count: { $or: [{ userId }, { userId: 'all' }], isRead: false }
        await notificationsCollection.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
        // Index to support fetching sorted order notifications: { $or: [{ userId }, { userId: 'all' }] } -> .sort({ createdAt: -1 })
        await notificationsCollection.createIndex({ userId: 1, createdAt: -1 });
        // Fallback fallback single sorting index
        await notificationsCollection.createIndex({ createdAt: -1 });

        console.log('Indexes created successfully.');

    } catch (error) {
        console.error('Error fixing database:', error);
    } finally {
        await client.close();
    }
}

fixDb();