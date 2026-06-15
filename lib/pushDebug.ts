/** Push token debug — production дээр идэвхгүй. */
export function isPushDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_DEBUG_PUSH === 'true') return true;
  try {
    return window.localStorage.getItem('soyol-debug-push') === '1';
  } catch {
    return false;
  }
}

function shortenToken(token: string): string {
  if (token.length <= 72) return token;
  return `${token.slice(0, 36)}...${token.slice(-24)}`;
}

export function debugPushLog(title: string, detail?: string) {
  const line = detail ? `${title}: ${detail}` : title;
  console.log('[Push Debug]', line);
  if (!isPushDebugEnabled()) return;
  window.alert(detail ? `${title}\n\n${shortenToken(detail)}` : title);
}

export function debugPushError(title: string, error: unknown) {
  console.error('[Push Debug]', title, error);
  if (!isPushDebugEnabled()) return;
  const text =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);
  window.alert(`${title}\n\n${text}`);
}
