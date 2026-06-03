import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { User, PushToken } from '@/models/User';
import { subscribeTokenToTopic } from '@/lib/fcm';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { token, platform } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        // Fetch user's promo preference before subscribing
        const usersCollection = await getCollection<User>('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const existingTokens = user?.pushTokens || [];
        const isAlreadyRegistered = existingTokens.some((pt: PushToken) => pt.token === token);
        const promoEnabled = user?.notificationPrefs?.promo !== false; // default true

        if (!isAlreadyRegistered) {
            const newToken: PushToken = {
                token,
                platform: (platform as string) || 'unknown',
                createdAt: new Date(),
            };
            
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $push: { pushTokens: newToken } as any }
            );

            // Only subscribe to promo topic if the user wants it
            if (promoEnabled) {
                await subscribeTokenToTopic(token, 'all-users');
            }
        } else {
            // Self-heal: only re-subscribe if preference allows it
            if (promoEnabled) {
                await subscribeTokenToTopic(token, 'all-users');
            }
            // If promoEnabled is false, we do NOT subscribe — respecting the user preference
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error registering push token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}