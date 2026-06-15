import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { SignJWT } from 'jose';
import { getAuthCookieOptions, AUTH_JWT_EXPIRY } from '@/lib/authCookie';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env variable is not set');
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request: Request) {
    try {
        const { access_token } = await request.json();

        if (!access_token) {
            return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
        }

        // Fetch user info from Google
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!googleRes.ok) {
            return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
        }

        const googleUser = await googleRes.json();
        const { sub: googleId, email, name, picture } = googleUser;

        const users = await getCollection('users');
        let user = await users.findOne({ $or: [{ googleId }, { email }] });
        let isNewUser = false;

        if (!user) {
            // Create user
            isNewUser = true;
            const result = await users.insertOne({
                googleId,
                email,
                name: name || email.split('@')[0],
                image: picture,
                role: 'user',
                createdAt: new Date(),
                status: 'available'
            });
            user = await users.findOne({ _id: result.insertedId });
            if (!user) throw new Error('Failed to create user');
        } else if (!user.googleId) {
            // Link googleId to existing user
            await users.updateOne({ _id: user._id }, { $set: { googleId } });
            user.googleId = googleId;
        }

        // Create JWT
        const token = await new SignJWT({
            sub: user._id.toString(),
            phone: user.phone || '',
            role: user.role,
            email: user.email,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime(AUTH_JWT_EXPIRY)
            .sign(JWT_SECRET);

        // Set cookie
        const response = NextResponse.json({
            success: true,
            isNewUser,
            user: {
                id: user._id.toString(),
                phone: user.phone,
                email: user.email,
                role: user.role,
                status: user.status,
                name: user.name,
                image: user.image
            }
        });
        
        response.cookies.set('auth_token', token, getAuthCookieOptions());

        return response;
    } catch (error) {
        console.error('Google Auth error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
