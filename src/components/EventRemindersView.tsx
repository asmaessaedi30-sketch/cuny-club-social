import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BellOff,
  BellRing,
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  RefreshCw,
  Search,
  Send,
  Server,
  Webhook,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  EmailDeliveryWebhookEvent,
  EmailReminderRecord,
  ScheduledReminderSlot,
  SmtpConfigView,
} from '../types';

interface RemindersOverviewResponse {
  smtpConfigured: boolean;
  smtpConfig?: SmtpConfigView;
  userEmailRemindersEnabled: boolean;
  dispatchedReminders: EmailReminderRecord[];
  scheduledQueue: ScheduledReminderSlot[];
  webhookEvents?: EmailDeliveryWebhookEvent[];
}

interface EventRemindersViewProps {
  onRefreshParent?: () => Promise<void>;
}

export function EventRemindersView({ onRefreshParent }: EventRemindersViewProps) {
  const { session, apiFetch } = useAuth();
  const [data, setData] = useState<RemindersOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [togglingPref, setTogglingPref] = useState(false);
  const [runningSweep, setRunningSweep] = useState(false);
  const [sendingEventId, setSendingEventId] = useState<string | null>(null);

  // SMTP Config & Webhook Testing State
  const [showSmtpPanel, setShowSmtpPanel] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpAppUrl, setSmtpAppUrl] = useState('');
  const [smtpProviderLabel, setSmtpProviderLabel] = useState('');
  const [smtpWebhookSecret, setSmtpWebhookSecret] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const isStudentLifeAdmin = Boolean(session?.effectiveAdminRole);

  const canManageReminders = Boolean(
    session?.effectiveAdminRole ||
      session?.memberships.some(
        (m) => m.status === 'Active' && (m.role === 'CLUB_LEAD' || m.role === 'EDITOR')
      )
  );

  const loadReminders = useCallback(async () => {
    setError('');
    try {
      const res = await apiFetch<RemindersOverviewResponse>('/api/reminders');
      setData(res);
      if (res.smtpConfig) {
        setSmtpHost(res.smtpConfig.host);
        setSmtpPort(String(res.smtpConfig.port));
        setSmtpSecure(res.smtpConfig.secure);
        setSmtpUser(res.smtpConfig.authUser);
        setSmtpFrom(res.smtpConfig.fromAddress);
        setSmtpAppUrl(res.smtpConfig.appUrl);
        setSmtpProviderLabel(res.smtpConfig.providerLabel);
      }
      setTestRecipient((prev) => prev || session?.user.email || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load event email reminders.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, session?.user.email]);

  useEffect(() => {
    void loadReminders();
  }, [loadReminders]);

  const handleTogglePreference = async () => {
    if (!data) return;
    setTogglingPref(true);
    setError('');
    setFeedback('');
    try {
      const nextValue = !data.userEmailRemindersEnabled;
      await apiFetch('/api/reminders/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ emailRemindersEnabled: nextValue }),
      });
      setFeedback(
        nextValue
          ? `24-hour event email reminders enabled for ${session?.user.email}.`
          : `24-hour event email reminders paused for ${session?.user.email}.`
      );
      await loadReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update email reminder preference.');
    } finally {
      setTogglingPref(false);
    }
  };

  const handleRunSweep = async () => {
    setRunningSweep(true);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ checkedEvents: number; dispatchedCount: number }>(
        '/api/reminders/sweep',
        { method: 'POST' }
      );
      setFeedback(
        res.dispatchedCount > 0
          ? `24-hour reminder sweep recorded ${res.dispatchedCount} email reminder(s) across ${res.checkedEvents} scheduled events.`
          : `Checked ${res.checkedEvents} events — all reminders currently inside the 24-hour window have already been queued / recorded in the outbox.`
      );
      await loadReminders();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run 24-hour reminder sweep.');
    } finally {
      setRunningSweep(false);
    }
  };

  const handleSendManualReminder = async (slot: ScheduledReminderSlot) => {
    setSendingEventId(slot.eventId);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ dispatchedCount: number }>(
        `/api/clubs/${slot.clubId}/events/${slot.eventId}/send-reminder`,
        { method: 'POST' }
      );
      setFeedback(
        `Recorded ${res.dispatchedCount} reminder attempt(s) for "${slot.eventTitle}". Check individual delivery statuses below.`
      );
      await loadReminders();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to dispatch event reminder.');
    } finally {
      setSendingEventId(null);
    }
  };

  const handleSaveSmtpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    setError('');
    setFeedback('');
    try {
      await apiFetch('/api/reminders/smtp-config', {
        method: 'PUT',
        body: JSON.stringify({
          host: smtpHost,
          port: Number(smtpPort) || 587,
          secure: smtpSecure,
          authUser: smtpUser,
          ...(smtpPass.trim() ? { authPass: smtpPass.trim() } : {}),
          fromAddress: smtpFrom,
          appUrl: smtpAppUrl,
          providerLabel: smtpProviderLabel,
          ...(smtpWebhookSecret.trim() ? { webhookSecret: smtpWebhookSecret.trim() } : {}),
        }),
      });
      setSmtpPass('');
      setSmtpWebhookSecret('');
      setFeedback('Saved institutional SMTP & delivery webhook configuration.');
      await loadReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save SMTP configuration.');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ message: string; status: string }>(
        '/api/reminders/smtp-test',
        {
          method: 'POST',
          body: JSON.stringify({
            recipientEmail: testRecipient.trim() || session?.user.email,
          }),
        }
      );
      setFeedback(res.message);
      await loadReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMTP test dispatch failed.');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSimulateWebhook = async (
    reminderId: string,
    eventType: 'delivered' | 'deferred' | 'bounced'
  ) => {
    setSimulatingId(`${reminderId}:${eventType}`);
    setError('');
    setFeedback('');
    try {
      await apiFetch('/api/reminders/simulate-webhook', {
        method: 'POST',
        body: JSON.stringify({ reminderId, eventType }),
      });
      setFeedback(`Recorded "${eventType}" delivery webhook event for reminder ${reminderId}.`);
      await loadReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to simulate delivery webhook.');
    } finally {
      setSimulatingId(null);
    }
  };

  if (loading) {
    return (
      <div role="status" aria-busy="true" className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
        <p className="text-sm text-slate-600">Loading email reminders…</p>
        <div className="h-5 w-56 bg-slate-200 rounded animate-pulse" />
        <div className="h-24 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
      <h1 className="font-semibold">Email reminders unavailable</h1>
      <p className="mt-2">{error || 'Reminder data has not loaded.'}</p>
      <button type="button" onClick={() => { setLoading(true); void loadReminders(); }} className="mt-3 underline font-semibold">Retry loading reminders</button>
    </div>;
  }

  const dispatched = (data?.dispatchedReminders ?? []).filter((r) => {
    if (scopeFilter === 'mine' && r.recipientUserId !== session?.user.userId) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      r.eventTitle.toLowerCase().includes(q) ||
      r.recipientName.toLowerCase().includes(q) ||
      r.recipientEmail.toLowerCase().includes(q) ||
      r.clubName.toLowerCase().includes(q) ||
      r.clubShortCode.toLowerCase().includes(q)
    );
  });

  const queue = data?.scheduledQueue ?? [];

  return (
    <div className="space-y-6">
      {/* Header & Member Preference Bar */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#004B87] shrink-0" />
            <h1 className="text-base font-bold text-slate-900">
              24-Hour Event Email Reminder System
            </h1>
          </div>
          <p className="text-xs text-slate-600">
            Automated reminders notify club members and RSVP attendees{' '}
            <span className="font-semibold text-slate-800">24 hours prior</span> to each scheduled
            meeting or campus event
            <span className="mx-1.5 text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono-tabular text-slate-500">
              {data?.smtpConfigured
                ? 'Live SMTP Transport Active'
                : 'Institutional Notification Outbox Active'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={togglingPref}
            onClick={() => void handleTogglePreference()}
            aria-pressed={Boolean(data?.userEmailRemindersEnabled)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
              data?.userEmailRemindersEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {data?.userEmailRemindersEnabled ? (
              <>
                <BellRing className="w-3.5 h-3.5 text-emerald-700" />
                <span>My Reminders: Active</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-slate-500" />
                <span>My Reminders: Paused</span>
              </>
            )}
          </button>

          {canManageReminders && (
            <button
              type="button"
              disabled={runningSweep}
              onClick={() => void handleRunSweep()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningSweep ? 'animate-spin' : ''}`} />
              <span>{runningSweep ? 'Checking 24h Window...' : 'Run 24h Reminder Sweep'}</span>
            </button>
          )}
        </div>
      </section>

      {error && (
        <div role="alert" className="p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {feedback && (
        <div className="p-3.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
          {feedback}
        </div>
      )}

      {/* Institutional SMTP & Delivery Webhook Configuration */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Server className="w-4 h-4 text-[#004B87] shrink-0" />
              <h2 className="text-sm font-semibold text-slate-900">
                Institutional SMTP &amp; Delivery Webhook Transport
              </h2>
              <span className="text-xs font-mono-tabular text-slate-500">
                · {data?.smtpConfig?.providerLabel ?? 'CUNY Microsoft 365 / Institutional SMTP'}
              </span>
            </div>
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2 font-mono-tabular">
              <span>
                Status:{' '}
                <strong
                  className={
                    data?.smtpConfigured ? 'text-emerald-700' : 'text-amber-700'
                  }
                >
                  {data?.smtpConfigured ? 'Configured for Live Relay' : 'Fallback Outbox Mode'}
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Webhook: {data?.smtpConfig?.webhookUrl ?? '/api/webhooks/email-delivery'}</span>
              {data?.smtpConfig?.lastTestMessage && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>Last Check: {data.smtpConfig.lastTestMessage}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSmtpPanel((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Webhook className="w-3.5 h-3.5 text-[#004B87]" />
            <span>
              {showSmtpPanel
                ? 'Hide SMTP & Webhook Panel'
                : isStudentLifeAdmin
                  ? 'Configure SMTP & Test'
                  : 'Inspect Delivery Telemetry'}
            </span>
          </button>
        </div>

        {showSmtpPanel && (
          <div className="p-5 space-y-5">
            {isStudentLifeAdmin && (
              <form onSubmit={handleSaveSmtpConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      SMTP Relay Host
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.office365.com"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Port &amp; TLS Mode
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        className="w-24 px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
                      />
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smtpSecure}
                          onChange={(e) => setSmtpSecure(e.target.checked)}
                          className="accent-[#004B87]"
                        />
                        <span>Implicit TLS (465)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Provider Label
                    </label>
                    <input
                      type="text"
                      value={smtpProviderLabel}
                      onChange={(e) => setSmtpProviderLabel(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      SMTP Auth Username
                    </label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="studentlife-noreply@sps.cuny.edu"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      SMTP App Password / Token {data?.smtpConfig?.hasPassword ? '(Stored)' : ''}
                    </label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="Leave blank to retain existing credential"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      From Email Address
                    </label>
                    <input
                      type="text"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Public Portal URL (Used in Email Links)
                    </label>
                    <input
                      type="url"
                      value={smtpAppUrl}
                      onChange={(e) => setSmtpAppUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Delivery Webhook Signing Secret{' '}
                      {data?.smtpConfig?.webhookSecretConfigured ? '(Configured)' : ''}
                    </label>
                    <input
                      type="password"
                      value={smtpWebhookSecret}
                      onChange={(e) => setSmtpWebhookSecret(e.target.value)}
                      placeholder="Leave blank to retain existing secret"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Test Dispatch Recipient
                    </label>
                    <input
                      type="email"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={testingSmtp}
                    onClick={() => void handleTestSmtp()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{testingSmtp ? 'Verifying...' : 'Verify & Send Test Email'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={savingSmtp}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    {savingSmtp ? 'Saving...' : 'Save SMTP Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* Webhook Event Stream */}
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#004B87]" />
                  <span>Recent Email Delivery Webhook Callbacks</span>
                </span>
                <span className="font-mono-tabular text-slate-500">
                  {(data?.webhookEvents ?? []).length} events
                </span>
              </div>
              {(data?.webhookEvents ?? []).length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  No delivery webhook callbacks recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                  {(data?.webhookEvents ?? []).slice(0, 12).map((evt) => (
                    <div
                      key={evt.webhookEventId}
                      className="px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span
                          className={`font-semibold uppercase mr-2 ${
                            evt.eventType === 'bounced'
                              ? 'text-red-700'
                              : evt.eventType === 'deferred'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                          }`}
                        >
                          {evt.eventType}
                        </span>
                        <span className="font-mono text-slate-800">{evt.recipientEmail}</span>
                        <span className="text-slate-500 ml-2">{evt.detail}</span>
                      </div>
                      <span className="text-[11px] font-mono-tabular text-slate-500">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Scheduled 24-Hour Reminder Windows */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Scheduled 24-Hour Event Reminder Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
              {queue.length} club event{queue.length === 1 ? '' : 's'} monitored
            </p>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No upcoming club events are queued for 24-hour reminders.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Club &amp; Event</th>
                  <th className="py-3 px-4">Event Start</th>
                  <th className="py-3 px-4">24h Trigger Time</th>
                  <th className="py-3 px-4 text-right">Eligible Members</th>
                  <th className="py-3 px-4 text-right">Reminder Records</th>
                  <th className="py-3 px-4">Reminder Status</th>
                  {canManageReminders && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {queue.map((slot) => (
                  <tr key={slot.eventId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{slot.eventTitle}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono font-semibold text-[#004B87]">
                          {slot.clubShortCode}
                        </span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{slot.eventLocation}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {slot.eventDate} · {slot.eventTime}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {slot.reminderScheduledFor ? new Date(slot.reminderScheduledFor).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }) : 'Needs a valid, unambiguous New York event time'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-800">
                      {slot.eligibleMemberCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-800">
                      {slot.dispatchedCount}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {slot.status === 'Sent (24h Window)' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{slot.dispatchedCount > 0 ? 'Reminder records created' : 'Window reached · no records'}</span>
                        </span>
                      ) : slot.status === 'Scheduled (24h Prior)' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#004B87]">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Scheduled (24h Prior)</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">{slot.status}</span>
                      )}
                    </td>
                    {canManageReminders && (
                      <td className="py-3 px-4 text-right">
                        {slot.status !== 'Event Passed' ? (
                          <button
                            type="button"
                            disabled={sendingEventId === slot.eventId}
                            onClick={() => void handleSendManualReminder(slot)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline disabled:opacity-50 whitespace-nowrap cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>
                              {sendingEventId === slot.eventId ? 'Sending...' : 'Send Reminder Now'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dispatched Email Delivery Log */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Recorded Event Email Reminders
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
              {dispatched.length} email reminder{dispatched.length === 1 ? '' : 's'} logged
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipient or event..."
                aria-label="Search dispatched email reminders"
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  scopeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Club Reminders
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('mine')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  scopeFilter === 'mine'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sent to Me
              </button>
            </div>
          </div>
        </div>

        {dispatched.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No email reminders match the active filter yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {dispatched.map((rec) => {
              const expanded = previewId === rec.reminderId;
              return (
                <div key={rec.reminderId} className="px-5 py-4 space-y-2.5 hover:bg-slate-50/70">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-mono font-semibold text-[#004B87]">
                          {rec.clubShortCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-700">{rec.triggerMode}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            rec.deliveryStatus === 'Failed'
                              ? 'font-medium text-red-700'
                              : 'font-medium text-emerald-700'
                          }
                        >
                          {rec.deliveryStatus === 'Delivered (Hub Outbox)' ? 'Queued (Hub Outbox; legacy record)' : rec.deliveryStatus}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          {new Date(rec.sentAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{rec.subject}</div>
                      <div className="text-xs text-slate-600">
                        To: <span className="font-medium text-slate-800">{rec.recipientName}</span>{' '}
                        <span className="font-mono text-slate-500">({rec.recipientEmail})</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                      {isStudentLifeAdmin && (
                        <div className="flex items-center gap-1">
                          {(['delivered', 'deferred', 'bounced'] as const).map((evtType) => (
                            <button
                              key={evtType}
                              type="button"
                              disabled={simulatingId === `${rec.reminderId}:${evtType}`}
                              onClick={() => void handleSimulateWebhook(rec.reminderId, evtType)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer capitalize"
                            >
                              {evtType}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setPreviewId(expanded ? null : rec.reminderId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>{expanded ? 'Hide Email' : 'Preview Email'}</span>
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <pre className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {rec.body}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
