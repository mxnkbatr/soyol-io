export const AUTH_COOKIE_NAME = 'auth_token';
export const AUTH_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days
export const AUTH_JWT_EXPIRY = '30d';

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: AUTH_MAX_AGE_SEC,
    path: '/',
  };
}
