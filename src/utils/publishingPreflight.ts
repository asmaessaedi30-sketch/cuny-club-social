import type { MediaAsset, SocialAccount } from '../types.ts';
import { integrationStatus } from './integrationStatus.ts';

export function publishingPreflight(input: { title: string; caption: string; targetAccountIds: string[]; mediaAsset?: MediaAsset }, accounts: SocialAccount[]) {
  const errors: string[] = [];
  const ids = [...new Set(input.targetAccountIds)];
  if (!input.title.trim()) errors.push('Add an internal post title.');
  if (!input.caption.trim()) errors.push('Add post copy.');
  if (!ids.length) errors.push('Select at least one destination account.');
  const destinations = ids.flatMap(id => {
    const account = accounts.find(item => item.accountId === id);
    if (!account) { errors.push('A selected account is no longer available. Choose destinations again.'); return []; }
    if (account.connection.status !== 'Connected' || !account.publishingSupported) errors.push(`${account.handle}: publishing is unavailable. Review My Social Accounts.`);
    if (account.platform === 'Instagram Professional' && !input.mediaAsset) errors.push(`${account.handle}: add an image for Instagram.`);
    return [`${account.handle} (${account.platform}) — ${integrationStatus(account).label}`];
  });
  if (input.mediaAsset) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(input.mediaAsset.mimeType)) errors.push('Use a JPEG, PNG, or WebP image for this composer.');
    if (!input.mediaAsset.altText?.trim()) errors.push('Add descriptive alt text for the image.');
  }
  return { errors: [...new Set(errors)], destinations };
}
