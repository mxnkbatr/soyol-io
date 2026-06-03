import { NextRequest, NextResponse } from 'next/server';
import { sendPushToAllUsers } from '@/lib/fcm';
import { getCollection } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        if (type !== 'morning' && type !== 'evening') {
            return NextResponse.json({ error: "Invalid type. Must be 'morning' or 'evening'." }, { status: 400 });
        }

        // Security check - Ensure CRON_SECRET is defined and matches the Authorization header
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let title = '';
        let message = '';
        let typeKey = '';

        if (type === 'morning') {
            title = '☀️ Өглөөний мэнд!';
            message = 'Өнөөдөр танд аз жаргал хүсье. Soyol-д шинэ хямдрал эхэллээ.';
            typeKey = 'greeting_morning';
        } else {
            title = '🌙 Оройн мэнд!';
            message = 'Өдрийн ажлаа амжуулсан уу? Тайван амраарай.';
            typeKey = 'greeting_evening';
        }

        // 1. Send Push Notification to 'all-users' topic
        await sendPushToAllUsers({
            title,
            body: message,
            data: {
                type: typeKey,
                url: '/'
            }
        });

        // 2. Log in database as a global notification for in-app bell
        try {
            const notificationsCollection = await getCollection('notifications');
            await notificationsCollection.insertOne({
                userId: 'all',
                title,
                message,
                type: typeKey,
                isRead: false,
                link: '/',
                createdAt: new Date()
            });
        } catch (dbErr) {
            console.error('[Greetings Cron] Failed to log greeting in DB:', dbErr);
        }

        console.log(`[Greetings Cron] Successfully sent ${type} greeting to all users.`);

        return NextResponse.json({ success: true, message: `Sent ${type} greeting.` });
    } catch (error) {
        console.error('[Greetings Cron] Error executing cron job:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}