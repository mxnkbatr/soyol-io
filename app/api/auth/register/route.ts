import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const jwtSecretEnv = process.env.JWT_SECRET;
if (!jwtSecretEnv) throw new Error('JWT_SECRET env variable is not set');
const JWT_SECRET = new TextEncoder().encode(jwtSecretEnv);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, password, name, age } = body;



        if (!phone || !password || !name || !age) {

            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const users = await getCollection('users');

        // Check if user exists
        const existingUser = await users.findOne({ phone });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Энэ дугаар бүртгэлтэй байна' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        // Create user
        const newUser = {
            phone,
            password: hashedPassword,
            name,
            age: Number(age),
            role: 'user', // Default role
            status: 'available',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await users.insertOne(newUser);
        const user = { ...newUser, _id: result.insertedId };

        // Migrate any guest orders with the same phone to this new user
        try {
            const orders = await getCollection('orders');
            const migrated = await orders.updateMany(
                { phone, userId: 'guest' },
                { $set: { userId: user._id.toString(), updatedAt: new Date() } }
            );

        } catch (migrationError) {
            console.error('[Register API] Order migration error:', migrationError);
            // Don't fail registration if migration fails
        }

        // Create JWT for auto-login
        const token = await new SignJWT({ // Using jose to match login
            sub: user._id.toString(),
            phone: user.phone,
            role: user.role
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('24h')
            .sign(JWT_SECRET);

        const response = NextResponse.json({
            success: true,
            message: 'Account created',
            token,
            user: {
                id: user._id.toString(),
                phone: user.phone,
                role: user.role,
                status: user.status,
                name: user.name
            }
        });

        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
