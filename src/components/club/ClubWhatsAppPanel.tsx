import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BellRing,
  CalendarPlus,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type {
  Club,
  ClubEvent,
  RoleName,
  WhatsAppAlertCategory,
  WhatsAppAlertMessage,
  WhatsAppDeliveryMode,
  WhatsAppGroupCategory,
  WhatsAppGroupLink,
} from '../../types';
import { StatusText } from '../StatusText';

interface ClubWhatsAppPanelProps {
  club: Club;
  effectiveRole: RoleName | null;
  groups: WhatsAppGroupLink[];
  messages: WhatsAppAlertMessage[];
  events?: ClubEvent[];
  variant?: 'dashboard' | 'full';
  onNavigate?: (tab: string) => void;
  onRefresh: () => Promise<void>;
}

const ALERT_CATEGORIES: WhatsAppAlertCategory[] = [
  'Announcement',
  'Event Reminder',
  'Urgent Alert',
  'Deadline',
  'Welcome',
];

const GROUP_CATEGORIES: WhatsAppGroupCategory[] = [
  'General Community',
  'Event Alerts',
  'Announcements Only',
  'Executive Board',
];

const DELIVERY_MODES: WhatsAppDeliveryMode[] = [
  'Interactive Share + Hub Outbox',
  'Webhook Relay',
  'WhatsApp Business Cloud API',
];

function formatWhatsAppText(
  clubName: string,
  category: WhatsAppAlertCategory,
  title: string,
  body: string
): string {
  return `[${clubName} — ${category}]\n*${title.trim()}*\n\n${body.trim()}`;
}

