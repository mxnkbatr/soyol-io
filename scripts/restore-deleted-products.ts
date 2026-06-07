/**
 * Устгасан бараануудыг backup-аас MongoDB руу буцааж сэргээнэ.
 *
 * Dry run:  npx tsx scripts/restore-deleted-products.ts
 * Сэргээх:  npx tsx scripts/restore-deleted-products.ts --confirm
 */
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';

config({ path: path.resolve(__dirname, '../.env.local') });
config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGO_DB || 'Soyloo';
const confirm = process.argv.includes('--confirm');

const BACKUP_FILE = path.resolve(
  __dirname,
  '../backups/deleted-products-1780818611193.json',
);

type BackupProduct = {
  _id: string;
  name: string;
  sku?: string;
  images: string[];
};

type OrderItem = {
  productId?: string;
  name?: string;
  price?: number;
  image?: string;
  category?: string;
  quantity?: number;
};

function buildProduct(
  item: BackupProduct,
  orderHints: Map<string, OrderItem[]>,
  defaultCategory: string,
) {
  const id = new ObjectId(item._id);
  const images = item.images.filter(Boolean);
  const hints = orderHints.get(item._id) ?? [];
  const latestHint = hints[0];

  return {
    _id: id,
    name: item.name?.trim() || 'Бараа',
    description: '',
    price: latestHint?.price ?? 0,
    sections: ['Шинэ', 'Захиалга'],
    image: images[0] ?? latestHint?.image ?? null,
    images,
    options: [],
    variants: [],
    category: latestHint?.category ?? defaultCategory,
    stockStatus: 'pre-order',
    inventory: 0,
    salesCount: 0,
    shippingOrigin: 'БНХАУ',
    shippingDestination: 'Улаанбаатар',
    dispatchTime: '14-21 хоногт ирнэ',
    featured: false,
    isCargo: true,
    brand: '',
    model: '',
    delivery: 'Үнэгүй',
    deliveryFee: 5000,
    paymentMethods: 'QPay, SocialPay, Card',
    attributes: {},
    ...(item.sku ? { sku: item.sku } : {}),
    restoredAt: new Date(),
    restoredFrom: 'deleted-products-1780818611193.json',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI байхгүй');
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`Backup олдсонгүй: ${BACKUP_FILE}`);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8')) as {
    products: BackupProduct[];
  };

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGO_DB);
  const productsCol = db.collection('products');
  const ordersCol = db.collection('orders');

  const backupIds = backup.products.map((p) => new ObjectId(p._id));
  const existing = await productsCol
    .find({ _id: { $in: backupIds } })
    .project({ _id: 1 })
    .toArray();
  const existingIds = new Set(existing.map((p) => String(p._id)));

  const toRestore = backup.products.filter((p) => !existingIds.has(p._id));
  const categoryAgg = await productsCol
    .aggregate([
      { $match: { category: { $exists: true, $nin: ['', '--', null] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ])
    .toArray();
  const defaultCategory = String(categoryAgg[0]?._id ?? '69e1af50241445d69f470bd4');

  const orderHints = new Map<string, OrderItem[]>();
  const orders = await ordersCol
    .find({ 'items.productId': { $in: backup.products.map((p) => p._id) } })
    .sort({ createdAt: -1 })
    .toArray();

  for (const order of orders) {
    const items = (order.items ?? []) as OrderItem[];
    for (const item of items) {
      if (!item.productId || !backup.products.some((p) => p._id === item.productId)) continue;
      const list = orderHints.get(item.productId) ?? [];
      list.push(item);
      orderHints.set(item.productId, list);
    }
  }

  console.log('📦 Backup-аас сэргээх:');
  console.log(`   Backup дотор: ${backup.products.length}`);
  console.log(`   Аль хэдийн байгаа: ${existing.length}`);
  console.log(`   Сэргээх: ${toRestore.length}`);
  console.log(`   Захиалгаас hint: ${orderHints.size} бараа`);

  if (toRestore.length === 0) {
    console.log('\n✅ Сэргээх бараа байхгүй.');
    await client.close();
    return;
  }

  const docs = toRestore.map((item) =>
    buildProduct(item, orderHints, defaultCategory),
  );

  const missingPrice = docs.filter((d) => !d.price).length;
  if (missingPrice > 0) {
    console.log(`\n⚠️  ${missingPrice} бараанд үнэ байхгүй (0₮). Admin-аас засах хэрэгтэй.`);
  }

  console.log('\n⚠️  Backup зөвхөн нэр + зураг агуулсан. Бусад талбарыг default утгаар сэргээнэ.');

  if (!confirm) {
    console.log('\nDry run — DB-д оруулаагүй.');
    console.log('Сэргээх: npx tsx scripts/restore-deleted-products.ts --confirm');
    console.log('\nЖишээ:');
    console.log(JSON.stringify(docs[0], null, 2).slice(0, 800));
    await client.close();
    return;
  }

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const result = await productsCol.insertMany(batch, { ordered: false }).catch((err) => {
      if (err?.insertedIds) {
        inserted += Object.keys(err.insertedIds).length;
      }
      throw err;
    });
    inserted += result.insertedCount;
    console.log(`   ... ${inserted}/${docs.length}`);
  }

  const total = await productsCol.countDocuments();
  console.log(`\n✅ ${inserted} бараа сэргээгдлээ. Нийт бараа: ${total}`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
