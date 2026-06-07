
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

const banners = [
    {
        image: 'https://res.cloudinary.com/dc127wztz/image/upload/v1770896452/banner1_nw6nok.png',
        title: 'New Collection',
        active: true,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        image: 'https://res.cloudinary.com/dc127wztz/image/upload/v1770896152/banner_qhjffv.png',
        title: 'Flash Sale',
        active: true,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

async function seedBanners() {
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
        const collection = db.collection('banners');

        // Optional: Clear existing banners
        await collection.deleteMany({});
        console.log('Cleared existing banners');

        const result = await collection.insertMany(banners);
        console.log(`Inserted ${result.insertedCount} banners`);

    } catch (error) {
        console.error('Error seeding banners:', error);
    } finally {
        await client.close();
    }
}

seedBanners();