function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function ClubWhatsAppPanel({
  club,
  effectiveRole,
  groups,
  messages,
  events = [],
  variant = 'full',
  onNavigate,
  onRefresh,
}: ClubWhatsAppPanelProps) {
  const { apiFetch, session } = useAuth();

  const canManageGroups =
    Boolean(session?.effectiveAdminRole) || effectiveRole === 'CLUB_LEAD';
  const canSendAlerts =
    Boolean(session?.effectiveAdminRole) ||
    effectiveRole === 'CLUB_LEAD' ||
    effectiveRole === 'EDITOR';
  const canDraftAlerts =
    canSendAlerts || effectiveRole === 'CONTRIBUTOR';

  const connectedGroups = useMemo(
    () => groups.filter((g) => g.status === 'Connected'),
    [groups]
  );

  // Group Linking / Editing State
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [groupCategory, setGroupCategory] = useState<WhatsAppGroupCategory>('General Community');
  const [groupDescription, setGroupDescription] = useState('');
  const [memberCountEstimate, setMemberCountEstimate] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<WhatsAppDeliveryMode>(
    'Interactive Share + Hub Outbox'
  );
  const [webhookUrl, setWebhookUrl] = useState('');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappRecipientJid, setWhatsappRecipientJid] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showInviteToMembers, setShowInviteToMembers] = useState(true);
  const [autoAlertNewEvents, setAutoAlertNewEvents] = useState(true);
  const [autoAlert24hReminders, setAutoAlert24hReminders] = useState(true);
  const [groupSaving, setGroupSaving] = useState(false);
  const [confirmUnlinkGroupId, setConfirmUnlinkGroupId] = useState<string | null>(null);

  // Alert Composer State
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    connectedGroups[0]?.groupId ?? groups[0]?.groupId ?? ''
  );
  const [alertCategory, setAlertCategory] = useState<WhatsAppAlertCategory>('Announcement');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertBody, setAlertBody] = useState('');
  const [linkedEventId, setLinkedEventId] = useState('');
  const [syncToHubNotifications, setSyncToHubNotifications] = useState(true);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [draftingAi, setDraftingAi] = useState(false);

  // History filter & Feedback State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [lastShareText, setLastShareText] = useState('');

  useEffect(() => {
    if (
      connectedGroups.length > 0 &&
      !connectedGroups.some((g) => g.groupId === selectedGroupId)
    ) {
      setSelectedGroupId(connectedGroups[0].groupId);
    } else if (
      connectedGroups.length === 0 &&
      groups.length > 0 &&
      !groups.some((g) => g.groupId === selectedGroupId)
    ) {
      setSelectedGroupId(groups[0].groupId);
    }
  }, [connectedGroups, groups, selectedGroupId]);

  const resetGroupForm = () => {
    setEditingGroupId(null);
    setGroupName('');
    setInviteLink('');
    setGroupCategory('General Community');
    setGroupDescription('');
    setMemberCountEstimate('');
    setDeliveryMode('Interactive Share + Hub Outbox');
    setWebhookUrl('');
    setWhatsappPhoneNumberId('');
    setWhatsappRecipientJid('');
    setApiToken('');
    setShowInviteToMembers(true);
    setAutoAlertNewEvents(true);
    setAutoAlert24hReminders(true);
    setShowGroupForm(false);
  };

  const openEditGroup = (grp: WhatsAppGroupLink) => {
    setEditingGroupId(grp.groupId);
    setGroupName(grp.groupName);
    setInviteLink(grp.inviteLink);
    setGroupCategory(grp.groupCategory);
    setGroupDescription(grp.description ?? '');
    setMemberCountEstimate(
      typeof grp.memberCountEstimate === 'number' ? String(grp.memberCountEstimate) : ''
    );
    setDeliveryMode(grp.deliveryMode);
    setWebhookUrl(grp.webhookUrl ?? '');
    setWhatsappPhoneNumberId(grp.whatsappPhoneNumberId ?? '');
    setWhatsappRecipientJid(grp.whatsappRecipientJid ?? '');
    setApiToken('');
    setShowInviteToMembers(grp.showInviteToMembers);
    setAutoAlertNewEvents(grp.autoAlertNewEvents);
    setAutoAlert24hReminders(grp.autoAlert24hReminders);
    setShowGroupForm(true);
    setErrorMsg('');
    setStatusMsg('');
  };

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId((curr) => (curr === key ? null : curr)), 2000);
    } catch {
      setErrorMsg('Clipboard access unavailable. Highlight and copy the text manually.');
    }
  };

  const handleSaveGroup = async (e: FormEvent) => {
    e.preventDefault();
    setGroupSaving(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const payload = {
        groupName: groupName.trim(),
        inviteLink: inviteLink.trim(),
        groupCategory,
        description: groupDescription.trim(),
        memberCountEstimate: memberCountEstimate ? Number(memberCountEstimate) : undefined,
        deliveryMode,
        webhookUrl: deliveryMode === 'Webhook Relay' ? webhookUrl.trim() : undefined,
        whatsappPhoneNumberId:
          deliveryMode === 'WhatsApp Business Cloud API'
            ? whatsappPhoneNumberId.trim()
            : undefined,
        whatsappRecipientJid:
          deliveryMode === 'WhatsApp Business Cloud API'
            ? whatsappRecipientJid.trim()
            : undefined,
        apiToken:
          deliveryMode === 'WhatsApp Business Cloud API' && apiToken.trim()
            ? apiToken.trim()
            : undefined,
        showInviteToMembers,
        autoAlertNewEvents,
        autoAlert24hReminders,
      };

      if (editingGroupId) {
        await apiFetch(`/api/clubs/${club.clubId}/whatsapp/groups/${editingGroupId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setStatusMsg(`Updated WhatsApp group "${groupName.trim()}".`);
      } else {
        const res = await apiFetch<{ group: WhatsAppGroupLink }>(
          `/api/clubs/${club.clubId}/whatsapp/groups`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        setSelectedGroupId(res.group.groupId);
        setStatusMsg(`Linked WhatsApp group "${res.group.groupName}" to ${club.shortCode}.`);
      }
      resetGroupForm();
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save WhatsApp group.');
    } finally {
      setGroupSaving(false);
    }
  };

  const handleToggleGroupStatus = async (grp: WhatsAppGroupLink) => {
    const nextStatus = grp.status === 'Connected' ? 'Paused' : 'Connected';
    setErrorMsg('');
    setStatusMsg('');
    try {
      await apiFetch(`/api/clubs/${club.clubId}/whatsapp/groups/${grp.groupId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setStatusMsg(`Set "${grp.groupName}" to ${nextStatus}.`);
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update group status.');
    }
  };

  const handleUnlinkGroup = async (groupId: string) => {
    setErrorMsg('');
    setStatusMsg('');
    try {
      await apiFetch(`/api/clubs/${club.clubId}/whatsapp/groups/${groupId}`, {
        method: 'DELETE',
      });
      setConfirmUnlinkGroupId(null);
      setStatusMsg('Unlinked WhatsApp group from the club dashboard.');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to unlink WhatsApp group.');
    }
  };

  const handlePrefillFromEvent = (eventId: string) => {
    setLinkedEventId(eventId);
    const ev = events.find((item) => item.eventId === eventId);
    if (!ev) return;
    setAlertCategory('Event Reminder');
    setAlertTitle(`${ev.title} — ${ev.date} at ${ev.time}`);
    setAlertBody(
      `Join ${club.name} for "${ev.title}" on ${ev.date} at ${ev.time} (${ev.location}).\n\n${ev.description}\n\nRSVP directly in the CUNY SPS Club Social Hub to receive your calendar file & check-in code!`
    );
  };

  const applyQuickTemplate = (kind: 'reminder' | 'room-change' | 'deadline' | 'welcome') => {
    if (kind === 'reminder') {
      setAlertCategory('Event Reminder');
      setAlertTitle(`${club.shortCode} Meeting Reminder`);
      setAlertBody(
        `Friendly reminder from ${club.name}: our upcoming session starts soon! Check the CUNY SPS Club Social Hub for the Zoom room link and agenda.`
      );
    } else if (kind === 'room-change') {
      setAlertCategory('Urgent Alert');
      setAlertTitle(`Updated Room / Zoom Link for Today`);
      setAlertBody(
        `Quick update for ${club.name} attendees: please check the latest location/Zoom link posted in the Club Social Hub before joining today's meeting.`
      );
    } else if (kind === 'deadline') {
      setAlertCategory('Deadline');
      setAlertTitle(`${club.shortCode} Action Required Before Deadline`);
      setAlertBody(
        `Heads up! Please submit your RSVPs / officer forms for ${club.name} by Friday at 5:00 PM ET so Student Life can finalize confirmations.`
      );
    } else {
      setAlertCategory('Welcome');
      setAlertTitle(`Welcome to the ${club.name} WhatsApp Group!`);
      setAlertBody(
        `Welcome new CUNY SPS students! Use this chat for quick event alerts, study meetups, and community Q&A. Keep discussions respectful and aligned with CUNY SPS guidelines.`
      );
    }
  };

  const handleAiDraft = async () => {
    setDraftingAi(true);
    setErrorMsg('');
    try {
      const res = await apiFetch<{ title: string; messageBody: string; modelUsed: string }>(
        `/api/clubs/${club.clubId}/whatsapp/ai-draft`,
        {
          method: 'POST',
          body: JSON.stringify({
            category: alertCategory,
            topic: alertBody.trim() || alertTitle.trim(),
            linkedEventId: linkedEventId || undefined,
            groupId: selectedGroupId || undefined,
          }),
        }
      );
      setAlertTitle(res.title);
      setAlertBody(res.messageBody);
      setStatusMsg(
        res.modelUsed === 'template-fallback'
          ? 'Generated clean structured WhatsApp alert draft ready for review.'
          : 'Generated Gemini AI WhatsApp alert draft ready for officer review.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate WhatsApp draft.');
    } finally {
      setDraftingAi(false);
    }
  };

  const handleSendAlert = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSendAlerts) return;
    setSendingAlert(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await apiFetch<{
        alert: WhatsAppAlertMessage;
        formattedWhatsAppText: string;
      }>(`/api/clubs/${club.clubId}/whatsapp/messages`, {
        method: 'POST',
        body: JSON.stringify({
          groupId: selectedGroupId,
          category: alertCategory,
          title: alertTitle.trim(),
          messageBody: alertBody.trim(),
          linkedEventId: linkedEventId || undefined,
          syncToHubNotifications,
        }),
      });
      setLastShareText(res.formattedWhatsAppText);
      setStatusMsg(
        `Alert logged & dispatched (${res.alert.deliveryStatus}) to ${res.alert.groupName}.`
      );
      setAlertTitle('');
      setAlertBody('');
      setLinkedEventId('');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send WhatsApp alert.');
    } finally {
      setSendingAlert(false);
    }
  };

  const draftFormattedText = useMemo(() => {
    if (!alertTitle.trim() && !alertBody.trim()) return '';
    return formatWhatsAppText(
      club.name,
      alertCategory,
      alertTitle || `${club.shortCode} Update`,
      alertBody
    );
  }, [club.name, club.shortCode, alertCategory, alertTitle, alertBody]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((msg) => {
      if (categoryFilter !== 'ALL' && msg.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        msg.title.toLowerCase().includes(q) ||
        msg.messageBody.toLowerCase().includes(q) ||
        msg.groupName.toLowerCase().includes(q) ||
        msg.sentByName.toLowerCase().includes(q)
      );
    });
  }, [messages, searchQuery, categoryFilter]);

  const displayedMessages =
    variant === 'dashboard' ? filteredMessages.slice(0, 3) : filteredMessages;

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <p role="note" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">
        Share-link workflow: saving an alert prepares a WhatsApp link. Open WhatsApp and send it there.
        The Hub cannot confirm sending, delivery, or reading in WhatsApp.
      </p>
      {/* Section Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#16A34A]" />
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              Club WhatsApp Group & Instant Alerts
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            <span className="font-mono-tabular font-medium text-slate-700">
              {connectedGroups.length}
            </span>{' '}
            connected group{connectedGroups.length === 1 ? '' : 's'}
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-mono-tabular font-medium text-slate-700">
              {messages.length}
            </span>{' '}
            alert{messages.length === 1 ? '' : 's'} logged for {club.shortCode}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canManageGroups && (
            <button
              type="button"
              onClick={() => {
                if (showGroupForm && !editingGroupId) {
                  resetGroupForm();
                } else {
                  resetGroupForm();
                  setShowGroupForm(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{groups.length > 0 ? 'Link Another Group' : 'Link WhatsApp Group'}</span>
            </button>
          )}
          {variant === 'dashboard' && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('whatsapp')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Full WhatsApp Hub</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alerts */}
      {(errorMsg || statusMsg) && (
        <div className="px-5 pt-4 space-y-2">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md"
            >
              {errorMsg}
            </div>
          )}
          {statusMsg && (
            <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>{statusMsg}</span>
              {lastShareText && (
                <a
                  href={buildWhatsAppShareUrl(lastShareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-[#16A34A] hover:bg-[#15803D] rounded whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in WhatsApp Now</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Link / Edit Group Form */}
      {showGroupForm && canManageGroups && (
        <form
          onSubmit={handleSaveGroup}
          className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">
              {editingGroupId ? 'Edit Linked WhatsApp Group' : 'Link Official Club WhatsApp Group'}
            </h3>
            <button
              type="button"
              onClick={resetGroupForm}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                WhatsApp Group Name
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={`e.g., ${club.shortCode} Community & Event Alerts`}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                WhatsApp Group Invite Link
              </label>
              <input
                type="url"
                required
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Group Purpose / Category
              </label>
              <select
                value={groupCategory}
                onChange={(e) => setGroupCategory(e.target.value as WhatsAppGroupCategory)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
              >
                {GROUP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Estimated Group Members (Optional)
              </label>
              <input
                type="number"
                min={1}
                max={2000}
                value={memberCountEstimate}
                onChange={(e) => setMemberCountEstimate(e.target.value)}
                placeholder="e.g., 45"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Alert Delivery Mode
              </label>
              <select
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value as WhatsAppDeliveryMode)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
              >
                {DELIVERY_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Short Group Description
              </label>
              <input
                type="text"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Weekly reminders, Zoom links, and peer community chat"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
              />
            </div>
          </div>

          {deliveryMode === 'Webhook Relay' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Webhook Relay Endpoint URL (POST JSON payload on every sent alert)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-relay.example.com/whatsapp-webhook"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
              />
            </div>
          )}

          {deliveryMode === 'WhatsApp Business Cloud API' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Meta Phone Number ID
                </label>
                <input
                  type="text"
                  value={whatsappPhoneNumberId}
                  onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                  placeholder="e.g., 104298374612"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Recipient / Broadcast ID
                </label>
                <input
                  type="text"
                  value={whatsappRecipientJid}
                  onChange={(e) => setWhatsappRecipientJid(e.target.value)}
                  placeholder="e.g., 1203630...@g.us"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cloud API Token (Stored Server-Side)
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder={editingGroupId ? 'Leave blank to keep existing token' : 'EAAG...'}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInviteToMembers}
                onChange={(e) => setShowInviteToMembers(e.target.checked)}
                className="rounded border-slate-300 text-[#004B87]"
              />
              <span>Show join invite link to active club members</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAlertNewEvents}
                onChange={(e) => setAutoAlertNewEvents(e.target.checked)}
                className="rounded border-slate-300 text-[#004B87]"
              />
              <span>Auto-log alert when a new club event is posted</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAlert24hReminders}
                onChange={(e) => setAutoAlert24hReminders(e.target.checked)}
                className="rounded border-slate-300 text-[#004B87]"
              />
              <span>Enable 24h event reminder alert sync</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetGroupForm}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={groupSaving}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md disabled:opacity-60 cursor-pointer"
            >
              {groupSaving
                ? 'Saving...'
                : editingGroupId
                  ? 'Save Group Changes'
                  : 'Connect WhatsApp Group'}
            </button>
          </div>
        </form>
      )}

      {/* Linked WhatsApp Groups */}
      <div className="divide-y divide-slate-200 border-b border-slate-200">
        {groups.length === 0 ? (
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-900">
                No WhatsApp group linked to {club.name} yet
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                Link your club&apos;s official WhatsApp group invite URL (https://chat.whatsapp.com/...)
                to share join access with members and broadcast event reminders or urgent alerts directly
                from this dashboard.
              </p>
            </div>
            {canManageGroups && (
              <button
                type="button"
                onClick={() => {
                  resetGroupForm();
                  setShowGroupForm(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Link Club WhatsApp Group</span>
              </button>
            )}
          </div>
        ) : (
          groups.map((grp) => (
            <div
              key={grp.groupId}
              className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm font-semibold text-slate-900">{grp.groupName}</span>
                  <StatusText status={grp.status === 'Connected' ? 'Share link ready' : grp.status} />
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{grp.groupCategory}</span>
                  <span aria-hidden="true">·</span>
                  <span>{grp.deliveryMode}</span>
                  {typeof grp.memberCountEstimate === 'number' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        ~{grp.memberCountEstimate} members
                      </span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>Linked by {grp.linkedByName}</span>
                </div>
                {grp.description && (
                  <p className="text-xs text-slate-600">{grp.description}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {grp.inviteLink && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleCopyText(grp.groupId, grp.inviteLink)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedId === grp.groupId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Link Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Invite</span>
                        </>
                      )}
                    </button>
                    <a
                      href={grp.inviteLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#16A34A] hover:bg-[#15803D] rounded-md whitespace-nowrap shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open / Join Group</span>
                    </a>
                  </>
                )}

                {canManageGroups && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleToggleGroupStatus(grp)}
                      title={grp.status === 'Connected' ? 'Pause group alerts' : 'Reconnect group'}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {grp.status === 'Connected' ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Resume</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditGroup(grp)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>
                    {confirmUnlinkGroupId === grp.groupId ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleUnlinkGroup(grp.groupId)}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md whitespace-nowrap cursor-pointer"
                        >
                          Confirm Unlink
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmUnlinkGroupId(null)}
                          className="px-2 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmUnlinkGroupId(grp.groupId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-slate-300 hover:bg-red-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Unlink</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Send Message / Alert Composer + Recent Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Composer Column */}
        <div className="lg:col-span-6 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-[#004B87]" />
                <span>Send Message / Alert to WhatsApp Group</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {canSendAlerts
                  ? 'Compose announcements, event reminders, or urgent updates directly from the dashboard.'
                  : 'Authorized Club Leads and Editors can broadcast alerts; members can inspect sent updates.'}
              </p>
            </div>
          </div>

          {!canDraftAlerts ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
              Your current role ({effectiveRole ?? 'Member'}) has read-only access to the club WhatsApp feed. Use the group invite link above to join discussions.
            </div>
          ) : connectedGroups.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
              Connect or resume a WhatsApp group above before sending messages or alerts.
            </div>
          ) : (
            <form onSubmit={handleSendAlert} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target WhatsApp Group
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
                  >
                    {connectedGroups.map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        {g.groupName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Alert Category
                  </label>
                  <select
                    value={alertCategory}
                    onChange={(e) => setAlertCategory(e.target.value as WhatsAppAlertCategory)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
                  >
                    {ALERT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {events.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                    <CalendarPlus className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pre-fill from Upcoming Club Event (Optional)</span>
                  </label>
                  <select
                    value={linkedEventId}
                    onChange={(e) => handlePrefillFromEvent(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
                  >
                    <option value="">Select an upcoming event to auto-fill details...</option>
                    {events.map((ev) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        {ev.date} {ev.time} — {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Templates */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 mr-1">
                  Quick templates:
                </span>
                <button
                  type="button"
                  onClick={() => applyQuickTemplate('reminder')}
                  className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Meeting Reminder
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTemplate('room-change')}
                  className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Room / Zoom Update
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTemplate('deadline')}
                  className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Deadline Alert
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTemplate('welcome')}
                  className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Welcome Note
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">Alert Title</label>
                  <button
                    type="button"
                    disabled={draftingAi}
                    onClick={() => void handleAiDraft()}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#004B87] hover:underline disabled:opacity-60 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{draftingAi ? 'Drafting...' : 'AI Draft / Polish'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder="e.g., Room & Zoom Link for Tonight's Workshop"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">Message Body</label>
                  <span className="text-[11px] font-mono-tabular text-slate-400">
                    {alertBody.length} chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={alertBody}
                  onChange={(e) => setAlertBody(e.target.value)}
                  placeholder="Write a clear message with date, time, Zoom/room details, and RSVP call to action..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToHubNotifications}
                  onChange={(e) => setSyncToHubNotifications(e.target.checked)}
                  className="rounded border-slate-300 text-[#004B87]"
                />
                <span>Also notify active club members in the top-bar Hub Notification Center</span>
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {canSendAlerts && (
                  <button
                    type="submit"
                    disabled={sendingAlert}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingAlert ? 'Preparing...' : 'Prepare & Log Share Link'}</span>
                  </button>
                )}

                {draftFormattedText && (
                  <>
                    <a
                      href={buildWhatsAppShareUrl(draftFormattedText)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#16A34A] hover:bg-[#15803D] rounded-md whitespace-nowrap shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleCopyText('draft', draftFormattedText)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedId === 'draft' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Formatted</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Recent Sent Alerts Feed Column */}
        <div className="lg:col-span-6 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Prepared WhatsApp Shares & Alert Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Institutional audit trail with 1-click WhatsApp Web resend
              </p>
            </div>
            {variant === 'dashboard' && messages.length > 3 && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('whatsapp')}
                className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                View all {messages.length} alerts
              </button>
            )}
          </div>

          {variant === 'full' && messages.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sent alerts..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="ALL">All Categories</option>
                {ALERT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {displayedMessages.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500">
              No WhatsApp alerts logged yet for {club.shortCode}. Use the composer on the left to
              send your first club announcement or event reminder.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
              {displayedMessages.map((msg) => {
                const formatted = formatWhatsAppText(
                  club.name,
                  msg.category,
                  msg.title,
                  msg.messageBody
                );
                return (
                  <div key={msg.alertId} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900">
                          {msg.category} · {msg.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {msg.groupName}
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          <span>
                            Prepared by {msg.sentByName} ({msg.sentByRoleLabel})
                          </span>
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-mono-tabular">
                            {new Date(msg.sentAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <StatusText
                        status={
                          msg.deliveryStatus === 'Failed'
                            ? 'Failed'
                            : 'Prepared · delivery unverified'
                        }
                      />
                    </div>

                    <p className="text-xs text-slate-700 whitespace-pre-line">{msg.messageBody}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-500">
                        {msg.deliveryStatus}
                        {msg.deliveryDetails ? ` · ${msg.deliveryDetails}` : ''}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleCopyText(msg.alertId, formatted)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          {copiedId === msg.alertId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <a
                          href={buildWhatsAppShareUrl(formatted)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16A34A] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Send on WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
