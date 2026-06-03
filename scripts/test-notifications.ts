
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGO_DB || 'Soyloo';
const TEST_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || 'user_2s...'; // Need a real user ID here or just fetch one

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not set in .env file');
    process.exit(1);
}

async function testNotifications() {
    const client = new MongoClient(MONGODB_URI!, {
        tls: true,
        tlsAllowInvalidCertificates: true,
    });

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(MONGO_DB);
        const usersCollection = db.collection('users');
        const notificationsCollection = db.collection('notifications');

        // Get a real user to send notification to
        const user = await usersCollection.findOne({});
        if (!user) {
            console.log('No users found to test notifications with.');
            return;
        }

        const userId = user.userId || user._id.toString(); // Adjust based on your user model
        console.log(`Sending test notification to user: ${userId}`);

        const newNotification = {
            userId: userId,
            title: 'Test Notification',
            message: 'This is a test notification from the seed script.',
            type: 'system',
            isRead: false,
            createdAt: new Date(),
        };

        const result = await notificationsCollection.insertOne(newNotification);
        console.log(`Notification created: ${result.insertedId}`);

    } catch (error) {
        console.error('Error testing notifications:', error);
    } finally {
        await client.close();
    }
}

testNotifications();
