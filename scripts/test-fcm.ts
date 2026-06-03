import { config } from 'dotenv';
import path from 'path';

// MUST load env BEFORE importing mongodb/fcm, because mongodb.ts
// reads process.env.MONGODB_URI at module evaluation time.
config({ path: path.resolve(__dirname, '../.env') });
config({ path: path.resolve(__dirname, '../.env.local'), override: true });

async function run() {
  // Dynamic imports so env vars are already set when modules load
  const { getCollection } = await import('../lib/mongodb');
  const { sendPushToUser } = await import('../lib/fcm');

  try {
    const usersCollection = await getCollection('users');

    // Find a user that has registered push tokens
    const user = await usersCollection.findOne({
      pushTokens: { $exists: true, $not: { $size: 0 } }
    } as any);

    if (!user) {
      console.log('🔴 Мэдээллийн санд нэг ч pushToken-той хэрэглэгч бүртгэгдээгүй байна.');
      console.log('Та эхлээд шинэ хувилбарын (Version 6) апп-аа утсандаа суулгаж, нэвтэрч ороод мэдэгдлийн зөвшөөрөл өгөх хэрэгтэй.');
      console.log('Тэгж байж таны утасны token мэдээллийн санд хадгалагдана.');
      return;
    }

    console.log(`🟢 Олдсон хэрэглэгч: ${user.fullName || user.phone || 'Нэргүй'} (ID: ${user._id.toString()})`);
    console.log(`📱 Бүртгэлтэй утасны тоо: ${user.pushTokens.length}`);

    console.log('Утас руу Push notification илгээж байна...');

    await sendPushToUser({
      userId: user._id.toString(),
      title: '🚀 Soyol Shop - Туршилтын Мэдэгдэл',
      body: 'Таны утасны push notification систем амжилттай ажиллаж байна!',
      data: { url: '/', type: 'test' }
    });

    console.log('✅ Илгээж дууслаа. Утасныхаа дэлгэцийг шалгана уу!');
  } catch (err) {
    console.error('Алдаа гарлаа:', err);
  } finally {
    process.exit(0);
  }
}

run();
