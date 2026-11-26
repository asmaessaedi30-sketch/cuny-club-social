import assert from 'node:assert/strict';
import test from 'node:test';
import { integrationStatus } from '../src/utils/integrationStatus';
import type { SocialAccount } from '../src/types';

test('stored configuration never implies provider verification and Instagram stays simulated', () => {
  const account = { platform: 'Facebook Pages', connection: { status: 'Connected' } } as SocialAccount;
  assert.equal(integrationStatus(account).label, 'Simulation');
  assert.equal(integrationStatus({ ...account, hasLiveMetaToken: true }).label, 'Simulation');
  assert.equal(integrationStatus({ ...account, hasLiveMetaToken: true, metaPageId: '123' }).label, 'Configured · unverified');
  assert.equal(integrationStatus({ ...account, platform: 'Instagram Professional', hasLiveMetaToken: true, metaPageId: '123' }).label, 'Simulation');
  for (const status of ['Disconnected', 'Expired', 'Revoked', 'Pending Setup'] as const) {
    assert.equal(integrationStatus({ ...account, connection: { ...account.connection, status }, hasLiveMetaToken: true, metaPageId: '123' }).label, status);
  }
});
