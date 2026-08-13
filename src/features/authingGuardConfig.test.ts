import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAuthingGuardConfig } from './authingGuardConfig.ts';

test('omits host when no Authing domain is configured', () => {
  assert.deepEqual(buildAuthingGuardConfig('app-id', ''), { appId: 'app-id' });
});

test('includes host when an Authing domain is configured', () => {
  assert.deepEqual(buildAuthingGuardConfig('app-id', 'https://example.authing.cn'), {
    appId: 'app-id',
    host: 'https://example.authing.cn',
  });
});
