import { DataLoadState } from '../DataLoadState';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Pin,
  Search,
  Send,
  Unlock,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type {
  BroadcastChannel,
  BroadcastPriority,
  ClubBroadcastMessage,
  RoleName,
  WhatsAppGroupLink,
} from '../../types';

interface MessagingRecipient {
  userId: string;
  name: string;
  email: string;
  officerTitle: string;
  role: RoleName;
}

interface MessagingCenterPayload {
  club: {
    clubId: string;
    name: string;
    shortCode: string;
    category: string;
    status: string;
  };
  broadcasts: ClubBroadcastMessage[];
  whatsappGroups: WhatsAppGroupLink[];
  activeMembers: MessagingRecipient[];
  activeMembersCount: number;
  canBroadcast: boolean;
  canReply: boolean;
}

interface ClubMessagingCenterProps {
  clubId: string;
  clubName?: string;
  clubShortCode?: string;
  variant?: 'dashboard' | 'full' | 'directory';
  defaultOpenComposer?: boolean;
  clubOptions?: { clubId: string; name: string; shortCode: string }[];
  onSelectClub?: (clubId: string) => void;
  onOpenFullView?: () => void;
  onRefreshParent?: () => Promise<void>;
}

function channelLabel(channel: BroadcastChannel): string {
  if (channel === 'both') return 'Internal Alert + WhatsApp';
  if (channel === 'whatsapp') return 'WhatsApp Link';
  return 'Internal Club Alert';
}

function priorityColorClass(priority: BroadcastPriority): string {
  if (priority === 'Urgent') return 'text-red-700 font-semibold';
  if (priority === 'Important') return 'text-amber-700 font-semibold';
  return 'text-slate-600 font-medium';
}

