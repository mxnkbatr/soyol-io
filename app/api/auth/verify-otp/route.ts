import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { verifyOtp } from '@/lib/twilio';
import { SignJWT } from 'jose';
import { getAuthCookieOptions, AUTH_JWT_EXPIRY } from '@/lib/authCookie';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env variable is not set');
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Missing phone or code' }, { status: 400 });
    }

    // 2. Verify OTP (Twilio or Mock)
    const twilioRes = await verifyOtp(phone, code);
    let isVerified = false;

    if (twilioRes.success) {
      if (twilioRes.isValid) {
        isVerified = true;
      } else {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      }
    } else if (twilioRes.error?.includes('Mock')) {
      // Fallback to DB check for Mock mode
      const otpCollection = await getCollection('otps');
      const otpRecord = await otpCollection.findOne({ phone, code });

      if (!otpRecord) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      }

      if (new Date() > otpRecord.expiresAt) {
        return NextResponse.json({ error: 'Code expired' }, { status: 400 });
      }

      // Mark verified
      await otpCollection.deleteOne({ _id: otpRecord._id });
      isVerified = true;
    } else {
      // Twilio API Error
      console.error('Twilio Error:', twilioRes.error);
      return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }

    if (!isVerified) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Check or Create User
    const usersCollection = await getCollection('users');
    let user = await usersCollection.findOne({ phone });

    if (!user) {
      // Default role: user, Status: available
      const newUser = {
        phone,
        role: 'user',
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const res = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: res.insertedId };
    }

    // Generate JWT
    const token = await new SignJWT({
      sub: user._id.toString(),
      phone: user.phone,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(AUTH_JWT_EXPIRY)
      .sign(JWT_SECRET);

    // Set Cookie
    const response = NextResponse.json({
      success: true,
      token,
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
    console.error('Verify OTP Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
