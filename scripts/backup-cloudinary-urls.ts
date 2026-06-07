/**
 * MongoDB дахь бүх Cloudinary зурагийн URL-ийг backup хадгална.
 * Cloudinary account сэргэхэд эдгээр URL шууд дахин ажиллана.
 *
 * Ажиллуулах: npx tsx scripts/backup-cloudinary-urls.ts
 */
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { MongoClient } from 'mongodb';

config({ path: path.resolve(__dirname, '../.env.local') });
config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGO_DB || 'Soyloo';

function collectUrls(value: unknown, urls: Set<string>) {
  if (!value) return;
  if (typeof value === 'string') {
    if (value.includes('res.cloudinary.com')) urls.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, urls));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((v) => collectUrls(v, urls));
  }
}

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI байхгүй байна');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGO_DB);

  const collections = ['products', 'banners', 'categories', 'users'];
  const allUrls = new Set<string>();
  const byCollection: Record<string, { id: string; urls: string[] }[]> = {};

  for (const name of collections) {
    const col = db.collection(name);
    const docs = await col.find({}).toArray();
    byCollection[name] = [];

    for (const doc of docs) {
      const docUrls = new Set<string>();
      collectUrls(doc, docUrls);
      docUrls.forEach((u) => allUrls.add(u));
      if (docUrls.size > 0) {
        byCollection[name].push({
          id: String(doc._id),
          urls: [...docUrls],
        });
      }
    }
  }

  const backup = {
    exportedAt: new Date().toISOString(),
    cloudName: 'dc127wztz',
    note: 'Cloudinary disabled байсан ч зураг сервер дээр үлдсэн байж болно. Support account сэргээвэл URL-ууд дахин ажиллана.',
    totalUniqueUrls: allUrls.size,
    urls: [...allUrls].sort(),
    byCollection,
  };

  const outDir = path.resolve(__dirname, '../backups');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `cloudinary-urls-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(backup, null, 2), 'utf8');

  console.log(`✅ Backup хадгаллаа: ${outFile}`);
  console.log(`📷 Нийт ${allUrls.size} өөр Cloudinary URL`);
  for (const name of collections) {
    const count = byCollection[name]?.length ?? 0;
    if (count > 0) console.log(`   - ${name}: ${count} document`);
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
