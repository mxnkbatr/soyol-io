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

        const usersCollection = await getCollection<User>('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const existingTokens = user?.pushTokens || [];
        const isAlreadyRegistered = existingTokens.some((pt: PushToken) => pt.token === token);
        const promoEnabled = user?.notificationPrefs?.promo !== false; // default true

        if (!isAlreadyRegistered) {
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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error registering push token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}