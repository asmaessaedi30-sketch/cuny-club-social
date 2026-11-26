import { DataLoadState } from './DataLoadState';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AtSign,
  Bell,
  BellOff,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Share2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Club, ForumCategory, ForumThread, RoleName } from '../types';

interface ClubForumMemberOption {
  userId: string;
  name: string;
  roleLabel: string;
}

interface ClubForumsProps {
  clubs: Club[];
  activeClubId: string | null;
  effectiveRole?: RoleName | null;
  onRefreshParent?: () => Promise<void>;
}

const CATEGORIES: ForumCategory[] = ['Question', 'Discussion', 'Resource Share', 'Event Ideas'];

function getCategoryMeta(category: ForumCategory) {
  switch (category) {
    case 'Question':
      return { icon: HelpCircle, colorClass: 'text-[#004B87]' };
    case 'Resource Share':
      return { icon: Share2, colorClass: 'text-emerald-700' };
    case 'Event Ideas':
      return { icon: Lightbulb, colorClass: 'text-amber-700' };
    default:
      return { icon: MessageSquare, colorClass: 'text-slate-700' };
  }
}

function renderBodyWithMentions(text: string) {
  const parts = text.split(/(@[A-Za-z0-9._-]+(?:\s[A-Z][a-z]+)?)/g);
  return parts.map((part, idx) =>
    part.startsWith('@') ? (
      <span key={idx} className="font-semibold text-[#004B87]">
        {part}
      </span>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

export function ClubForums({ clubs, activeClubId, onRefreshParent }: ClubForumsProps) {
  const { session, apiFetch } = useAuth();
  const [selectedClubId, setSelectedClubId] = useState<string>(
    activeClubId || clubs[0]?.clubId || ''
  );
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubForumMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [categoryFilter, setCategoryFilter] = useState<'All' | ForumCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pinned' | 'unresolved' | 'subscribed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ForumCategory>('Question');
  const [newBody, setNewBody] = useState('');
  const [submittingThread, setSubmittingThread] = useState(false);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [busyThreadId, setBusyThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (activeClubId && clubs.some((c) => c.clubId === activeClubId)) {
      setSelectedClubId(activeClubId);
    } else if (!selectedClubId && clubs.length > 0) {
      setSelectedClubId(clubs[0].clubId);
    }
  }, [activeClubId, clubs, selectedClubId]);

  const loadForumThreads = useCallback(async () => {
    if (!selectedClubId) {
      setThreads([]);
      setClubMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiFetch<{
        threads: ForumThread[];
        clubMembers?: ClubForumMemberOption[];
      }>(`/api/clubs/${selectedClubId}/forum`);
      setThreads(res.threads);
      setClubMembers(res.clubMembers ?? []);
      setExpandedThreadId((prev) =>
        prev && res.threads.some((t) => t.threadId === prev)
          ? prev
          : res.threads[0]?.threadId ?? null
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load club forum threads.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedClubId]);

  useEffect(() => {
    setLoading(true);
    void loadForumThreads();
  }, [loadForumThreads]);

  const selectedClub = clubs.find((c) => c.clubId === selectedClubId);

  const isModeratorForClub = Boolean(
    session?.effectiveAdminRole ||
      session?.memberships.some(
        (m) =>
          m.clubId === selectedClubId &&
          m.status === 'Active' &&
          (m.role === 'CLUB_LEAD' || m.role === 'EDITOR')
      )
  );

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubId) return;
    setSubmittingThread(true);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ thread: ForumThread }>(`/api/clubs/${selectedClubId}/forum`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          body: newBody,
        }),
      });
      setNewTitle('');
      setNewBody('');
      setShowNewForm(false);
      setFeedback(`Started discussion thread "${res.thread.title}".`);
      await loadForumThreads();
      setExpandedThreadId(res.thread.threadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start forum thread.');
    } finally {
      setSubmittingThread(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent, thread: ForumThread) => {
    e.preventDefault();
    const draft = (replyDrafts[thread.threadId] ?? '').trim();
    if (!draft) return;
    setReplyingId(thread.threadId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${thread.clubId}/forum/${thread.threadId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ body: draft }),
      });
      setReplyDrafts((prev) => ({ ...prev, [thread.threadId]: '' }));
      setFeedback(`Posted reply to "${thread.title}". Any @mentioned members and subscribers were notified.`);
      await loadForumThreads();
      setExpandedThreadId(thread.threadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post reply.');
    } finally {
      setReplyingId(null);
    }
  };

  const handleTogglePin = async (thread: ForumThread) => {
    setBusyThreadId(thread.threadId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${thread.clubId}/forum/${thread.threadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ pinned: !thread.pinned }),
      });
      setFeedback(
        !thread.pinned
          ? `Pinned "${thread.title}" to top of ${selectedClub?.shortCode ?? 'club'} forum.`
          : `Unpinned "${thread.title}".`
      );
      await loadForumThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update pin state.');
    } finally {
      setBusyThreadId(null);
    }
  };

  const handleToggleResolved = async (thread: ForumThread) => {
    setBusyThreadId(thread.threadId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${thread.clubId}/forum/${thread.threadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved: !thread.resolved }),
      });
      setFeedback(
        !thread.resolved
          ? `Marked "${thread.title}" as resolved.`
          : `Reopened "${thread.title}".`
      );
      await loadForumThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update resolved status.');
    } finally {
      setBusyThreadId(null);
    }
  };

  const handleToggleSubscribe = async (thread: ForumThread) => {
    setBusyThreadId(thread.threadId);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ subscribed: boolean }>(
        `/api/clubs/${thread.clubId}/forum/${thread.threadId}/subscribe`,
        { method: 'POST' }
      );
      setFeedback(
        res.subscribed
          ? `Subscribed to replies in "${thread.title}".`
          : `Unsubscribed from "${thread.title}".`
      );
      await loadForumThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update thread subscription.');
    } finally {
      setBusyThreadId(null);
    }
  };

  const handlePromoteThread = async (thread: ForumThread, targetType: 'event' | 'task') => {
    setBusyThreadId(thread.threadId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${thread.clubId}/forum/${thread.threadId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ targetType }),
      });
      setFeedback(
        targetType === 'event'
          ? `Promoted "${thread.title}" to a scheduled Upcoming Club Event.`
          : `Promoted "${thread.title}" to a Club Project Task.`
      );
      await loadForumThreads();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to promote thread to ${targetType}.`);
    } finally {
      setBusyThreadId(null);
    }
  };

  const handleDeleteThread = async (thread: ForumThread) => {
    setBusyThreadId(thread.threadId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${thread.clubId}/forum/${thread.threadId}`, {
        method: 'DELETE',
      });
      setFeedback(`Deleted thread "${thread.title}".`);
      await loadForumThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete thread.');
    } finally {
      setBusyThreadId(null);
    }
  };

  const myUserId = session?.user.userId ?? '';

  const visibleThreads = threads.filter((t) => {
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
    if (statusFilter === 'pinned' && !t.pinned) return false;
    if (statusFilter === 'unresolved' && t.resolved) return false;
    if (statusFilter === 'subscribed' && !(t.subscriberUserIds ?? []).includes(myUserId)) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q) ||
      t.authorName.toLowerCase().includes(q) ||
      t.replies.some((r) => r.body.toLowerCase().includes(q) || r.authorName.toLowerCase().includes(q))
    );
  });

  if (clubs.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
        You do not currently belong to an authorized student club workspace.
      </section>
    );
  }

  if (loading || loadError) return <DataLoadState label="forum threads" loading={loading} error={loadError} onRetry={() => void loadForumThreads()} />;

  return (
    <section
      aria-label="Club Forums"
      className="bg-white border border-slate-200 rounded-lg overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#004B87] shrink-0" />
            <h1 className="text-base font-bold text-slate-900">
              Club Forums{selectedClub ? ` — ${selectedClub.name}` : ''}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
            {threads.length} discussion thread{threads.length === 1 ? '' : 's'} · Supports @member
            mentions, thread subscriptions &amp; event/task promotion
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {clubs.length > 1 && (
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              aria-label="Select club forum"
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 font-medium"
            >
              {clubs.map((c) => (
                <option key={c.clubId} value={c.clubId}>
                  {c.name} ({c.shortCode})
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threads or @mentions..."
              aria-label="Search club forum threads"
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setError('');
              setShowNewForm((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showNewForm ? 'Close Form' : 'Start Thread'}</span>
          </button>
        </div>
      </div>

      {/* Category & Status Filter Bar */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('All')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              categoryFilter === 'All'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Topics ({threads.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = threads.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md w-fit">
          {(
            [
              ['all', 'All'],
              ['pinned', 'Pinned'],
              ['unresolved', 'Unresolved'],
              ['subscribed', 'Subscribed'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-5 mt-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md"
        >
          {error}
        </div>
      )}

      {feedback && (
        <div className="mx-5 mt-4 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {feedback}
        </div>
      )}

      {showNewForm && (
        <form
          onSubmit={handleCreateThread}
          className="p-5 bg-slate-50/70 border-b border-slate-200 space-y-4"
        >
          <div className="text-xs font-semibold text-slate-900">
            Start a New Discussion Thread in {selectedClub?.name ?? 'Club Forum'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Thread Title / Question
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Looking for teammates for the Spring Civic Tech Showcase"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Topic Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ForumCategory)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="block text-[11px] font-medium text-slate-700">
                Details &amp; Context (type @Name to notify a club member)
              </label>
              <textarea
                rows={3}
                required
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Ask a question, tag @member, share resources, or propose a club event..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
              {clubMembers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <AtSign className="w-3.5 h-3.5 text-[#004B87]" />
                  <span>Mention member:</span>
                  {clubMembers.map((m) => (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() =>
                        setNewBody((prev) =>
                          prev ? `${prev.trimEnd()} @${m.name} ` : `@${m.name} `
                        )
                      }
                      className="px-2 py-0.5 text-[11px] font-medium text-[#004B87] bg-white border border-slate-200 hover:border-[#004B87] rounded cursor-pointer"
                    >
                      @{m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingThread}
              className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              {submittingThread ? 'Posting Thread...' : 'Post Thread'}
            </button>
          </div>
        </form>
      )}

      {visibleThreads.length === 0 ? (
        <div className="p-8 text-center space-y-2">
          <div className="text-sm font-medium text-slate-800">
            {threads.length === 0 ? 'No forum threads yet' : 'No forum threads match the current filter'}
          </div>
          <p className="text-xs text-slate-500">
            Try clearing your search and category filters, or use Start Thread to start a discussion if your role allows it.
          </p>
          <button type="button" onClick={() => { setSearchQuery(''); setCategoryFilter('All'); setStatusFilter('all'); }} className="text-xs text-[#004B87] underline">Clear forum search and category</button>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {visibleThreads.map((thread) => {
            const catMeta = getCategoryMeta(thread.category);
            const CategoryIcon = catMeta.icon;
            const isExpanded = expandedThreadId === thread.threadId;
            const isAuthor = thread.authorId === session?.user.userId;
            const isBusy = busyThreadId === thread.threadId;
            const isSubscribed = (thread.subscriberUserIds ?? []).includes(myUserId);

            return (
              <div key={thread.threadId} className="transition-colors">
                <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedThreadId(isExpanded ? null : thread.threadId)
                    }
                    className="text-left min-w-0 flex-1 space-y-1 cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${catMeta.colorClass}`}
                      >
                        <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{thread.category}</span>
                      </span>

                      {thread.pinned && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                            <Pin className="w-3 h-3 shrink-0" />
                            <span>Pinned</span>
                          </span>
                        </>
                      )}

                      {thread.resolved && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Resolved</span>
                          </span>
                        </>
                      )}

                      {thread.promotedEventId && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-medium text-[#004B87]">
                            Promoted → Event ({thread.promotedEventId})
                          </span>
                        </>
                      )}

                      {thread.promotedTaskId && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-medium text-emerald-700">
                            Promoted → Task ({thread.promotedTaskId})
                          </span>
                        </>
                      )}

                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-600">
                        {thread.authorName} ({thread.authorRoleLabel})
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono-tabular text-slate-500">
                        {new Date(thread.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-900">{thread.title}</div>

                    {!isExpanded && (
                      <p className="text-xs text-slate-600 line-clamp-2">{thread.body}</p>
                    )}
                  </button>

                  <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleToggleSubscribe(thread)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap cursor-pointer ${
                        isSubscribed
                          ? 'bg-sky-50 border-[#004B87] text-[#004B87]'
                          : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isSubscribed ? (
                        <>
                          <Bell className="w-3.5 h-3.5" />
                          <span>Subscribed</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="w-3.5 h-3.5" />
                          <span>Subscribe</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedThreadId(isExpanded ? null : thread.threadId)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono-tabular">{thread.replies.length}</span>
                      <span>{thread.replies.length === 1 ? 'reply' : 'replies'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line max-w-4xl">
                        {renderBodyWithMentions(thread.body)}
                      </p>

                      {(isModeratorForClub || isAuthor) && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {isModeratorForClub && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handlePromoteThread(thread, 'event')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                <span>Promote to Event</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handlePromoteThread(thread, 'task')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                              >
                                <ListChecks className="w-3.5 h-3.5" />
                                <span>Promote to Task</span>
                              </button>
                            </>
                          )}

                          {thread.category === 'Question' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleToggleResolved(thread)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>{thread.resolved ? 'Reopen Question' : 'Mark Resolved'}</span>
                            </button>
                          )}

                          {isModeratorForClub && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleTogglePin(thread)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                            >
                              {thread.pinned ? (
                                <>
                                  <PinOff className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Unpin</span>
                                </>
                              ) : (
                                <>
                                  <Pin className="w-3.5 h-3.5 text-[#004B87]" />
                                  <span>Pin</span>
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDeleteThread(thread)}
                            aria-label={`Delete thread ${thread.title}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-red-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Replies */}
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <div className="text-[11px] font-semibold text-slate-600 font-mono-tabular">
                        Replies ({thread.replies.length}) · {(thread.subscriberUserIds ?? []).length} subscriber(s)
                      </div>

                      {thread.replies.length === 0 ? (
                        <div className="text-xs text-slate-500">
                          No replies yet. Be the first club member to respond below.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-md">
                          {thread.replies.map((rep) => (
                            <div key={rep.replyId} className="px-4 py-3 space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-900">
                                  {rep.authorName}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{rep.authorRoleLabel}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono-tabular">
                                  {new Date(rep.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                {renderBodyWithMentions(rep.body)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {clubMembers.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          <AtSign className="w-3 h-3 text-[#004B87]" />
                          <span>Tag member in reply:</span>
                          {clubMembers.map((m) => (
                            <button
                              key={m.userId}
                              type="button"
                              onClick={() =>
                                setReplyDrafts((prev) => {
                                  const existing = prev[thread.threadId] ?? '';
                                  return {
                                    ...prev,
                                    [thread.threadId]: existing
                                      ? `${existing.trimEnd()} @${m.name} `
                                      : `@${m.name} `,
                                  };
                                })
                              }
                              className="px-2 py-0.5 text-[11px] font-medium text-[#004B87] bg-white border border-slate-200 hover:border-[#004B87] rounded cursor-pointer"
                            >
                              @{m.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => void handlePostReply(e, thread)}
                        className="flex flex-col sm:flex-row gap-2 pt-1"
                      >
                        <input
                          type="text"
                          required
                          value={replyDrafts[thread.threadId] ?? ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [thread.threadId]: e.target.value,
                            }))
                          }
                          placeholder={`Reply as ${session?.user.name ?? 'club member'} (use @Name to mention)...`}
                          aria-label={`Reply to ${thread.title}`}
                          className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                        />
                        <button
                          type="submit"
                          disabled={replyingId === thread.threadId}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {replyingId === thread.threadId ? 'Posting...' : 'Post Reply'}
                          </span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

