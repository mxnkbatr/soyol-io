import { NextRequest, NextResponse } from 'next/server';
import { sendPushToAllUsers } from '@/lib/fcm';

/** Manual test: GET with Authorization: Bearer CRON_SECRET */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const fcmId = await sendPushToAllUsers({
            title: '🔔 Soyol тест',
            body: 'Апп хаалттай үед мэдэгдэл ирж байна уу? Энэ бол туршилтын мэдэгдэл.',
            data: { type: 'test_push', url: '/' },
        });

        return NextResponse.json({ success: true, fcmId: fcmId ?? null });
    } catch (error) {
        console.error('[Test Push] Error:', error);
        return NextResponse.json({ error: 'Failed to send push' }, { status: 500 });
    }
}
