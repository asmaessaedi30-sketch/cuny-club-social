import assert from 'node:assert/strict';
import test from 'node:test';
import { DraftUpdateError, updateDraft } from '../server/draftUpdates.ts';
import type { Post } from '../src/types.ts';

const fixture = (): Post => ({postId:'p', clubId:'club-a', title:'Original', caption:'Café 🎉', hashtags:[], authorId:'author', authorName:'Author', status:'Draft', targetAccountIds:[], createdAt:'2026-11-16T12:00:00.000Z', updatedAt:'2026-11-16T12:00:00.000Z', aiAssisted:false, aiReviewedByHuman:true, publishAttempts:[]});
const status = (code: number) => (err: unknown) => err instanceof DraftUpdateError && err.status === code;

test('two editors cannot silently overwrite a newer save, even in the same millisecond', () => {
  const original = fixture();
  const editorA = updateDraft(original, {expectedUpdatedAt:original.updatedAt, caption:'First editor'}, Date.parse(original.updatedAt));
  assert.notEqual(editorA.updatedAt, original.updatedAt);
  assert.throws(() => updateDraft(editorA, {expectedUpdatedAt:original.updatedAt,caption:'Stale editor'}), status(409));
  assert.equal(editorA.caption, 'First editor');
  assert.equal(original.caption, 'Café 🎉');
  const editorB = updateDraft(editorA, {expectedUpdatedAt:editorA.updatedAt,caption:'Reviewed latest'});
  assert.equal(editorB.caption, 'Reviewed latest');
});

test('missing version and attempts to change tenant, author or lifecycle are rejected without mutation', () => {
  const post = fixture();
  assert.throws(() => updateDraft(post, {caption:'No version'}), status(428));
  for (const field of ['clubId','postId','authorId','status','publishAttempts','updatedAt','scheduledAt','aiReviewedByHuman']) {
    assert.throws(() => updateDraft(post, {expectedUpdatedAt:post.updatedAt,[field]:'forged'}), status(400));
  }
  assert.deepEqual(post, fixture());
});

test('invalid authoring payloads and active/completed publication cannot be edited as drafts', () => {
  const post = fixture();
  for (const fields of [{title:' '},{caption:2},{hashtags:'invalid'},{targetAccountIds:[1]},{aiAssisted:'yes'}]) {
    assert.throws(() => updateDraft(post,{expectedUpdatedAt:post.updatedAt,...fields}), status(400));
  }
  for (const lifecycle of ['Publishing','Published'] as const) {
    assert.throws(() => updateDraft({...post,status:lifecycle},{expectedUpdatedAt:post.updatedAt,caption:'new'}), status(409));
  }
});
