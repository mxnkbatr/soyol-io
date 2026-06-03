import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const queryUserId = searchParams.get('userId');
        const countOnly = searchParams.get('countOnly') === 'true';

        if (userId !== queryUserId) {
            // Optional: Allow admins to view others, but for now strict check
            // return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const notificationsCollection = await getCollection('notifications');

        if (countOnly) {
            const unreadCount = await notificationsCollection.countDocuments({
                $or: [
                    { userId },
                    { userId: 'all' }
                ],
                isRead: false
            });
            return NextResponse.json({ unreadCount });
        }

        const notifications = await notificationsCollection
            .find({
                $or: [
                    { userId },
                    { userId: 'all' }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        const mappedNotifications = notifications.map(n => ({
            ...n,
            id: n._id.toString()
        }));

        return NextResponse.json({ notifications: mappedNotifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId, role } = await auth(); 
        if (!userId) { 
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); 
        } 
        if (role !== 'admin') { 
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); 
        }

        const body = await req.json();
        const { recipientId, title, message, type, link } = body;

        if (!recipientId || !title || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const notificationsCollection = await getCollection('notifications');
        const newNotification = {
            userId: recipientId,
            title,
            message,
            type: type || 'system',
            isRead: false,
            link,
            createdAt: new Date(),
        };

        const result = await notificationsCollection.insertOne(newNotification);

        return NextResponse.json({ success: true, notificationId: result.insertedId });

    } catch (error) {
        console.error('Error creating notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { notificationId, markAll } = body;

        const notificationsCollection = await getCollection('notifications');

        // Mode 2: Mark-all-read
        if (markAll === true) {
            const result = await notificationsCollection.updateMany(
                {
                    $or: [
                        { userId },
                        { userId: 'all' }
                    ],
                    isRead: false
                },
                { $set: { isRead: true } }
            );

            return NextResponse.json({
                success: true,
                updatedCount: result.modifiedCount
            });
        }

        // Mode 1: Single mark-read
        if (!notificationId) {
            return NextResponse.json({ error: 'Missing notificationId or markAll' }, { status: 400 });
        }

        // Modified query to include broadcast notifications
        await notificationsCollection.updateOne(
            {
                _id: new ObjectId(notificationId),
                $or: [{ userId }, { userId: 'all' }],
            },
            { $set: { isRead: true } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}