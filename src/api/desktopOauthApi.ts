import axios from 'axios';

import { getUserAPIPrefix } from './client';

export async function issueDesktopAuthorizationCode(input: {
  ak: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}): Promise<{ code: string }> {
  const base = getUserAPIPrefix().replace(/\/$/, '');
  const response = await axios.post<{ code: string }>(`${base}/oauth/code`, input, {
    withCredentials: true,
    timeout: 15_000,
  });
  return response.data;
}
