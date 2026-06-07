/**
 * Banner-уудыг local SVG зураг руу шилжүүлнэ (dc127wztz disabled үед).
 * Ажиллуулах: npx tsx scripts/fix-banners-local.ts
 */
import { config } from 'dotenv';
import path from 'path';
import { MongoClient } from 'mongodb';

config({ path: path.resolve(__dirname, '../.env.local') });
config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGO_DB || 'Soyloo';

const LOCAL_BANNERS = [
  {
    image: '/banners/new-collection.svg',
    title: 'New Collection',
    order: 0,
  },
  {
    image: '/banners/flash-sale.svg',
    title: 'Flash Sale',
    order: 1,
  },
];

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI байхгүй');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const banners = client.db(MONGO_DB).collection('banners');

  await banners.deleteMany({ image: { $regex: 'dc127wztz' } });

  for (const banner of LOCAL_BANNERS) {
    await banners.updateOne(
      { title: banner.title },
      {
        $set: {
          image: banner.image,
          title: banner.title,
          order: banner.order,
          active: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  }

  const all = await banners.find({ active: true }).sort({ order: 1 }).toArray();
  console.log('✅ Banner шинэчлэгдлээ:');
  all.forEach((b) => console.log(`   - ${b.title}: ${b.image}`));

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
