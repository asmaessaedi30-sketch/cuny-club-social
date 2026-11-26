import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationText, searchWorkspacePages } from '../src/utils/workspacePresentation';
import { publishingPreflight } from '../src/utils/publishingPreflight';
import type { MediaAsset, SocialAccount } from '../src/types';

test('legacy reminder claims are qualified without rewriting unrelated or verified state text', () => {
  assert.match(notificationText('Meeting. Email reminder sent to test@example.edu.'), /recorded for test@example.edu; delivery is unverified/);
  assert.equal(notificationText('delivery status: Delivered (SMTP)'), 'delivery status: Delivered (SMTP)');
});
test('search uses aliases, multiple terms and only supplied portal pages', () => {
  const pages = [{id:'create-post',label:'Create Post',section:'Social Publishing'}, {id:'member-directory',label:'Member Directory'}];
  assert.equal(searchWorkspacePages(pages, 'social draft')[0].id, 'create-post');
  assert.equal(searchWorkspacePages(pages, 'roster')[0].id, 'member-directory');
  assert.deepEqual(searchWorkspacePages(pages, 'admin secrets'), []);
  assert.deepEqual(searchWorkspacePages(pages, '   '), []);
});
test('preflight rejects unavailable accounts and missing image accessibility while exposing simulation', () => {
  const account = {accountId:'a',handle:'@test',platform:'Instagram Professional',publishingSupported:true,connection:{status:'Connected'}} as SocialAccount;
  const input = {title:'Title',caption:'Copy',targetAccountIds:['a']};
  assert.match(publishingPreflight(input,[account]).errors.join(), /image for Instagram/);
  const mediaAsset = {mimeType:'image/png',altText:'Descriptive image'} as MediaAsset;
  assert.deepEqual(publishingPreflight({...input,mediaAsset},[account]).errors, []);
  assert.match(publishingPreflight({...input,mediaAsset},[account]).destinations[0], /Simulation/);
  assert.match(publishingPreflight({...input,mediaAsset:{...mediaAsset,altText:' '}},[account]).errors.join(), /alt text/);
  assert.match(publishingPreflight(input,[]).errors.join(), /no longer available/);
  assert.match(publishingPreflight(input,[{...account,connection:{...account.connection,status:'Expired'}}]).errors.join(), /unavailable/);
});
