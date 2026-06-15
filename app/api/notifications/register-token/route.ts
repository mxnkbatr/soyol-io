import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { User, PushToken } from '@/models/User';
import { subscribeTokenToTopic, isFcmRegistrationToken } from '@/lib/fcm';

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

        if (platform === 'ios' && !isFcmRegistrationToken(token)) {
            console.warn('[Push Token] Rejected non-FCM iOS token');
            return NextResponse.json({ error: 'Invalid FCM token for iOS' }, { status: 400 });
        }

        console.log('[Push Token] Incoming registration:', {
            userId,
            platform: platform || 'unknown',
            tokenPreview: `${String(token).slice(0, 12)}...${String(token).slice(-8)}`,
        });

        const usersCollection = await getCollection<User>('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const existingTokens = user?.pushTokens || [];
        const isAlreadyRegistered = existingTokens.some((pt: PushToken) => pt.token === token);
        const promoEnabled = user?.notificationPrefs?.promo !== false;

        if (!isAlreadyRegistered) {
            const newToken: PushToken = {
                token,
                platform: (platform as string) || 'unknown',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $push: { pushTokens: newToken } as any },
            );
        } else {
            await usersCollection.updateOne(
                { _id: new ObjectId(userId), 'pushTokens.token': token },
                { $set: { 'pushTokens.$.updatedAt': new Date() } },
            );
        }

        const invalidTokens = existingTokens
            .filter((pt: PushToken) => !isFcmRegistrationToken(pt.token))
            .map((pt: PushToken) => pt.token);
        if (invalidTokens.length > 0) {
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $pull: { pushTokens: { token: { $in: invalidTokens } } } } as any,
            );
            console.log('[Push Token] Removed invalid tokens:', invalidTokens.length);
        }

        if (platform === 'ios' || platform === 'android') {
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $pull: {
                        pushTokens: {
                            platform,
                            token: { $ne: token },
                        },
                    } as any,
                },
            );
        }

        if (promoEnabled) {
            await subscribeTokenToTopic(token, 'all-users');
        }

        console.log('[Push Token] Registered successfully:', {
            userId,
            platform: platform || 'unknown',
            isNew: !isAlreadyRegistered,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error registering push token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
