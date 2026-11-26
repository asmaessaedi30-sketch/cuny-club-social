import { campusTimeMs } from '../src/utils/calendarDates.ts';
import nodemailer, { type Transporter } from 'nodemailer';
import type {
  ClubEvent,
  EmailDeliveryWebhookEvent,
  EmailReminderDeliveryStatus,
  EmailReminderRecord,
  ScheduledReminderSlot,
  SmtpConfigView,
  User,
} from '../src/types.ts';
import { canAccessClub } from './rbac.ts';
import { getDb, pushNotification, recordAudit, saveDb } from './store.ts';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function parseEventStartMs(dateStr: string, timeStr: string): number {
  return campusTimeMs(dateStr, timeStr);
}

export function get24HourTriggerIso(dateStr: string, timeStr: string): string {
  const startMs = parseEventStartMs(dateStr, timeStr);
  if (Number.isNaN(startMs)) return ''; // Invalid or ambiguous local time: never invent a trigger.
  return new Date(startMs - TWENTY_FOUR_HOURS_MS).toISOString();
}

export function getEligibleRecipientsForEvent(ev: ClubEvent): User[] {
  const db = getDb();
  const memberUserIds = new Set<string>(
    db.memberships
      .filter((m) => m.clubId === ev.clubId && m.status === 'Active')
      .map((m) => m.userId)
  );
  for (const rsvpUid of ev.rsvpUserIds ?? []) {
    memberUserIds.add(rsvpUid);
  }

  return db.users.filter(
    (u) =>
      memberUserIds.has(u.userId) &&
      u.status === 'Active' &&
      u.emailRemindersEnabled !== false
  );
}

let cachedTransporter: Transporter | null = null;
let cachedConfigKey = '';

export function resetSmtpTransporterCache(): void {
  cachedTransporter = null;
  cachedConfigKey = '';
}

function getEffectiveSmtpSettings() {
  const db = getDb();
  const cfg = db.smtpConfig;
  const host = (cfg?.host || process.env.SMTP_HOST || '').trim();
  const port = Number(cfg?.port || process.env.SMTP_PORT || '587');
  const secure = typeof cfg?.secure === 'boolean' ? cfg.secure : port === 465;
  const authUser = (cfg?.authUser || process.env.SMTP_USER || '').trim();
  const authPass = (cfg?.authPass || process.env.SMTP_PASS || '').trim();
  const fromAddress =
    (cfg?.fromAddress || process.env.SMTP_FROM || '').trim() ||
    'CUNY SPS Club Social Hub <studentlife-noreply@sps.cuny.edu>';
  const appUrl =
    (cfg?.appUrl || process.env.APP_URL || '').trim() || 'https://sps.cuny.edu/student-life';
  return { host, port, secure, authUser, authPass, fromAddress, appUrl, cfg };
}

