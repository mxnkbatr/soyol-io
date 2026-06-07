/**
 * Cloudinary account сэргэсний ДАРАА шинэ cloud руу зураг шилжүүлнэ.
 * (Account disabled үед ажиллахгүй — эхлээд support-оор сэргээнэ үү)
 *
 * Ажиллуулах:
 *   SOURCE_CLOUD=dc127wztz TARGET_CLOUD=шинэ_нэр npx tsx scripts/migrate-cloudinary-images.ts
 */
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

config({ path: path.resolve(__dirname, '../.env.local') });
config({ path: path.resolve(__dirname, '../.env') });

const sourceCloud = process.env.SOURCE_CLOUD || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dc127wztz';
const targetCloud = process.env.TARGET_CLOUD;

async function main() {
  if (!targetCloud) {
    console.error('TARGET_CLOUD env заавал хэрэгтэй (шинэ cloud name)');
    process.exit(1);
  }

  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error('CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET хэрэгтэй');
    process.exit(1);
  }

  cloudinary.config({ cloud_name: sourceCloud, api_key: apiKey, api_secret: apiSecret });

  // Эхлээд admin API ажиллаж байгаа эсэхийг шалгана
  try {
    await cloudinary.api.resources({ type: 'upload', max_results: 1 });
  } catch (e: any) {
    console.error('❌ Source cloud ажиллахгүй байна:', e?.message || e);
    console.error('   Cloudinary support-оор account сэргээгээд дахин оролдоно уу.');
    process.exit(1);
  }

  console.log(`📦 ${sourceCloud} → ${targetCloud} шилжүүлж байна...`);

  const migrated: { old: string; new: string; publicId: string }[] = [];
  let nextCursor: string | undefined;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 100,
      next_cursor: nextCursor,
    });

    for (const res of result.resources) {
      const publicId = res.public_id as string;
      const oldUrl = res.secure_url as string;

      const uploaded = await cloudinary.uploader.upload(oldUrl, {
        cloud_name: targetCloud,
        resource_type: 'image',
        overwrite: false,
      });

      migrated.push({ old: oldUrl, new: uploaded.secure_url, publicId });
      console.log(`  ✓ ${publicId}`);
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  const outDir = path.resolve(__dirname, '../backups');
  fs.mkdirSync(outDir, { recursive: true });
  const mapFile = path.join(outDir, `migration-map-${Date.now()}.json`);
  fs.writeFileSync(mapFile, JSON.stringify(migrated, null, 2));

  console.log(`\n✅ ${migrated.length} зураг шилжүүллээ`);
  console.log(`📄 URL map: ${mapFile}`);
  console.log('\nДараагийн алхам: MongoDB дахь хуучин URL-уудыг шинэ URL-аар солих script ажиллуulna.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
