import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { subscribeTokenToTopic, unsubscribeTokenFromTopic } from '@/lib/fcm';

const DEFAULT_PREFS = {
    order: true,
    delivery: true,
    promo: true,
    stock: false,
    chat: true,
    email: false,
};

interface PushTokenEntry {
    token: string;
    platform: string;
    createdAt: Date;
}

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const usersCollection = await getCollection('users');
        const user = await usersCollection.findOne(
            { _id: new ObjectId(userId) },
            { projection: { notificationPrefs: 1 } }
        );

        const prefs = user?.notificationPrefs || DEFAULT_PREFS;

        return NextResponse.json({ prefs });
    } catch (error) {
        console.error('[Prefs GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { prefs: updatedPrefs } = body;

        if (!updatedPrefs) {
            return NextResponse.json({ error: 'Missing preferences' }, { status: 400 });
        }

        const usersCollection = await getCollection('users');
        const user = await usersCollection.findOne(
            { _id: new ObjectId(userId) },
            { projection: { notificationPrefs: 1, pushTokens: 1 } }
        );

        const oldPrefs = user?.notificationPrefs || DEFAULT_PREFS;

        // Save preferences to Mongo user document
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { notificationPrefs: updatedPrefs } }
        );

        // Manage FCM subscriptions on topic 'all-users' if promo changes
        if (oldPrefs.promo !== updatedPrefs.promo && user?.pushTokens && Array.isArray(user.pushTokens)) {
            const pushTokens = user.pushTokens as PushTokenEntry[];
            for (const entry of pushTokens) {
                const token = entry?.token;
                if (!token) continue;

                try {
                    if (updatedPrefs.promo) {
                        await subscribeTokenToTopic(token, 'all-users');
                    } else {
                        await unsubscribeTokenFromTopic(token, 'all-users');
                    }
                } catch (fcmErr) {
                    console.error(`[FCM Topic Toggle] Error for token ${token}:`, fcmErr);
                }
            }
        }

        return NextResponse.json({ success: true, prefs: updatedPrefs });
    } catch (error) {
        console.error('[Prefs PATCH] Error:', error);
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }
}