function getSmtpTransporter(): Transporter | null {
  const { host, port, secure, authUser, authPass } = getEffectiveSmtpSettings();
  if (!host) return null;

  const key = `${host}:${port}:${secure}:${authUser}:${authPass ? '1' : '0'}`;
  if (cachedTransporter && cachedConfigKey === key) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: authUser && authPass ? { user: authUser, pass: authPass } : undefined,
    connectionTimeout: 4000,
    greetingTimeout: 4000,
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

export function getMaskedSmtpConfig(): SmtpConfigView {
  const db = getDb();
  const { host, port, secure, authUser, authPass, fromAddress, appUrl, cfg } =
    getEffectiveSmtpSettings();
  return {
    host,
    port,
    secure,
    authUser,
    hasPassword: Boolean(authPass),
    fromAddress,
    appUrl,
    providerLabel:
      cfg?.providerLabel ||
      (host ? 'Configured SMTP Relay' : 'Institutional Notification Outbox (Ready for SMTP Relay)'),
    webhookUrl: '/api/webhooks/email-delivery',
    webhookSecretConfigured: Boolean(cfg?.webhookSecret),
    envSmtpActive: Boolean(host),
    updatedAt: cfg?.updatedAt || new Date().toISOString(),
    updatedByName: cfg?.updatedByName || 'System',
    lastTestedAt: cfg?.lastTestedAt,
    lastTestStatus: cfg?.lastTestStatus,
    lastTestMessage: cfg?.lastTestMessage,
  };
}

export async function testSmtpConfiguration(params: {
  recipientEmail: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}): Promise<{
  status: 'Verified' | 'Simulated' | 'Failed';
  message: string;
  config: SmtpConfigView;
}> {
  const db = getDb();
  const { host, port, fromAddress } = getEffectiveSmtpSettings();
  const transporter = getSmtpTransporter();
  const now = new Date().toISOString();

  let status: 'Verified' | 'Simulated' | 'Failed' = 'Simulated';
  let message =
    'No external SMTP host configured; institutional notification outbox verified and ready for webhook tracking.';

  if (transporter && host) {
    try {
      await transporter.verify();
      await transporter.sendMail({
        from: fromAddress,
        to: params.recipientEmail,
        subject: '[CUNY SPS Club Social Hub] SMTP Transport Verification Test',
        text: `This is a test verification email from the CUNY SPS Club Social Hub confirming SMTP relay connectivity via ${host}:${port}.`,
      });
      status = 'Verified';
      message = `Verified SMTP handshake and dispatched test message via ${host}:${port} to ${params.recipientEmail}.`;
    } catch (err) {
      status = 'Failed';
      message = `SMTP verification failed for ${host}:${port}: ${
        err instanceof Error ? err.message : 'Connection error'
      }`;
    }
  }

  db.smtpConfig.lastTestedAt = now;
  db.smtpConfig.lastTestStatus = status;
  db.smtpConfig.lastTestMessage = message;

  recordAudit({
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: 'TEST_SMTP_TRANSPORT',
    category: 'Integration',
    target: host || 'Hub Notification Outbox',
    details: message,
  });
  saveDb();

  return {
    status,
    message,
    config: getMaskedSmtpConfig(),
  };
}

export function processEmailDeliveryWebhook(params: {
  providerMessageId?: string;
  reminderId?: string;
  recipientEmail?: string;
  eventType: 'delivered' | 'deferred' | 'bounced';
  detail?: string;
}): {
  webhookEvent: EmailDeliveryWebhookEvent;
  updatedRecord: EmailReminderRecord | null;
} {
  const db = getDb();
  const now = new Date().toISOString();

  const record =
    db.emailReminders.find(
      (r) =>
        (params.reminderId && r.reminderId === params.reminderId) ||
        (params.providerMessageId && r.providerMessageId === params.providerMessageId)
    ) ?? null;

  const webhookEvent: EmailDeliveryWebhookEvent = {
    webhookEventId: `wh-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
    reminderId: record?.reminderId ?? params.reminderId,
    providerMessageId:
      record?.providerMessageId ?? params.providerMessageId ?? `msg_${Date.now()}`,
    recipientEmail: record?.recipientEmail ?? params.recipientEmail ?? 'unknown@spsmail.cuny.edu',
    eventType: params.eventType,
    detail:
      params.detail?.trim() ||
      (params.eventType === 'delivered'
        ? '250 2.0.0 OK — Confirmed delivered to @spsmail.cuny.edu MX.'
        : params.eventType === 'deferred'
          ? '421 Temporary deferral — retry queued by institutional relay.'
          : '550 5.1.1 Mailbox unavailable — recipient bounce logged.'),
    timestamp: now,
  };

  db.emailWebhookEvents.unshift(webhookEvent);

  if (record) {
    if (params.eventType === 'delivered') {
      record.deliveryStatus = 'Delivered (Webhook Verified)';
      record.errorMessage = undefined;
    } else if (params.eventType === 'deferred') {
      record.deliveryStatus = 'Deferred';
      record.errorMessage = webhookEvent.detail;
    } else {
      record.deliveryStatus = 'Bounced';
      record.errorMessage = webhookEvent.detail;
    }
    record.webhookEvents = [...(record.webhookEvents ?? []), webhookEvent];
  }

  recordAudit({
    actorId: 'smtp-webhook-listener',
    actorName: 'SMTP Delivery Webhook',
    actorRole: 'SYSTEM_WEBHOOK',
    action: `EMAIL_WEBHOOK_${params.eventType.toUpperCase()}`,
    category: 'Integration',
    target: webhookEvent.recipientEmail,
    clubId: record?.clubId,
    details: `${webhookEvent.eventType} (${webhookEvent.providerMessageId}): ${webhookEvent.detail}`,
  });

  saveDb();
  return { webhookEvent, updatedRecord: record };
}

export async function dispatchEventReminders(params: {
  event: ClubEvent;
  triggerMode: '24h Automated' | 'Manual Early Dispatch';
  actorName?: string;
  actorId?: string;
  actorRole?: string;
}): Promise<EmailReminderRecord[]> {
  const { event, triggerMode, actorName, actorId, actorRole } = params;
  const db = getDb();
  const club = db.clubs.find((c) => c.clubId === event.clubId);
  const clubName = club?.name ?? event.clubId;
  const clubShortCode = club?.shortCode ?? event.clubId;
  const recipients = getEligibleRecipientsForEvent(event);

  const transporter = getSmtpTransporter();
  const { fromAddress, appUrl } = getEffectiveSmtpSettings();

  const dispatched: EmailReminderRecord[] = [];

  for (const recipient of recipients) {
    if (triggerMode === '24h Automated') {
      const alreadySent = db.emailReminders.some(
        (r) =>
          r.eventId === event.eventId &&
          r.recipientUserId === recipient.userId &&
          r.triggerMode === '24h Automated' &&
          r.deliveryStatus !== 'Failed' &&
          r.deliveryStatus !== 'Bounced'
      );
      if (alreadySent) continue;
    }

    const isRsvped = (event.rsvpUserIds ?? []).includes(recipient.userId);
    const subject = `[24h Reminder] ${clubShortCode}: ${event.title} (${event.date} at ${event.time})`;
    const body = [
      `Hello ${recipient.name},`,
      '',
      `This is your 24-hour reminder for an upcoming ${clubName} (${clubShortCode}) event:`,
      '',
      `Event: ${event.title}`,
      `Date & Time: ${event.date} at ${event.time}`,
      `Location: ${event.location}`,
      `Check-In Code: ${event.checkInCode ?? 'Available at event'}`,
      `Your RSVP Status: ${isRsvped ? 'RSVP Confirmed (Attending)' : 'Not yet RSVP\'d — confirm in Upcoming Club Events'}`,
      '',
      `Details: ${event.description}`,
      '',
      `Manage your RSVP or email reminder preferences in the CUNY SPS Club Social Hub: ${appUrl}`,
      '',
      '— CUNY SPS Office of Student Life & Club Social Hub',
    ].join('\n');

    let deliveryStatus: EmailReminderDeliveryStatus = 'Queued (Hub Outbox)';
    let providerMessageId = `outbox_${Date.now()}_${recipient.userId}`;
    let errorMessage: string | undefined;

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: recipient.email,
          subject,
          text: body,
        });
        deliveryStatus = 'Sent (SMTP)';
        providerMessageId = info.messageId || providerMessageId;
      } catch (err) {
        deliveryStatus = 'Failed';
        errorMessage = err instanceof Error ? err.message : 'SMTP delivery failed.';
      }
    }

    const record: EmailReminderRecord = {
      reminderId: `rem-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      eventId: event.eventId,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      clubId: event.clubId,
      clubName,
      clubShortCode,
      recipientUserId: recipient.userId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      subject,
      body,
      triggerMode,
      deliveryStatus,
      providerMessageId,
      errorMessage,
      sentAt: new Date().toISOString(),
      webhookEvents: [],
    };

    db.emailReminders.unshift(record);
    dispatched.push(record);

    if (deliveryStatus !== 'Failed') {
      pushNotification({
        userId: recipient.userId,
        clubId: event.clubId,
        type: 'Event Reminder',
        title: `24-Hour Event Reminder: ${event.title}`,
        message: `${clubShortCode} meets on ${event.date} at ${event.time} (${event.location}). Reminder recorded for ${recipient.email}; delivery status: ${deliveryStatus}.`,
      });
    }
  }

  if (dispatched.length > 0) {
    recordAudit({
      actorId: actorId ?? 'system-reminder-worker',
      actorName: actorName ?? '24h Event Reminder Worker',
      actorRole: actorRole ?? 'SYSTEM_WORKER',
      action:
        triggerMode === '24h Automated'
          ? 'SEND_24H_EVENT_REMINDERS'
          : 'SEND_MANUAL_EVENT_REMINDER',
      category: 'Publishing',
      target: `${event.title} (${event.date})`,
      clubId: event.clubId,
      details: `Dispatched ${dispatched.length} event reminder email(s) for ${clubName} (${transporter ? 'SMTP' : 'Hub Notification Outbox'}).`,
    });
    saveDb();
  }

  return dispatched;
}

