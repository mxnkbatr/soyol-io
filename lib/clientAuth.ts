import { AUTH_COOKIE_NAME, AUTH_MAX_AGE_SEC } from './authCookie';

const TOKEN_KEY = 'soyol_auth_token';
let fetchInterceptorInstalled = false;

export function readAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Persist JWT for native WebView (cookies often fail on Capacitor remote URL). */
export function writeAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;

  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${AUTH_MAX_AGE_SEC}; secure; samesite=lax`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; secure; samesite=lax`;
    }
  } catch {
    // ignore quota / private mode
  }
}

export function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const token = readAuthToken();
  const headers = new Headers(init?.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers,
  });
}

/** Attach Bearer token to same-origin API calls (Capacitor). */
export function installAuthFetchInterceptor() {
  if (typeof window === 'undefined' || fetchInterceptorInstalled) return;
  fetchInterceptorInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const token = readAuthToken();
    if (!token) return nativeFetch(input, init);

    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const isApi =
      url.startsWith('/api/') ||
      url.includes('/api/');

    if (!isApi) return nativeFetch(input, init);

    const headers = new Headers(init?.headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return nativeFetch(input, {
      ...init,
      credentials: init?.credentials ?? 'include',
      headers,
    });
  };
}
