import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env') });
config({ path: path.resolve(__dirname, '../.env.local'), override: true });

async function run() {
  const { getCollection } = await import('../lib/mongodb');
  const admin = await import('firebase-admin');

  if (!admin.default.apps.length) {
    admin.default.initializeApp({
      credential: admin.default.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
      }),
    });
  }

  const users = await getCollection('users');
  const user = await users.findOne({
    pushTokens: { $exists: true, $not: { $size: 0 } },
  } as any);

  if (!user?.pushTokens?.length) {
    console.log('No tokens');
    return;
  }

  const tokens = user.pushTokens.map((t: { token: string }) => t.token);
  const res = await admin.default.messaging().sendEachForMulticast({
    notification: { title: '🔔 Direct test', body: 'MongoDB token руу шууд илгээв' },
    tokens,
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
        'apns-topic': 'mn.soyol.shop',
      },
      payload: { aps: { alert: { title: '🔔 Direct', body: 'test' }, sound: 'default' } },
    },
  });

  console.log(`success: ${res.successCount}, fail: ${res.failureCount}`);
  res.responses.forEach((r, i) => {
    const pt = user.pushTokens[i];
    const preview = `${String(pt.token).slice(0, 20)}...`;
    if (r.success) {
      console.log(`✅ [${pt.platform}] ${preview}`);
    } else {
      console.log(`❌ [${pt.platform}] ${preview} → ${r.error?.code}: ${r.error?.message}`);
    }
  });
}

run().finally(() => process.exit(0));