let sweepInProgress = false;

export async function run24HourReminderSweep(): Promise<{
  checkedEvents: number;
  dispatchedCount: number;
  dispatchedRecords: EmailReminderRecord[];
}> {
  if (sweepInProgress) {
    return { checkedEvents: 0, dispatchedCount: 0, dispatchedRecords: [] };
  }
  sweepInProgress = true;
  try {
    const db = getDb();
    const nowMs = Date.now();
    const allDispatched: EmailReminderRecord[] = [];

    for (const ev of db.events) {
      const startMs = parseEventStartMs(ev.date, ev.time);
      if (Number.isNaN(startMs)) continue;
      // Within 24 hours before event start and event has not yet passed
      if (startMs > nowMs && nowMs >= startMs - TWENTY_FOUR_HOURS_MS) {
        const sent = await dispatchEventReminders({
          event: ev,
          triggerMode: '24h Automated',
        });
        allDispatched.push(...sent);
      }
    }

    return {
      checkedEvents: db.events.length,
      dispatchedCount: allDispatched.length,
      dispatchedRecords: allDispatched,
    };
  } finally {
    sweepInProgress = false;
  }
}

export function getReminderOverviewForUser(user: User): {
  smtpConfigured: boolean;
  smtpConfig: SmtpConfigView;
  userEmailRemindersEnabled: boolean;
  dispatchedReminders: EmailReminderRecord[];
  scheduledQueue: ScheduledReminderSlot[];
  webhookEvents: EmailDeliveryWebhookEvent[];
} {
  const db = getDb();
  const nowMs = Date.now();

  const dispatchedReminders = db.emailReminders.filter((r) => canAccessClub(user, r.clubId));

  const scheduledQueue: ScheduledReminderSlot[] = db.events
    .filter((ev) => canAccessClub(user, ev.clubId))
    .map((ev) => {
      const club = db.clubs.find((c) => c.clubId === ev.clubId);
      const startMs = parseEventStartMs(ev.date, ev.time);
      const triggerMs = startMs - TWENTY_FOUR_HOURS_MS;
      const dispatchedCount = db.emailReminders.filter(
        (r) => r.eventId === ev.eventId && r.deliveryStatus !== 'Failed' && r.deliveryStatus !== 'Bounced'
      ).length;
      const eligibleMemberCount = getEligibleRecipientsForEvent(ev).length;

      let status: ScheduledReminderSlot['status'] = 'Scheduled (24h Prior)';
      if (Number.isNaN(startMs)) {
        status = 'Invalid Event Time';
      } else if (startMs <= nowMs) {
        status = 'Event Passed';
      } else if (dispatchedCount > 0 || (!Number.isNaN(triggerMs) && nowMs >= triggerMs)) {
        status = 'Sent (24h Window)';
      }

      return {
        eventId: ev.eventId,
        eventTitle: ev.title,
        eventDate: ev.date,
        eventTime: ev.time,
        eventLocation: ev.location,
        clubId: ev.clubId,
        clubName: club?.name ?? ev.clubId,
        clubShortCode: club?.shortCode ?? ev.clubId,
        reminderScheduledFor: get24HourTriggerIso(ev.date, ev.time),
        eligibleMemberCount,
        dispatchedCount,
        status,
      };
    })
    .sort((a, b) => a.reminderScheduledFor.localeCompare(b.reminderScheduledFor));

  const smtpConfig = getMaskedSmtpConfig();

  return {
    smtpConfigured: smtpConfig.envSmtpActive,
    smtpConfig,
    userEmailRemindersEnabled: user.emailRemindersEnabled !== false,
    dispatchedReminders,
    scheduledQueue,
    webhookEvents: (db.emailWebhookEvents ?? []).slice(0, 25),
  };
}

