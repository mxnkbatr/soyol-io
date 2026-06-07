/**
 * Local /uploads/ banner URL-уудыг Cloudinary руу шилжүүлнэ (файл байвал).
 * Файл байхгүй бол идэвхгүй болгоно.
 *
 * npx tsx scripts/migrate-local-banners-to-cloudinary.ts --confirm
 */
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { MongoClient } from 'mongodb';
import { uploadToNewCloudinary } from '../lib/imageUpload';

config({ path: path.resolve(__dirname, '../.env.local') });

const confirm = process.argv.includes('--confirm');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const banners = client.db(process.env.MONGO_DB || 'Soyloo').collection('banners');

  const broken = await banners
    .find({
      $or: [
        { image: { $regex: '^/uploads/' } },
        { image: { $regex: '^/api/media/' } },
      ],
    })
    .toArray();

  console.log(`Эвдэрсэн banner: ${broken.length}`);

  for (const banner of broken) {
    const imagePath = String(banner.image);
    const localFile = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''));

    console.log(`\n→ ${banner._id}: ${imagePath}`);

    if (!fs.existsSync(localFile)) {
      console.log('   Файл байхгүй — устгана');
      if (confirm) await banners.deleteOne({ _id: banner._id });
      continue;
    }

    const buffer = fs.readFileSync(localFile);
    const ext = path.extname(localFile).slice(1) || 'jpg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const result = await uploadToNewCloudinary(buffer, 'banners', mime);

    if (!result.ok) {
      console.log(`   Cloudinary алдаа: ${result.error}`);
      if (confirm) await banners.deleteOne({ _id: banner._id });
      continue;
    }

    console.log(`   ✓ ${result.url}`);
    if (confirm) {
      await banners.updateOne(
        { _id: banner._id },
        { $set: { image: result.url, updatedAt: new Date() } },
      );
    }
  }

  const remaining = await banners.find({ active: true }).toArray();
  console.log(`\nИдэвхтэй banner: ${remaining.length}`);
  remaining.forEach((b) => console.log(`   - ${b.image}`));

  await client.close();
}

main().catch(console.error);