export function ClubMessagingCenter({
  clubId,
  clubName,
  clubShortCode,
  variant = 'full',
  defaultOpenComposer = false,
  clubOptions,
  onSelectClub,
  onOpenFullView,
  onRefreshParent,
}: ClubMessagingCenterProps) {
  const { apiFetch } = useAuth();
  const [payload, setPayload] = useState<MessagingCenterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Composer state
  const [showComposer, setShowComposer] = useState(
    defaultOpenComposer || variant === 'full' || variant === 'directory'
  );
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<BroadcastChannel>('both');
  const [priority, setPriority] = useState<BroadcastPriority>('Standard');
  const [whatsappGroupId, setWhatsappGroupId] = useState('');
  const [pinned, setPinned] = useState(false);
  const [allowMemberReplies, setAllowMemberReplies] = useState(true);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [lastDispatchLinks, setLastDispatchLinks] = useState<{
    title: string;
    shareUrl?: string;
    inviteLink?: string;
    groupName?: string;
  } | null>(null);

  // Filter / recipient inspection state
  const [showRecipients, setShowRecipients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'pinned' | 'whatsapp' | 'internal'>('all');

  // Reply drafts per broadcastId
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadMessagingCenter = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiFetch<MessagingCenterPayload>(
        `/api/clubs/${clubId}/messaging-center`
      );
      setPayload(data);
      if (data.whatsappGroups.length > 0) {
        setWhatsappGroupId((prev) =>
          data.whatsappGroups.some((g) => g.groupId === prev)
            ? prev
            : data.whatsappGroups[0].groupId
        );
      } else {
        setWhatsappGroupId('');
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Unable to load club messaging center.'
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch, clubId]);

  useEffect(() => {
    setLoading(true);
    setLastDispatchLinks(null);
    setShowRecipients(false);
    void loadMessagingCenter();
  }, [loadMessagingCenter]);

  const handleCopyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 2000);
    } catch {
      setNotice('Copy link manually from the WhatsApp URL field.');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSendingBroadcast(true);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch<{ broadcast: ClubBroadcastMessage }>(
        `/api/clubs/${clubId}/messaging-center/broadcasts`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            channel,
            priority,
            whatsappGroupId: whatsappGroupId || undefined,
            pinned,
            allowMemberReplies,
          }),
        }
      );
      const created = res.broadcast;
      setTitle('');
      setBody('');
      setPinned(false);
      setPriority('Standard');
      setAllowMemberReplies(true);
      setLastDispatchLinks({
        title: created.title,
        shareUrl: created.whatsappShareUrl,
        inviteLink: created.whatsappInviteLink,
        groupName: created.whatsappGroupName,
      });
      setNotice(
        created.channel === 'whatsapp'
          ? `WhatsApp broadcast "${created.title}" prepared for ${created.recipientCount} club members.`
          : `Broadcast "${created.title}" delivered to ${created.recipientCount} active club members.`
      );
      await loadMessagingCenter();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send club broadcast.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent, broadcastId: string) => {
    e.preventDefault();
    const draft = (replyDrafts[broadcastId] ?? '').trim();
    if (!draft) return;
    setReplyingId(broadcastId);
    setError('');
    setNotice('');
    try {
      await apiFetch(
        `/api/clubs/${clubId}/messaging-center/broadcasts/${broadcastId}/replies`,
        {
          method: 'POST',
          body: JSON.stringify({ body: draft }),
        }
      );
      setReplyDrafts((prev) => ({ ...prev, [broadcastId]: '' }));
      setNotice('Your reply was posted to the club workspace thread.');
      await loadMessagingCenter();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post reply.');
    } finally {
      setReplyingId(null);
    }
  };

  const handleToggleBroadcastFlag = async (
    b: ClubBroadcastMessage,
    updates: { pinned?: boolean; allowMemberReplies?: boolean }
  ) => {
    setUpdatingId(b.broadcastId);
    setError('');
    try {
      await apiFetch(
        `/api/clubs/${clubId}/messaging-center/broadcasts/${b.broadcastId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }
      );
      await loadMessagingCenter();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update broadcast setting.');
    } finally {
      setUpdatingId(null);
    }
  };

  const broadcasts = payload?.broadcasts ?? [];
  const whatsappGroups = payload?.whatsappGroups ?? [];
  const activeMembers = payload?.activeMembers ?? [];
  const activeMembersCount = payload?.activeMembersCount ?? activeMembers.length;
  const canBroadcast = Boolean(payload?.canBroadcast);
  const canReply = Boolean(payload?.canReply);

  const resolvedClubName = payload?.club.name ?? clubName ?? 'Club Workspace';
  const resolvedShortCode = payload?.club.shortCode ?? clubShortCode ?? 'CLUB';

  const filteredBroadcasts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return broadcasts.filter((b) => {
      if (channelFilter === 'pinned' && !b.pinned) return false;
      if (
        channelFilter === 'whatsapp' &&
        b.channel !== 'whatsapp' &&
        b.channel !== 'both'
      ) {
        return false;
      }
      if (
        channelFilter === 'internal' &&
        b.channel !== 'internal' &&
        b.channel !== 'both'
      ) {
        return false;
      }
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.body.toLowerCase().includes(q) ||
        b.senderName.toLowerCase().includes(q) ||
        b.replies.some(
          (r) =>
            r.body.toLowerCase().includes(q) ||
            r.authorName.toLowerCase().includes(q)
        )
      );
    });
  }, [broadcasts, channelFilter, searchQuery]);

  const displayedBroadcasts =
    variant === 'dashboard' ? filteredBroadcasts.slice(0, 3) : filteredBroadcasts;

  const selectedGroup = whatsappGroups.find((g) => g.groupId === whatsappGroupId);

  if (loading || loadError) return <DataLoadState label="messages" loading={loading} error={loadError} onRetry={() => void loadMessagingCenter()} />;

  return (
    <section
      aria-label={`${resolvedClubName} Integrated Messaging Center`}
      className="bg-white border border-slate-200 rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#004B87] shrink-0" />
            <h2 className="text-sm font-bold text-slate-900">
              {variant === 'directory'
                ? `Integrated Club Messaging Center · ${resolvedClubName}`
                : 'Club Messaging Center'}
            </h2>
            <span className="text-xs font-mono text-slate-500">
              ({resolvedShortCode})
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {canBroadcast
              ? 'Broadcast announcements to all active club members via internal workspace alerts or WhatsApp links. Members can reply directly inside this club workspace.'
              : `View official broadcasts from ${resolvedShortCode} officers and reply directly within your club workspace.`}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular text-slate-500 mt-1.5">
            <span>{activeMembersCount} active members</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>{whatsappGroups.length} WhatsApp group(s) linked</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>{broadcasts.length} broadcasts</span>
            {activeMembers.length > 0 && (
              <>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setShowRecipients((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[#004B87] font-sans font-medium hover:underline cursor-pointer"
                >
                  <Users className="w-3 h-3" />
                  <span>{showRecipients ? 'Hide Member Recipients' : 'View Member Recipients'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {clubOptions && clubOptions.length > 1 && onSelectClub && (
            <select
              aria-label="Select Club Messaging Workspace"
              value={clubId}
              onChange={(e) => onSelectClub(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
            >
              {clubOptions.map((opt) => (
                <option key={opt.clubId} value={opt.clubId}>
                  {opt.name} ({opt.shortCode})
                </option>
              ))}
            </select>
          )}
          {canBroadcast && (
            <button
              type="button"
              onClick={() => setShowComposer((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{showComposer ? 'Hide Composer' : 'New Broadcast'}</span>
            </button>
          )}
          {variant === 'dashboard' && onOpenFullView && (
            <button
              type="button"
              onClick={onOpenFullView}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Open Full Messaging Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Active Member Recipients Drawer */}
      {showRecipients && activeMembers.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Club-Scoped Recipient Roster ({activeMembers.length} active {resolvedShortCode} members)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
            {activeMembers.map((m) => (
              <div key={m.userId} className="truncate text-slate-700">
                <span className="font-semibold text-slate-900">{m.name}</span>
                <span className="text-slate-400 mx-1">·</span>
                <span>{m.officerTitle}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div role="alert" className="mx-5 mt-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {notice && (
        <div className="mx-5 mt-4 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {notice}
        </div>
      )}

      {/* Post-Send WhatsApp Dispatch Banner */}
      {lastDispatchLinks && (lastDispatchLinks.shareUrl || lastDispatchLinks.inviteLink) && (
        <div className="mx-5 mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-emerald-950">
            <span className="font-semibold">WhatsApp Share Ready:</span>{' '}
            &ldquo;{lastDispatchLinks.title}&rdquo;
            {lastDispatchLinks.groupName ? ` · Target Group: ${lastDispatchLinks.groupName}` : ''}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {lastDispatchLinks.shareUrl && (
              <a
                href={lastDispatchLinks.shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md whitespace-nowrap"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Open in WhatsApp Now</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {lastDispatchLinks.inviteLink && (
              <button
                type="button"
                onClick={() =>
                  void handleCopyText('last-invite', lastDispatchLinks.inviteLink!)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-md whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'last-invite' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Invite Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Group Invite Link</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leader Broadcast Composer */}
      {canBroadcast && showComposer && (
        <form
          onSubmit={handleSendBroadcast}
          className="p-5 border-b border-slate-200 bg-slate-50/40 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Compose Broadcast to All {resolvedShortCode} Members
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Deliver an internal workspace notification, a formatted WhatsApp broadcast link, or both simultaneously.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md w-fit">
              {(
                [
                  { id: 'both', label: 'Both Channels' },
                  { id: 'internal', label: 'Internal Alert' },
                  { id: 'whatsapp', label: 'WhatsApp Link' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChannel(opt.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                    channel === opt.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Announcement Subject / Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., ${resolvedShortCode} General Body Meeting & Room Update`}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as BroadcastPriority)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              >
                <option value="Standard">Standard</option>
                <option value="Important">Important</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {(channel === 'whatsapp' || channel === 'both') && (
            <div className="p-3 bg-white border border-slate-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Linked WhatsApp Group Target
                </label>
                {whatsappGroups.length > 0 ? (
                  <select
                    value={whatsappGroupId}
                    onChange={(e) => setWhatsappGroupId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  >
                    {whatsappGroups.map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        {g.groupName} ({g.groupCategory})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500">
                    No WhatsApp group linked yet. A 1-click <span className="font-mono">wa.me</span> share link will still be generated for your message.
                  </p>
                )}
              </div>
              {selectedGroup?.inviteLink && (
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <a
                    href={selectedGroup.inviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Open Group</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyText('composer-invite', selectedGroup.inviteLink)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    {copiedKey === 'composer-invite' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Invite</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Broadcast Message
            </label>
            <textarea
              rows={3}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement, Zoom/event details, or action item for club members..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="rounded border-slate-300 text-[#004B87] focus:ring-[#004B87]"
                />
                <span>Pin to top of club workspace</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMemberReplies}
                  onChange={(e) => setAllowMemberReplies(e.target.checked)}
                  className="rounded border-slate-300 text-[#004B87] focus:ring-[#004B87]"
                />
                <span>Allow member replies in {resolvedShortCode} workspace</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={sendingBroadcast}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>
                {sendingBroadcast
                  ? 'Sending Broadcast...'
                  : `Send Broadcast to ${activeMembersCount} Members`}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Search & Channel Filters (Full & Directory variants) */}
      {variant !== 'dashboard' && broadcasts.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${resolvedShortCode} broadcasts or member replies...`}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'pinned', label: 'Pinned' },
                { id: 'whatsapp', label: 'WhatsApp Shared' },
                { id: 'internal', label: 'Internal Alert' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChannelFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap cursor-pointer transition-colors ${
                  channelFilter === tab.id
                    ? 'bg-[#004B87] text-white border-[#004B87]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast Feed & Club-Scoped Member Reply Threads */}
      {displayedBroadcasts.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500">
          {broadcasts.length === 0
            ? `No broadcasts sent in the ${resolvedClubName} workspace yet. Authorized officers can use New Broadcast; members can return later for updates.`
            : 'No broadcasts match your current search or filter. Clear the search or choose another channel.'}
          {(searchQuery || channelFilter !== 'all') && <button type="button" onClick={() => { setSearchQuery(''); setChannelFilter('all'); }} className="mt-3 block mx-auto text-[#004B87] underline">Clear message search and channel</button>}
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {displayedBroadcasts.map((b) => {
            const replyValue = replyDrafts[b.broadcastId] ?? '';
            const isReplying = replyingId === b.broadcastId;
            const isUpdating = updatingId === b.broadcastId;

            return (
              <article key={b.broadcastId} className="p-5 space-y-3.5">
                {/* Metadata & Leader Controls */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      {b.pinned && (
                        <>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <Pin className="w-3 h-3" />
                            <span>Pinned</span>
                          </span>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                        </>
                      )}
                      <span className={priorityColorClass(b.priority)}>{b.priority}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">
                        {channelLabel(b.channel)}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {b.recipientCount} members
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span>
                        {b.senderName} ({b.senderRoleLabel})
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <time className="font-mono-tabular">
                        {new Date(b.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{b.title}</h3>
                  </div>

                  {canBroadcast && (
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          void handleToggleBroadcastFlag(b, { pinned: !b.pinned })
                        }
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-[#004B87] disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>{b.pinned ? 'Unpin' : 'Pin'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          void handleToggleBroadcastFlag(b, {
                            allowMemberReplies: !b.allowMemberReplies,
                          })
                        }
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-[#004B87] disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        {b.allowMemberReplies ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Lock Replies</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Unlock Replies</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Broadcast Body */}
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {b.body}
                </p>

                {/* WhatsApp Action Bar */}
                {(b.whatsappShareUrl || b.whatsappInviteLink) && (
                  <div className="px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 text-emerald-950 min-w-0">
                      <MessageCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="truncate">
                        {b.whatsappGroupName
                          ? `WhatsApp Group: ${b.whatsappGroupName}`
                          : 'WhatsApp Broadcast Link Ready'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {b.whatsappShareUrl && (
                        <a
                          href={b.whatsappShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded whitespace-nowrap"
                        >
                          <span>Share on WhatsApp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {b.whatsappInviteLink && (
                        <>
                          <a
                            href={b.whatsappInviteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 rounded whitespace-nowrap"
                          >
                            <span>Open Group</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopyText(b.broadcastId, b.whatsappInviteLink!)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded whitespace-nowrap cursor-pointer"
                          >
                            {copiedKey === b.broadcastId ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Invite</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Club-Scoped Member Reply Thread */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {b.replies.length}{' '}
                        {b.replies.length === 1 ? 'Member Reply' : 'Member Replies'} ·{' '}
                        {resolvedShortCode} Workspace Only
                      </span>
                    </span>
                  </div>

                  {b.replies.length > 0 && (
                    <div className="space-y-2 pl-3 border-l border-slate-200">
                      {b.replies.map((rep) => (
                        <div
                          key={rep.replyId}
                          className="bg-slate-50/70 border border-slate-200/80 rounded-md px-3 py-2 text-xs space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div>
                              <span className="font-semibold text-slate-900">
                                {rep.authorName}
                              </span>
                              <span className="text-slate-400 mx-1.5">·</span>
                              <span className="text-slate-600">{rep.authorRoleLabel}</span>
                            </div>
                            <time className="font-mono-tabular text-slate-400">
                              {new Date(rep.createdAt).toLocaleString()}
                            </time>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap">{rep.body}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {b.allowMemberReplies && canReply ? (
                    <form
                      onSubmit={(e) => void handlePostReply(e, b.broadcastId)}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={replyValue}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [b.broadcastId]: e.target.value,
                          }))
                        }
                        placeholder={`Reply inside the ${resolvedShortCode} workspace...`}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                      />
                      <button
                        type="submit"
                        disabled={isReplying || !replyValue.trim()}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isReplying ? 'Posting...' : 'Reply'}</span>
                      </button>
                    </form>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Replies are currently locked by {resolvedShortCode} officers.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
