import type { Post } from '../src/types.ts';

export class DraftUpdateError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Only authoring fields may be changed here. Lifecycle and tenant fields have
// separate authorized endpoints and must never be assigned from a request body.
const editable = new Set(['title', 'caption', 'hashtags', 'callToAction', 'relatedEvent',
  'eventDate', 'targetAccountIds', 'platformAdaptations', 'mediaAsset', 'aiAssisted']);

export function updateDraft(post: Post, input: Record<string, unknown>, now = Date.now()): Post {
  if (typeof input.expectedUpdatedAt !== 'string') {
    throw new DraftUpdateError(428, 'Reopen this draft before saving so its latest version can be checked. Your edits have not been saved.');
  }
  if (input.expectedUpdatedAt !== post.updatedAt) {
    throw new DraftUpdateError(409, 'This post changed since you opened it. Your edits are still here. Save a copy or reopen the latest draft before trying again.');
  }
  if (post.status === 'Publishing' || post.status === 'Published') {
    throw new DraftUpdateError(409, 'This post is publishing or already published. Save your edits as a new draft.');
  }
  for (const key of Object.keys(input)) {
    if (key !== 'expectedUpdatedAt' && !editable.has(key)) {
      throw new DraftUpdateError(400, 'Only draft content can be changed here. Use the dedicated workflow for publication, scheduling, or ownership changes.');
    }
  }
  for (const key of ['title', 'caption']) {
    if (key in input && (typeof input[key] !== 'string' || !input[key].trim())) {
      throw new DraftUpdateError(400, 'Post title and caption text are required.');
    }
  }
  for (const key of ['callToAction', 'relatedEvent', 'eventDate']) {
    if (key in input && typeof input[key] !== 'string') throw new DraftUpdateError(400, 'Invalid draft text.');
  }
  for (const key of ['hashtags', 'targetAccountIds']) {
    if (key in input && (!Array.isArray(input[key]) || !(input[key] as unknown[]).every(v => typeof v === 'string'))) {
      throw new DraftUpdateError(400, 'Hashtags and target accounts must be lists of text values.');
    }
  }
  if ('aiAssisted' in input && typeof input.aiAssisted !== 'boolean') throw new DraftUpdateError(400, 'Invalid AI assistance flag.');
  const changes = Object.fromEntries(Object.entries(input).filter(([key]) => editable.has(key)));
  // A strictly newer timestamp also distinguishes saves within one millisecond.
  const updatedAt = new Date(Math.max(now, Date.parse(post.updatedAt) + 1)).toISOString();
  return { ...post, ...changes, updatedAt } as Post;
}
