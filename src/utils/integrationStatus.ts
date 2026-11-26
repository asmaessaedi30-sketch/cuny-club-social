import type { SocialAccount } from '../types';

// Configuration is evidence of setup, never evidence of provider authorization.
export function integrationStatus(account: Pick<SocialAccount, 'platform' | 'connection' | 'hasLiveMetaToken' | 'metaPageId'>) {
  if (account.connection.status !== 'Connected') {
    return { label: account.connection.status, detail: 'Publishing is unavailable. Ask the staff custodian to review the connection.' };
  }
  if (account.platform === 'Facebook Pages' && account.hasLiveMetaToken && account.metaPageId) {
    return { label: 'Configured · unverified', detail: 'A Page ID and token are stored. Live publishing may be attempted; provider authorization and delivery are not verified by this badge.' };
  }
  return { label: 'Simulation', detail: 'Publishing uses the Hub simulation for this account. No external post is created by this path.' };
}
