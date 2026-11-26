import assert from 'node:assert/strict';
import { test } from 'node:test';
import { userFacingAiError } from '../src/utils/userFacingError.ts';

test('provider failures have actionable messages without leaking raw diagnostics', () => {
  for (const [raw, expected] of [
    ['{"error":{"code":503,"status":"UNAVAILABLE"}}', /temporarily busy/],
    ['429 quota exceeded; secret=private', /usage limit/],
    ['request timed out at private-host', /could not be reached/],
    ['{"apiKey":"private","error":"internal"}', /could not be completed/],
  ] as const) {
    const message = userFacingAiError(raw);
    assert.match(message, expected);
    assert.match(message, /inputs are unchanged/);
    assert.doesNotMatch(message, /private|apiKey|\{"/);
  }
});
