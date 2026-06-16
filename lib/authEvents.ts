export const AUTH_READY_EVENT = 'soyol-auth-ready';

export function notifyAuthReady() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_READY_EVENT));
  }
}
