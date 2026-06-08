import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET env variable is not set');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Server-side auth helper.
 * Returns `{ userId, phone, role }` if authenticated, `{ userId: null, ... }` otherwise.
 */
export async function auth(): Promise<{ userId: string | null; phone: string | null; role: string | null }> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) return { userId: null, phone: null, role: null };

        const { payload } = await jwtVerify(token, JWT_SECRET);

        // Most routes use `sub`; OTP login historically used `userId` in the payload.
        const userId = (payload.sub || payload.userId) as string | undefined;

        if (!userId) return { userId: null, phone: null, role: null };

        return {
            userId: userId as string,
            phone: (payload.phone as string) || null,
            role: (payload.role as string) || null,
        };
    } catch {
        return { userId: null, phone: null, role: null };
    }
}

/**
 * Server-side helper — returns the full user object or null.
 */
export async function currentUser() {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const usersCollection = await getCollection('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) return null;

        return {
            id: user._id.toString(),
            phone: user.phone,
            role: user.role,
            status: user.status,
            name: user.name,
            fullName: user.name,
            firstName: user.name?.split(' ')[0],
            email: user.email,
            image: user.image,
            primaryEmailAddress: user.email ? { emailAddress: user.email } : null,
            imageUrl: user.image || null,
            publicMetadata: { role: user.role },
        };
    } catch {
        return null;
    }
}
