import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiter setup with safety checks
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  : null;

const ratelimit = redis
  ? new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(100, '60 s'),
    analytics: true,
  })
  : null;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET env variable is not set');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Paths that require authentication
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/profile',
  '/orders',
  '/wishlist',
  '/addresses',
  '/settings',
  '/vendor',
  '/messages',
];

// Paths that are for admins only
const adminRoutes = [
  '/admin'
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

  // 1. Rate Limiting for API routes (skip lightweight high-frequency reads)
  const rateLimitExempt =
    pathname === '/api/auth/me' ||
    pathname.startsWith('/api/banners') ||
    pathname.startsWith('/api/health/');

  if (pathname.startsWith('/api/') && !rateLimitExempt) {
    if (ratelimit) {
      try {
        const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_${ip}`);

        if (!success) {
          return NextResponse.json(
            { error: 'Too many requests' },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
              }
            }
          );
        }
      } catch (err) {
        console.error('Rate limiting error:', err);
      }
    }
  }

  // 2. Auth checks (Custom JWT Auth)
  const token = req.cookies.get('auth_token')?.value;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    if (!token) {
      const url = new URL('/sign-in', req.url);
      url.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);

      if (isAdminRoute && payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }

      return NextResponse.next();
    } catch (err) {
      const url = new URL('/sign-in', req.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - Next.js internal system files (_next)
     * - Favicon
     * - Public static images/assets (optional, standard bypass patterns)
     */
    '/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};