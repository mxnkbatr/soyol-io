import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

import { getAuthCookieOptions, AUTH_JWT_EXPIRY } from '@/lib/authCookie';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env variable is not set');
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request: Request) {
    try {
        const { phone, password } = await request.json();

        if (!phone || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const users = await getCollection('users');
        const user = await users.findOne({ phone });

        if (!user || !user.password) {

            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {

            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create JWT
        const token = await new SignJWT({
            sub: user._id.toString(),
            phone: user.phone,
            role: user.role
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime(AUTH_JWT_EXPIRY)
            .sign(JWT_SECRET);

        // Set cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user._id.toString(),
                phone: user.phone,
                role: user.role,
                status: user.status,
                name: user.name,
                image: user.image
            }
        });
        response.cookies.set('auth_token', token, getAuthCookieOptions());

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
