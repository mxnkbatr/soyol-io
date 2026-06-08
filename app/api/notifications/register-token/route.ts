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
            console.warn('[Push Token] Rejected: user not authenticated');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { token, platform } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        console.log('[Push Token] Incoming registration:', {
            userId,
            platform: platform || 'unknown',
            token,
            tokenPreview: `${String(token).slice(0, 12)}...${String(token).slice(-8)}`,
        });

        const usersCollection = await getCollection<User>('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const existingTokens = user?.pushTokens || [];
        const isAlreadyRegistered = existingTokens.some((pt: PushToken) => pt.token === token);
        const promoEnabled = user?.notificationPrefs?.promo !== false; // default true

        if (!isAlreadyRegistered) {
            console.log('[Push Token] Saving new token for user:', userId);
            // New token — insert it
            const newToken: PushToken = {
                token,
                platform: (platform as string) || 'unknown',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $push: { pushTokens: newToken } as any }
            );
        } else {
            console.log('[Push Token] Token already exists, refreshing updatedAt for user:', userId);
            // Existing token — always bump updatedAt so we know it's still alive
            await usersCollection.updateOne(
                { _id: new ObjectId(userId), 'pushTokens.token': token },
                { $set: { 'pushTokens.$.updatedAt': new Date() } }
            );
        }

        // Always re-subscribe to FCM topic so tokens registered before APNs
        // key was configured get properly linked to the topic.
        if (promoEnabled) {
            await subscribeTokenToTopic(token, 'all-users');
        }

        console.log('[Push Token] Registered successfully:', {
            userId,
            platform: platform || 'unknown',
            isNew: !isAlreadyRegistered,
            totalTokens: (existingTokens.length || 0) + (isAlreadyRegistered ? 0 : 1),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error registering push token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}