import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDesktopAuthorizeQuery } from './desktopAuthorize.ts';

const challenge = 'a'.repeat(43);

test('accepts the configured desktop client and random loopback port', () => {
  const result = parseDesktopAuthorizeQuery(
    `?ak=desktop1&redirect_uri=${encodeURIComponent('http://127.0.0.1:49152/oauth/callback')}&state=state-1234567890&code_challenge=${challenge}&code_challenge_method=S256`,
    'desktop1',
  );
  assert.equal(result.ok, true);
});

test('rejects a wrong client, host, path, or PKCE method', () => {
  const invalidQueries = [
    `?ak=other001&redirect_uri=${encodeURIComponent('http://127.0.0.1:49152/oauth/callback')}&state=state-1234567890&code_challenge=${challenge}&code_challenge_method=S256`,
    `?ak=desktop1&redirect_uri=${encodeURIComponent('http://localhost:49152/oauth/callback')}&state=state-1234567890&code_challenge=${challenge}&code_challenge_method=S256`,
    `?ak=desktop1&redirect_uri=${encodeURIComponent('http://127.0.0.1:49152/evil')}&state=state-1234567890&code_challenge=${challenge}&code_challenge_method=S256`,
    `?ak=desktop1&redirect_uri=${encodeURIComponent('http://127.0.0.1:49152/oauth/callback')}&state=short&code_challenge=${challenge}&code_challenge_method=S256`,
    `?ak=desktop1&redirect_uri=${encodeURIComponent('http://127.0.0.1:49152/oauth/callback')}&state=state-1234567890&code_challenge=short&code_challenge_method=S256`,
    `?ak=desktop1&redirect_uri=${encodeURIComponent('http://127.0.0.1:49152/oauth/callback')}&state=state-1234567890&code_challenge=${challenge}&code_challenge_method=plain`,
  ];
  for (const query of invalidQueries) {
    assert.equal(parseDesktopAuthorizeQuery(query, 'desktop1').ok, false);
  }
});
