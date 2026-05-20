/**
 * 推广邀请码客户端归因（主站 zerocut.cn）。
 * 与 workspace.zerocut.cn 共享 .zerocut.cn cookie，因此用户从主站点击落地后
 * 注册时若发生在 workspace 侧，也能拿到这枚 ref_code。
 *
 * 规则参考 server/src/modules/referral：last-click 覆盖；服务端按 channel 配置判定窗口期。
 */

const COOKIE_NAME = 'ref_code';
const COOKIE_SEEN_NAME = 'ref_seen_at';
const STORAGE_KEY = 'zerocut_ref';
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export interface StoredRef {
  code: string;
  seenAt: string;
  landingHost?: string;
}

function getCookieDomain(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  if (host.endsWith('.zerocut.cn') || host === 'zerocut.cn') return '.zerocut.cn';
  return null;
}

function setCookie(name: string, value: string) {
  const domain = getCookieDomain();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    `Path=/`,
    `SameSite=Lax`,
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (window.location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const target = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return null;
}

export function captureRefFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const rawCode = url.searchParams.get('ref');
    if (!rawCode) return;

    const code = rawCode.trim().toUpperCase();
    if (!code || code.length > 16) return;

    const stored: StoredRef = {
      code,
      seenAt: new Date().toISOString(),
      landingHost: window.location.hostname,
    };

    setCookie(COOKIE_NAME, stored.code);
    setCookie(COOKIE_SEEN_NAME, stored.seenAt);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

export function getStoredRef(): StoredRef | null {
  if (typeof window === 'undefined') return null;

  const cookieCode = readCookie(COOKIE_NAME);
  const cookieSeen = readCookie(COOKIE_SEEN_NAME);
  if (cookieCode) {
    return {
      code: cookieCode,
      seenAt: cookieSeen ?? new Date().toISOString(),
      landingHost: window.location.hostname,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRef;
    if (!parsed.code) return null;
    return parsed;
  } catch {
    return null;
  }
}
