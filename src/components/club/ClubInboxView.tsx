import { useState } from 'react';
import { Flag, Info, MessageSquare, Send, Sparkles, Tag, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { ClubMembership, InboxMessage, InboxThreadTag, RoleName } from '../../types';

interface InboxMemberOption extends ClubMembership {
  name: string;
  email: string;
}

interface ClubInboxViewProps {
  clubId: string;
  effectiveRole: RoleName | null;
  messages: InboxMessage[];
  members?: InboxMemberOption[];
  onRefresh: () => Promise<void>;
}

const THREAD_TAGS: InboxThreadTag[] = ['Event Question', 'Join Inquiry', 'Escalation', 'General'];

const FAQ_SNIPPETS = [
  {
    label: 'How to Join Club',
    text: 'You can join directly in the CUNY SPS Club Social Hub under Campus Directory -> Request to Join using your @spsmail.cuny.edu account!',
  },
  {
    label: 'Zoom Accessibility & Captions',
    text: 'All virtual club events include live Zoom auto-captioning and slide transcripts. Let us know if you need additional accommodations via Student Life.',
  },
  {
    label: 'RSVP & Calendar .ics',
    text: 'Click RSVP on Upcoming Club Events or export our .ics feed inside Club Event Calendar so new meetings sync automatically.',
  },
  {
    label: 'Escalate to Student Life',
    text: 'Thank you for reaching out. We are escalating this inquiry to the CUNY SPS Office of Student Life (studentlife@sps.cuny.edu) for official follow-up.',
  },
];

export function ClubInboxView({
  clubId,
  effectiveRole,
  messages,
  members = [],
  onRefresh,
}: ClubInboxViewProps) {
  const { apiFetch } = useAuth();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [tagFilter, setTagFilter] = useState<'All' | InboxThreadTag>('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [aiBusyId, setAiBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const canAccessInbox =
    effectiveRole === 'SL_SUPER_ADMIN' ||
    effectiveRole === 'SL_ADMIN' ||
    effectiveRole === 'CLUB_LEAD' ||
    effectiveRole === 'EDITOR';

  const activeOfficers = members.filter((m) => m.status === 'Active' && m.role !== 'VIEWER');

  const handleReply = async (msgId: string) => {
    const replyText = replyDrafts[msgId]?.trim();
    if (!replyText) return;
    setBusyId(msgId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${clubId}/inbox/${msgId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ replyText }),
      });
      setFeedback('Official club reply sent and logged.');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reply.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateThread = async (
    msgId: string,
    updates: { assignedToUserId?: string | null; tag?: InboxThreadTag }
  ) => {
    setBusyId(msgId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${clubId}/inbox/${msgId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setFeedback('Inbox thread assignment/classification saved.');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update thread metadata.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAiDraft = async (msgId: string, faqSnippet?: string) => {
    setAiBusyId(msgId);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ draftReply: string; modelUsed?: string }>(
        `/api/clubs/${clubId}/inbox/${msgId}/ai-draft`,
        {
          method: 'POST',
          body: JSON.stringify({ faqSnippet }),
        }
      );
      setReplyDrafts((prev) => ({ ...prev, [msgId]: res.draftReply }));
      setFeedback(`Generated editable Gemini reply draft (${res.modelUsed ?? 'gemini-4-hydrogen'}). Review before sending.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate Gemini reply draft.');
    } finally {
      setAiBusyId(null);
    }
  };

  const handleToggleFlag = async (msgId: string) => {
    setBusyId(msgId);
    try {
      await apiFetch(`/api/clubs/${clubId}/inbox/${msgId}/flag`, { method: 'POST' });
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const visibleMessages = messages.filter(
    (m) => tagFilter === 'All' || (m.tag ?? 'General') === tagFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Unified Social Inbox & Comment Triage
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Assign incoming student inquiries to officers, classify by topic, insert Student Life FAQ snippets, and draft Gemini replies.
          </p>
        </div>
        {canAccessInbox && (
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="inbox-tag-filter" className="text-xs font-medium text-slate-600">
              Filter Tag:
            </label>
            <select
              id="inbox-tag-filter"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value as 'All' | InboxThreadTag)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700"
            >
              <option value="All">All Threads ({messages.length})</option>
              {THREAD_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t} ({messages.filter((m) => (m.tag ?? 'General') === t).length})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-4 h-4 text-[#004B87] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Authorized Messaging Access:</span>{' '}
          Only Club Leads, Editors, and Student Life Administrators may view, assign, and reply to
          social inbox threads. All AI-drafted replies require officer review prior to dispatch.
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {feedback && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {feedback}
        </div>
      )}

      {!canAccessInbox ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-600">
          Access restricted: Per PRD Section B4, only authorized Club Leads, Editors, and Student
          Life Administrators may view club messages.
        </div>
      ) : visibleMessages.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
          No incoming comments or messages match the selected tag filter.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {visibleMessages.map((msg) => (
            <div key={msg.messageId} className="p-5 space-y-3">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-900">{msg.senderName}</span>
                    <span>({msg.senderHandle})</span>
                    <span aria-hidden="true">·</span>
                    <span>{msg.platform}</span>
                    <span aria-hidden="true">·</span>
                    <span>{msg.channel}</span>
                    {msg.tag && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-medium text-[#004B87]">
                          <Tag className="w-3 h-3" />
                          <span>{msg.tag}</span>
                        </span>
                      </>
                    )}
                    {msg.assignedToName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                          <UserCheck className="w-3 h-3" />
                          <span>Assigned: {msg.assignedToName}</span>
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-slate-800">{msg.body}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    value={msg.tag ?? 'General'}
                    disabled={busyId === msg.messageId}
                    onChange={(e) =>
                      void handleUpdateThread(msg.messageId, {
                        tag: e.target.value as InboxThreadTag,
                      })
                    }
                    aria-label={`Thread category tag for ${msg.senderName}`}
                    className="px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-700"
                  >
                    {THREAD_TAGS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  <select
                    value={msg.assignedToUserId ?? ''}
                    disabled={busyId === msg.messageId}
                    onChange={(e) =>
                      void handleUpdateThread(msg.messageId, {
                        assignedToUserId: e.target.value || null,
                      })
                    }
                    aria-label={`Assign officer for ${msg.senderName}`}
                    className="px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-700"
                  >
                    <option value="">Unassigned Officer</option>
                    {activeOfficers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name} ({m.officerTitle ?? m.role})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={busyId === msg.messageId}
                    onClick={() => void handleToggleFlag(msg.messageId)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border cursor-pointer shrink-0 ${
                      msg.flagged
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    <span>{msg.flagged ? 'Flagged' : 'Flag'}</span>
                  </button>
                </div>
              </div>

              {msg.replied && msg.replyText ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-900">
                      Club Reply{msg.repliedByName ? ` (${msg.repliedByName})` : ''}:
                    </span>{' '}
                    {msg.replyText}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500 mr-1">
                      Student Life FAQ Snippets:
                    </span>
                    {FAQ_SNIPPETS.map((faq) => (
                      <button
                        key={faq.label}
                        type="button"
                        onClick={() =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [msg.messageId]: prev[msg.messageId]?.trim()
                              ? `${prev[msg.messageId].trim()} ${faq.text}`
                              : faq.text,
                          }))
                        }
                        className="px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded cursor-pointer"
                      >
                        + {faq.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={aiBusyId === msg.messageId}
                      onClick={() =>
                        void handleAiDraft(msg.messageId, replyDrafts[msg.messageId])
                      }
                      className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#004B87] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {aiBusyId === msg.messageId ? 'Drafting...' : 'Draft Reply with Gemini'}
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyDrafts[msg.messageId] ?? ''}
                      onChange={(e) =>
                        setReplyDrafts({ ...replyDrafts, [msg.messageId]: e.target.value })
                      }
                      placeholder="Write or refine an official club response..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                    />
                    <button
                      type="button"
                      disabled={busyId === msg.messageId || !(replyDrafts[msg.messageId] ?? '').trim()}
                      onClick={() => void handleReply(msg.messageId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send Reply</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

