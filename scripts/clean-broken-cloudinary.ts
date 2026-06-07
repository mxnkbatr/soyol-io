/**
 * Харагдахгүй dc127wztz Cloudinary зурагтай бараануудыг устгана.
 * Ажиллаж байгаа dohh4grkj зурагтай 363 барааг хадгална.
 *
 * Dry run:  npx tsx scripts/clean-broken-cloudinary.ts
 * Устгах:   npx tsx scripts/clean-broken-cloudinary.ts --confirm
 */
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';

config({ path: path.resolve(__dirname, '../.env.local') });
config({ path: path.resolve(__dirname, '../.env') });

const BROKEN_CLOUD = 'dc127wztz';
const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGO_DB || 'Soyloo';
const confirm = process.argv.includes('--confirm');

function collectImageUrls(value: unknown, urls: string[] = []): string[] {
  if (!value) return urls;
  if (typeof value === 'string' && value.includes('res.cloudinary.com')) {
    urls.push(value);
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => collectImageUrls(v, urls));
    return urls;
  }
  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((v) => collectImageUrls(v, urls));
  }
  return urls;
}

function isBrokenUrl(url: string): boolean {
  return url.includes(`res.cloudinary.com/${BROKEN_CLOUD}/`);
}

function productShouldDelete(product: Record<string, unknown>): boolean {
  const urls = collectImageUrls(product);
  const hasWorking = urls.some((u) => !isBrokenUrl(u));
  if (hasWorking) return false;
  if (urls.some(isBrokenUrl)) return true;
  if (product.restoredFrom) return true;
  return false;
}

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI байхгүй');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGO_DB);

  const productsCol = db.collection('products');
  const bannersCol = db.collection('banners');

  const allProducts = await productsCol.find({}).toArray();
  const toDelete = allProducts.filter((p) => productShouldDelete(p as Record<string, unknown>));
  const toKeep = allProducts.length - toDelete.length;

  const brokenBanners = await bannersCol
    .find({
      $or: [
        { image: { $regex: BROKEN_CLOUD } },
        { image: { $regex: '^/banners/' } },
      ],
    })
    .toArray();

  console.log('📊 Цэвэрлэлт:');
  console.log(`   Бүх бараа: ${allProducts.length}`);
  console.log(`   Устгах (эвдэрсэн зураг): ${toDelete.length}`);
  console.log(`   Хадгалах (зураг ажиллаж байгаа): ${toKeep}`);
  console.log(`   Banner устгах: ${brokenBanners.length}`);

  const backup = {
    exportedAt: new Date().toISOString(),
    brokenCloud: BROKEN_CLOUD,
    stats: {
      deleteProducts: toDelete.length,
      keepProducts: toKeep,
      deleteBanners: brokenBanners.length,
    },
    products: toDelete.map((p) => ({
      _id: String(p._id),
      name: p.name,
      image: p.image,
      images: p.images,
      restoredFrom: p.restoredFrom,
    })),
    banners: brokenBanners.map((b) => ({
      _id: String(b._id),
      title: b.title,
      image: b.image,
    })),
  };

  const outDir = path.resolve(__dirname, '../backups');
  fs.mkdirSync(outDir, { recursive: true });
  const backupFile = path.join(outDir, `clean-broken-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`\n💾 Backup: ${backupFile}`);

  if (!confirm) {
    console.log('\nDry run — устгаагүй.');
    console.log('Устгах: npx tsx scripts/clean-broken-cloudinary.ts --confirm');
    await client.close();
    return;
  }

  if (toDelete.length > 0) {
    const ids = toDelete.map((p) => p._id as ObjectId);
    const result = await productsCol.deleteMany({ _id: { $in: ids } });
    console.log(`\n🗑️  ${result.deletedCount} бараа устгалаа`);
  }

  if (brokenBanners.length > 0) {
    const bannerResult = await bannersCol.deleteMany({
      _id: { $in: brokenBanners.map((b) => b._id) },
    });
    console.log(`🗑️  ${bannerResult.deletedCount} banner устгалаа`);
  }

  const remaining = await productsCol.countDocuments();
  const remainingBanners = await bannersCol.countDocuments({ active: true });
  console.log(`\n✅ Дууслаа:`);
  console.log(`   Бараа: ${remaining}`);
  console.log(`   Идэвхтэй banner: ${remainingBanners}`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
