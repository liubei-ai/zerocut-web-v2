export interface DesktopAuthorizeRequest {
  ak: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export type DesktopAuthorizeParseResult =
  | { ok: true; value: DesktopAuthorizeRequest }
  | { ok: false; error: string };

export function parseDesktopAuthorizeQuery(
  search: string,
  configuredAk: string,
): DesktopAuthorizeParseResult {
  if (!configuredAk) return { ok: false, error: 'Desktop OAuth is not configured.' };
  const params = new URLSearchParams(search);
  const ak = params.get('ak') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';
  const state = params.get('state') ?? '';
  const codeChallenge = params.get('code_challenge') ?? '';
  const method = params.get('code_challenge_method') ?? '';
  if (ak !== configuredAk) return { ok: false, error: 'Unknown Desktop application.' };
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(state)) {
    return { ok: false, error: 'Invalid OAuth state.' };
  }
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge) || method !== 'S256') {
    return { ok: false, error: 'Invalid PKCE request.' };
  }
  try {
    const callback = new URL(redirectUri);
    if (
      callback.protocol !== 'http:' ||
      callback.hostname !== '127.0.0.1' ||
      callback.port.length === 0 ||
      callback.pathname !== '/oauth/callback' ||
      callback.search ||
      callback.hash
    ) {
      return { ok: false, error: 'Invalid Desktop callback.' };
    }
  } catch {
    return { ok: false, error: 'Invalid Desktop callback.' };
  }
  return {
    ok: true,
    value: {
      ak,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
    },
  };
}

export function buildDesktopCallback(request: DesktopAuthorizeRequest, code: string): string {
  const callback = new URL(request.redirectUri);
  callback.searchParams.set('code', code);
  callback.searchParams.set('state', request.state);
  return callback.toString();
}
