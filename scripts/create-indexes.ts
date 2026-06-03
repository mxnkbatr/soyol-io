import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';

// Load env variables
config({ path: path.resolve(__dirname, '../.env') });
config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.MONGODB_URI as string;
const dbName = process.env.MONGO_DB || 'Soyloo';

async function main() {
  if (!url) {
    console.error("MONGODB_URI is not set in env variables.");
    process.exit(1);
  }

  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('products');

    console.log("Creating database indexes for the products collection...");

    const createIndexSafely = async (indexSpec: any, options?: any) => {
      try {
        const name = await collection.createIndex(indexSpec, options);
        console.log(`Created index ${JSON.stringify(indexSpec)}: ${name}`);
      } catch (err: any) {
        if (err.code === 85) {
          console.log(`Index already exists for spec: ${JSON.stringify(indexSpec)} (skipped options conflict)`);
        } else {
          console.error(`Error spec: ${JSON.stringify(indexSpec)}:`, err.message);
        }
      }
    };

    await createIndexSafely({ sections: 1 });
    await createIndexSafely({ featured: 1 });
    await createIndexSafely({ category: 1 });
    await createIndexSafely({ price: 1 });
    await createIndexSafely({ sections: 1, _id: -1 });

    console.log("All indexes completed!");
  } catch (error) {
    console.error("Error creating indexes:", error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
