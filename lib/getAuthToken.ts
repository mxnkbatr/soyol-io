import { cookies, headers } from 'next/headers';
import { AUTH_COOKIE_NAME } from './authCookie';

/** Read JWT from httpOnly cookie or Authorization header (native app). */
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;

  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return undefined;
}