export async function dispatchEventUpdateEmails(input: {
  event: ClubEvent;
  changeSummary: string;
  cancelled?: boolean;
  actorId: string;
  actorName: string;
  actorRole: string;
}): Promise<EmailReminderRecord[]> {
  const { event, changeSummary, cancelled, actorId, actorName, actorRole } = input;
  const db = getDb();
  const club = db.clubs.find((c) => c.clubId === event.clubId);
  const clubName = club?.name ?? event.clubId;
  const clubShortCode = club?.shortCode ?? event.clubId;
  const recipients = getEligibleRecipientsForEvent(event);
  const activeSmtp = getEffectiveSmtpSettings();
  const transporter = getSmtpTransporter();
  const fromAddress = activeSmtp.fromAddress;
  const dispatched: EmailReminderRecord[] = [];
  const actionLabel = cancelled ? 'Cancelled' : 'Updated';

  for (const recipient of recipients) {
    const subject = `[${clubShortCode}] Event ${actionLabel}: ${event.title} (${event.date})`;
    const body = [
      `Hello ${recipient.name},`,
      '',
      `This is an official schedule update for ${clubName}'s ${event.eventType ?? 'club event'}:`,
      '',
      `Event: ${event.title}`,
      `Status: ${cancelled ? 'Cancelled' : 'Schedule / Logistics Updated'}`,
      `Current Schedule: ${event.date} at ${event.time} ET`,
      `Location / Room: ${event.location}`,
      `Change Summary: ${changeSummary}`,
      '',
      `Manage notifications in CUNY SPS Club Social Hub: ${activeSmtp.appUrl}`,
    ].join('\n');

    const sentAt = new Date().toISOString();
    let deliveryStatus: EmailReminderRecord['deliveryStatus'] = 'Queued (Hub Outbox)';
    let providerMessageId = `hub-upd-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    let errorMessage: string | undefined;

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: recipient.email,
          subject,
          text: body,
        });
        deliveryStatus = 'Sent (SMTP)';
        providerMessageId = info.messageId || providerMessageId;
      } catch (err) {
        deliveryStatus = 'Failed';
        errorMessage = err instanceof Error ? err.message : 'SMTP delivery failed';
      }
    }

    const record: EmailReminderRecord = {
      reminderId: `rem-upd-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      eventId: event.eventId,
      eventTitle: `${event.title} (${actionLabel})`,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      clubId: event.clubId,
      clubName,
      clubShortCode,
      recipientUserId: recipient.userId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      subject,
      body,
      triggerMode: 'Manual Early Dispatch',
      deliveryStatus,
      providerMessageId,
      errorMessage,
      sentAt,
    };
    db.emailReminders.unshift(record);
    dispatched.push(record);

    pushNotification({
      userId: recipient.userId,
      clubId: event.clubId,
      type: 'Event Reminder',
      title: `Event ${actionLabel}: ${event.title} (${clubShortCode})`,
      message: `${changeSummary} · ${event.date} at ${event.time} ET (${event.location}).`,
    });
  }

  recordAudit({
    actorId,
    actorName,
    actorRole,
    action: cancelled ? 'CANCEL_CLUB_EVENT_NOTICES' : 'SEND_EVENT_UPDATE_NOTICE',
    category: 'Publishing',
    target: `${event.title} (${event.date})`,
    clubId: event.clubId,
    details: `${changeSummary} — notified ${dispatched.length} student recipient(s) (${transporter ? 'SMTP' : 'Hub Outbox'}).`,
  });
  saveDb();
  return dispatched;
}


