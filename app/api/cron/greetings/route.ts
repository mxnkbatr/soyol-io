import { NextRequest, NextResponse } from 'next/server';
import { sendPushToAllUsers } from '@/lib/fcm';
import { getCollection } from '@/lib/mongodb';

const GREETINGS: Record<
    'morning' | 'evening',
    { title: string; message: string; typeKey: string }
> = {
    morning: {
        title: '☀️ Өглөөний мэнд!',
        message: '🔥 Өнөөдрийн хямдрал бэлэн! Soyol Shop-оос шинэ бараа үзээрэй.',
        typeKey: 'greeting_morning',
    },
    evening: {
        title: '🌙 Оройн мэнд!',
        message: '🛍️ Оройн санал — зөвхөн өнөөдөр! Хямдралтай бараа үлдсэн эсэхийг шалгаарай.',
        typeKey: 'greeting_evening',
    },
};

function isAuthorized(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        if (type !== 'morning' && type !== 'evening') {
            return NextResponse.json({ error: "Invalid type. Must be 'morning' or 'evening'." }, { status: 400 });
        }

        if (!isAuthorized(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, message, typeKey } = GREETINGS[type];

        const fcmId = await sendPushToAllUsers({
            title,
            body: message,
            data: {
                type: typeKey,
                url: '/',
            },
        });

        try {
            const notificationsCollection = await getCollection('notifications');
            await notificationsCollection.insertOne({
                userId: 'all',
                title,
                message,
                type: typeKey,
                isRead: false,
                link: '/',
                createdAt: new Date(),
            });
        } catch (dbErr) {
            console.error('[Greetings Cron] Failed to log greeting in DB:', dbErr);
        }

        console.log(`[Greetings Cron] Successfully sent ${type} greeting to all users.`);

        return NextResponse.json({
            success: true,
            message: `Sent ${type} greeting.`,
            fcmId: fcmId ?? null,
        });
    } catch (error) {
        console.error('[Greetings Cron] Error executing cron job:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
