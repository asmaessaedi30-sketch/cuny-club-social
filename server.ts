import 'dotenv/config';
import { DraftUpdateError, updateDraft } from './server/draftUpdates.ts';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  adaptPostAcrossPlatforms,
  generateAccessibilityReview,
  generateClubContentIdeas,
  generateEventCaption,
  generateImageAltText,
  generateInboxReplyDraft,
  generateWhatsAppAlertDraft,
  searchGroundedResearch,
  sendAssistantChatMessage,
  transcribeAudioClip,
  type ChatTurnInput,
  type SupportedChatModel,
} from './server/gemini.ts';
import { buildIcsFeed } from './server/ics.ts';
import {
  PERMISSIONS_MATRIX,
  canAccessClub,
  canAdminManageClub,
  getUserEffectiveClubRole,
  hasClubCapability,
  isAdminUser,
} from './server/rbac.ts';
import {
  dispatchEventReminders,
  dispatchEventUpdateEmails,
  get24HourTriggerIso,
  getMaskedSmtpConfig,
  getReminderOverviewForUser,
  processEmailDeliveryWebhook,
  resetSmtpTransporterCache,
  run24HourReminderSweep,
  testSmtpConfiguration,
} from './server/reminders.ts';
import { OFFICIAL_CLUB_RESOURCES } from './server/resources.ts';
import { getDb, pushNotification, recordAudit, resetDb, saveDb } from './server/store.ts';
import type {
  AccountRequestStatus,
  AnnouncementPriority,
  BlogPostCategory,
  BlogPostStatus,
  BroadcastChannel,
  BroadcastPriority,
  BudgetIncreaseRequest,
  BudgetSplitAllocation,
  Club,
  ClubAnnouncement,
  ClubBlogComment,
  ClubBlogPost,
  ClubBlogTaxonomy,
  ClubBroadcastMessage,
  ClubBroadcastReply,
  ClubBudgetSummary,
  ClubCharterRenewalSummary,
  ClubEngagementFunnel,
  ClubEvent,
  ClubEventType,
  ClubJoinRequest,
  ClubMembership,
  ClubProjectTask,
  ClubTaskAssigneeOption,
  ClubTaskCategory,
  CrossClubReshareRequest,
  EventAttendanceRecord,
  EventFeedbackResponse,
  EventFormat,
  EventRecurrence,
  ForumCategory,
  ForumReply,
  ForumThread,
  InboxThreadTag,
  OfficerTransitionChecklist,
  PeerReviewComment,
  Post,
  PublicClubSummary,
  PublishAttempt,
  ResourceSubmission,
  ResourceSubmissionStatus,
  ResourceSubmissionType,
  SocialAccount,
  TaskPriority,
  TaskStatus,
  User,
  WhatsAppAlertCategory,
  WhatsAppAlertMessage,
  WhatsAppDeliveryMode,
  WhatsAppGroupCategory,
  WhatsAppGroupLink,
} from './src/types.ts';

interface AuthedRequest extends Request {
  currentUser?: User;
}

function roundCurrency(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function sanitizeSocialAccount(account: SocialAccount): SocialAccount {
  const db = getDb();
  const expiresMs = Date.parse(account.connection.expiresAt);
  const tokenExpiresInDays = Number.isNaN(expiresMs)
    ? undefined
    : Math.ceil((expiresMs - Date.now()) / 86400000);
  return {
    ...account,
    hasLiveMetaToken: Boolean(db.metaTokenSecrets?.[account.accountId]),
    tokenExpiresInDays,
  };
}

function sanitizeWhatsAppGroup(
  group: WhatsAppGroupLink,
  includeOfficerFields: boolean
): WhatsAppGroupLink {
  const db = getDb();
  const base: WhatsAppGroupLink = {
    ...group,
    hasApiToken: Boolean(db.whatsappSecrets?.[group.groupId]),
  };
  if (includeOfficerFields) {
    return base;
  }
  return {
    ...base,
    inviteLink: group.showInviteToMembers ? group.inviteLink : '',
    webhookUrl: undefined,
    whatsappPhoneNumberId: undefined,
    whatsappRecipientJid: undefined,
  };
}

function formatWhatsAppBroadcastText(
  clubName: string,
  category: WhatsAppAlertCategory,
  title: string,
  messageBody: string
): string {
  return `[${clubName} — ${category}]\n*${title.trim()}*\n\n${messageBody.trim()}`;
}

function formatClubMessagingWhatsAppText(
  clubName: string,
  priority: BroadcastPriority,
  title: string,
  body: string
): string {
  const priorityTag = priority === 'Standard' ? 'Club Broadcast' : `${priority} Broadcast`;
  return `[${clubName} — ${priorityTag}]\n*${title.trim()}*\n\n${body.trim()}`;
}

function sortClubBroadcasts(items: ClubBroadcastMessage[]): ClubBroadcastMessage[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function slugifyBlogTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 72) || 'club-article';
}

function estimateReadingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

function validateBlogCoverImageUrl(rawUrl?: string): { value?: string; error?: string } {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return { value: undefined };
  if (trimmed.length > 900_000) {
    return { error: 'Cover image is too large. Please upload an image under 650 KB or use a link.' };
  }
  const allowed =
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/assets/');
  if (!allowed) {
    return {
      error: 'Cover image must be an uploaded image, /assets/... path, or https:// / http:// link.',
    };
  }
  return { value: trimmed };
}

function enrichBlogPost(post: ClubBlogPost): ClubBlogPost {
  const db = getDb();
  const club = db.clubs.find((c) => c.clubId === post.clubId);
  return {
    ...post,
    clubName: club?.name ?? post.clubName,
    clubShortCode: club?.shortCode ?? post.clubShortCode,
    clubLogoUrl: club?.logoUrl,
    clubAccentColor: club?.accentColor,
  };
}

function sortBlogPosts(posts: ClubBlogPost[]): ClubBlogPost[] {
  return [...posts].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const aTime = a.publishedAt ?? a.updatedAt ?? a.createdAt;
    const bTime = b.publishedAt ?? b.updatedAt ?? b.createdAt;
    return bTime.localeCompare(aTime);
  });
}

async function dispatchWhatsAppAlert(
  group: WhatsAppGroupLink,
  clubName: string,
  alert: WhatsAppAlertMessage
): Promise<{
  deliveryStatus: WhatsAppAlertMessage['deliveryStatus'];
  deliveryDetails: string;
}> {
  const db = getDb();
  const formattedText = formatWhatsAppBroadcastText(
    clubName,
    alert.category,
    alert.title,
    alert.messageBody
  );

  if (group.deliveryMode === 'Webhook Relay' && group.webhookUrl?.trim()) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const hookRes = await fetch(group.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'CUNY SPS Club Social Hub',
          clubId: alert.clubId,
          clubName,
          groupId: group.groupId,
          groupName: group.groupName,
          category: alert.category,
          title: alert.title,
          messageBody: alert.messageBody,
          formattedText,
          linkedEventId: alert.linkedEventId,
          sentBy: alert.sentByName,
          sentAt: alert.sentAt,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (hookRes.ok) {
        return {
          deliveryStatus: 'Delivered via Webhook',
          deliveryDetails: `Dispatched HTTP POST webhook to relay (${hookRes.status}).`,
        };
      }
      return {
        deliveryStatus: 'Failed',
        deliveryDetails: `Webhook relay responded HTTP ${hookRes.status}. Use Open in WhatsApp fallback to send immediately.`,
      };
    } catch (err) {
      return {
        deliveryStatus: 'Failed',
        deliveryDetails:
          err instanceof Error
            ? `Webhook relay unreachable (${err.message}). Use Open in WhatsApp fallback.`
            : 'Webhook relay unreachable. Use Open in WhatsApp fallback.',
      };
    }
  }

  if (group.deliveryMode === 'WhatsApp Business Cloud API') {
    const token = db.whatsappSecrets?.[group.groupId];
    if (token && group.whatsappPhoneNumberId?.trim() && group.whatsappRecipientJid?.trim()) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const cloudRes = await fetch(
          `https://graph.facebook.com/v21.0/${encodeURIComponent(group.whatsappPhoneNumberId.trim())}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: group.whatsappRecipientJid.trim(),
              type: 'text',
              text: { body: formattedText },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);
        if (cloudRes.ok) {
          return {
            deliveryStatus: 'Delivered via Cloud API',
            deliveryDetails: 'Dispatched via Meta WhatsApp Business Cloud API v21.0.',
          };
        }
        const errText = await cloudRes.text().catch(() => '');
        return {
          deliveryStatus: 'Failed',
          deliveryDetails: `Cloud API error (${cloudRes.status})${errText ? `: ${errText.slice(0, 120)}` : ''}.`,
        };
      } catch (err) {
        return {
          deliveryStatus: 'Failed',
          deliveryDetails:
            err instanceof Error
              ? `Cloud API request failed (${err.message}).`
              : 'Cloud API request failed.',
        };
      }
    }
    return {
      deliveryStatus: 'Ready for WhatsApp Share',
      deliveryDetails:
        'Cloud API credentials incomplete; alert logged cleanly for 1-click Open in WhatsApp delivery.',
    };
  }

  return {
    deliveryStatus: 'Ready for WhatsApp Share',
    deliveryDetails: 'Logged in Club WhatsApp Outbox with 1-click WhatsApp share dispatch.',
  };
}

function isClubFacultyAdvisor(user: User, clubId: string): boolean {
  if (user.systemRole === 'SL_SUPER_ADMIN') return true;
  if (isAdminUser(user) && canAdminManageClub(user, clubId)) return true;
  const db = getDb();
  const club = db.clubs.find((c) => c.clubId === clubId);
  if (club && club.facultyAdvisor.toLowerCase() === user.name.toLowerCase()) {
    return true;
  }
  const mem = db.memberships.find(
    (m) => m.clubId === clubId && m.userId === user.userId && m.status === 'Active'
  );
  return Boolean(mem && (mem.officerTitle ?? '').toLowerCase() === 'faculty advisor');
}

function findFacultyAdvisorUsers(clubId: string): User[] {
  const db = getDb();
  const club = db.clubs.find((c) => c.clubId === clubId);
  const advisorMemIds = new Set(
    db.memberships
      .filter(
        (m) =>
          m.clubId === clubId &&
          m.status === 'Active' &&
          (m.officerTitle ?? '').toLowerCase() === 'faculty advisor'
      )
      .map((m) => m.userId)
  );
  return db.users.filter(
    (u) =>
      u.status === 'Active' &&
      (advisorMemIds.has(u.userId) ||
        (club ? u.name.toLowerCase() === club.facultyAdvisor.toLowerCase() : false))
  );
}

function computeClubBudgetSummary(clubId: string): ClubBudgetSummary {
  const db = getDb();
  const club = db.clubs.find((c) => c.clubId === clubId);
  const allocatedUsd = roundCurrency(club?.semesterBudgetAllocatedUsd ?? 500);
  let encumberedUsd = 0;
  let reimbursedUsd = 0;

  for (const sub of db.resourceSubmissions ?? []) {
    const amount = Number(sub.amountUsd ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    let share = 0;
    if (Array.isArray(sub.budgetSplits) && sub.budgetSplits.length > 0) {
      const splitEntry = sub.budgetSplits.find((s) => s.clubId === clubId);
      if (splitEntry) {
        share = Math.max(0, Math.min(100, Number(splitEntry.sharePct) || 0)) / 100;
      }
    } else if (sub.clubId === clubId) {
      share = 1;
    }
    if (share <= 0) continue;

    const portion = amount * share;
    if (sub.type === 'Financial Reimbursement' && sub.status === 'Approved') {
      reimbursedUsd += portion;
    } else if (
      sub.type === 'Event Proposal' &&
      ['Submitted', 'Under Review', 'Approved'].includes(sub.status)
    ) {
      encumberedUsd += portion;
    }
  }

  encumberedUsd = roundCurrency(encumberedUsd);
  reimbursedUsd = roundCurrency(reimbursedUsd);
  const remainingUsd = roundCurrency(Math.max(0, allocatedUsd - encumberedUsd - reimbursedUsd));

  return {
    clubId,
    clubName: club?.name ?? clubId,
    clubShortCode: club?.shortCode ?? clubId,
    allocatedUsd,
    encumberedUsd,
    reimbursedUsd,
    remainingUsd,
  };
}

function computeClubEngagementFunnel(clubId: string): ClubEngagementFunnel {
  const db = getDb();
  const clubMetrics = db.analytics.filter((m) => m.clubId === clubId);
  const socialReach = clubMetrics.reduce((s, m) => s + m.reach, 0);
  const socialEngagements = clubMetrics.reduce((s, m) => s + m.engagementCount, 0);

  const clubRecords = (db.eventAttendanceRecords ?? []).filter(
    (r) => r.clubId === clubId || r.coSponsorClubIds?.includes(clubId)
  );
  const syncedIds = new Set(clubRecords.map((r) => r.recordId));
  const upcomingUnsyncedEvents = db.events.filter(
    (e) =>
      (e.clubId === clubId || e.coSponsorClubIds?.includes(clubId)) &&
      (!e.syncedAnalyticsRecordId || !syncedIds.has(e.syncedAnalyticsRecordId))
  );

  const eventRsvps =
    clubRecords.reduce((s, r) => s + r.registeredCount, 0) +
    upcomingUnsyncedEvents.reduce((s, e) => s + (e.rsvpUserIds?.length ?? 0), 0);

  const verifiedCheckIns =
    clubRecords.reduce((s, r) => s + r.attendedCount, 0) +
    upcomingUnsyncedEvents.reduce(
      (s, e) => s + (e.checkedInUserIds?.length ?? 0) + (e.guestWalkInCount ?? 0),
      0
    );

  const clubJoins = (db.joinRequests ?? []).filter((j) => j.clubId === clubId);
  const joinRequestsSubmitted = clubJoins.length;
  const newMembersApproved = clubJoins.filter((j) => j.status === 'Approved').length;

  return {
    socialReach,
    socialEngagements,
    eventRsvps,
    verifiedCheckIns,
    joinRequestsSubmitted,
    newMembersApproved,
  };
}

function enrichEventForUser(ev: ClubEvent, userId?: string): ClubEvent {
  const db = getDb();
  const club = db.clubs.find((c) => c.clubId === ev.clubId);
  const rsvpList = Array.isArray(ev.rsvpUserIds) ? ev.rsvpUserIds : [];
  const waitlistList = Array.isArray(ev.waitlistUserIds) ? ev.waitlistUserIds : [];
  const checkedInList = Array.isArray(ev.checkedInUserIds) ? ev.checkedInUserIds : [];
  const modes = ev.rsvpModes ?? {};
  const guestCount = ev.guestWalkInCount ?? 0;

  let inPersonConfirmedCount = 0;
  let virtualConfirmedCount = 0;
  for (const uid of rsvpList) {
    const mode = modes[uid] ?? (ev.inPersonCapacity ? 'In-Person' : 'Virtual');
    if (mode === 'In-Person') inPersonConfirmedCount += 1;
    else virtualConfirmedCount += 1;
  }

  const feedbackList = Array.isArray(ev.feedbackResponses) ? ev.feedbackResponses : [];
  const feedbackCount = feedbackList.length;
  const avgFeedbackRating =
    feedbackCount > 0
      ? Math.round((feedbackList.reduce((s, f) => s + f.rating, 0) / feedbackCount) * 10) / 10
      : undefined;

  const coSponsorClubCodes = (ev.coSponsorClubIds ?? [])
    .map((id) => db.clubs.find((c) => c.clubId === id)?.shortCode ?? id)
    .filter(Boolean);

  const reminderSentCount = db.emailReminders.filter(
    (r) => r.eventId === ev.eventId && r.deliveryStatus !== 'Failed' && r.deliveryStatus !== 'Bounced'
  ).length;

  return {
    ...ev,
    eventType: ev.eventType ?? 'Campus Event',
    clubName: club?.name ?? ev.clubId,
    clubShortCode: club?.shortCode ?? ev.clubId,
    clubLogoUrl: club?.logoUrl,
    clubAccentColor: club?.accentColor,
    coSponsorClubIds: ev.coSponsorClubIds ?? [],
    coSponsorClubCodes,
    rsvpUserIds: rsvpList,
    rsvpCount: rsvpList.length,
    userHasRsvped: userId ? rsvpList.includes(userId) : false,
    waitlistUserIds: waitlistList,
    waitlistCount: waitlistList.length,
    userOnWaitlist: userId ? waitlistList.includes(userId) : false,
    inPersonConfirmedCount,
    virtualConfirmedCount,
    userRsvpMode: userId ? modes[userId] : undefined,
    checkedInUserIds: checkedInList,
    guestWalkInCount: guestCount,
    checkedInCount: checkedInList.length + guestCount,
    userCheckedIn: userId ? checkedInList.includes(userId) : false,
    feedbackResponses: feedbackList,
    feedbackCount,
    avgFeedbackRating,
    userSubmittedFeedback: userId ? feedbackList.some((f) => f.userId === userId) : false,
    reminderSentCount,
    reminderScheduledFor: get24HourTriggerIso(ev.date, ev.time),
  };
}

function scanAndAlertExpiringTokens(): number {
  const db = getDb();
  const nowMs = Date.now();
  let createdAlerts = 0;

  for (const account of db.socialAccounts) {
    if (account.connection.status !== 'Connected') continue;
    const expiresMs = Date.parse(account.connection.expiresAt);
    if (Number.isNaN(expiresMs)) continue;
    const daysLeft = Math.ceil((expiresMs - nowMs) / 86400000);
    if (daysLeft > 14) continue;

    const bucket = daysLeft <= 0 ? 'expired' : daysLeft <= 7 ? '7d' : '14d';
    const marker = `[${account.accountId}:${bucket}]`;
    const alreadyAlerted = db.notifications.some(
      (n) => n.type === 'Security' && n.message.includes(marker)
    );
    if (alreadyAlerted) continue;

    const club = db.clubs.find((c) => c.clubId === account.clubId);
    const title =
      daysLeft <= 0
        ? `OAuth Token Expired: ${account.handle} (${club?.shortCode ?? account.clubId})`
        : `${daysLeft <= 7 ? 'Urgent 7-Day' : '14-Day'} Token Expiry Alert: ${account.handle}`;
    const message =
      daysLeft <= 0
        ? `${account.platform} credential has expired. Custodian ${account.custodian.staffName} must reconnect ${account.handle}. ${marker}`
        : `${account.platform} OAuth token for ${club?.name ?? account.clubId} expires in ${daysLeft} day(s). Coordinate renewal with custodian ${account.custodian.staffName}. ${marker}`;

    const recipientIds = Array.from(new Set([account.custodian.userId, 'usr-sl-super']));
    for (const uid of recipientIds) {
      pushNotification({
        userId: uid,
        clubId: account.clubId,
        type: 'Security',
        title,
        message,
      });
    }

    recordAudit({
      actorId: 'system-token-monitor',
      actorName: 'Token Expiry Monitor',
      actorRole: 'SYSTEM_WORKER',
      action: 'TOKEN_EXPIRY_ALERT',
      category: 'Integration',
      target: `${account.platform} ${account.handle}`,
      clubId: account.clubId,
      details: `${title} (${bucket} window).`,
    });
    createdAlerts += 1;
  }

  if (createdAlerts > 0) saveDb();
  return createdAlerts;
}

async function executePostPublish(
  post: Post,
  actorName: string,
  actorId: string,
  actorRole: string
): Promise<Post> {
  const db = getDb();
  const now = new Date().toISOString();

  // Duplicate publication prevention: skip accounts that already succeeded for this post
  const alreadySucceededAccounts = new Set(
    post.publishAttempts.filter((a) => a.outcome === 'Success').map((a) => a.accountId)
  );

  const newAttempts: PublishAttempt[] = [];
  let anyFailed = false;

  for (const accountId of post.targetAccountIds) {
    if (alreadySucceededAccounts.has(accountId)) {
      continue;
    }
    const account = db.socialAccounts.find((a) => a.accountId === accountId && a.clubId === post.clubId);
    if (!account) {
      anyFailed = true;
      newAttempts.push({
        attemptId: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        postId: post.postId,
        accountId,
        platform: 'Facebook Pages',
        handle: 'unknown',
        outcome: 'Failed',
        errorCode: 'ACCOUNT_NOT_FOUND',
        errorMessage: 'Target social account is not registered to this club workspace.',
        nextAction: 'Select an approved connected account in Content Studio.',
        attemptedAt: now,
      });
      continue;
    }

    if (account.connection.status !== 'Connected') {
      anyFailed = true;
      newAttempts.push({
        attemptId: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        postId: post.postId,
        accountId: account.accountId,
        platform: account.platform,
        handle: account.handle,
        outcome: 'Failed',
        errorCode:
          account.connection.status === 'Expired' ? 'OAUTH_TOKEN_EXPIRED' : 'INTEGRATION_DISCONNECTED',
        errorMessage:
          account.connection.errorMessage ||
          `${account.platform} integration (${account.handle}) is currently ${account.connection.status}.`,
        nextAction: `Reconnect ${account.handle} in My Social Accounts, then retry publication (already-succeeded platforms will not duplicate).`,
        attemptedAt: now,
      });
      continue;
    }

    const liveToken = db.metaTokenSecrets?.[account.accountId];
    const messageBody =
      post.platformAdaptations?.[account.platform] ??
      `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''}`;

    if (liveToken && account.platform === 'Facebook Pages' && account.metaPageId) {
      try {
        const fbRes = await fetch(
          `https://graph.facebook.com/v21.0/${encodeURIComponent(account.metaPageId)}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: messageBody,
              access_token: liveToken,
            }),
          }
        );
        const fbJson = (await fbRes.json()) as { id?: string; error?: { message?: string; code?: number } };
        if (fbRes.ok && fbJson.id) {
          newAttempts.push({
            attemptId: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            postId: post.postId,
            accountId: account.accountId,
            platform: account.platform,
            handle: account.handle,
            outcome: 'Success',
            providerPostId: fbJson.id,
            attemptedAt: now,
          });
          continue;
        }
        anyFailed = true;
        newAttempts.push({
          attemptId: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          postId: post.postId,
          accountId: account.accountId,
          platform: account.platform,
          handle: account.handle,
          outcome: 'Failed',
          errorCode: `META_GRAPH_${fbJson.error?.code ?? fbRes.status}`,
          errorMessage: fbJson.error?.message || `Meta Graph API returned HTTP ${fbRes.status}`,
          nextAction: 'Verify the Page ID and Page Access Token in My Social Accounts -> Meta API Credentials.',
          attemptedAt: now,
        });
        continue;
      } catch (err) {
        anyFailed = true;
        newAttempts.push({
          attemptId: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          postId: post.postId,
          accountId: account.accountId,
          platform: account.platform,
          handle: account.handle,
          outcome: 'Failed',
          errorCode: 'META_GRAPH_NETWORK_ERROR',
          errorMessage: err instanceof Error ? err.message : 'Unable to reach graph.facebook.com.',
          nextAction: 'Check outbound network access or token settings in My Social Accounts.',
          attemptedAt: now,
        });
        continue;
      }
    }

    const prefix = account.platform === 'Facebook Pages' ? 'fb_graph' : 'ig_media';
    newAttempts.push({
      attemptId: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      postId: post.postId,
      accountId: account.accountId,
      platform: account.platform,
      handle: account.handle,
      outcome: 'Success',
      providerPostId: `${prefix}_${Math.floor(100000000 + Math.random() * 900000000)}`,
      attemptedAt: now,
    });
  }

  post.publishAttempts = [...post.publishAttempts, ...newAttempts];
  post.updatedAt = now;

  if (anyFailed) {
    post.status = 'Failed';
    recordAudit({
      actorId,
      actorName,
      actorRole,
      action: 'PUBLISH_ATTEMPT_FAILED',
      category: 'Publishing',
      target: `${post.postId} (${post.title})`,
      clubId: post.clubId,
      details: `One or more platform connectors reported errors; duplicate-publication protection active.`,
    });
    pushNotification({
      userId: actorId,
      clubId: post.clubId,
      type: 'Publishing',
      title: `Publishing failed for "${post.title}"`,
      message: 'Check My Social Accounts connection health and retry from Publishing History.',
    });
  } else {
    post.status = 'Published';
    post.publishedAt = now;
    recordAudit({
      actorId,
      actorName,
      actorRole,
      action: 'PUBLISH_SUCCEEDED',
      category: 'Publishing',
      target: `${post.postId} (${post.title})`,
      clubId: post.clubId,
      details: `Published to ${post.targetAccountIds.length} authorized social account(s).`,
    });
  }

  saveDb();
  return post;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Run initial token expiry check on boot
  scanAndAlertExpiringTokens();

  // Background scheduled publishing worker (PRD C5)
  let schedulerBusy = false;
  const schedulerInterval = setInterval(() => {
    if (schedulerBusy) return;
    schedulerBusy = true;
    void (async () => {
      try {
        const db = getDb();
        const nowMs = Date.now();
        const duePosts = db.posts.filter(
          (p) => p.status === 'Scheduled' && p.scheduledAt && new Date(p.scheduledAt).getTime() <= nowMs
        );
        for (const post of duePosts) {
          post.status = 'Publishing';
          await executePostPublish(post, 'Publishing Queue Worker', 'system-worker', 'SYSTEM_WORKER');
        }
        scanAndAlertExpiringTokens();
      } finally {
        schedulerBusy = false;
      }
    })();
  }, 10000);
  schedulerInterval.unref();

  // Automated 24-hour club event email reminder sweep
  void run24HourReminderSweep();
  const reminderInterval = setInterval(() => {
    void run24HourReminderSweep();
  }, 15000);
  reminderInterval.unref();

  // Auth middleware resolving verified CUNY identity
  app.use('/api', (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (
      req.path === '/auth/personas' ||
      req.path === '/auth/login' ||
      req.path === '/health' ||
      req.path === '/public/campus' ||
      req.path === '/public/campus.ics' ||
      /^\/public\/clubs\/[^/]+\/join-requests$/.test(req.path) ||
      /^\/clubs\/[^/]+\/calendar\.ics$/.test(req.path) ||
      req.path === '/webhooks/email-delivery'
    ) {
      next();
      return;
    }
    const userId = req.header('x-cuny-user-id');
    if (!userId) {
      res.status(401).json({ error: 'Institutional authentication required. Sign in via CUNY SSO.' });
      return;
    }
    const db = getDb();
    const user = db.users.find((u) => u.userId === userId);
    if (!user || user.status !== 'Active') {
      res.status(403).json({ error: 'Institutional account is inactive or access has been revoked.' });
      return;
    }
    req.currentUser = user;
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'cuny-sps-club-social-hub' });
  });

  app.get('/api/auth/personas', (_req, res) => {
    const db = getDb();
    const personas = db.users.map((user) => {
      const memberships = db.memberships
        .filter((m) => m.userId === user.userId && m.status === 'Active')
        .map((m) => {
          const club = db.clubs.find((c) => c.clubId === m.clubId);
          return {
            ...m,
            clubName: club?.name ?? m.clubId,
            clubShortCode: club?.shortCode ?? m.clubId,
            clubStatus: club?.status ?? 'Active',
          };
        });
      return { user, memberships };
    });
    res.json({ personas });
  });

  app.post('/api/auth/login', (req, res) => {
    const { userId, email } = req.body as { userId?: string; email?: string };
    const db = getDb();
    const user = db.users.find(
      (u) => (userId && u.userId === userId) || (email && u.email.toLowerCase() === email.toLowerCase())
    );
    if (!user) {
      res.status(404).json({ error: 'No verified CUNY SPS institutional identity matched those credentials.' });
      return;
    }
    if (user.status !== 'Active') {
      res.status(403).json({ error: 'Platform access for this institutional account has been revoked by Student Life.' });
      return;
    }
    user.lastLoginAt = new Date().toISOString();
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'DEMO_PERSONA_LOGIN',
      category: 'Authentication',
      target: user.identitySubject,
      details: `Demo persona selected (${user.email}); institutional identity was not verified.`,
    });
    const memberships = db.memberships
      .filter((m) => m.userId === user.userId && m.status === 'Active')
      .map((m) => {
        const club = db.clubs.find((c) => c.clubId === m.clubId);
        return {
          ...m,
          clubName: club?.name ?? m.clubId,
          clubShortCode: club?.shortCode ?? m.clubId,
          clubStatus: club?.status ?? 'Active',
        };
      });
    res.json({
      user,
      memberships,
      effectiveAdminRole: user.systemRole === 'STANDARD_USER' ? null : user.systemRole,
    });
  });

  app.get('/api/auth/session', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const db = getDb();
    const memberships = db.memberships
      .filter((m) => m.userId === user.userId && m.status === 'Active')
      .map((m) => {
        const club = db.clubs.find((c) => c.clubId === m.clubId);
        return {
          ...m,
          clubName: club?.name ?? m.clubId,
          clubShortCode: club?.shortCode ?? m.clubId,
          clubStatus: club?.status ?? 'Active',
        };
      });
    res.json({
      user,
      memberships,
      effectiveAdminRole: user.systemRole === 'STANDARD_USER' ? null : user.systemRole,
    });
  });

  // Public Campus Club Directory & Upcoming Public Events (no auth required)
  app.get('/api/public/campus', (_req, res) => {
    const db = getDb();
    const activeClubs = db.clubs.filter((c) => c.status === 'Active');
    const activeClubMap = new Map(activeClubs.map((c) => [c.clubId, c]));

    const clubs: PublicClubSummary[] = activeClubs.map((club) => {
      const clubMemberships = db.memberships.filter(
        (m) => m.clubId === club.clubId && m.status === 'Active'
      );
      const presidentMem =
        clubMemberships.find((m) => (m.officerTitle ?? '').toLowerCase() === 'president') ??
        clubMemberships.find((m) => m.role === 'CLUB_LEAD');
      const presidentUser = presidentMem
        ? db.users.find((u) => u.userId === presidentMem.userId)
        : undefined;
      const upcomingPublicEventsCount = db.events.filter(
        (ev) =>
          ev.clubId === club.clubId &&
          ev.isPublic !== false &&
          (ev.approvalStatus ?? 'Approved') === 'Approved'
      ).length;

      return {
        clubId: club.clubId,
        name: club.name,
        shortCode: club.shortCode,
        description: club.description,
        category: club.category,
        facultyAdvisor: club.facultyAdvisor,
        activeMemberCount: clubMemberships.length,
        upcomingPublicEventsCount,
        presidentName: presidentUser?.name,
        logoUrl: club.logoUrl,
        accentColor: club.accentColor,
        tagline: club.tagline,
        meetingSchedule: club.meetingSchedule,
        contactEmail: club.contactEmail,
        websiteUrl: club.websiteUrl,
      };
    });

    const publicEvents = db.events
      .filter(
        (ev) =>
          activeClubMap.has(ev.clubId) &&
          ev.isPublic !== false &&
          (ev.approvalStatus ?? 'Approved') === 'Approved'
      )
      .map((ev) => {
        const enriched = enrichEventForUser(ev);
        return {
          ...enriched,
          isPublic: true,
          approvalStatus: ev.approvalStatus ?? 'Approved',
        };
      })
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

    const publicBlogPosts = sortBlogPosts(
      (db.blogPosts ?? [])
        .filter(
          (bp) =>
            activeClubMap.has(bp.clubId) &&
            bp.status === 'Published' &&
            bp.visibility === 'Public Campus'
        )
        .map(enrichBlogPost)
    );

    const priorityCats = ['News', 'Event Recap', 'Member Spotlight'];
    const usedCats = Array.from(new Set(publicBlogPosts.map((bp) => bp.category).filter(Boolean)));
    const blogCategories = [
      ...priorityCats.filter((c) => usedCats.includes(c)),
      ...usedCats.filter((c) => !priorityCats.includes(c)).sort(),
    ];
    const blogTags = Array.from(
      new Set(publicBlogPosts.flatMap((bp) => bp.tags ?? []).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    res.json({ clubs, publicEvents, publicBlogPosts, blogCategories, blogTags });
  });

  // Public Unauthenticated Non-Member Student "Request to Join" Endpoint
  app.post('/api/public/clubs/:id/join-requests', (req: Request, res: Response) => {
    const clubId = String(req.params.id);
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId && c.status === 'Active');
    if (!club) {
      res.status(404).json({ error: 'Active student club not found.' });
      return;
    }

    const { studentName, studentEmail, departmentOrMajor, preferredInterest, reason } =
      req.body as {
        studentName?: string;
        studentEmail?: string;
        departmentOrMajor?: string;
        preferredInterest?: string;
        reason?: string;
      };

    const cleanName = studentName?.trim() ?? '';
    const cleanEmail = studentEmail?.trim().toLowerCase() ?? '';
    const cleanMajor = departmentOrMajor?.trim() ?? '';
    const cleanReason = reason?.trim() ?? '';

    if (!cleanName) {
      res.status(400).json({ error: 'Student full name is required.' });
      return;
    }
    if (
      !cleanEmail ||
      !/@(spsmail\.cuny\.edu|sps\.cuny\.edu|cuny\.edu)$/i.test(cleanEmail)
    ) {
      res.status(400).json({
        error: 'Please enter your CUNY institutional email (@spsmail.cuny.edu, @sps.cuny.edu, or @cuny.edu).',
      });
      return;
    }
    if (!cleanReason) {
      res.status(400).json({ error: 'Please share a brief note about why you would like to join.' });
      return;
    }

    let applicant = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (applicant) {
      const existingActive = db.memberships.find(
        (m) => m.clubId === clubId && m.userId === applicant!.userId && m.status === 'Active'
      );
      if (existingActive) {
        res.status(400).json({
          error: `An active membership already exists under ${cleanEmail} for ${club.name}.`,
        });
        return;
      }
      const existingPending = (db.joinRequests ?? []).find(
        (jr) => jr.clubId === clubId && jr.userId === applicant!.userId && jr.status === 'Pending'
      );
      if (existingPending) {
        res.status(400).json({
          error: `A pending Request to Join ${club.name} already exists for ${cleanEmail}.`,
        });
        return;
      }
    } else {
      applicant = {
        userId: `usr-pub-${Date.now().toString().slice(-6)}`,
        name: cleanName,
        email: cleanEmail,
        identitySubject: `cuny-sso|${cleanEmail.split('@')[0]}`,
        title: 'Prospective Student Member',
        departmentOrMajor: cleanMajor || 'CUNY SPS Student',
        systemRole: 'STANDARD_USER',
        status: 'Active',
        lastLoginAt: new Date().toISOString(),
      };
      db.users.push(applicant);
    }

    const joinReq: ClubJoinRequest = {
      joinRequestId: `jr-${Date.now().toString().slice(-6)}`,
      clubId: club.clubId,
      clubName: club.name,
      clubShortCode: club.shortCode,
      userId: applicant.userId,
      studentName: cleanName,
      studentEmail: cleanEmail,
      departmentOrMajor: cleanMajor || applicant.departmentOrMajor || 'CUNY SPS Student',
      reason: cleanReason,
      preferredInterest: preferredInterest?.trim() || 'General Member & Event Participant',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(db.joinRequests)) db.joinRequests = [];
    db.joinRequests.unshift(joinReq);

    const clubLeads = db.memberships.filter(
      (m) => m.clubId === clubId && m.status === 'Active' && m.role === 'CLUB_LEAD'
    );
    const notifyUserIds = new Set<string>(clubLeads.map((l) => l.userId));
    if (notifyUserIds.size === 0) {
      for (const admin of db.users) {
        if (admin.systemRole === 'SL_SUPER_ADMIN' && admin.status === 'Active') {
          notifyUserIds.add(admin.userId);
        }
      }
    }
    for (const targetId of notifyUserIds) {
      pushNotification({
        userId: targetId,
        clubId,
        type: 'Join Request',
        title: `New Request to Join ${club.shortCode}`,
        message: `${joinReq.studentName} (${joinReq.departmentOrMajor}) submitted a public Request to Join ${club.name}.`,
      });
    }

    recordAudit({
      actorId: applicant.userId,
      actorName: joinReq.studentName,
      actorRole: 'PROSPECTIVE_STUDENT',
      action: 'SUBMIT_PUBLIC_CLUB_JOIN_REQUEST',
      category: 'Membership',
      target: `${club.name} (${club.shortCode})`,
      clubId,
      details: `${joinReq.studentName} (${joinReq.studentEmail}) submitted a public Request to Join ${club.name}.`,
    });
    saveDb();
    res.status(201).json({ joinRequest: joinReq });
  });

  // Live iCalendar Subscription Feed URLs (no auth required for Apple/Google/Outlook calendar subscribe)
  app.get('/api/public/campus.ics', (_req, res) => {
    const db = getDb();
    const activeClubIds = new Set(db.clubs.filter((c) => c.status === 'Active').map((c) => c.clubId));
    const events = db.events
      .filter((ev) => activeClubIds.has(ev.clubId) && ev.isPublic !== false)
      .map((ev) => enrichEventForUser(ev))
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    const ics = buildIcsFeed(events, 'CUNY SPS Student Clubs — Campus Events');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="cuny-sps-campus.ics"');
    res.send(ics);
  });

  app.get('/api/clubs/:id/calendar.ics', (req, res) => {
    const clubId = String(req.params.id);
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).send('Club calendar not found.');
      return;
    }
    const events = db.events
      .filter(
        (ev) =>
          (ev.clubId === clubId || ev.coSponsorClubIds?.includes(clubId)) && ev.isPublic !== false
      )
      .map((ev) => enrichEventForUser(ev))
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    const ics = buildIcsFeed(events, `${club.name} (${club.shortCode}) Calendar`);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${club.shortCode.toLowerCase()}-calendar.ics"`);
    res.send(ics);
  });

  // List authorized clubs for current user with live governance status summary
  app.get('/api/clubs', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const db = getDb();
    const clubs = db.clubs
      .filter((club) => canAccessClub(user, club.clubId))
      .map((club) => {
        const clubAccounts = db.socialAccounts.filter((a) => a.clubId === club.clubId);
        const connectedAccountsCount = clubAccounts.filter(
          (a) => a.connection.status === 'Connected'
        ).length;
        const issueAccountsCount = clubAccounts.filter(
          (a) => a.connection.status !== 'Connected'
        ).length;
        const authorizedLeadersCount = db.memberships.filter(
          (m) => m.clubId === club.clubId && m.role === 'CLUB_LEAD' && m.status === 'Active'
        ).length;
        const pendingRequestsCount = db.accountRequests.filter(
          (r) =>
            r.clubId === club.clubId &&
            !['Connected', 'Rejected', 'Cancelled'].includes(r.status)
        ).length;

        let governanceStatus:
          | 'Compliant'
          | 'Attention Required'
          | 'Transition Scheduled'
          | 'Pending Approval'
          | 'Suspended' = 'Compliant';
        if (club.status === 'Pending Approval') {
          governanceStatus = 'Pending Approval';
        } else if (club.status === 'Suspended' || club.status === 'Archived') {
          governanceStatus = 'Suspended';
        } else if (issueAccountsCount > 0 || authorizedLeadersCount === 0) {
          governanceStatus = 'Attention Required';
        } else if (club.upcomingLeadershipChange || pendingRequestsCount > 0) {
          governanceStatus = 'Transition Scheduled';
        }

        return {
          ...club,
          budgetSummary: computeClubBudgetSummary(club.clubId),
          governanceSummary: {
            authorizedLeadersCount,
            connectedAccountsCount,
            issueAccountsCount,
            pendingRequestsCount,
            governanceStatus,
          },
        };
      });
    res.json({ clubs });
  });

  // Retrieve permitted club workspace
  app.get('/api/clubs/:id', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    if (!canAccessClub(user, clubId)) {
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: user.systemRole,
        action: 'UNAUTHORIZED_WORKSPACE_BLOCKED',
        category: 'Authentication',
        target: `${club.name} (${clubId})`,
        details: `Denied access attempt to unassociated club workspace per BR-019 tenant isolation.`,
      });
      res.status(403).json({
        error: `Access denied: ${user.name} is not authorized to access ${club.name}'s private workspace.`,
      });
      return;
    }

    const effectiveRole = getUserEffectiveClubRole(user, clubId);
    const socialAccounts = db.socialAccounts
      .filter((a) => a.clubId === clubId)
      .map(sanitizeSocialAccount);
    const posts = db.posts.filter((p) => p.clubId === clubId);
    const events = db.events
      .filter((e) => e.clubId === clubId || e.coSponsorClubIds?.includes(clubId))
      .map((ev) => enrichEventForUser(ev, user.userId));
    const accountRequests = db.accountRequests.filter((r) => r.clubId === clubId);
    const analytics = db.analytics.filter((m) => m.clubId === clubId);
    const invitations = db.invitations.filter((i) => i.clubId === clubId);
    const members = db.memberships
      .filter((m) => m.clubId === clubId)
      .map((m) => {
        const u = db.users.find((usr) => usr.userId === m.userId);
        return {
          ...m,
          name: u?.name ?? 'Unknown User',
          email: u?.email ?? '',
          departmentOrMajor: u?.departmentOrMajor ?? '',
          userStatus: u?.status ?? 'Active',
        };
      });
    const inboxMessages = hasClubCapability(user, clubId, 'VIEW_PRIVATE_MESSAGES')
      ? db.inboxMessages.filter((msg) => msg.clubId === clubId)
      : [];
    const notifications = db.notifications.filter(
      (n) => n.userId === user.userId || n.clubId === clubId
    );
    const auditLogs = hasClubCapability(user, clubId, 'VIEW_SECURITY_AUDIT_LOGS')
      ? db.auditLogs.filter((l) => l.clubId === clubId)
      : [];
    const canManageWhatsApp = hasClubCapability(user, clubId, 'CONNECT_EXISTING_SOCIAL_ACCOUNT');
    const whatsappGroups = (db.whatsappGroups ?? [])
      .filter((g) => g.clubId === clubId)
      .map((g) => sanitizeWhatsAppGroup(g, canManageWhatsApp));
    const whatsappMessages = (db.whatsappMessages ?? [])
      .filter((m) => m.clubId === clubId)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    const budgetIncreaseRequests = (db.budgetIncreaseRequests ?? [])
      .filter((r) => r.clubId === clubId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    const clubBroadcasts = sortClubBroadcasts(
      (db.clubBroadcasts ?? []).filter((b) => b.clubId === clubId)
    );

    res.json({
      club: {
        ...club,
        budgetSummary: computeClubBudgetSummary(clubId),
      },
      effectiveRole,
      socialAccounts,
      posts,
      events,
      accountRequests,
      analytics,
      invitations,
      members,
      inboxMessages,
      notifications,
      auditLogs,
      whatsappGroups,
      whatsappMessages,
      budgetIncreaseRequests,
      clubBroadcasts,
    });
  });

  const applyClubProfileUpdates = (
    club: Club,
    payload: {
      name?: string;
      shortCode?: string;
      category?: string;
      description?: string;
      facultyAdvisor?: string;
      logoUrl?: string | null;
      accentColor?: string | null;
      tagline?: string | null;
      meetingSchedule?: string | null;
      contactEmail?: string | null;
      websiteUrl?: string | null;
      upcomingLeadershipChange?: string | null;
    }
  ): { error?: string; changedFields: string[] } => {
    const changedFields: string[] = [];

    if (typeof payload.name === 'string') {
      const clean = payload.name.trim();
      if (!clean) return { error: 'Club name cannot be empty.', changedFields };
      if (clean !== club.name) {
        club.name = clean;
        changedFields.push('club name');
      }
    }
    if (typeof payload.shortCode === 'string') {
      const clean = payload.shortCode.trim().toUpperCase().slice(0, 18);
      if (!clean) return { error: 'Workspace short code cannot be empty.', changedFields };
      if (clean !== club.shortCode) {
        club.shortCode = clean;
        changedFields.push('short code');
      }
    }
    if (typeof payload.category === 'string') {
      const clean = payload.category.trim();
      if (clean && clean !== club.category) {
        club.category = clean;
        changedFields.push('category');
      }
    }
    if (typeof payload.description === 'string') {
      const clean = payload.description.trim();
      if (clean && clean !== club.description) {
        club.description = clean;
        changedFields.push('description');
      }
    }
    if (typeof payload.facultyAdvisor === 'string') {
      const clean = payload.facultyAdvisor.trim();
      if (clean && clean !== club.facultyAdvisor) {
        club.facultyAdvisor = clean;
        changedFields.push('faculty advisor');
      }
    }
    if (payload.logoUrl !== undefined) {
      const cleanLogo = (payload.logoUrl ?? '').trim();
      if (cleanLogo) {
        const isSafeLogo =
          cleanLogo === '__none__' ||
          cleanLogo.startsWith('data:image/') ||
          cleanLogo.startsWith('/assets/') ||
          cleanLogo.startsWith('/') ||
          cleanLogo.startsWith('https://') ||
          cleanLogo.startsWith('http://');
        if (!isSafeLogo) {
          return {
            error: 'Profile picture must be an uploaded image or a valid HTTP(S)/local asset URL.',
            changedFields,
          };
        }
        if (cleanLogo.length > 750_000) {
          return {
            error: 'Uploaded club profile picture is too large (max ~500 KB encoded).',
            changedFields,
          };
        }
      }
      const nextLogo = cleanLogo || undefined;
      if (nextLogo !== club.logoUrl) {
        club.logoUrl = nextLogo;
        changedFields.push('profile picture');
      }
    }
    if (payload.accentColor !== undefined) {
      const cleanAccent = (payload.accentColor ?? '').trim();
      if (cleanAccent && !/^#[0-9a-fA-F]{3,8}$/.test(cleanAccent)) {
        return { error: 'Accent color must be a valid hex code (e.g., #004B87).', changedFields };
      }
      const nextAccent = cleanAccent || undefined;
      if (nextAccent !== club.accentColor) {
        club.accentColor = nextAccent;
        changedFields.push('accent color');
      }
    }
    if (payload.tagline !== undefined) {
      const nextTagline = (payload.tagline ?? '').trim() || undefined;
      if (nextTagline !== club.tagline) {
        club.tagline = nextTagline;
        changedFields.push('tagline');
      }
    }
    if (payload.meetingSchedule !== undefined) {
      const nextSchedule = (payload.meetingSchedule ?? '').trim() || undefined;
      if (nextSchedule !== club.meetingSchedule) {
        club.meetingSchedule = nextSchedule;
        changedFields.push('meeting schedule');
      }
    }
    if (payload.contactEmail !== undefined) {
      const nextEmail = (payload.contactEmail ?? '').trim() || undefined;
      if (nextEmail !== club.contactEmail) {
        club.contactEmail = nextEmail;
        changedFields.push('contact email');
      }
    }
    if (payload.websiteUrl !== undefined) {
      const nextUrl = (payload.websiteUrl ?? '').trim() || undefined;
      if (nextUrl && !/^https?:\/\//i.test(nextUrl)) {
        return { error: 'Website or social hub link must start with https:// or http://.', changedFields };
      }
      if (nextUrl !== club.websiteUrl) {
        club.websiteUrl = nextUrl;
        changedFields.push('website URL');
      }
    }
    if (payload.upcomingLeadershipChange !== undefined) {
      const nextNote = (payload.upcomingLeadershipChange ?? '').trim() || undefined;
      if (nextNote !== club.upcomingLeadershipChange) {
        club.upcomingLeadershipChange = nextNote;
        changedFields.push('leadership transition note');
      }
    }

    return { changedFields };
  };

  app.patch('/api/clubs/:id', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'INVITE_CLUB_MEMBERS')) {
      res.status(403).json({ error: 'Only authorized Club Leads or Student Life Administrators can edit workspace details.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }
    const result = applyClubProfileUpdates(club, req.body ?? {});
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    if (result.changedFields.length > 0) {
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
        action: 'UPDATE_CLUB_PROFILE',
        category: 'Governance',
        target: `${club.name} (${club.shortCode})`,
        clubId,
        details: `Updated ${result.changedFields.join(', ')}.`,
      });
    }
    saveDb();
    res.json({
      club: {
        ...club,
        budgetSummary: computeClubBudgetSummary(clubId),
      },
    });
  });

  // Admin Overview (Student Life Dashboard)
  app.get('/api/admin/overview', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Student Life Administrator privileges required.' });
      return;
    }
    const db = getDb();
    const scopedClubs = db.clubs.filter((c) => canAdminManageClub(user, c.clubId));
    const scopedClubIds = new Set(scopedClubs.map((c) => c.clubId));

    const socialAccounts = db.socialAccounts.filter((a) => scopedClubIds.has(a.clubId));
    const accountRequests = db.accountRequests.filter((r) => scopedClubIds.has(r.clubId));
    const memberships = db.memberships.filter((m) => scopedClubIds.has(m.clubId));
    const posts = db.posts.filter((p) => scopedClubIds.has(p.clubId));
    const auditLogs = db.auditLogs.filter((l) => !l.clubId || scopedClubIds.has(l.clubId));

    const activeClubLeaders = memberships.filter((m) => m.role === 'CLUB_LEAD' && m.status === 'Active');
    const integrationIssues = socialAccounts.filter((a) => a.connection.status !== 'Connected');
    const failedPosts = posts.filter((p) => p.status === 'Failed');

    const pendingRequestsCount = accountRequests.filter(
      (r) => !['Connected', 'Rejected', 'Cancelled'].includes(r.status)
    ).length;
    const budgetIncreaseRequests = (db.budgetIncreaseRequests ?? [])
      .filter((r) => scopedClubIds.has(r.clubId))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    const pendingBudgetRequestsCount = budgetIncreaseRequests.filter(
      (r) => r.status === 'Pending'
    ).length;

    const summary = {
      participatingClubs: scopedClubs.filter((c) => c.status === 'Active').length,
      totalClubs: scopedClubs.length,
      connectedAccounts: socialAccounts.length,
      pendingRequests: pendingRequestsCount,
      pendingBudgetRequests: pendingBudgetRequestsCount,
      activeClubLeaders: activeClubLeaders.length,
      securityAlerts: integrationIssues.length + failedPosts.length,
      integrationIssues: integrationIssues.length,
    };

    const enrichedLeaders = memberships
      .filter((m) => m.role === 'CLUB_LEAD')
      .map((m) => {
        const u = db.users.find((usr) => usr.userId === m.userId);
        const c = db.clubs.find((clb) => clb.clubId === m.clubId);
        return {
          ...m,
          userName: u?.name ?? 'Unknown',
          userEmail: u?.email ?? '',
          clubName: c?.name ?? m.clubId,
        };
      });

    const budgetLedgers = scopedClubs.map((c) => computeClubBudgetSummary(c.clubId));
    const clubsWithBudget = scopedClubs.map((c) => ({
      ...c,
      budgetSummary: budgetLedgers.find((b) => b.clubId === c.clubId),
    }));
    const resourceSubmissions = (db.resourceSubmissions ?? [])
      .filter((s) => scopedClubIds.has(s.clubId))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    const engagementFunnel = scopedClubs.reduce<ClubEngagementFunnel>(
      (acc, c) => {
        const f = computeClubEngagementFunnel(c.clubId);
        return {
          socialReach: acc.socialReach + f.socialReach,
          socialEngagements: acc.socialEngagements + f.socialEngagements,
          eventRsvps: acc.eventRsvps + f.eventRsvps,
          verifiedCheckIns: acc.verifiedCheckIns + f.verifiedCheckIns,
          joinRequestsSubmitted: acc.joinRequestsSubmitted + f.joinRequestsSubmitted,
          newMembersApproved: acc.newMembersApproved + f.newMembersApproved,
        };
      },
      {
        socialReach: 0,
        socialEngagements: 0,
        eventRsvps: 0,
        verifiedCheckIns: 0,
        joinRequestsSubmitted: 0,
        newMembersApproved: 0,
      }
    );

    const enrichedMemberships = memberships.map((m) => {
      const u = db.users.find((usr) => usr.userId === m.userId);
      const c = db.clubs.find((clb) => clb.clubId === m.clubId);
      return {
        ...m,
        userName: u?.name ?? 'Unknown User',
        userEmail: u?.email ?? '',
        departmentOrMajor: u?.departmentOrMajor ?? '',
        userStatus: u?.status ?? 'Active',
        clubName: c?.name ?? m.clubId,
        clubShortCode: c?.shortCode ?? m.clubId,
      };
    });

    res.json({
      summary,
      clubs: clubsWithBudget,
      socialAccounts: socialAccounts.map((a) => ({
        ...sanitizeSocialAccount(a),
        clubName: db.clubs.find((c) => c.clubId === a.clubId)?.name ?? a.clubId,
      })),
      accountRequests,
      leaders: enrichedLeaders,
      memberships: enrichedMemberships,
      auditLogs: auditLogs.slice(0, 40),
      posts,
      budgetLedgers,
      budgetIncreaseRequests,
      resourceSubmissions,
      engagementFunnel,
      eligibleUsers: db.users.filter((u) => u.systemRole === 'STANDARD_USER' && u.status === 'Active'),
    });
  });

  // View Club Membership Roster (Student Life Admin Oversight)
  app.get('/api/admin/clubs/:id/members', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!isAdminUser(user) || !canAdminManageClub(user, clubId)) {
      res.status(403).json({ error: 'Scoped Student Life Administrator privileges required to inspect club membership.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    const members = db.memberships
      .filter((m) => m.clubId === clubId)
      .map((m) => {
        const u = db.users.find((usr) => usr.userId === m.userId);
        return {
          ...m,
          userName: u?.name ?? m.userId,
          userEmail: u?.email ?? '',
          departmentOrMajor: u?.departmentOrMajor ?? '',
          userStatus: u?.status ?? 'Active',
        };
      });
    res.json({ club, members });
  });

  // Update Club Semester Budget Cap (Student Life Admin)
  app.patch('/api/admin/clubs/:id/budget', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!isAdminUser(user) || !canAdminManageClub(user, clubId)) {
      res.status(403).json({
        error: 'Only scoped Office of Student Life Administrators can adjust club budget allocations.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    const { allocatedUsd, semesterBudgetAllocatedUsd } = req.body as {
      allocatedUsd?: number;
      semesterBudgetAllocatedUsd?: number;
    };
    const nextCap = Number(allocatedUsd ?? semesterBudgetAllocatedUsd);
    if (!Number.isFinite(nextCap) || nextCap < 0) {
      res.status(400).json({ error: 'Allocated semester budget must be a non-negative dollar amount.' });
      return;
    }
    club.semesterBudgetAllocatedUsd = roundCurrency(nextCap);
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'UPDATE_CLUB_BUDGET_CAP',
      category: 'Governance',
      target: `${club.shortCode}: $${club.semesterBudgetAllocatedUsd.toFixed(2)}`,
      clubId,
      details: `Set annual Student Activity Fee budget cap to $${club.semesterBudgetAllocatedUsd.toFixed(2)}.`,
    });
    saveDb();
    res.json({ club: { ...club, budgetSummary: computeClubBudgetSummary(clubId) } });
  });

  // Club Lead Request for Increased Funding (routes to Student Life Admin)
  app.post('/api/clubs/:id/budget-increase-requests', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'INVITE_CLUB_MEMBERS')) {
      res.status(403).json({
        error: 'Only authorized Club Leaders or Student Life Administrators can request increased club funding.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    const {
      requestedAdditionalUsd,
      eventOrInitiativeTitle,
      fundingBreakdown,
      reason,
      expectedAttendance,
      eventDate,
    } = req.body as {
      requestedAdditionalUsd?: number;
      eventOrInitiativeTitle?: string;
      fundingBreakdown?: string;
      reason?: string;
      expectedAttendance?: number;
      eventDate?: string;
    };

    const additional = roundCurrency(Number(requestedAdditionalUsd));
    if (!Number.isFinite(additional) || additional <= 0) {
      res.status(400).json({
        error: 'Please enter a valid positive dollar amount for the requested funding increase.',
      });
      return;
    }
    if (!eventOrInitiativeTitle?.trim() || !reason?.trim()) {
      res.status(400).json({
        error: 'Event or initiative title and justification reason are required.',
      });
      return;
    }

    const currentCap = roundCurrency(club.semesterBudgetAllocatedUsd ?? 500);
    const now = new Date().toISOString();
    if (!Array.isArray(db.budgetIncreaseRequests)) {
      db.budgetIncreaseRequests = [];
    }
    const nextNum = 101 + db.budgetIncreaseRequests.length;
    const newRequest: BudgetIncreaseRequest = {
      requestId: `BGT-${new Date().getFullYear()}-${nextNum}-${Date.now().toString().slice(-3)}`,
      clubId: club.clubId,
      clubName: club.name,
      clubShortCode: club.shortCode,
      currentAllocatedUsd: currentCap,
      requestedAdditionalUsd: additional,
      proposedTotalUsd: roundCurrency(currentCap + additional),
      eventOrInitiativeTitle: eventOrInitiativeTitle.trim(),
      fundingBreakdown: fundingBreakdown?.trim() || 'Itemized club initiative budget',
      reason: reason.trim(),
      expectedAttendance:
        typeof expectedAttendance === 'number' && Number.isFinite(expectedAttendance) && expectedAttendance > 0
          ? Math.round(expectedAttendance)
          : undefined,
      eventDate: eventDate?.trim() || undefined,
      status: 'Pending',
      submittedByUserId: user.userId,
      submittedByName: user.name,
      submittedByEmail: user.email,
      submittedAt: now,
      updatedAt: now,
    };

    db.budgetIncreaseRequests.unshift(newRequest);

    const adminsToNotify = db.users.filter(
      (u) =>
        u.status === 'Active' &&
        (u.systemRole === 'SL_SUPER_ADMIN' ||
          (u.systemRole === 'SL_ADMIN' && u.assignedAdminClubIds?.includes(clubId)))
    );
    for (const adm of adminsToNotify) {
      pushNotification({
        userId: adm.userId,
        clubId,
        type: 'Resource Submission',
        title: `Funding Increase Request (${club.shortCode}): +$${additional.toFixed(0)}`,
        message: `${user.name} requested +$${additional.toFixed(2)} for "${newRequest.eventOrInitiativeTitle}" — awaiting Student Life review.`,
      });
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'REQUEST_BUDGET_INCREASE',
      category: 'Governance',
      target: `${club.shortCode}: +$${additional.toFixed(2)} (${newRequest.eventOrInitiativeTitle})`,
      clubId,
      details: `${user.name} submitted funding increase request ${newRequest.requestId} ($${currentCap.toFixed(2)} -> $${newRequest.proposedTotalUsd.toFixed(2)}). Reason: ${newRequest.reason}`,
    });

    saveDb();
    res.status(201).json({ request: newRequest });
  });

  // Student Life Admin Decision on Club Funding Increase Request (Approve or Deny)
  app.post('/api/admin/budget-increase-requests/:requestId/decision', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const requestId = String(req.params.requestId);
    const db = getDb();
    const reqItem = (db.budgetIncreaseRequests ?? []).find((r) => r.requestId === requestId);
    if (!reqItem) {
      res.status(404).json({ error: 'Funding increase request not found.' });
      return;
    }
    if (!isAdminUser(user) || !canAdminManageClub(user, reqItem.clubId)) {
      res.status(403).json({
        error: 'Only scoped Office of Student Life Administrators can approve or deny club funding requests.',
      });
      return;
    }
    if (reqItem.status !== 'Pending') {
      res.status(400).json({ error: `Funding request ${requestId} has already been ${reqItem.status.toLowerCase()}.` });
      return;
    }
    const { decision, approvedAdditionalUsd, decisionNotes } = req.body as {
      decision?: 'Approved' | 'Denied';
      approvedAdditionalUsd?: number;
      decisionNotes?: string;
    };
    if (decision !== 'Approved' && decision !== 'Denied') {
      res.status(400).json({ error: 'Decision must be either Approved or Denied.' });
      return;
    }
    if (decision === 'Denied' && !decisionNotes?.trim()) {
      res.status(400).json({ error: 'Please provide a brief reason when denying a funding increase request.' });
      return;
    }

    const club = db.clubs.find((c) => c.clubId === reqItem.clubId);
    if (!club) {
      res.status(404).json({ error: 'Associated club workspace not found.' });
      return;
    }

    const now = new Date().toISOString();
    reqItem.status = decision;
    reqItem.reviewedByUserId = user.userId;
    reqItem.reviewedByName = user.name;
    reqItem.reviewedAt = now;
    reqItem.updatedAt = now;

    if (decision === 'Approved') {
      const approvedAmount = roundCurrency(
        approvedAdditionalUsd !== undefined && Number.isFinite(Number(approvedAdditionalUsd))
          ? Number(approvedAdditionalUsd)
          : reqItem.requestedAdditionalUsd
      );
      if (approvedAmount <= 0) {
        res.status(400).json({ error: 'Approved additional funding must be greater than $0.' });
        return;
      }
      const prevCap = roundCurrency(club.semesterBudgetAllocatedUsd ?? 500);
      club.semesterBudgetAllocatedUsd = roundCurrency(prevCap + approvedAmount);
      reqItem.approvedAdditionalUsd = approvedAmount;
      reqItem.proposedTotalUsd = club.semesterBudgetAllocatedUsd;
      reqItem.decisionNotes =
        decisionNotes?.trim() ||
        `Approved +$${approvedAmount.toFixed(2)} supplemental allocation for "${reqItem.eventOrInitiativeTitle}".`;

      pushNotification({
        userId: reqItem.submittedByUserId,
        clubId: club.clubId,
        type: 'Approval',
        title: `Funding Request Approved (+$${approvedAmount.toFixed(2)})`,
        message: `${user.name} approved your ${club.shortCode} funding increase for "${reqItem.eventOrInitiativeTitle}". New cap: $${club.semesterBudgetAllocatedUsd.toFixed(2)}.`,
      });

      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: user.systemRole,
        action: 'APPROVE_BUDGET_INCREASE',
        category: 'Governance',
        target: `${club.shortCode}: +$${approvedAmount.toFixed(2)} -> $${club.semesterBudgetAllocatedUsd.toFixed(2)}`,
        clubId: club.clubId,
        details: `Approved ${reqItem.requestId} ("${reqItem.eventOrInitiativeTitle}"). Notes: ${reqItem.decisionNotes}`,
      });
    } else {
      reqItem.decisionNotes = decisionNotes!.trim();

      pushNotification({
        userId: reqItem.submittedByUserId,
        clubId: club.clubId,
        type: 'Resource Submission',
        title: `Funding Request Denied (${club.shortCode})`,
        message: `${user.name} denied ${reqItem.requestId} ("${reqItem.eventOrInitiativeTitle}"): ${reqItem.decisionNotes}`,
      });

      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: user.systemRole,
        action: 'DENY_BUDGET_INCREASE',
        category: 'Governance',
        target: `${club.shortCode}: ${reqItem.requestId}`,
        clubId: club.clubId,
        details: `Denied funding increase request (+$${reqItem.requestedAdditionalUsd.toFixed(2)} for "${reqItem.eventOrInitiativeTitle}"). Reason: ${reqItem.decisionNotes}`,
      });
    }

    saveDb();
    res.json({
      request: reqItem,
      club: { ...club, budgetSummary: computeClubBudgetSummary(club.clubId) },
    });
  });

  // One-Click Student Life Annual Charter Renewal Dossier
  app.get('/api/clubs/:id/charter-renewal', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club charter renewal access.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const clubMems = db.memberships.filter((m) => m.clubId === clubId);
    const activeMems = clubMems.filter((m) => m.status === 'Active');
    const alumniMems = clubMems.filter((m) => m.status === 'Alumni');
    const officers = activeMems
      .filter((m) => m.role !== 'VIEWER' || (m.officerTitle ?? '').toLowerCase() === 'faculty advisor')
      .map((m) => {
        const u = db.users.find((usr) => usr.userId === m.userId);
        return {
          name: u?.name ?? m.userId,
          email: u?.email ?? '',
          officerTitle: m.officerTitle || m.role,
          role: m.role,
        };
      });

    const records = (db.eventAttendanceRecords ?? []).filter(
      (r) => r.clubId === clubId || r.coSponsorClubIds?.includes(clubId)
    );
    const totalReg = records.reduce((s, r) => s + r.registeredCount, 0);
    const totalAtt = records.reduce((s, r) => s + r.attendedCount, 0);
    const avgAttendanceRatePct = totalReg > 0 ? Math.round((totalAtt / totalReg) * 100) : 0;

    const clubEvents = db.events.filter(
      (e) => e.clubId === clubId || e.coSponsorClubIds?.includes(clubId)
    );
    const allFeedback: EventFeedbackResponse[] = clubEvents.flatMap(
      (e) => e.feedbackResponses ?? []
    );
    const avgEventSatisfaction =
      allFeedback.length > 0
        ? Math.round((allFeedback.reduce((s, f) => s + f.rating, 0) / allFeedback.length) * 10) / 10
        : null;

    const accts = db.socialAccounts.filter((a) => a.clubId === clubId);
    const healthyAccts = accts.filter((a) => a.connection.status === 'Connected');
    const publishedPostsCount = db.posts.filter(
      (p) => p.clubId === clubId && p.status === 'Published'
    ).length;

    const clubSubs = (db.resourceSubmissions ?? []).filter(
      (s) => s.clubId === clubId || s.coSponsorClubIds?.includes(clubId)
    );
    const approvedReimbursementsCount = clubSubs.filter(
      (s) => s.type === 'Financial Reimbursement' && s.status === 'Approved'
    ).length;

    const healthRatio = accts.length > 0 ? healthyAccts.length / accts.length : 1;
    const failedPosts = db.posts.filter((p) => p.clubId === clubId && p.status === 'Failed').length;
    const auditComplianceRatePct = Math.max(
      65,
      Math.min(100, Math.round(healthRatio * 100 - failedPosts * 5))
    );

    const summary: ClubCharterRenewalSummary = {
      clubId: club.clubId,
      clubName: club.name,
      clubShortCode: club.shortCode,
      category: club.category,
      status: club.status,
      facultyAdvisor: club.facultyAdvisor,
      onboardedAt: club.onboardedAt,
      generatedAt: new Date().toISOString(),
      semesterLabel: '2026–2027 Academic Year',
      activeMembersCount: activeMems.length,
      alumniMembersCount: alumniMems.length,
      officers,
      eventsHostedCount: Math.max(records.length, clubEvents.length),
      totalSemesterAttendance: totalAtt,
      avgAttendanceRatePct,
      avgEventSatisfaction,
      connectedSocialAccountsCount: accts.length,
      healthySocialAccountsCount: healthyAccts.length,
      auditComplianceRatePct,
      publishedPostsCount,
      budgetSummary: computeClubBudgetSummary(clubId),
      resourceSubmissionsCount: clubSubs.length,
      approvedReimbursementsCount,
    };

    res.json({ charterRenewal: summary });
  });

  // Create approved club workspace (US-003)
  app.post('/api/admin/clubs', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Student Life Administrator authorization required to create workspaces.' });
      return;
    }
    const { name, shortCode, description, category, facultyAdvisor, activateImmediately } = req.body as {
      name: string;
      shortCode: string;
      description: string;
      category: string;
      facultyAdvisor: string;
      activateImmediately?: boolean;
    };
    if (!name || !shortCode || !facultyAdvisor) {
      res.status(400).json({ error: 'Club name, short code, and faculty advisor are required.' });
      return;
    }
    const db = getDb();
    const clubId = `club-${shortCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
    const club = {
      clubId,
      name: name.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      description: description?.trim() || 'Officially recognized CUNY SPS student organization.',
      category: category?.trim() || 'Academic & Professional',
      status: activateImmediately === false ? ('Pending Approval' as const) : ('Active' as const),
      facultyAdvisor: facultyAdvisor.trim(),
      onboardedAt: new Date().toISOString(),
      semesterBudgetAllocatedUsd: 500,
    };
    db.clubs.push(club);
    if (user.systemRole === 'SL_ADMIN') {
      user.assignedAdminClubIds = [...(user.assignedAdminClubIds ?? []), clubId];
    }
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'CREATE_CLUB_WORKSPACE',
      category: 'Governance',
      target: `${club.name} (${club.clubId})`,
      clubId: club.clubId,
      details: `Created club workspace with status ${club.status} and advisor ${club.facultyAdvisor}.`,
    });
    saveDb();
    res.status(201).json({ club });
  });

  app.patch('/api/admin/clubs/:id/status', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAdminManageClub(user, clubId)) {
      res.status(403).json({ error: 'Insufficient administrative scope for this club.' });
      return;
    }
    const { status } = req.body as { status: 'Active' | 'Pending Approval' | 'Suspended' | 'Archived' };
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }
    club.status = status;
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'UPDATE_CLUB_STATUS',
      category: 'Governance',
      target: `${club.name} -> ${status}`,
      clubId,
      details: `Student Life updated workspace status to ${status}.`,
    });
    saveDb();
    res.json({ club });
  });

  app.patch('/api/admin/clubs/:id', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!isAdminUser(user) || !canAdminManageClub(user, clubId)) {
      res.status(403).json({
        error: 'Student Life Administrator authorization required to edit this club profile.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }
    const result = applyClubProfileUpdates(club, req.body ?? {});
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    const { status } = req.body as { status?: Club['status'] };
    if (status && ['Active', 'Pending Approval', 'Suspended', 'Archived'].includes(status)) {
      if (club.status !== status) {
        club.status = status;
        result.changedFields.push(`status (${status})`);
      }
    }
    if (result.changedFields.length > 0) {
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: user.systemRole,
        action: 'ADMIN_UPDATE_CLUB_PROFILE',
        category: 'Governance',
        target: `${club.name} (${club.shortCode})`,
        clubId,
        details: `Student Life updated ${result.changedFields.join(', ')}.`,
      });
    }
    saveDb();
    res.json({
      club: {
        ...club,
        budgetSummary: computeClubBudgetSummary(clubId),
      },
    });
  });

  // Authorize Club Leader or Execute Leadership Transfer (US-004, US-021, US-024)
  app.post('/api/admin/clubs/:id/leaders', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAdminManageClub(user, clubId)) {
      res.status(403).json({ error: 'Only authorized Student Life Administrators can authorize club leaders.' });
      return;
    }
    const { userId, outgoingLeaderUserId, reason } = req.body as {
      userId: string;
      outgoingLeaderUserId?: string;
      reason?: string;
    };
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const targetUser = db.users.find((u) => u.userId === userId);
    if (!club || !targetUser) {
      res.status(404).json({ error: 'Club or verified institutional user not found.' });
      return;
    }
    if (targetUser.status !== 'Active') {
      res.status(400).json({ error: 'Cannot authorize a user whose institutional access is revoked.' });
      return;
    }

    let existingMem = db.memberships.find((m) => m.userId === userId && m.clubId === clubId);
    if (existingMem) {
      existingMem.role = 'CLUB_LEAD';
      existingMem.status = 'Active';
      existingMem.authorizedBy = user.name;
      existingMem.authorizedAt = new Date().toISOString();
    } else {
      existingMem = {
        membershipId: `mem-${Date.now()}`,
        userId,
        clubId,
        role: 'CLUB_LEAD',
        status: 'Active',
        authorizedBy: user.name,
        authorizedAt: new Date().toISOString(),
      };
      db.memberships.push(existingMem);
    }

    let outgoingName = '';
    if (outgoingLeaderUserId && outgoingLeaderUserId !== userId) {
      const outgoingMem = db.memberships.find(
        (m) => m.userId === outgoingLeaderUserId && m.clubId === clubId && m.status === 'Active'
      );
      if (outgoingMem) {
        outgoingMem.status = 'Revoked';
        outgoingName = db.users.find((u) => u.userId === outgoingLeaderUserId)?.name ?? outgoingLeaderUserId;
      }
      club.upcomingLeadershipChange = undefined;
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: outgoingLeaderUserId ? 'LEADERSHIP_TRANSFER_COMPLETED' : 'AUTHORIZE_CLUB_LEADER',
      category: 'Governance',
      target: `${targetUser.name} -> ${club.name}`,
      clubId,
      details: outgoingLeaderUserId
        ? `Transferred CLUB_LEAD from ${outgoingName} to ${targetUser.name}. Staff account custodianship remained unchanged (${reason || 'Verified leadership transition'}).`
        : `Student Life authorized ${targetUser.name} as CLUB_LEAD for ${club.name}.`,
    });

    pushNotification({
      userId: targetUser.userId,
      clubId,
      type: 'Membership',
      title: `Authorized as Club Lead for ${club.name}`,
      message: `Student Life granted you Club Lead workspace privileges.`,
    });

    saveDb();
    res.json({ membership: existingMem });
  });

  // Club Team Management: Invite officer (US-006)
  app.post('/api/clubs/:id/invitations', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'INVITE_CLUB_MEMBERS')) {
      res.status(403).json({ error: 'Only Club Leads or Student Life Administrators can invite club members.' });
      return;
    }
    const { recipientEmail, recipientName, role } = req.body as {
      recipientEmail: string;
      recipientName: string;
      role: string;
    };

    if (!recipientEmail || (!recipientEmail.endsWith('@spsmail.cuny.edu') && !recipientEmail.endsWith('@sps.cuny.edu'))) {
      res.status(400).json({ error: 'Invitations require a verified @spsmail.cuny.edu or @sps.cuny.edu institutional email.' });
      return;
    }
    if (role === 'SL_SUPER_ADMIN' || role === 'SL_ADMIN') {
      res.status(403).json({ error: 'Policy BR-006 violation: Club leaders cannot grant university administrator privileges.' });
      return;
    }
    if (!['CLUB_LEAD', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'].includes(role)) {
      res.status(400).json({ error: 'Invalid club role selected.' });
      return;
    }

    const db = getDb();
    const invitation = {
      invitationId: `inv-${Date.now()}`,
      clubId,
      recipientEmail: recipientEmail.trim().toLowerCase(),
      recipientName: recipientName?.trim() || recipientEmail.split('@')[0],
      role: role as ClubMembership['role'],
      invitedByUserId: user.userId,
      invitedByName: user.name,
      status: 'Pending' as const,
      createdAt: new Date().toISOString(),
    };
    db.invitations.unshift(invitation);

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'INVITE_CLUB_MEMBER',
      category: 'Membership',
      target: `${invitation.recipientEmail} (${invitation.role})`,
      clubId,
      details: `Issued verified institutional club invitation for ${invitation.role} role.`,
    });
    saveDb();
    res.status(201).json({ invitation });
  });

  app.post('/api/clubs/:id/invitations/:invId/accept', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const invId = String(req.params.invId);
    if (!hasClubCapability(user, clubId, 'INVITE_CLUB_MEMBERS')) {
      res.status(403).json({ error: 'Authorization required.' });
      return;
    }
    const db = getDb();
    const inv = db.invitations.find((i) => i.invitationId === invId && i.clubId === clubId);
    if (!inv) {
      res.status(404).json({ error: 'Invitation not found.' });
      return;
    }
    inv.status = 'Accepted';
    let targetUser = db.users.find((u) => u.email.toLowerCase() === inv.recipientEmail.toLowerCase());
    if (!targetUser) {
      targetUser = {
        userId: `usr-${Date.now()}`,
        name: inv.recipientName,
        email: inv.recipientEmail,
        identitySubject: `cuny-sso|${inv.recipientEmail.split('@')[0]}`,
        title: 'Club Officer',
        departmentOrMajor: 'CUNY SPS Student',
        systemRole: 'STANDARD_USER',
        status: 'Active',
        lastLoginAt: new Date().toISOString(),
      };
      db.users.push(targetUser);
    }
    const existing = db.memberships.find((m) => m.userId === targetUser!.userId && m.clubId === clubId);
    if (existing) {
      existing.role = inv.role;
      existing.status = 'Active';
    } else {
      db.memberships.push({
        membershipId: `mem-${Date.now()}`,
        userId: targetUser.userId,
        clubId,
        role: inv.role,
        status: 'Active',
        authorizedBy: inv.invitedByName,
        authorizedAt: new Date().toISOString(),
      });
    }
    recordAudit({
      actorId: targetUser.userId,
      actorName: targetUser.name,
      actorRole: inv.role,
      action: 'INVITATION_ACCEPTED',
      category: 'Membership',
      target: `${targetUser.email} -> ${clubId}`,
      clubId,
      details: `Institutional identity verified and ${inv.role} membership activated.`,
    });
    saveDb();
    res.json({ invitation: inv });
  });

  // Club Member Directory across authorized clubs
  app.get('/api/member-directory', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const db = getDb();
    const accessibleClubs = db.clubs.filter((c) => canAccessClub(user, c.clubId));
    const accessibleClubIds = new Set(accessibleClubs.map((c) => c.clubId));

    const defaultOfficerTitle = (role: ClubMembership['role']): string => {
      switch (role) {
        case 'CLUB_LEAD':
          return 'President';
        case 'EDITOR':
          return 'Social Media Chair';
        case 'CONTRIBUTOR':
          return 'Secretary';
        default:
          return 'General Member';
      }
    };

    const entries = db.memberships
      .filter((m) => accessibleClubIds.has(m.clubId))
      .map((m) => {
        const u = db.users.find((usr) => usr.userId === m.userId);
        const c = db.clubs.find((clb) => clb.clubId === m.clubId);
        return {
          ...m,
          officerTitle: m.officerTitle ?? defaultOfficerTitle(m.role),
          name: u?.name ?? 'Unknown Student',
          email: u?.email ?? '',
          departmentOrMajor: u?.departmentOrMajor ?? 'CUNY SPS',
          userStatus: u?.status ?? 'Active',
          clubName: c?.name ?? m.clubId,
          clubShortCode: c?.shortCode ?? m.clubId,
          canManage: hasClubCapability(user, m.clubId, 'ASSIGN_CLUB_ROLES'),
        };
      });

    res.json({
      entries,
      clubs: accessibleClubs,
      eligibleStudents: db.users
        .filter((u) => u.status === 'Active' && u.systemRole === 'STANDARD_USER')
        .map((u) => ({
          userId: u.userId,
          name: u.name,
          email: u.email,
          departmentOrMajor: u.departmentOrMajor,
        })),
    });
  });

  // Add or assign a verified student member with an officer role (e.g. President, Secretary)
  app.post('/api/clubs/:id/members', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'INVITE_CLUB_MEMBERS')) {
      res.status(403).json({
        error: 'Only Club Leads or Student Life Administrators can add club members.',
      });
      return;
    }

    const { userId, name, email, departmentOrMajor, role, officerTitle } = req.body as {
      userId?: string;
      name?: string;
      email?: string;
      departmentOrMajor?: string;
      role?: string;
      officerTitle?: string;
    };

    if (role === 'SL_SUPER_ADMIN' || role === 'SL_ADMIN') {
      res.status(403).json({
        error: 'Policy BR-006 violation: Cannot grant university administrator privileges at club level.',
      });
      return;
    }

    const resolvedRole: ClubMembership['role'] =
      role && ['CLUB_LEAD', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'].includes(role)
        ? (role as ClubMembership['role'])
        : 'CONTRIBUTOR';

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    let targetUser = userId ? db.users.find((u) => u.userId === userId) : undefined;
    if (!targetUser) {
      const cleanEmail = email?.trim().toLowerCase() ?? '';
      if (
        !cleanEmail ||
        (!cleanEmail.endsWith('@spsmail.cuny.edu') && !cleanEmail.endsWith('@sps.cuny.edu'))
      ) {
        res.status(400).json({
          error: 'Adding a member requires a verified @spsmail.cuny.edu or @sps.cuny.edu email.',
        });
        return;
      }
      targetUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!targetUser) {
        if (!name?.trim()) {
          res.status(400).json({ error: 'Student full name is required.' });
          return;
        }
        targetUser = {
          userId: `usr-${Date.now().toString().slice(-6)}`,
          name: name.trim(),
          email: cleanEmail,
          identitySubject: `cuny-sso|${cleanEmail.split('@')[0]}`,
          title: officerTitle?.trim() || 'Club Member',
          departmentOrMajor: departmentOrMajor?.trim() || 'CUNY SPS Student',
          systemRole: 'STANDARD_USER',
          status: 'Active',
          lastLoginAt: new Date().toISOString(),
        };
        db.users.push(targetUser);
      }
    }

    const resolvedOfficerTitle = officerTitle?.trim() || 'General Member';
    let membership = db.memberships.find(
      (m) => m.userId === targetUser!.userId && m.clubId === clubId
    );
    if (membership) {
      membership.role = resolvedRole;
      membership.officerTitle = resolvedOfficerTitle;
      membership.status = 'Active';
      membership.authorizedBy = user.name;
      membership.authorizedAt = new Date().toISOString();
    } else {
      membership = {
        membershipId: `mem-${Date.now().toString().slice(-6)}`,
        userId: targetUser.userId,
        clubId,
        role: resolvedRole,
        officerTitle: resolvedOfficerTitle,
        status: 'Active',
        authorizedBy: user.name,
        authorizedAt: new Date().toISOString(),
      };
      db.memberships.push(membership);
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'ASSIGN_CLUB_MEMBER_ROLE',
      category: 'Membership',
      target: `${targetUser.name} (${resolvedOfficerTitle} / ${resolvedRole})`,
      clubId,
      details: `Added or updated ${targetUser.name} in ${club.name} directory as ${resolvedOfficerTitle}.`,
    });
    saveDb();
    res.status(201).json({ membership });
  });

  // Update or revoke club membership (US-007, US-008)
  app.patch('/api/clubs/:id/members/:userId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const targetUserId = String(req.params.userId);
    if (!hasClubCapability(user, clubId, 'ASSIGN_CLUB_ROLES')) {
      res.status(403).json({ error: 'Only Club Leads or Student Life Administrators can modify member roles.' });
      return;
    }
    const { role, officerTitle, status } = req.body as {
      role?: string;
      officerTitle?: string;
      status?: 'Active' | 'Invited' | 'Revoked' | 'Alumni';
    };
    if (role === 'SL_SUPER_ADMIN' || role === 'SL_ADMIN') {
      res.status(403).json({ error: 'Policy BR-006 violation: Cannot assign institutional administrator roles at club level.' });
      return;
    }
    const db = getDb();
    const membership = db.memberships.find((m) => m.userId === targetUserId && m.clubId === clubId);
    if (!membership) {
      res.status(404).json({ error: 'Club membership record not found.' });
      return;
    }
    const targetUser = db.users.find((u) => u.userId === targetUserId);
    if (role && ['CLUB_LEAD', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'].includes(role)) {
      membership.role = role as ClubMembership['role'];
    }
    if (typeof officerTitle === 'string' && officerTitle.trim()) {
      membership.officerTitle = officerTitle.trim();
    }
    if (status && ['Active', 'Invited', 'Revoked', 'Alumni'].includes(status)) {
      membership.status = status;
    }
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action:
        status === 'Revoked'
          ? 'REVOKE_CLUB_MEMBER'
          : status === 'Alumni'
            ? 'ARCHIVE_OFFICER_ALUMNI'
            : 'UPDATE_MEMBER_ROLE',
      category: 'Membership',
      target: `${targetUser?.name ?? targetUserId} (${membership.officerTitle ?? membership.role}, ${membership.status})`,
      clubId,
      details: `Updated club membership role/title in workspace ${clubId}.`,
    });
    saveDb();
    res.json({ membership });
  });

  // Public Club Join Requests (Submit by student, Review/Approve by Club Lead or Student Life Admin)
  app.get('/api/join-requests', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const db = getDb();
    const requests = (db.joinRequests ?? []).filter(
      (jr) => jr.userId === user.userId || hasClubCapability(user, jr.clubId, 'ASSIGN_CLUB_ROLES')
    );
    res.json({ joinRequests: requests });
  });

  app.post('/api/clubs/:id/join-requests', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId && c.status === 'Active');
    if (!club) {
      res.status(404).json({ error: 'Active student club not found.' });
      return;
    }

    const activeMembership = db.memberships.find(
      (m) => m.clubId === clubId && m.userId === user.userId && m.status === 'Active'
    );
    if (activeMembership) {
      res.status(400).json({ error: `You are already an active member of ${club.name}.` });
      return;
    }

    const existingPending = (db.joinRequests ?? []).find(
      (jr) => jr.clubId === clubId && jr.userId === user.userId && jr.status === 'Pending'
    );
    if (existingPending) {
      res.status(400).json({ error: `You already have a pending Request to Join ${club.name}.` });
      return;
    }

    const { reason, preferredInterest } = req.body as {
      reason?: string;
      preferredInterest?: string;
    };
    if (!reason?.trim()) {
      res.status(400).json({ error: 'Please share a brief note about why you would like to join.' });
      return;
    }

    const joinReq: ClubJoinRequest = {
      joinRequestId: `jr-${Date.now().toString().slice(-6)}`,
      clubId: club.clubId,
      clubName: club.name,
      clubShortCode: club.shortCode,
      userId: user.userId,
      studentName: user.name,
      studentEmail: user.email,
      departmentOrMajor: user.departmentOrMajor,
      reason: reason.trim(),
      preferredInterest: preferredInterest?.trim() || 'General Member',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    db.joinRequests.unshift(joinReq);

    const clubLeads = db.memberships.filter(
      (m) => m.clubId === clubId && m.status === 'Active' && m.role === 'CLUB_LEAD'
    );
    const leadIds = new Set<string>(clubLeads.map((l) => l.userId));
    if (leadIds.size === 0) {
      for (const admin of db.users) {
        if (admin.systemRole === 'SL_SUPER_ADMIN' && admin.status === 'Active') {
          leadIds.add(admin.userId);
        }
      }
    }
    for (const leadId of leadIds) {
      pushNotification({
        userId: leadId,
        clubId,
        type: 'Join Request',
        title: `New Request to Join ${club.shortCode}`,
        message: `${user.name} (${user.departmentOrMajor}) requested to join ${club.name}.`,
      });
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'SUBMIT_CLUB_JOIN_REQUEST',
      category: 'Membership',
      target: `${club.name} (${club.shortCode})`,
      clubId,
      details: `${user.name} submitted a Request to Join ${club.name}.`,
    });
    saveDb();
    res.status(201).json({ joinRequest: joinReq });
  });

  app.post('/api/clubs/:id/join-requests/:requestId/decision', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const requestId = String(req.params.requestId);
    if (!hasClubCapability(user, clubId, 'ASSIGN_CLUB_ROLES')) {
      res.status(403).json({
        error: 'Only Club Leads or Student Life Administrators can approve or decline join requests.',
      });
      return;
    }

    const db = getDb();
    const joinReq = (db.joinRequests ?? []).find(
      (jr) => jr.joinRequestId === requestId && jr.clubId === clubId
    );
    if (!joinReq) {
      res.status(404).json({ error: 'Club join request not found.' });
      return;
    }

    const { decision, officerTitle, role, note } = req.body as {
      decision?: 'Approved' | 'Declined';
      officerTitle?: string;
      role?: ClubMembership['role'];
      note?: string;
    };
    if (decision !== 'Approved' && decision !== 'Declined') {
      res.status(400).json({ error: 'Decision must be Approved or Declined.' });
      return;
    }

    const now = new Date().toISOString();
    joinReq.status = decision;
    joinReq.reviewedByName = user.name;
    joinReq.reviewedAt = now;
    joinReq.reviewNote = note?.trim();

    if (decision === 'Approved') {
      const assignedRole: ClubMembership['role'] =
        role && ['CONTRIBUTOR', 'EDITOR', 'VIEWER'].includes(role) ? role : 'CONTRIBUTOR';
      const assignedTitle = officerTitle?.trim() || 'General Member';
      const existingMem = db.memberships.find(
        (m) => m.clubId === clubId && m.userId === joinReq.userId
      );
      if (existingMem) {
        existingMem.status = 'Active';
        existingMem.role = assignedRole;
        existingMem.officerTitle = assignedTitle;
        existingMem.authorizedBy = user.name;
        existingMem.authorizedAt = now;
      } else {
        db.memberships.push({
          membershipId: `mem-${Date.now().toString().slice(-6)}`,
          userId: joinReq.userId,
          clubId,
          role: assignedRole,
          officerTitle: assignedTitle,
          status: 'Active',
          authorizedBy: user.name,
          authorizedAt: now,
        });
      }
    }

    pushNotification({
      userId: joinReq.userId,
      clubId,
      type: 'Join Request',
      title: `${joinReq.clubShortCode} Join Request ${decision}`,
      message:
        decision === 'Approved'
          ? `${user.name} approved your request to join ${joinReq.clubName}. You now appear in the Club Member Directory.`
          : `${user.name} declined your join request for ${joinReq.clubName}.${joinReq.reviewNote ? ` Note: ${joinReq.reviewNote}` : ''}`,
    });

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: decision === 'Approved' ? 'APPROVE_CLUB_JOIN_REQUEST' : 'DECLINE_CLUB_JOIN_REQUEST',
      category: 'Membership',
      target: `${joinReq.studentName} -> ${joinReq.clubShortCode}`,
      clubId,
      details: `${decision} membership join request from ${joinReq.studentName}.`,
    });
    saveDb();
    res.json({ joinRequest: joinReq });
  });

  // Officer Handover & Semester Transition Tool
  const getOrCreateClubTransition = (clubId: string): OfficerTransitionChecklist => {
    const db = getDb();
    let existing = (db.officerTransitions ?? []).find((t) => t.clubId === clubId);
    if (!existing) {
      existing = {
        transitionId: `trn-${clubId}-${Date.now().toString().slice(-4)}`,
        clubId,
        fromSemester: 'Fall 2026',
        toSemester: 'Spring 2027',
        targetEffectiveDate: '2027-01-15',
        status: 'In Progress',
        updatedAt: new Date().toISOString(),
        checklistItems: [
          {
            itemId: 'chk-1',
            label: 'Confirm incoming President, Secretary, and Treasurer eligibility with Office of Student Life',
            completed: false,
          },
          {
            itemId: 'chk-2',
            label: 'Rotate outgoing officer titles and archive graduating officers to Alumni status',
            completed: false,
          },
          {
            itemId: 'chk-3',
            label: 'Transfer open Club Project Tasks and event prep deliverables to incoming officers',
            completed: false,
          },
          {
            itemId: 'chk-4',
            label: 'Verify institutional social account custodianship and revoke legacy contributor access',
            completed: false,
          },
        ],
      };
      db.officerTransitions.push(existing);
      saveDb();
    }
    return existing;
  };

  app.get('/api/clubs/:id/transition', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club transition view.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    const transition = getOrCreateClubTransition(clubId);
    const members = db.memberships
      .filter((m) => m.clubId === clubId)
      .map((m) => {
        const u = db.users.find((usr) => usr.userId === m.userId);
        return {
          ...m,
          name: u?.name ?? 'Unknown',
          email: u?.email ?? '',
          departmentOrMajor: u?.departmentOrMajor ?? 'CUNY SPS',
          openTaskCount: (db.clubTasks ?? []).filter(
            (t) => t.clubId === clubId && t.assigneeUserId === m.userId && t.status !== 'Completed'
          ).length,
          custodiedAccountsCount: db.socialAccounts.filter(
            (a) => a.clubId === clubId && a.custodian.userId === m.userId
          ).length,
        };
      });
    const socialAccounts = db.socialAccounts.filter((a) => a.clubId === clubId);
    res.json({
      transition,
      club,
      members,
      socialAccounts,
      canManage: hasClubCapability(user, clubId, 'ASSIGN_CLUB_ROLES'),
    });
  });

  app.patch('/api/clubs/:id/transition/checklist', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'ASSIGN_CLUB_ROLES')) {
      res.status(403).json({ error: 'Only Club Leads or Student Life Admins can update the transition checklist.' });
      return;
    }
    const { itemId, completed } = req.body as { itemId?: string; completed?: boolean };
    const transition = getOrCreateClubTransition(clubId);
    const item = transition.checklistItems.find((i) => i.itemId === itemId);
    if (!item || typeof completed !== 'boolean') {
      res.status(400).json({ error: 'Valid checklist itemId and completed boolean required.' });
      return;
    }
    const now = new Date().toISOString();
    item.completed = completed;
    item.completedBy = completed ? user.name : undefined;
    item.completedAt = completed ? now : undefined;
    transition.status = transition.checklistItems.every((i) => i.completed)
      ? 'Completed'
      : 'In Progress';
    transition.updatedAt = now;
    saveDb();
    res.json({ transition });
  });

  app.post('/api/clubs/:id/transition/execute', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'ASSIGN_CLUB_ROLES')) {
      res.status(403).json({
        error: 'Only Club Leads or Student Life Administrators can execute officer handovers.',
      });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const {
      outgoingUserId,
      incomingUserId,
      officerTitle,
      archiveOutgoingAsAlumni,
      transferTasks,
      transferSocialCustody,
    } = req.body as {
      outgoingUserId?: string;
      incomingUserId?: string;
      officerTitle?: string;
      archiveOutgoingAsAlumni?: boolean;
      transferTasks?: boolean;
      transferSocialCustody?: boolean;
    };

    if (!outgoingUserId || !incomingUserId || !officerTitle?.trim()) {
      res.status(400).json({
        error: 'Outgoing officer, incoming successor, and officer title are required.',
      });
      return;
    }
    if (outgoingUserId === incomingUserId) {
      res.status(400).json({ error: 'Incoming successor must be a different student member.' });
      return;
    }

    const outgoingUser = db.users.find((u) => u.userId === outgoingUserId);
    const incomingUser = db.users.find((u) => u.userId === incomingUserId);
    if (!outgoingUser || !incomingUser) {
      res.status(404).json({ error: 'Selected student record not found.' });
      return;
    }

    const now = new Date().toISOString();
    const resolvedTitle = officerTitle.trim();

    // 1. Rotate officer role to incoming successor
    const incomingRole: ClubMembership['role'] =
      resolvedTitle === 'President' || resolvedTitle === 'Vice President'
        ? 'CLUB_LEAD'
        : resolvedTitle === 'Social Media Chair' || resolvedTitle === 'Events Coordinator'
          ? 'EDITOR'
          : 'CONTRIBUTOR';

    let incomingMem = db.memberships.find(
      (m) => m.clubId === clubId && m.userId === incomingUserId
    );
    if (incomingMem) {
      incomingMem.officerTitle = resolvedTitle;
      incomingMem.role = incomingRole;
      incomingMem.status = 'Active';
      incomingMem.authorizedBy = user.name;
      incomingMem.authorizedAt = now;
    } else {
      incomingMem = {
        membershipId: `mem-${Date.now().toString().slice(-6)}`,
        userId: incomingUserId,
        clubId,
        role: incomingRole,
        officerTitle: resolvedTitle,
        status: 'Active',
        authorizedBy: user.name,
        authorizedAt: now,
      };
      db.memberships.push(incomingMem);
    }

    // 2. Archive outgoing officer as Alumni or transition to General Member
    const outgoingMem = db.memberships.find(
      (m) => m.clubId === clubId && m.userId === outgoingUserId
    );
    if (outgoingMem) {
      if (archiveOutgoingAsAlumni) {
        outgoingMem.status = 'Alumni';
        outgoingMem.officerTitle = `${resolvedTitle} (Alumni)`;
      } else {
        outgoingMem.officerTitle = 'General Member';
        outgoingMem.role = 'VIEWER';
      }
    }

    // 3. Transfer open project tasks if requested
    let transferredTasksCount = 0;
    if (transferTasks) {
      for (const task of db.clubTasks ?? []) {
        if (
          task.clubId === clubId &&
          task.assigneeUserId === outgoingUserId &&
          task.status !== 'Completed'
        ) {
          task.assigneeUserId = incomingUser.userId;
          task.assigneeName = incomingUser.name;
          task.assigneeRoleLabel = resolvedTitle;
          task.updatedAt = now;
          transferredTasksCount += 1;
        }
      }
    }

    // 4. Transfer social account custody if currently held by outgoing officer (or explicitly assign if requested)
    let transferredAccountsCount = 0;
    if (transferSocialCustody) {
      for (const acct of db.socialAccounts) {
        if (acct.clubId === clubId && acct.custodian.userId === outgoingUserId) {
          acct.custodian = {
            ...acct.custodian,
            userId: incomingUser.userId,
            staffName: incomingUser.name,
            staffEmail: incomingUser.email,
            responsibility: `${resolvedTitle} Club Account Custodian`,
            assignedAt: now,
          };
          transferredAccountsCount += 1;
        }
      }
    }

    // 5. Update transition checklist records
    const transition = getOrCreateClubTransition(clubId);
    for (const item of transition.checklistItems) {
      if (item.itemId === 'chk-2') {
        item.completed = true;
        item.completedBy = user.name;
        item.completedAt = now;
      }
      if (item.itemId === 'chk-3' && transferTasks) {
        item.completed = true;
        item.completedBy = user.name;
        item.completedAt = now;
      }
      if (item.itemId === 'chk-4' && transferSocialCustody) {
        item.completed = true;
        item.completedBy = user.name;
        item.completedAt = now;
      }
    }
    transition.lastRotationNote = `Rotated ${resolvedTitle} from ${outgoingUser.name} to ${incomingUser.name} (${transferredTasksCount} tasks transferred, ${transferredAccountsCount} account custodies transferred).`;
    transition.status = transition.checklistItems.every((i) => i.completed)
      ? 'Completed'
      : 'In Progress';
    transition.updatedAt = now;

    pushNotification({
      userId: incomingUser.userId,
      clubId,
      type: 'Membership',
      title: `Officer Handover Complete: ${resolvedTitle} (${club.shortCode})`,
      message: `${user.name} transitioned ${resolvedTitle} duties to you in ${club.name}${transferredTasksCount > 0 ? ` with ${transferredTasksCount} open task(s)` : ''}.`,
    });

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'EXECUTE_OFFICER_HANDOVER',
      category: 'Governance',
      target: `${club.shortCode}: ${resolvedTitle} (${outgoingUser.name} -> ${incomingUser.name})`,
      clubId,
      details: transition.lastRotationNote,
    });
    saveDb();

    res.json({
      transition,
      transferredTasksCount,
      transferredAccountsCount,
      summary: transition.lastRotationNote,
    });
  });

  // Faculty Advisor Co-Sign on Officer Handover Transition
  app.post('/api/clubs/:id/transition/advisor-signoff', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!isClubFacultyAdvisor(user, clubId)) {
      res.status(403).json({
        error: 'Only the assigned Faculty Advisor or Student Life Administrator can co-sign this officer transition.',
      });
      return;
    }
    const { note } = (req.body ?? {}) as { note?: string };
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const transition = getOrCreateClubTransition(clubId);
    const now = new Date().toISOString();
    transition.advisorSignOff = {
      signedByUserId: user.userId,
      signedByName: user.name,
      signedAt: now,
      note: note?.trim() || 'Faculty Advisor verified incoming officer transition readiness.',
    };
    transition.updatedAt = now;

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'ADVISOR_COSIGN_TRANSITION',
      category: 'Governance',
      target: `${club?.shortCode ?? clubId} (${transition.toSemester})`,
      clubId,
      details: transition.advisorSignOff.note ?? 'Faculty Advisor co-signed handover checklist.',
    });
    saveDb();
    res.json({ transition });
  });

  // Social Account Connect / Disconnect (US-011)
  app.post('/api/clubs/:id/social-accounts/:accountId/connect', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const accountId = String(req.params.accountId);
    if (!hasClubCapability(user, clubId, 'CONNECT_EXISTING_SOCIAL_ACCOUNT')) {
      res.status(403).json({ error: 'Only authorized Club Leads or Student Life Administrators can connect official accounts.' });
      return;
    }
    const db = getDb();
    const account = db.socialAccounts.find((a) => a.accountId === accountId && a.clubId === clubId);
    if (!account) {
      res.status(404).json({ error: 'Social account not found in this club workspace.' });
      return;
    }
    const now = new Date();
    const expiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    account.connection.status = 'Connected';
    account.connection.connectedBy = user.name;
    account.connection.connectedAt = now.toISOString();
    account.connection.expiresAt = expiry.toISOString();
    account.connection.lastCheckedAt = now.toISOString();
    account.connection.errorMessage = undefined;
    account.connection.tokenReference = `vault://cuny-sps/secrets/${account.accountId}-${now.getTime().toString().slice(-4)}`;

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'CONNECT_SOCIAL_ACCOUNT',
      category: 'Integration',
      target: `${account.platform} ${account.handle}`,
      clubId,
      details: `Authorized official OAuth integration. Institutional owner (${account.institutionalOwner}) unchanged.`,
    });
    saveDb();
    res.json({ account: sanitizeSocialAccount(account) });
  });

  // Optional Live Meta Graph / Instagram Business API Credentials (stored server-side only)
  app.post('/api/clubs/:id/social-accounts/:accountId/meta-config', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const accountId = String(req.params.accountId);
    if (!hasClubCapability(user, clubId, 'CONNECT_EXISTING_SOCIAL_ACCOUNT')) {
      res.status(403).json({
        error: 'Only authorized Club Leads or Student Life Administrators can manage Meta API credentials.',
      });
      return;
    }
    const db = getDb();
    const account = db.socialAccounts.find((a) => a.accountId === accountId && a.clubId === clubId);
    if (!account) {
      res.status(404).json({ error: 'Social account not found in this club workspace.' });
      return;
    }

    const { metaPageId, igBusinessAccountId, accessToken, clearToken } = req.body as {
      metaPageId?: string;
      igBusinessAccountId?: string;
      accessToken?: string;
      clearToken?: boolean;
    };

    if (typeof metaPageId === 'string') {
      account.metaPageId = metaPageId.trim() || undefined;
    }
    if (typeof igBusinessAccountId === 'string') {
      account.igBusinessAccountId = igBusinessAccountId.trim() || undefined;
    }
    if (!db.metaTokenSecrets || typeof db.metaTokenSecrets !== 'object') {
      db.metaTokenSecrets = {};
    }
    if (clearToken) {
      delete db.metaTokenSecrets[accountId];
    } else if (typeof accessToken === 'string' && accessToken.trim()) {
      db.metaTokenSecrets[accountId] = accessToken.trim();
      account.connection.tokenReference = `vault://meta-graph/live/${accountId}-${Date.now().toString().slice(-4)}`;
      account.connection.lastCheckedAt = new Date().toISOString();
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'UPDATE_META_GRAPH_CONFIG',
      category: 'Integration',
      target: `${account.platform} ${account.handle}`,
      clubId,
      details: clearToken
        ? 'Cleared stored live Meta Graph API token (reverted to Hub sandbox simulation).'
        : `Updated Meta Graph API endpoints${accessToken?.trim() ? ' and encrypted live token' : ''}.`,
    });
    saveDb();
    res.json({ account: sanitizeSocialAccount(account) });
  });

  app.post('/api/clubs/:id/social-accounts/:accountId/disconnect', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const accountId = String(req.params.accountId);
    if (!hasClubCapability(user, clubId, 'CONNECT_EXISTING_SOCIAL_ACCOUNT')) {
      res.status(403).json({ error: 'Authorization required to disconnect platform integrations.' });
      return;
    }
    const db = getDb();
    const account = db.socialAccounts.find((a) => a.accountId === accountId && a.clubId === clubId);
    if (!account) {
      res.status(404).json({ error: 'Social account not found.' });
      return;
    }
    account.connection.status = 'Disconnected';
    account.connection.lastCheckedAt = new Date().toISOString();
    account.connection.errorMessage = 'Integration disconnected by authorized manager; institutional custodianship preserved.';

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'DISCONNECT_SOCIAL_INTEGRATION',
      category: 'Integration',
      target: `${account.platform} ${account.handle}`,
      clubId,
      details: `Disconnected API integration without altering university account custodianship.`,
    });
    saveDb();
    res.json({ account });
  });

  // Submit Account Request (Creation, Transfer, Closure) (US-009, US-012)
  app.post('/api/clubs/:id/account-requests', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const {
      requestType,
      platform,
      proposedAccountName,
      targetAccountId,
      businessPurpose,
      intendedAudience,
      responsibleRepresentatives,
    } = req.body as {
      requestType: 'New Official Account' | 'Ownership Transfer' | 'Account Closure' | 'Account Archival';
      platform: SocialAccount['platform'];
      proposedAccountName: string;
      targetAccountId?: string;
      businessPurpose: string;
      intendedAudience: string;
      responsibleRepresentatives: string;
    };

    const requiredCap =
      requestType === 'Account Closure' || requestType === 'Account Archival'
        ? 'REQUEST_ACCOUNT_CLOSURE'
        : 'REQUEST_NEW_SOCIAL_ACCOUNT';

    if (!hasClubCapability(user, clubId, requiredCap)) {
      res.status(403).json({ error: 'Only Club Leads or Student Life Administrators can submit official account governance requests.' });
      return;
    }

    if (!proposedAccountName || !businessPurpose || !intendedAudience || !responsibleRepresentatives) {
      res.status(400).json({ error: 'All governance request fields (name, purpose, audience, representatives) are required.' });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const requestId = `REQ-2026-${String(db.accountRequests.length + 15).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newRequest = {
      requestId,
      clubId,
      clubName: club?.name ?? clubId,
      requestType,
      platform,
      proposedAccountName: proposedAccountName.trim(),
      targetAccountId,
      businessPurpose: businessPurpose.trim(),
      intendedAudience: intendedAudience.trim(),
      responsibleRepresentatives: responsibleRepresentatives.trim(),
      status: 'Submitted' as AccountRequestStatus,
      submittedByUserId: user.userId,
      submittedByName: user.name,
      submittedAt: now,
      updatedAt: now,
      approvals: [
        {
          approvalId: `apr-${Date.now()}`,
          requestId,
          authority: 'Club Social Hub Submission Check',
          actorName: user.name,
          decision: 'Submitted',
          notes: 'Submitted for Student Life eligibility review. External account remains unchanged until required approvals are obtained.',
          timestamp: now,
        },
      ],
    };
    db.accountRequests.unshift(newRequest);

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'SUBMIT_ACCOUNT_REQUEST',
      category: 'Governance',
      target: `${requestId} (${requestType}: ${proposedAccountName})`,
      clubId,
      details: `Submitted ${requestType} request for ${platform}.`,
    });

    pushNotification({
      userId: 'usr-sl-super',
      clubId,
      type: 'Approval',
      title: `New ${requestType} request from ${club?.name ?? clubId}`,
      message: `${requestId} for ${platform} (${proposedAccountName}) is awaiting Student Life review.`,
    });

    saveDb();
    res.status(201).json({ request: newRequest });
  });

  // Student Life Review Decision (US-010)
  app.post('/api/admin/account-requests/:id/decisions', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const requestId = String(req.params.id);
    if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Student Life Administrator authorization required to record decisions.' });
      return;
    }
    const db = getDb();
    const accountReq = db.accountRequests.find((r) => r.requestId === requestId);
    if (!accountReq) {
      res.status(404).json({ error: 'Account request not found.' });
      return;
    }
    if (!canAdminManageClub(user, accountReq.clubId)) {
      res.status(403).json({ error: 'Request falls outside your scoped administrative clubs.' });
      return;
    }
    const { nextStatus, notes, authority } = req.body as {
      nextStatus: AccountRequestStatus;
      notes: string;
      authority?: string;
    };
    const now = new Date().toISOString();
    accountReq.status = nextStatus;
    accountReq.updatedAt = now;
    accountReq.approvals.push({
      approvalId: `apr-${Date.now()}`,
      requestId,
      authority: authority || 'CUNY SPS Office of Student Life',
      actorName: user.name,
      decision: nextStatus,
      notes: notes || `Status transitioned to ${nextStatus}.`,
      timestamp: now,
    });

    // If marked Connected on a New Official Account request, register it in the Official Account Inventory
    if (nextStatus === 'Connected' && accountReq.requestType === 'New Official Account') {
      const exists = db.socialAccounts.some(
        (a) => a.clubId === accountReq.clubId && a.handle === accountReq.proposedAccountName
      );
      if (!exists) {
        const accountId = `acc-${Date.now().toString().slice(-5)}`;
        const isPilotPriority =
          accountReq.platform === 'Facebook Pages' || accountReq.platform === 'Instagram Professional';
        db.socialAccounts.push({
          accountId,
          clubId: accountReq.clubId,
          platform: accountReq.platform,
          accountName: accountReq.proposedAccountName,
          handle: accountReq.proposedAccountName.startsWith('@')
            ? accountReq.proposedAccountName
            : `@${accountReq.proposedAccountName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          institutionalOwner: 'CUNY SPS Office of Student Life & CUNY Communications',
          pilotTier: isPilotPriority ? 'Pilot Priority' : 'Later Phase',
          publishingSupported: isPilotPriority,
          analyticsSupported: isPilotPriority,
          custodian: {
            custodianId: `cust-${Date.now()}`,
            accountId,
            userId: user.userId,
            staffName: user.name,
            staffEmail: user.email,
            staffDepartment: 'Office of Student Life',
            responsibility: 'Designated Staff Account Administrator',
            assignedAt: now,
          },
          connection: {
            connectionId: `conn-${Date.now()}`,
            accountId,
            tokenReference: `vault://cuny-sps/secrets/${accountId}-live`,
            status: 'Connected',
            connectedBy: user.name,
            connectedAt: now,
            expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
            lastCheckedAt: now,
          },
        });
      }
    }

    // If an Account Closure request is finalized, deactivate (never delete) the target social account per CUNY retention policy
    if (nextStatus === 'Connected' && accountReq.requestType === 'Account Closure') {
      const targetAcct = db.socialAccounts.find(
        (a) =>
          a.clubId === accountReq.clubId &&
          (a.handle === accountReq.proposedAccountName ||
            a.accountName === accountReq.proposedAccountName)
      );
      if (targetAcct) {
        targetAcct.connection.status = 'Expired';
        targetAcct.connection.errorMessage =
          'Account deactivated per approved CUNY SPS closure request (preserved for institutional continuity).';
      }
    }

    if (nextStatus === 'Connected' && accountReq.requestType === 'Ownership Transfer') {
      const targetAcct = db.socialAccounts.find(
        (a) =>
          a.clubId === accountReq.clubId &&
          (a.handle === accountReq.proposedAccountName ||
            a.accountName === accountReq.proposedAccountName)
      );
      if (targetAcct) {
        targetAcct.institutionalOwner = 'CUNY SPS Office of Student Life & CUNY Communications';
        targetAcct.custodian = {
          ...targetAcct.custodian,
          userId: user.userId,
          staffName: user.name,
          staffEmail: user.email,
          assignedAt: now,
        };
        targetAcct.connection.status = 'Connected';
        targetAcct.connection.lastCheckedAt = now;
        targetAcct.connection.errorMessage = undefined;
      }
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'RECORD_ACCOUNT_DECISION',
      category: 'Governance',
      target: `${requestId} -> ${nextStatus}`,
      clubId: accountReq.clubId,
      details: notes || `Updated request ${requestId} to ${nextStatus}.`,
    });

    pushNotification({
      userId: accountReq.submittedByUserId,
      clubId: accountReq.clubId,
      type: 'Approval',
      title: `Account Request ${requestId}: ${nextStatus}`,
      message: notes || `Student Life recorded decision: ${nextStatus}.`,
    });

    saveDb();
    res.json({ request: accountReq });
  });

  // Create Draft Post (US-013)
  app.post('/api/clubs/:id/posts', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'Viewers cannot create content drafts.' });
      return;
    }
    const {
      title,
      caption,
      hashtags,
      callToAction,
      relatedEvent,
      eventDate,
      targetAccountIds,
      platformAdaptations,
      mediaAsset,
      aiAssisted,
    } = req.body as Partial<Post>;

    if (!title || !caption) {
      res.status(400).json({ error: 'Post title and caption text are required.' });
      return;
    }

    const db = getDb();
    const now = new Date().toISOString();
    const post: Post = {
      postId: `post-${Date.now().toString().slice(-6)}`,
      clubId,
      title: title.trim(),
      caption: caption.trim(),
      platformAdaptations,
      hashtags: hashtags ?? [],
      callToAction,
      relatedEvent,
      eventDate,
      authorId: user.userId,
      authorName: user.name,
      status: 'Draft',
      targetAccountIds: targetAccountIds ?? [],
      mediaAsset,
      createdAt: now,
      updatedAt: now,
      aiAssisted: Boolean(aiAssisted),
      aiReviewedByHuman: true,
      publishAttempts: [],
    };
    db.posts.unshift(post);

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'CREATE_CONTENT_DRAFT',
      category: 'Publishing',
      target: `${post.postId} (${post.title})`,
      clubId,
      details: `Saved draft in club workspace${aiAssisted ? ' (AI-assisted, human-reviewed)' : ''}.`,
    });
    saveDb();
    res.status(201).json({ post });
  });

  app.patch('/api/clubs/:id/posts/:postId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const postId = String(req.params.postId);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'Insufficient permissions to edit content.' });
      return;
    }
    const db = getDb();
    const post = db.posts.find((p) => p.postId === postId && p.clubId === clubId);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    if (post.status === 'Scheduled' && !hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({ error: 'Only an Editor or Club Lead may change scheduled content.' });
      return;
    }
    try {
      const updated = updateDraft(post, req.body ?? {});
      if (updated.targetAccountIds.some(id => !db.socialAccounts.some(a => a.accountId === id && a.clubId === clubId))) {
        res.status(400).json({ error: 'Every destination must belong to this club workspace.' });
        return;
      }
      Object.assign(post, updated);
    } catch (err) {
      if (!(err instanceof DraftUpdateError)) throw err;
      res.status(err.status).json({ error: err.message });
      return;
    }
    saveDb();
    res.json({ post });
  });

  // Schedule Post (US-015)
  app.post('/api/clubs/:id/posts/:postId/schedule', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const postId = String(req.params.postId);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Contributors and Viewers cannot schedule posts. Submit as draft for an Editor or Club Lead.',
      });
      return;
    }
    const { scheduledAt, targetAccountIds } = req.body as {
      scheduledAt: string;
      targetAccountIds?: string[];
    };
    if (!scheduledAt) {
      res.status(400).json({ error: 'Scheduled publication date and time are required.' });
      return;
    }
    const db = getDb();
    const post = db.posts.find((p) => p.postId === postId && p.clubId === clubId);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    if (targetAccountIds && targetAccountIds.length > 0) {
      post.targetAccountIds = targetAccountIds;
    }
    if (post.targetAccountIds.length === 0) {
      res.status(400).json({ error: 'Select at least one connected social account before scheduling.' });
      return;
    }
    post.scheduledAt = scheduledAt;
    post.status = 'Scheduled';
    post.updatedAt = new Date().toISOString();

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'SCHEDULE_POST',
      category: 'Publishing',
      target: `${post.postId} -> ${scheduledAt}`,
      clubId,
      details: `Scheduled "${post.title}" across ${post.targetAccountIds.length} account(s).`,
    });
    saveDb();
    res.json({ post });
  });

  // Publish Now / Retry Failed Publication (US-014, US-023)
  app.post('/api/clubs/:id/posts/:postId/publish', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const postId = String(req.params.postId);
    if (!hasClubCapability(user, clubId, 'PUBLISH_CONTENT')) {
      res.status(403).json({
        error: 'Contributors and Viewers do not have publishing privileges. An authorized Editor or Club Lead must review and publish.',
      });
      return;
    }
    const db = getDb();
    const post = db.posts.find((p) => p.postId === postId && p.clubId === clubId);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const { targetAccountIds } = req.body as { targetAccountIds?: string[] };
    if (targetAccountIds && targetAccountIds.length > 0) {
      post.targetAccountIds = targetAccountIds;
    }
    if (post.targetAccountIds.length === 0) {
      res.status(400).json({ error: 'Select at least one social account to publish.' });
      return;
    }

    const updated = await executePostPublish(
      post,
      user.name,
      user.userId,
      getUserEffectiveClubRole(user, clubId) ?? user.systemRole
    );
    res.json({ post: updated });
  });

  // Internal Peer Review Workflow (Contributor -> Lead/Editor Handoff)
  app.post('/api/clubs/:id/posts/:postId/request-review', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const postId = String(req.params.postId);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'Insufficient permissions to request internal officer review.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const post = db.posts.find((p) => p.postId === postId && p.clubId === clubId);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const { note } = (req.body ?? {}) as { note?: string };
    const now = new Date().toISOString();
    post.status = 'In Review';
    post.peerReviewRequestedBy = user.name;
    post.peerReviewRequestedAt = now;
    post.updatedAt = now;

    if (note?.trim()) {
      if (!Array.isArray(post.peerReviewComments)) post.peerReviewComments = [];
      post.peerReviewComments.push({
        commentId: `prc-${Date.now().toString().slice(-6)}`,
        authorId: user.userId,
        authorName: user.name,
        authorRoleLabel: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
        body: note.trim(),
        createdAt: now,
      });
    }

    for (const mem of db.memberships) {
      if (
        mem.clubId === clubId &&
        mem.status === 'Active' &&
        (mem.role === 'CLUB_LEAD' || mem.role === 'EDITOR') &&
        mem.userId !== user.userId
      ) {
        pushNotification({
          userId: mem.userId,
          clubId,
          type: 'Peer Review',
          title: `Internal Review Requested (${club?.shortCode ?? clubId})`,
          message: `${user.name} submitted "${post.title}" for Editor/Lead peer review.`,
        });
      }
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'REQUEST_INTERNAL_PEER_REVIEW',
      category: 'Publishing',
      target: `${post.postId} (${post.title})`,
      clubId,
      details: `Moved draft into Internal Peer Review queue for Club Lead/Editor sign-off.`,
    });
    saveDb();
    res.json({ post });
  });

  app.post('/api/clubs/:id/posts/:postId/review-comment', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const postId = String(req.params.postId);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'Insufficient permissions to comment on content drafts.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const post = db.posts.find((p) => p.postId === postId && p.clubId === clubId);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const { body } = req.body as { body?: string };
    if (!body?.trim()) {
      res.status(400).json({ error: 'Review comment text is required.' });
      return;
    }
    const now = new Date().toISOString();
    const comment: PeerReviewComment = {
      commentId: `prc-${Date.now().toString().slice(-6)}`,
      authorId: user.userId,
      authorName: user.name,
      authorRoleLabel: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      body: body.trim(),
      createdAt: now,
    };
    if (!Array.isArray(post.peerReviewComments)) post.peerReviewComments = [];
    post.peerReviewComments.push(comment);
    post.updatedAt = now;

    if (post.authorId !== user.userId) {
      pushNotification({
        userId: post.authorId,
        clubId,
        type: 'Peer Review',
        title: `Peer Review Feedback on "${post.title}" (${club?.shortCode ?? clubId})`,
        message: `${user.name}: ${comment.body.slice(0, 120)}`,
      });
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'ADD_PEER_REVIEW_COMMENT',
      category: 'Publishing',
      target: `${post.postId} (${post.title})`,
      clubId,
      details: `Added peer review note: "${comment.body.slice(0, 90)}".`,
    });
    saveDb();
    res.status(201).json({ post, comment });
  });

  // Cross-Club Co-Sponsored Reshare Workflow
  app.get('/api/reshare-requests', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const db = getDb();
    const requests = (db.reshareRequests ?? [])
      .filter((r) => canAccessClub(user, r.sourceClubId) || canAccessClub(user, r.targetClubId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ requests });
  });

  app.post('/api/clubs/:id/posts/:postId/reshare-request', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const sourceClubId = String(req.params.id);
    const postId = String(req.params.postId);
    if (!hasClubCapability(user, sourceClubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Admins can request a cross-club reshare.',
      });
      return;
    }
    const db = getDb();
    const sourceClub = db.clubs.find((c) => c.clubId === sourceClubId);
    const post = db.posts.find((p) => p.postId === postId && p.clubId === sourceClubId);
    if (!sourceClub || !post) {
      res.status(404).json({ error: 'Source club or post not found.' });
      return;
    }
    const { targetClubId, note } = req.body as { targetClubId?: string; note?: string };
    if (!targetClubId || targetClubId === sourceClubId) {
      res.status(400).json({ error: 'Select a different partner club to request a reshare.' });
      return;
    }
    const targetClub = db.clubs.find((c) => c.clubId === targetClubId && c.status === 'Active');
    if (!targetClub) {
      res.status(404).json({ error: 'Target partner club not found or inactive.' });
      return;
    }

    const request: CrossClubReshareRequest = {
      requestId: `rsh-${Date.now().toString().slice(-6)}`,
      sourceClubId,
      sourceClubName: sourceClub.name,
      sourceClubShortCode: sourceClub.shortCode,
      targetClubId,
      targetClubName: targetClub.name,
      targetClubShortCode: targetClub.shortCode,
      sourcePostId: post.postId,
      sourcePostTitle: post.title,
      sourceCaption: post.caption,
      requestedByUserId: user.userId,
      requestedByName: user.name,
      note: note?.trim() || undefined,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    if (!Array.isArray(db.reshareRequests)) db.reshareRequests = [];
    db.reshareRequests.unshift(request);

    for (const mem of db.memberships) {
      if (
        mem.clubId === targetClubId &&
        mem.status === 'Active' &&
        (mem.role === 'CLUB_LEAD' || mem.role === 'EDITOR')
      ) {
        pushNotification({
          userId: mem.userId,
          clubId: targetClubId,
          type: 'Reshare Request',
          title: `Co-Sponsored Reshare Request from ${sourceClub.shortCode}`,
          message: `${user.name} invited ${targetClub.shortCode} to cross-post "${post.title}".`,
        });
      }
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, sourceClubId) ?? user.systemRole,
      action: 'REQUEST_CROSS_CLUB_RESHARE',
      category: 'Publishing',
      target: `${sourceClub.shortCode} -> ${targetClub.shortCode}: ${post.title}`,
      clubId: sourceClubId,
      details: `Requested co-sponsored reshare from ${targetClub.name}.`,
    });
    saveDb();
    res.status(201).json({ request });
  });

  app.post('/api/reshare-requests/:requestId/decision', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const requestId = String(req.params.requestId);
    const db = getDb();
    const reshareReq = (db.reshareRequests ?? []).find((r) => r.requestId === requestId);
    if (!reshareReq) {
      res.status(404).json({ error: 'Cross-club reshare request not found.' });
      return;
    }
    if (!hasClubCapability(user, reshareReq.targetClubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only target club Leads, Editors, or Student Life Admins can approve or decline reshares.',
      });
      return;
    }
    const { decision } = req.body as { decision?: 'Approved' | 'Declined' };
    if (decision !== 'Approved' && decision !== 'Declined') {
      res.status(400).json({ error: 'Decision must be Approved or Declined.' });
      return;
    }
    const now = new Date().toISOString();
    reshareReq.status = decision;
    reshareReq.decidedByName = user.name;
    reshareReq.decidedAt = now;

    let createdPost: Post | undefined;
    if (decision === 'Approved') {
      const targetAccounts = db.socialAccounts
        .filter((a) => a.clubId === reshareReq.targetClubId && a.connection.status === 'Connected')
        .map((a) => a.accountId);
      createdPost = {
        postId: `post-rsh-${Date.now().toString().slice(-6)}`,
        clubId: reshareReq.targetClubId,
        title: `Reshare [${reshareReq.sourceClubShortCode}]: ${reshareReq.sourcePostTitle}`,
        caption: `Co-sponsored highlight with ${reshareReq.sourceClubName} (${reshareReq.sourceClubShortCode}):\n\n${reshareReq.sourceCaption}`,
        hashtags: ['#CUNYSPS', `#${reshareReq.sourceClubShortCode.replace(/[^A-Z0-9]/gi, '')}`, '#StudentLife'],
        authorId: user.userId,
        authorName: user.name,
        status: 'Draft',
        targetAccountIds: targetAccounts,
        createdAt: now,
        updatedAt: now,
        aiAssisted: false,
        aiReviewedByHuman: true,
        publishAttempts: [],
      };
      db.posts.unshift(createdPost);
      reshareReq.createdPostId = createdPost.postId;
    }

    pushNotification({
      userId: reshareReq.requestedByUserId,
      clubId: reshareReq.sourceClubId,
      type: 'Reshare Request',
      title: `Reshare ${decision} by ${reshareReq.targetClubShortCode}`,
      message:
        decision === 'Approved'
          ? `${user.name} accepted your reshare request and queued a cross-post draft for "${reshareReq.sourcePostTitle}".`
          : `${user.name} declined the reshare request for "${reshareReq.sourcePostTitle}".`,
    });

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, reshareReq.targetClubId) ?? user.systemRole,
      action: decision === 'Approved' ? 'APPROVE_CROSS_CLUB_RESHARE' : 'DECLINE_CROSS_CLUB_RESHARE',
      category: 'Publishing',
      target: `${reshareReq.targetClubShortCode}: ${reshareReq.sourcePostTitle}`,
      clubId: reshareReq.targetClubId,
      details: `${decision} cross-club reshare request from ${reshareReq.sourceClubShortCode}.`,
    });
    saveDb();
    res.json({ request: reshareReq, createdPost });
  });

  // Content Calendar (Module 7)
  app.get('/api/clubs/:id/calendar', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club access.' });
      return;
    }
    const db = getDb();
    res.json({
      posts: db.posts.filter((p) => p.clubId === clubId),
      events: db.events.filter((e) => e.clubId === clubId),
    });
  });

  // Official Club Resources Catalog & Downloads
  app.get('/api/resources', (_req: AuthedRequest, res) => {
    const resources = OFFICIAL_CLUB_RESOURCES.map(({ content: _omit, ...meta }) => meta);
    res.json({ resources });
  });

  app.get('/api/resources/:resourceId/preview', (req: AuthedRequest, res) => {
    const resourceId = String(req.params.resourceId);
    const entry = OFFICIAL_CLUB_RESOURCES.find((r) => r.resourceId === resourceId);
    if (!entry) {
      res.status(404).json({ error: 'Club resource not found.' });
      return;
    }
    res.json({
      resource: {
        resourceId: entry.resourceId,
        title: entry.title,
        category: entry.category,
        description: entry.description,
        fileName: entry.fileName,
        fileFormat: entry.fileFormat,
        mimeType: entry.mimeType,
        version: entry.version,
        updatedAt: entry.updatedAt,
        publishedBy: entry.publishedBy,
        audienceNote: entry.audienceNote,
      },
      content: entry.content,
    });
  });

  app.get('/api/resources/:resourceId/download', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const resourceId = String(req.params.resourceId);
    const entry = OFFICIAL_CLUB_RESOURCES.find((r) => r.resourceId === resourceId);
    if (!entry) {
      res.status(404).json({ error: 'Club resource not found.' });
      return;
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'DOWNLOAD_CLUB_RESOURCE',
      category: 'Governance',
      target: `${entry.title} (${entry.fileName})`,
      details: `Downloaded official ${entry.category} resource (${entry.version}).`,
    });
    saveDb();

    res.setHeader('Content-Type', entry.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${entry.fileName}"`);
    res.send(entry.content);
  });

  // In-App Event Proposal & Financial Reimbursement Submissions to Student Life
  app.get('/api/resource-submissions', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const db = getDb();
    const submissions = (db.resourceSubmissions ?? [])
      .filter((sub) => isAdminUser(user) || canAccessClub(user, sub.clubId))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    res.json({ submissions });
  });

  app.post('/api/clubs/:id/resource-submissions', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can submit official packets to Student Life.',
      });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const { type, title, summary, amountUsd, eventDate, payload, coSponsorClubIds, budgetSplits, offCampusVenue } = req.body as {
      type?: ResourceSubmissionType;
      title?: string;
      summary?: string;
      amountUsd?: number;
      eventDate?: string;
      payload?: Record<string, unknown>;
      coSponsorClubIds?: string[];
      budgetSplits?: BudgetSplitAllocation[];
      offCampusVenue?: boolean;
    };

    if (
      (type !== 'Event Proposal' && type !== 'Financial Reimbursement') ||
      !title?.trim() ||
      !summary?.trim()
    ) {
      res.status(400).json({
        error: 'Submission type, title, and summary details are required.',
      });
      return;
    }

    const cleanedCoSponsors = Array.isArray(coSponsorClubIds)
      ? Array.from(new Set(coSponsorClubIds.filter((id) => id && id !== clubId)))
      : [];
    const cleanedSplits =
      Array.isArray(budgetSplits) && budgetSplits.length > 0 ? budgetSplits : undefined;
    const isHighBudgetOrOffCampus =
      type === 'Event Proposal' && ((Number(amountUsd) || 0) >= 250 || Boolean(offCampusVenue));

    const now = new Date().toISOString();
    const submission: ResourceSubmission = {
      submissionId: `SUB-2026-${100 + (db.resourceSubmissions?.length ?? 0) + 1}`,
      clubId,
      clubName: club.name,
      clubShortCode: club.shortCode,
      type,
      title: title.trim(),
      summary: summary.trim(),
      amountUsd: typeof amountUsd === 'number' && Number.isFinite(amountUsd) ? amountUsd : undefined,
      eventDate: eventDate?.trim() || undefined,
      coSponsorClubIds: cleanedCoSponsors.length > 0 ? cleanedCoSponsors : undefined,
      budgetSplits: cleanedSplits,
      offCampusVenue: Boolean(offCampusVenue),
      requiresAdvisorSignOff: isHighBudgetOrOffCampus,
      payload: payload ?? {},
      status: 'Submitted',
      submittedByUserId: user.userId,
      submittedByName: user.name,
      submittedByEmail: user.email,
      submittedAt: now,
      updatedAt: now,
    };

    db.resourceSubmissions.unshift(submission);

    for (const admin of db.users.filter((u) => isAdminUser(u))) {
      pushNotification({
        userId: admin.userId,
        clubId,
        type: 'Resource Submission',
        title: `New ${type} Submitted (${club.shortCode})`,
        message: `${user.name} submitted "${submission.title}" for Office of Student Life review.`,
      });
    }

    if (isHighBudgetOrOffCampus) {
      for (const advisor of findFacultyAdvisorUsers(clubId)) {
        if (advisor.userId !== user.userId) {
          pushNotification({
            userId: advisor.userId,
            clubId,
            type: 'Advisor Sign-Off',
            title: `Faculty Advisor Co-Sign Required (${club.shortCode})`,
            message: `"${submission.title}" ($${(submission.amountUsd ?? 0).toFixed(2)}${submission.offCampusVenue ? ' · Off-Campus Venue' : ''}) requires your Faculty Advisor co-sign.`,
          });
        }
      }
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'SUBMIT_RESOURCE_PACKET',
      category: 'Governance',
      target: `${submission.submissionId}: ${submission.title}`,
      clubId,
      details: `Submitted ${type} packet for ${club.name}${isHighBudgetOrOffCampus ? ' (Faculty Advisor co-sign flagged)' : ''}.`,
    });
    saveDb();
    res.status(201).json({ submission });
  });

  // Faculty Advisor Co-Sign on High-Budget / Off-Campus Event Proposals
  app.post('/api/clubs/:id/resource-submissions/:submissionId/advisor-signoff', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const submissionId = String(req.params.submissionId);
    if (!isClubFacultyAdvisor(user, clubId)) {
      res.status(403).json({
        error: 'Only the club’s Faculty Advisor or Student Life Administrator can co-sign this submission.',
      });
      return;
    }
    const db = getDb();
    const submission = (db.resourceSubmissions ?? []).find(
      (s) => s.submissionId === submissionId && s.clubId === clubId
    );
    if (!submission) {
      res.status(404).json({ error: 'Resource submission not found.' });
      return;
    }
    const { note } = (req.body ?? {}) as { note?: string };
    const now = new Date().toISOString();
    submission.advisorSignOff = {
      signedByUserId: user.userId,
      signedByName: user.name,
      signedAt: now,
      note: note?.trim() || 'Co-signed by Faculty Advisor for Student Life approval.',
    };
    submission.updatedAt = now;

    pushNotification({
      userId: submission.submittedByUserId,
      clubId,
      type: 'Advisor Sign-Off',
      title: `Faculty Advisor Co-Signed ${submission.submissionId}`,
      message: `${user.name} co-signed "${submission.title}".`,
    });

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'ADVISOR_COSIGN_SUBMISSION',
      category: 'Governance',
      target: `${submission.submissionId}: ${submission.title}`,
      clubId,
      details: submission.advisorSignOff.note ?? 'Faculty Advisor co-signed proposal packet.',
    });
    saveDb();
    res.json({ submission });
  });

  app.patch('/api/admin/resource-submissions/:submissionId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({
        error: 'Only Office of Student Life Administrators can update submission review status.',
      });
      return;
    }

    const submissionId = String(req.params.submissionId);
    const db = getDb();
    const submission = (db.resourceSubmissions ?? []).find(
      (s) => s.submissionId === submissionId
    );
    if (!submission) {
      res.status(404).json({ error: 'Resource submission not found.' });
      return;
    }

    const { status, reviewNotes } = req.body as {
      status?: ResourceSubmissionStatus;
      reviewNotes?: string;
    };
    const validStatuses: ResourceSubmissionStatus[] = [
      'Submitted',
      'Under Review',
      'Approved',
      'Revisions Requested',
    ];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Valid review status is required.' });
      return;
    }

    const now = new Date().toISOString();
    submission.status = status;
    submission.reviewedByName = user.name;
    submission.reviewedAt = now;
    submission.updatedAt = now;
    if (typeof reviewNotes === 'string') {
      submission.reviewNotes = reviewNotes.trim();
    }

    pushNotification({
      userId: submission.submittedByUserId,
      clubId: submission.clubId,
      type: 'Resource Submission',
      title: `${submission.type} ${status} (${submission.submissionId})`,
      message: `${user.name} marked "${submission.title}" as ${status}.${submission.reviewNotes ? ` Note: ${submission.reviewNotes}` : ''}`,
    });

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'REVIEW_RESOURCE_PACKET',
      category: 'Governance',
      target: `${submission.submissionId} -> ${status}`,
      clubId: submission.clubId,
      details: submission.reviewNotes || `Updated packet status to ${status}.`,
    });
    saveDb();
    res.json({ submission });
  });

  // Upcoming Club Events & Meetings
  app.get('/api/events', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const db = getDb();
    const events = db.events
      .filter(
        (ev) =>
          canAccessClub(user, ev.clubId) ||
          Boolean(ev.coSponsorClubIds?.some((cid) => canAccessClub(user, cid)))
      )
      .map((ev) => enrichEventForUser(ev, user.userId))
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    res.json({ events });
  });

  app.post('/api/clubs/:id/events', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({
        error: 'Posting upcoming meetings or campus events requires Contributor permissions or higher.',
      });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const {
      title,
      date,
      time,
      location,
      description,
      eventType,
      isPublic,
      recurrence,
      recurrenceCount,
      inPersonCapacity,
      virtualCapacity,
      coSponsorClubIds,
    } = req.body as {
      title?: string;
      date?: string;
      time?: string;
      location?: string;
      description?: string;
      eventType?: 'Club Meeting' | 'Campus Event' | 'Workshop' | 'Networking';
      isPublic?: boolean;
      recurrence?: EventRecurrence;
      recurrenceCount?: number;
      inPersonCapacity?: number;
      virtualCapacity?: number;
      coSponsorClubIds?: string[];
    };

    if (!title?.trim() || !date?.trim() || !time?.trim() || !location?.trim() || !description?.trim()) {
      res.status(400).json({
        error: 'Title, date, time, location, and description are required to post a club event.',
      });
      return;
    }

    const validTypes = ['Club Meeting', 'Campus Event', 'Workshop', 'Networking'] as const;
    const normalizedType =
      eventType && validTypes.includes(eventType) ? eventType : 'Club Meeting';
    const resolvedRecurrence: EventRecurrence =
      recurrence === 'Weekly' || recurrence === 'Biweekly' ? recurrence : 'None';
    const occurrences =
      resolvedRecurrence === 'None'
        ? 1
        : Math.max(2, Math.min(8, Number(recurrenceCount) || 4));
    const seriesId = resolvedRecurrence === 'None' ? undefined : `ser-${Date.now().toString().slice(-6)}`;
    const dayStep = resolvedRecurrence === 'Biweekly' ? 14 : 7;
    const cleanedCoSponsors = Array.isArray(coSponsorClubIds)
      ? Array.from(new Set(coSponsorClubIds.filter((id) => id && id !== clubId)))
      : [];

    const addDaysIso = (baseDateStr: string, offsetDays: number): string => {
      const parsed = new Date(`${baseDateStr}T12:00:00Z`);
      if (Number.isNaN(parsed.getTime())) return baseDateStr;
      parsed.setUTCDate(parsed.getUTCDate() + offsetDays);
      return parsed.toISOString().slice(0, 10);
    };

    const createdEvents: ClubEvent[] = [];
    const baseStamp = Date.now().toString().slice(-6);

    for (let i = 0; i < occurrences; i += 1) {
      const occDate = i === 0 ? date.trim() : addDaysIso(date.trim(), i * dayStep);
      const codePrefix = club.shortCode.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || 'EV';
      const codeDigits = String(Math.floor(1000 + Math.random() * 9000));
      const newEvent: ClubEvent = {
        eventId: `evt-${baseStamp}${occurrences > 1 ? `-${i + 1}` : ''}`,
        clubId,
        title: occurrences > 1 ? `${title.trim()} (${i + 1}/${occurrences})` : title.trim(),
        date: occDate,
        time: time.trim(),
        location: location.trim(),
        description: description.trim(),
        eventType: normalizedType,
        postedByName: user.name,
        createdAt: new Date().toISOString(),
        coSponsorClubIds: cleanedCoSponsors.length > 0 ? cleanedCoSponsors : undefined,
        inPersonCapacity:
          typeof inPersonCapacity === 'number' && Number.isFinite(inPersonCapacity) && inPersonCapacity > 0
            ? Math.round(inPersonCapacity)
            : undefined,
        virtualCapacity:
          typeof virtualCapacity === 'number' && Number.isFinite(virtualCapacity) && virtualCapacity > 0
            ? Math.round(virtualCapacity)
            : undefined,
        rsvpModes: {},
        waitlistUserIds: [],
        rsvpUserIds: [],
        checkedInUserIds: [],
        guestWalkInCount: 0,
        isPublic: isPublic !== false,
        approvalStatus: 'Approved',
        checkInCode: `${codePrefix}${codeDigits}`,
        recurrence: resolvedRecurrence,
        recurrenceSeriesId: seriesId,
        recurrenceCount: occurrences,
      };
      db.events.push(newEvent);
      createdEvents.push(newEvent);
    }

    const primaryEvent = createdEvents[0];
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'CREATE_CLUB_EVENT',
      category: 'Publishing',
      target: `${primaryEvent.title} (${primaryEvent.date})`,
      clubId,
      details: `Posted ${normalizedType} for ${club.name} at ${primaryEvent.location}${
        occurrences > 1 ? ` (${resolvedRecurrence} series, ${occurrences} occurrences)` : ''
      }.`,
    });
    const autoAlertGroups = (db.whatsappGroups ?? []).filter(
      (g) => g.clubId === clubId && g.status === 'Connected' && g.autoAlertNewEvents
    );
    for (const grp of autoAlertGroups) {
      const autoAlert: WhatsAppAlertMessage = {
        alertId: `wa-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        clubId,
        groupId: grp.groupId,
        groupName: grp.groupName,
        category: 'Event Reminder',
        title: `New Event: ${primaryEvent.title}`,
        messageBody: `${club.name} posted "${primaryEvent.title}" on ${primaryEvent.date} at ${primaryEvent.time} (${primaryEvent.location}). RSVP in the CUNY SPS Club Social Hub!`,
        linkedEventId: primaryEvent.eventId,
        linkedEventTitle: primaryEvent.title,
        deliveryMode: grp.deliveryMode,
        deliveryStatus: 'Ready for WhatsApp Share',
        recipientCountEstimate: grp.memberCountEstimate,
        syncToHubNotifications: false,
        sentByUserId: user.userId,
        sentByName: user.name,
        sentByRoleLabel: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
        sentAt: new Date().toISOString(),
      };
      const result = await dispatchWhatsAppAlert(grp, club.name, autoAlert);
      autoAlert.deliveryStatus = result.deliveryStatus;
      autoAlert.deliveryDetails = result.deliveryDetails;
      grp.lastMessageAt = autoAlert.sentAt;
      db.whatsappMessages.unshift(autoAlert);
    }

    saveDb();
    await run24HourReminderSweep();
    res.status(201).json({
      event: enrichEventForUser(primaryEvent, user.userId),
      createdCount: createdEvents.length,
    });
  });

  // Update Club Event Logistics & Auto-Dispatch Calendar Change Emails
  app.patch('/api/clubs/:id/events/:eventId', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const eventId = String(req.params.eventId);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can edit scheduled club events.',
      });
      return;
    }

    const db = getDb();
    const ev = db.events.find((e) => e.eventId === eventId && e.clubId === clubId);
    if (!ev) {
      res.status(404).json({ error: 'Club event not found.' });
      return;
    }

    const { title, date, time, location, description, inPersonCapacity, coSponsorClubIds } = req.body as {
      title?: string;
      date?: string;
      time?: string;
      location?: string;
      description?: string;
      inPersonCapacity?: number | null;
      coSponsorClubIds?: string[];
    };

    const changes: string[] = [];
    if (typeof title === 'string' && title.trim() && title.trim() !== ev.title) {
      changes.push(`Title changed to "${title.trim()}"`);
      ev.title = title.trim();
    }
    if (typeof date === 'string' && date.trim() && date.trim() !== ev.date) {
      changes.push(`Date moved from ${ev.date} to ${date.trim()}`);
      ev.date = date.trim();
    }
    if (typeof time === 'string' && time.trim() && time.trim() !== ev.time) {
      changes.push(`Time updated from ${ev.time} to ${time.trim()} ET`);
      ev.time = time.trim();
    }
    if (typeof location === 'string' && location.trim() && location.trim() !== ev.location) {
      changes.push(`Location changed to "${location.trim()}"`);
      ev.location = location.trim();
    }
    if (typeof description === 'string' && description.trim()) {
      ev.description = description.trim();
    }
    if (inPersonCapacity === null) {
      ev.inPersonCapacity = undefined;
    } else if (typeof inPersonCapacity === 'number' && Number.isFinite(inPersonCapacity) && inPersonCapacity > 0) {
      ev.inPersonCapacity = Math.round(inPersonCapacity);
    }
    if (Array.isArray(coSponsorClubIds)) {
      ev.coSponsorClubIds = Array.from(new Set(coSponsorClubIds.filter((id) => id && id !== clubId)));
    }
    ev.updatedAt = new Date().toISOString();

    let noticesSent = 0;
    if (changes.length > 0) {
      const dispatched = await dispatchEventUpdateEmails({
        event: ev,
        changeSummary: changes.join('; '),
        actorId: user.userId,
        actorName: user.name,
        actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      });
      noticesSent = dispatched.length;
    } else {
      saveDb();
    }

    res.json({
      event: enrichEventForUser(ev, user.userId),
      noticesSent,
      changeSummary: changes.join('; ') || 'Details saved.',
    });
  });

  app.post('/api/clubs/:id/events/:eventId/rsvp', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const eventId = String(req.params.eventId);
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const ev = db.events.find((e) => e.eventId === eventId && e.clubId === clubId);
    if (!ev) {
      res.status(404).json({ error: 'Club event not found.' });
      return;
    }
    const isCoSponsorMember = Boolean(ev.coSponsorClubIds?.some((cid) => canAccessClub(user, cid)));
    if (!canAccessClub(user, clubId) && !isCoSponsorMember) {
      res.status(403).json({
        error: 'Only authorized members of participating clubs or Student Life staff can RSVP.',
      });
      return;
    }

    const currentList = Array.isArray(ev.rsvpUserIds) ? [...ev.rsvpUserIds] : [];
    const waitlist = Array.isArray(ev.waitlistUserIds) ? [...ev.waitlistUserIds] : [];
    const modes = { ...(ev.rsvpModes ?? {}) };
    const alreadyAttending = currentList.includes(user.userId);
    const alreadyWaitlisted = waitlist.includes(user.userId);

    const { attending, mode } = (req.body ?? {}) as {
      attending?: boolean;
      mode?: 'In-Person' | 'Virtual';
    };
    const nextAttending =
      typeof attending === 'boolean' ? attending : !(alreadyAttending || alreadyWaitlisted);
    const requestedMode: 'In-Person' | 'Virtual' =
      mode === 'Virtual' ? 'Virtual' : ev.inPersonCapacity ? 'In-Person' : 'Virtual';

    let promotedUserName: string | undefined;
    let waitlisted = false;

    if (nextAttending) {
      if (!alreadyAttending) {
        const currentInPersonCount = currentList.filter(
          (uid) => (modes[uid] ?? (ev.inPersonCapacity ? 'In-Person' : 'Virtual')) === 'In-Person'
        ).length;
        const capReached =
          requestedMode === 'In-Person' &&
          typeof ev.inPersonCapacity === 'number' &&
          currentInPersonCount >= ev.inPersonCapacity;

        if (capReached) {
          if (!alreadyWaitlisted) waitlist.push(user.userId);
          modes[user.userId] = 'In-Person';
          waitlisted = true;
        } else {
          const wIdx = waitlist.indexOf(user.userId);
          if (wIdx !== -1) waitlist.splice(wIdx, 1);
          currentList.push(user.userId);
          modes[user.userId] = requestedMode;
        }
      } else if (mode && modes[user.userId] !== mode) {
        modes[user.userId] = requestedMode;
      }
    } else {
      const wasInPerson = (modes[user.userId] ?? 'In-Person') === 'In-Person';
      const idx = currentList.indexOf(user.userId);
      if (idx !== -1) currentList.splice(idx, 1);
      const wIdx = waitlist.indexOf(user.userId);
      if (wIdx !== -1) waitlist.splice(wIdx, 1);
      delete modes[user.userId];

      // Auto-promote next student from waitlist when an In-Person seat opens
      if (wasInPerson && waitlist.length > 0) {
        const promotedId = waitlist.shift()!;
        currentList.push(promotedId);
        modes[promotedId] = 'In-Person';
        const promotedUser = db.users.find((u) => u.userId === promotedId);
        promotedUserName = promotedUser?.name ?? promotedId;
        pushNotification({
          userId: promotedId,
          clubId,
          type: 'Event Reminder',
          title: `Seat Opened: Confirmed In-Person Spot (${club?.shortCode ?? clubId})`,
          message: `You were automatically promoted from the waitlist for "${ev.title}" (${ev.date}).`,
        });
      }
    }

    ev.rsvpUserIds = currentList;
    ev.waitlistUserIds = waitlist;
    ev.rsvpModes = modes;

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: waitlisted
        ? 'EVENT_WAITLIST_JOINED'
        : nextAttending
          ? 'EVENT_RSVP_CONFIRMED'
          : 'EVENT_RSVP_CANCELLED',
      category: 'Membership',
      target: `${ev.title} (${ev.date})`,
      clubId,
      details: waitlisted
        ? `${user.name} joined the In-Person waitlist (${waitlist.length} waitlisted).`
        : `${user.name} ${nextAttending ? `confirmed ${requestedMode} RSVP` : 'cancelled RSVP'}${
            promotedUserName ? `; auto-promoted ${promotedUserName} from waitlist` : ''
          }.`,
    });

    saveDb();
    res.json({
      event: enrichEventForUser(ev, user.userId),
      waitlisted,
      promotedUserName,
    });
  });

  // Post-Event Feedback Pulse (3-question quick survey)
  app.post('/api/clubs/:id/events/:eventId/feedback', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const eventId = String(req.params.eventId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club event feedback submission.' });
      return;
    }
    const db = getDb();
    const ev = db.events.find((e) => e.eventId === eventId && e.clubId === clubId);
    if (!ev) {
      res.status(404).json({ error: 'Club event not found.' });
      return;
    }

    const { rating, relevantToGoals, takeaway } = req.body as {
      rating?: number;
      relevantToGoals?: boolean;
      takeaway?: string;
    };
    const numRating = Number(rating);
    if (!Number.isFinite(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({ error: 'Satisfaction rating must be between 1 and 5.' });
      return;
    }
    if (!Array.isArray(ev.feedbackResponses)) ev.feedbackResponses = [];
    const now = new Date().toISOString();
    const existing = ev.feedbackResponses.find((f) => f.userId === user.userId);
    const entry: EventFeedbackResponse = {
      feedbackId: existing?.feedbackId ?? `fb-${Date.now().toString().slice(-6)}`,
      userId: user.userId,
      respondentName: user.name,
      rating: Math.round(numRating),
      relevantToGoals: relevantToGoals !== false,
      takeaway: takeaway?.trim() || 'Helpful session.',
      submittedAt: now,
    };
    if (existing) {
      Object.assign(existing, entry);
    } else {
      ev.feedbackResponses.push(entry);
    }

    const count = ev.feedbackResponses.length;
    const avg =
      Math.round((ev.feedbackResponses.reduce((s, f) => s + f.rating, 0) / count) * 10) / 10;

    if (ev.syncedAnalyticsRecordId) {
      const rec = db.eventAttendanceRecords.find(
        (r) => r.recordId === ev.syncedAnalyticsRecordId
      );
      if (rec) {
        rec.avgFeedbackRating = avg;
        rec.feedbackCount = count;
      }
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'SUBMIT_EVENT_FEEDBACK',
      category: 'Membership',
      target: `${ev.title} (${entry.rating}/5)`,
      clubId,
      details: `Submitted post-event feedback pulse (${count} responses, ${avg}/5 avg).`,
    });
    saveDb();
    res.status(201).json({
      event: enrichEventForUser(ev, user.userId),
      feedback: entry,
    });
  });

  // Event Check-In Roster & Automatic Event Analytics Sync
  app.get('/api/clubs/:id/events/:eventId/checkin', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const eventId = String(req.params.eventId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized event check-in access.' });
      return;
    }
    const db = getDb();
    const ev = db.events.find((e) => e.eventId === eventId && e.clubId === clubId);
    if (!ev) {
      res.status(404).json({ error: 'Club event not found.' });
      return;
    }

    const rsvpIds = new Set(ev.rsvpUserIds ?? []);
    const checkedInIds = new Set(ev.checkedInUserIds ?? []);
    const clubMemberIds = db.memberships
      .filter((m) => m.clubId === clubId && m.status === 'Active')
      .map((m) => m.userId);
    const rosterUserIds = Array.from(new Set([...rsvpIds, ...checkedInIds, ...clubMemberIds]));

    const roster = rosterUserIds
      .map((uid) => {
        const u = db.users.find((usr) => usr.userId === uid);
        if (!u) return null;
        return {
          userId: u.userId,
          name: u.name,
          email: u.email,
          rsvped: rsvpIds.has(u.userId),
          checkedIn: checkedInIds.has(u.userId),
        };
      })
      .filter(Boolean);

    res.json({
      eventId: ev.eventId,
      checkInCode: ev.checkInCode,
      checkedInCount: checkedInIds.size + (ev.guestWalkInCount ?? 0),
      guestWalkInCount: ev.guestWalkInCount ?? 0,
      syncedAnalyticsRecordId: ev.syncedAnalyticsRecordId ?? null,
      roster,
    });
  });

  app.post('/api/clubs/:id/events/:eventId/checkin', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const eventId = String(req.params.eventId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club event check-in.' });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const ev = db.events.find((e) => e.eventId === eventId && e.clubId === clubId);
    if (!ev) {
      res.status(404).json({ error: 'Club event not found.' });
      return;
    }

    const { code, userId: targetUserId, checkedIn, guestWalkInCount } = req.body as {
      code?: string;
      userId?: string;
      checkedIn?: boolean;
      guestWalkInCount?: number;
    };

    const isLeader = hasClubCapability(user, clubId, 'SCHEDULE_CONTENT');
    if (!Array.isArray(ev.checkedInUserIds)) ev.checkedInUserIds = [];

    if (typeof guestWalkInCount === 'number' && Number.isFinite(guestWalkInCount)) {
      if (!isLeader) {
        res.status(403).json({ error: 'Only club leaders can adjust walk-in guest attendance counts.' });
        return;
      }
      ev.guestWalkInCount = Math.max(0, Math.round(guestWalkInCount));
    } else if (targetUserId) {
      if (!isLeader && targetUserId !== user.userId) {
        res.status(403).json({ error: 'Only club leaders can check in other members.' });
        return;
      }
      const has = ev.checkedInUserIds.includes(targetUserId);
      const nextState = typeof checkedIn === 'boolean' ? checkedIn : !has;
      if (nextState && !has) {
        ev.checkedInUserIds.push(targetUserId);
        if (!Array.isArray(ev.rsvpUserIds)) ev.rsvpUserIds = [];
        if (!ev.rsvpUserIds.includes(targetUserId)) {
          ev.rsvpUserIds.push(targetUserId);
        }
      } else if (!nextState && has) {
        ev.checkedInUserIds = ev.checkedInUserIds.filter((id) => id !== targetUserId);
      }
    } else {
      // Self check-in via QR / code verification
      if (!code?.trim() || code.trim().toUpperCase() !== (ev.checkInCode ?? '').toUpperCase()) {
        res.status(400).json({ error: 'Invalid event check-in code. Verify the code displayed at the meeting.' });
        return;
      }
      if (!ev.checkedInUserIds.includes(user.userId)) {
        ev.checkedInUserIds.push(user.userId);
      }
      if (!Array.isArray(ev.rsvpUserIds)) ev.rsvpUserIds = [];
      if (!ev.rsvpUserIds.includes(user.userId)) {
        ev.rsvpUserIds.push(user.userId);
      }
    }

    const totalCheckedIn = ev.checkedInUserIds.length + (ev.guestWalkInCount ?? 0);
    const totalRsvps = Math.max((ev.rsvpUserIds ?? []).length, totalCheckedIn);

    // Auto-sync verified attendance into Event Analytics
    let analyticsRecord = ev.syncedAnalyticsRecordId
      ? db.eventAttendanceRecords.find((r) => r.recordId === ev.syncedAnalyticsRecordId)
      : db.eventAttendanceRecords.find(
          (r) => r.clubId === clubId && r.title === ev.title && r.date === ev.date
        );

    const monthNum = Number(ev.date.split('-')[1] || 11);
    const yearNum = ev.date.split('-')[0] || '2026';
    const inferredSemester =
      monthNum >= 8 ? `Fall ${yearNum}` : monthNum <= 5 ? `Spring ${yearNum}` : `Summer ${yearNum}`;

    if (analyticsRecord) {
      analyticsRecord.registeredCount = Math.max(analyticsRecord.registeredCount, totalRsvps);
      analyticsRecord.attendedCount = totalCheckedIn;
      analyticsRecord.notes = `Live check-in synced (${ev.checkedInUserIds.length} member check-ins + ${ev.guestWalkInCount ?? 0} walk-ins).`;
    } else {
      const inferredFormat: EventFormat = ev.location.toLowerCase().includes('zoom')
        ? ev.location.toLowerCase().includes('st') || ev.location.toLowerCase().includes('room')
          ? 'Hybrid'
          : 'Virtual'
        : 'In-Person';
      analyticsRecord = {
        recordId: `attrec-sync-${ev.eventId}`,
        clubId,
        semester: inferredSemester,
        title: ev.title,
        date: ev.date,
        eventType: ev.eventType ?? 'Campus Event',
        format: inferredFormat,
        registeredCount: totalRsvps,
        attendedCount: totalCheckedIn,
        capacity: Math.max(60, totalRsvps + 15),
        recordedByName: user.name,
        notes: `Auto-synced from Event Check-In (${ev.checkInCode}).`,
      };
      db.eventAttendanceRecords.push(analyticsRecord);
    }
    ev.syncedAnalyticsRecordId = analyticsRecord.recordId;

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'EVENT_CHECKIN_SYNC_ANALYTICS',
      category: 'Membership',
      target: `${ev.title} (${totalCheckedIn} checked in)`,
      clubId,
      details: `Updated verified check-in count to ${totalCheckedIn} and synced Event Analytics record ${analyticsRecord.recordId}.`,
    });
    saveDb();

    res.json({
      event: {
        ...ev,
        clubName: club?.name ?? clubId,
        clubShortCode: club?.shortCode ?? clubId,
        rsvpCount: (ev.rsvpUserIds ?? []).length,
        userHasRsvped: (ev.rsvpUserIds ?? []).includes(user.userId),
        checkedInCount: totalCheckedIn,
        userCheckedIn: ev.checkedInUserIds.includes(user.userId),
      },
      analyticsRecord,
    });
  });

  app.delete('/api/clubs/:id/events/:eventId', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const eventId = String(req.params.eventId);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can remove scheduled club events.',
      });
      return;
    }
    const db = getDb();
    const idx = db.events.findIndex((e) => e.eventId === eventId && e.clubId === clubId);
    if (idx === -1) {
      res.status(404).json({ error: 'Club event not found.' });
      return;
    }
    const [removed] = db.events.splice(idx, 1);
    await dispatchEventUpdateEmails({
      event: removed,
      changeSummary: `Cancelled by ${user.name} and removed from the club calendar`,
      cancelled: true,
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
    });
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'DELETE_CLUB_EVENT',
      category: 'Publishing',
      target: `${removed.title} (${removed.date})`,
      clubId,
      details: `Removed event ${removed.eventId} from club schedule and notified RSVP/club recipients.`,
    });
    saveDb();
    res.json({ ok: true });
  });

  // 24-Hour Event Email Reminders, Notification Preferences, Live SMTP Config & Delivery Webhooks
  app.get('/api/reminders', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    res.json(getReminderOverviewForUser(user));
  });

  app.get('/api/reminders/smtp-config', (_req: AuthedRequest, res) => {
    const db = getDb();
    res.json({
      smtpConfig: getMaskedSmtpConfig(),
      webhookEvents: (db.emailWebhookEvents ?? []).slice(0, 25),
    });
  });

  app.put('/api/reminders/smtp-config', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({
        error: 'Only Office of Student Life Administrators can configure institutional SMTP settings.',
      });
      return;
    }

    const { host, port, secure, authUser, authPass, fromAddress, appUrl, providerLabel, webhookSecret } =
      req.body as {
        host?: string;
        port?: number;
        secure?: boolean;
        authUser?: string;
        authPass?: string;
        fromAddress?: string;
        appUrl?: string;
        providerLabel?: string;
        webhookSecret?: string;
      };

    const db = getDb();
    const now = new Date().toISOString();
    const current = db.smtpConfig;
    db.smtpConfig = {
      ...current,
      host: typeof host === 'string' ? host.trim() : current.host,
      port: typeof port === 'number' && Number.isFinite(port) && port > 0 ? port : current.port,
      secure: typeof secure === 'boolean' ? secure : current.secure,
      authUser: typeof authUser === 'string' ? authUser.trim() : current.authUser,
      authPass: typeof authPass === 'string' && authPass.length > 0 ? authPass : current.authPass,
      fromAddress: typeof fromAddress === 'string' && fromAddress.trim() ? fromAddress.trim() : current.fromAddress,
      appUrl: typeof appUrl === 'string' && appUrl.trim() ? appUrl.trim() : current.appUrl,
      providerLabel:
        typeof providerLabel === 'string' && providerLabel.trim()
          ? providerLabel.trim()
          : host?.trim()
            ? 'Configured SMTP Relay'
            : 'Institutional Notification Outbox',
      webhookSecret:
        typeof webhookSecret === 'string' && webhookSecret.trim()
          ? webhookSecret.trim()
          : current.webhookSecret,
      updatedAt: now,
      updatedByName: user.name,
    };

    resetSmtpTransporterCache();
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'UPDATE_SMTP_CONFIG',
      category: 'Integration',
      target: db.smtpConfig.host || 'Hub Notification Outbox',
      details: `Updated institutional SMTP settings (${db.smtpConfig.host || 'Outbox mode'}:${db.smtpConfig.port}).`,
    });
    saveDb();
    res.json({ smtpConfig: getMaskedSmtpConfig() });
  });

  app.post('/api/reminders/smtp-test', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({
        error: 'Only Office of Student Life Administrators can run SMTP transport diagnostics.',
      });
      return;
    }
    const { recipientEmail } = (req.body ?? {}) as { recipientEmail?: string };
    const targetEmail = recipientEmail?.trim() || user.email;
    const result = await testSmtpConfiguration({
      recipientEmail: targetEmail,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
    });
    res.json(result);
  });

  app.post('/api/webhooks/email-delivery', (req, res) => {
    const db = getDb();
    const providedSecret = req.header('x-webhook-secret');
    if (
      db.smtpConfig?.webhookSecret &&
      providedSecret &&
      providedSecret !== db.smtpConfig.webhookSecret
    ) {
      res.status(401).json({ error: 'Invalid email delivery webhook signature.' });
      return;
    }
    const { reminderId, providerMessageId, recipientEmail, eventType, detail } = req.body as {
      reminderId?: string;
      providerMessageId?: string;
      recipientEmail?: string;
      eventType?: 'delivered' | 'deferred' | 'bounced';
      detail?: string;
    };
    if (eventType !== 'delivered' && eventType !== 'deferred' && eventType !== 'bounced') {
      res.status(400).json({ error: 'eventType must be delivered, deferred, or bounced.' });
      return;
    }
    const result = processEmailDeliveryWebhook({
      reminderId,
      providerMessageId,
      recipientEmail,
      eventType,
      detail,
    });
    res.json(result);
  });

  app.post('/api/reminders/simulate-webhook', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Only Student Life Administrators can test delivery webhooks.' });
      return;
    }
    const { reminderId, eventType } = req.body as {
      reminderId?: string;
      eventType?: 'delivered' | 'deferred' | 'bounced';
    };
    if (!reminderId || (eventType !== 'delivered' && eventType !== 'deferred' && eventType !== 'bounced')) {
      res.status(400).json({ error: 'reminderId and valid eventType are required.' });
      return;
    }
    const result = processEmailDeliveryWebhook({ reminderId, eventType });
    res.json(result);
  });

  app.patch('/api/reminders/preferences', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const { emailRemindersEnabled } = req.body as { emailRemindersEnabled?: boolean };
    if (typeof emailRemindersEnabled !== 'boolean') {
      res.status(400).json({ error: 'emailRemindersEnabled boolean preference is required.' });
      return;
    }
    const db = getDb();
    const targetUser = db.users.find((u) => u.userId === user.userId);
    if (!targetUser) {
      res.status(404).json({ error: 'Authenticated user not found.' });
      return;
    }
    targetUser.emailRemindersEnabled = emailRemindersEnabled;
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: emailRemindersEnabled ? 'ENABLE_EMAIL_REMINDERS' : 'PAUSE_EMAIL_REMINDERS',
      category: 'Membership',
      target: targetUser.email,
      details: `${user.name} ${emailRemindersEnabled ? 'enabled' : 'paused'} 24-hour club event email reminders.`,
    });
    saveDb();
    res.json({ emailRemindersEnabled: targetUser.emailRemindersEnabled });
  });

  app.post('/api/reminders/sweep', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const canManageAnyClub =
      isAdminUser(user) ||
      getDb().memberships.some(
        (m) =>
          m.userId === user.userId &&
          m.status === 'Active' &&
          (m.role === 'CLUB_LEAD' || m.role === 'EDITOR')
      );
    if (!canManageAnyClub) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can trigger a reminder sweep.',
      });
      return;
    }
    const result = await run24HourReminderSweep();
    res.json(result);
  });

  app.post('/api/clubs/:id/events/:eventId/send-reminder', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const eventId = String(req.params.eventId);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can dispatch event reminders.',
      });
      return;
    }
    const db = getDb();
    const ev = db.events.find((e) => e.eventId === eventId && e.clubId === clubId);
    if (!ev) {
      res.status(404).json({ error: 'Club event not found.' });
      return;
    }
    const dispatched = await dispatchEventReminders({
      event: ev,
      triggerMode: 'Manual Early Dispatch',
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
    });
    res.json({
      dispatchedCount: dispatched.length,
      dispatchedRecords: dispatched,
    });
  });

  // Club Forums (Club-scoped member threads, Q&A, and information sharing)
  const resolveForumAuthorRoleLabel = (user: User, clubId: string): string => {
    if (isAdminUser(user)) return user.title || 'Office of Student Life';
    const db = getDb();
    const mem = db.memberships.find(
      (m) => m.clubId === clubId && m.userId === user.userId && m.status === 'Active'
    );
    if (mem?.officerTitle) return mem.officerTitle;
    if (mem?.role === 'CLUB_LEAD') return 'Club Lead';
    if (mem?.role === 'EDITOR') return 'Editor';
    if (mem?.role === 'CONTRIBUTOR') return 'Contributor';
    return user.title || 'Club Member';
  };

  const resolveForumMentions = (clubId: string, text: string): User[] => {
    const db = getDb();
    const lowerText = text.toLowerCase();
    const activeMemberIds = new Set(
      db.memberships
        .filter((m) => m.clubId === clubId && m.status === 'Active')
        .map((m) => m.userId)
    );
    return db.users.filter((u) => {
      if (!activeMemberIds.has(u.userId) && !isAdminUser(u)) return false;
      const fullName = u.name.toLowerCase();
      const firstName = fullName.split(/\s+/)[0];
      const handle = u.email.split('@')[0].toLowerCase();
      return (
        lowerText.includes(`@${fullName}`) ||
        lowerText.includes(`@${firstName}`) ||
        lowerText.includes(`@${handle}`)
      );
    });
  };

  app.get('/api/clubs/:id/forum', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({
        error: 'Access denied: Only authorized members of this club can view its private forum.',
      });
      return;
    }
    const db = getDb();
    const threads = db.forumThreads
      .filter((t) => t.clubId === clubId)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    const clubMembers = db.memberships
      .filter((m) => m.clubId === clubId && m.status === 'Active')
      .map((m) => {
        const u = db.users.find((usr) => usr.userId === m.userId);
        return u
          ? {
              userId: u.userId,
              name: u.name,
              roleLabel: m.officerTitle || m.role,
            }
          : null;
      })
      .filter(Boolean);
    res.json({ threads, clubMembers });
  });

  app.post('/api/clubs/:id/forum', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({
        error: 'Only active members of this club or scoped Student Life staff can start forum threads.',
      });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const { title, body, category } = req.body as {
      title?: string;
      body?: string;
      category?: ForumCategory;
    };

    if (!title?.trim() || !body?.trim()) {
      res.status(400).json({ error: 'Thread headline and message body are required.' });
      return;
    }

    const validCategories: ForumCategory[] = [
      'Question',
      'Discussion',
      'Resource Share',
      'Event Ideas',
    ];
    const resolvedCategory: ForumCategory =
      category && validCategories.includes(category) ? category : 'Discussion';

    const mentionedUsers = resolveForumMentions(clubId, `${title} ${body}`);
    const now = new Date().toISOString();
    const thread: ForumThread = {
      threadId: `thr-${Date.now().toString().slice(-6)}`,
      clubId,
      category: resolvedCategory,
      title: title.trim(),
      body: body.trim(),
      authorId: user.userId,
      authorName: user.name,
      authorRoleLabel: resolveForumAuthorRoleLabel(user, clubId),
      pinned: false,
      resolved: false,
      replies: [],
      subscriberUserIds: Array.from(new Set([user.userId, ...mentionedUsers.map((u) => u.userId)])),
      mentionedUserIds: mentionedUsers.map((u) => u.userId),
      createdAt: now,
      updatedAt: now,
    };

    db.forumThreads.unshift(thread);
    for (const mentioned of mentionedUsers) {
      if (mentioned.userId !== user.userId) {
        pushNotification({
          userId: mentioned.userId,
          clubId,
          type: 'Forum Mention',
          title: `${user.name} mentioned you in ${club.shortCode} Forum`,
          message: `"${thread.title}"`,
        });
      }
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'CREATE_FORUM_THREAD',
      category: 'Membership',
      target: `${club.shortCode}: ${thread.title}`,
      clubId,
      details: `Started ${resolvedCategory} thread in ${club.name} forum.`,
    });
    saveDb();
    res.status(201).json({ thread });
  });

  app.post('/api/clubs/:id/forum/:threadId/replies', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const threadId = String(req.params.threadId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({
        error: 'Only authorized members of this club can reply to forum threads.',
      });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const thread = db.forumThreads.find((t) => t.threadId === threadId && t.clubId === clubId);
    if (!thread) {
      res.status(404).json({ error: 'Forum thread not found.' });
      return;
    }

    const { body } = req.body as { body?: string };
    if (!body?.trim()) {
      res.status(400).json({ error: 'Reply message cannot be empty.' });
      return;
    }

    const mentionedUsers = resolveForumMentions(clubId, body);
    const now = new Date().toISOString();
    const reply: ForumReply = {
      replyId: `rep-${Date.now().toString().slice(-6)}`,
      threadId,
      authorId: user.userId,
      authorName: user.name,
      authorRoleLabel: resolveForumAuthorRoleLabel(user, clubId),
      body: body.trim(),
      mentionedUserIds: mentionedUsers.map((u) => u.userId),
      createdAt: now,
    };

    thread.replies.push(reply);
    thread.updatedAt = now;
    if (!Array.isArray(thread.subscriberUserIds)) {
      thread.subscriberUserIds = [thread.authorId];
    }
    if (!thread.subscriberUserIds.includes(user.userId)) {
      thread.subscriberUserIds.push(user.userId);
    }

    const notifiedIds = new Set<string>([user.userId]);
    for (const mentioned of mentionedUsers) {
      if (!notifiedIds.has(mentioned.userId)) {
        notifiedIds.add(mentioned.userId);
        pushNotification({
          userId: mentioned.userId,
          clubId,
          type: 'Forum Mention',
          title: `${user.name} mentioned you in "${thread.title}"`,
          message: reply.body.slice(0, 120),
        });
      }
    }
    for (const subId of thread.subscriberUserIds) {
      if (!notifiedIds.has(subId)) {
        notifiedIds.add(subId);
        pushNotification({
          userId: subId,
          clubId,
          type: 'Forum Reply',
          title: `New reply in ${club?.shortCode ?? 'Club'} Forum: "${thread.title}"`,
          message: `${user.name}: ${reply.body.slice(0, 120)}`,
        });
      }
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'REPLY_FORUM_THREAD',
      category: 'Membership',
      target: thread.title,
      clubId,
      details: `Posted reply on forum thread ${threadId}.`,
    });
    saveDb();
    res.status(201).json({ thread, reply });
  });

  app.post('/api/clubs/:id/forum/:threadId/subscribe', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const threadId = String(req.params.threadId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club forum access.' });
      return;
    }

    const db = getDb();
    const thread = db.forumThreads.find((t) => t.threadId === threadId && t.clubId === clubId);
    if (!thread) {
      res.status(404).json({ error: 'Forum thread not found.' });
      return;
    }
    if (!Array.isArray(thread.subscriberUserIds)) {
      thread.subscriberUserIds = [thread.authorId];
    }
    const idx = thread.subscriberUserIds.indexOf(user.userId);
    let subscribed = false;
    if (idx === -1) {
      thread.subscriberUserIds.push(user.userId);
      subscribed = true;
    } else {
      thread.subscriberUserIds.splice(idx, 1);
      subscribed = false;
    }
    saveDb();
    res.json({ thread, subscribed });
  });

  app.post('/api/clubs/:id/forum/:threadId/promote', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const threadId = String(req.params.threadId);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can promote forum threads to events or tasks.',
      });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const thread = db.forumThreads.find((t) => t.threadId === threadId && t.clubId === clubId);
    if (!club || !thread) {
      res.status(404).json({ error: 'Club or forum thread not found.' });
      return;
    }

    const { targetType, date, time, location, assigneeUserId, dueDate, priority } = req.body as {
      targetType?: 'event' | 'task';
      date?: string;
      time?: string;
      location?: string;
      assigneeUserId?: string;
      dueDate?: string;
      priority?: TaskPriority;
    };

    const now = new Date().toISOString();
    if (targetType === 'event') {
      const codePrefix = club.shortCode.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || 'EV';
      const createdEvent: ClubEvent = {
        eventId: `evt-${Date.now().toString().slice(-6)}`,
        clubId,
        title: thread.title,
        date: date?.trim() || '2026-12-02',
        time: time?.trim() || '18:30',
        location: location?.trim() || 'Zoom / CUNY SPS Virtual Commons',
        description: `${thread.body}\n\nPromoted from Club Forum thread by ${user.name}.`,
        eventType: 'Campus Event',
        postedByName: user.name,
        createdAt: now,
        isPublic: true,
        checkInCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
        checkedInUserIds: [],
        guestWalkInCount: 0,
        rsvpUserIds: [user.userId],
      };
      db.events.push(createdEvent);
      thread.promotedEventId = createdEvent.eventId;
      thread.updatedAt = now;
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
        action: 'PROMOTE_FORUM_TO_EVENT',
        category: 'Publishing',
        target: createdEvent.title,
        clubId,
        details: `Promoted forum thread ${threadId} into scheduled event ${createdEvent.eventId}.`,
      });
      saveDb();
      res.status(201).json({ thread, createdEvent });
      return;
    }

    if (targetType === 'task') {
      const assignees = getClubTaskAssignees(clubId);
      const assignee = assignees.find((a) => a.userId === assigneeUserId) ?? assignees[0];
      if (!assignee) {
        res.status(400).json({ error: 'No eligible club member found to assign task.' });
        return;
      }
      const createdTask: ClubProjectTask = {
        taskId: `tsk-${Date.now().toString().slice(-6)}`,
        clubId,
        title: thread.title,
        description: `${thread.body}\n\nPromoted from Club Forum discussion.`,
        category: 'Event Operations',
        priority: priority && ['High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
        status: 'To Do',
        assigneeUserId: assignee.userId,
        assigneeName: assignee.name,
        assigneeRoleLabel: assignee.roleLabel,
        assignedByUserId: user.userId,
        assignedByName: user.name,
        dueDate: dueDate?.trim() || '2026-11-30',
        progressPct: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.clubTasks.unshift(createdTask);
      thread.promotedTaskId = createdTask.taskId;
      thread.updatedAt = now;
      if (assignee.userId !== user.userId) {
        pushNotification({
          userId: assignee.userId,
          clubId,
          type: 'Membership',
          title: `Forum Thread Promoted to Task (${club.shortCode})`,
          message: `${user.name} assigned "${createdTask.title}" to you from the Club Forum.`,
        });
      }
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
        action: 'PROMOTE_FORUM_TO_TASK',
        category: 'Membership',
        target: createdTask.title,
        clubId,
        details: `Promoted forum thread ${threadId} into project task ${createdTask.taskId} assigned to ${assignee.name}.`,
      });
      saveDb();
      res.status(201).json({ thread, createdTask });
      return;
    }

    res.status(400).json({ error: 'targetType must be either event or task.' });
  });

  app.patch('/api/clubs/:id/forum/:threadId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const threadId = String(req.params.threadId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club forum access.' });
      return;
    }

    const db = getDb();
    const thread = db.forumThreads.find((t) => t.threadId === threadId && t.clubId === clubId);
    if (!thread) {
      res.status(404).json({ error: 'Forum thread not found.' });
      return;
    }

    const { pinned, resolved } = req.body as { pinned?: boolean; resolved?: boolean };
    const isModerator = hasClubCapability(user, clubId, 'SCHEDULE_CONTENT');
    const isAuthor = thread.authorId === user.userId;

    if (typeof pinned === 'boolean') {
      if (!isModerator) {
        res.status(403).json({
          error: 'Only Club Leads, Editors, or Student Life Administrators can pin forum threads.',
        });
        return;
      }
      thread.pinned = pinned;
    }

    if (typeof resolved === 'boolean') {
      if (!isAuthor && !isModerator) {
        res.status(403).json({
          error: 'Only the thread author or club moderators can mark a question resolved.',
        });
        return;
      }
      thread.resolved = resolved;
    }

    thread.updatedAt = new Date().toISOString();
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'UPDATE_FORUM_THREAD',
      category: 'Membership',
      target: thread.title,
      clubId,
      details: `Updated thread state (pinned=${thread.pinned}, resolved=${thread.resolved}).`,
    });
    saveDb();
    res.json({ thread });
  });

  app.delete('/api/clubs/:id/forum/:threadId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const threadId = String(req.params.threadId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club forum access.' });
      return;
    }

    const db = getDb();
    const idx = db.forumThreads.findIndex((t) => t.threadId === threadId && t.clubId === clubId);
    if (idx === -1) {
      res.status(404).json({ error: 'Forum thread not found.' });
      return;
    }

    const thread = db.forumThreads[idx];
    const isModerator = hasClubCapability(user, clubId, 'SCHEDULE_CONTENT');
    if (thread.authorId !== user.userId && !isModerator) {
      res.status(403).json({
        error: 'Only the thread author, Club Leads, Editors, or Student Life Administrators can delete a thread.',
      });
      return;
    }

    db.forumThreads.splice(idx, 1);
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'DELETE_FORUM_THREAD',
      category: 'Membership',
      target: thread.title,
      clubId,
      details: `Deleted forum thread ${threadId}.`,
    });
    saveDb();
    res.json({ ok: true });
  });

  // Club Announcements (Office of Student Life pinned campus-wide updates)
  app.get('/api/announcements', (_req: AuthedRequest, res) => {
    const db = getDb();
    const priorityRank: Record<AnnouncementPriority, number> = {
      Critical: 0,
      Important: 1,
      General: 2,
    };
    const announcements = [...db.announcements].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const pDiff = (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    res.json({ announcements });
  });

  app.post('/api/announcements', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({
        error: 'Only the Office of Student Life can post or pin campus-wide club announcements.',
      });
      return;
    }

    const { title, message, priority, pinned, audience, expiresAt } = req.body as {
      title?: string;
      message?: string;
      priority?: AnnouncementPriority;
      pinned?: boolean;
      audience?: string;
      expiresAt?: string;
    };

    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'Announcement headline and update message are required.' });
      return;
    }

    const validPriorities: AnnouncementPriority[] = ['Critical', 'Important', 'General'];
    const normalizedPriority: AnnouncementPriority =
      priority && validPriorities.includes(priority) ? priority : 'Critical';
    const isPinned = pinned !== false;
    const now = new Date().toISOString();

    const db = getDb();
    const announcement: ClubAnnouncement = {
      announcementId: `ann-${Date.now().toString().slice(-6)}`,
      title: title.trim(),
      message: message.trim(),
      priority: normalizedPriority,
      pinned: isPinned,
      audience: audience?.trim() || 'All Recognized Student Clubs',
      expiresAt: expiresAt?.trim() || undefined,
      postedByUserId: user.userId,
      postedByName: user.name,
      postedByTitle: user.title,
      createdAt: now,
      updatedAt: now,
    };

    db.announcements.unshift(announcement);

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: isPinned ? 'PIN_CLUB_ANNOUNCEMENT' : 'POST_CLUB_ANNOUNCEMENT',
      category: 'Governance',
      target: `${announcement.title} (${announcement.priority})`,
      details: `${isPinned ? 'Pinned' : 'Posted'} Office of Student Life announcement for ${announcement.audience}.`,
    });

    saveDb();
    res.status(201).json({ announcement });
  });

  app.patch('/api/announcements/:id', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({
        error: 'Only the Office of Student Life can pin, unpin, or edit club announcements.',
      });
      return;
    }

    const announcementId = String(req.params.id);
    const db = getDb();
    const announcement = db.announcements.find((a) => a.announcementId === announcementId);
    if (!announcement) {
      res.status(404).json({ error: 'Club announcement not found.' });
      return;
    }

    const { title, message, priority, pinned, audience, expiresAt } = req.body as {
      title?: string;
      message?: string;
      priority?: AnnouncementPriority;
      pinned?: boolean;
      audience?: string;
      expiresAt?: string;
    };

    if (typeof title === 'string' && title.trim()) {
      announcement.title = title.trim();
    }
    if (typeof message === 'string' && message.trim()) {
      announcement.message = message.trim();
    }
    if (priority && ['Critical', 'Important', 'General'].includes(priority)) {
      announcement.priority = priority;
    }
    if (typeof audience === 'string' && audience.trim()) {
      announcement.audience = audience.trim();
    }
    if (typeof expiresAt === 'string') {
      announcement.expiresAt = expiresAt.trim() || undefined;
    }

    const prevPinned = announcement.pinned;
    if (typeof pinned === 'boolean') {
      announcement.pinned = pinned;
    }
    announcement.updatedAt = new Date().toISOString();

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action:
        typeof pinned === 'boolean' && pinned !== prevPinned
          ? pinned
            ? 'PIN_CLUB_ANNOUNCEMENT'
            : 'UNPIN_CLUB_ANNOUNCEMENT'
          : 'UPDATE_CLUB_ANNOUNCEMENT',
      category: 'Governance',
      target: announcement.title,
      details: `Office of Student Life updated announcement (${announcement.pinned ? 'Pinned to dashboard top' : 'Archived'}).`,
    });

    saveDb();
    res.json({ announcement });
  });

  app.delete('/api/announcements/:id', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({
        error: 'Only the Office of Student Life can delete club announcements.',
      });
      return;
    }

    const announcementId = String(req.params.id);
    const db = getDb();
    const idx = db.announcements.findIndex((a) => a.announcementId === announcementId);
    if (idx === -1) {
      res.status(404).json({ error: 'Club announcement not found.' });
      return;
    }

    const [removed] = db.announcements.splice(idx, 1);
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: 'DELETE_CLUB_ANNOUNCEMENT',
      category: 'Governance',
      target: removed.title,
      details: `Removed Student Life announcement ${removed.announcementId}.`,
    });

    saveDb();
    res.json({ ok: true });
  });

  // Analytics (Module 10)
  app.get('/api/clubs/:id/analytics', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'VIEW_ANALYTICS')) {
      res.status(403).json({ error: 'Unauthorized analytics access.' });
      return;
    }
    const db = getDb();
    res.json({
      metrics: db.analytics.filter((m) => m.clubId === clubId),
    });
  });

  // Event Attendance Analytics (Semester Trends & RSVP Conversion)
  app.get('/api/clubs/:id/event-analytics', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'VIEW_ANALYTICS')) {
      res.status(403).json({ error: 'Unauthorized club event analytics access.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const records = [...(db.eventAttendanceRecords ?? [])]
      .filter((r) => r.clubId === clubId || r.coSponsorClubIds?.includes(clubId))
      .sort((a, b) => a.date.localeCompare(b.date));

    const upcomingProjections = db.events
      .filter((ev) => ev.clubId === clubId || ev.coSponsorClubIds?.includes(clubId))
      .map((ev) => ({
        eventId: ev.eventId,
        title: ev.title,
        date: ev.date,
        time: ev.time,
        eventType: ev.eventType ?? ('Campus Event' as ClubEventType),
        location: ev.location,
        rsvpCount: Array.isArray(ev.rsvpUserIds) ? ev.rsvpUserIds.length : 0,
        waitlistCount: Array.isArray(ev.waitlistUserIds) ? ev.waitlistUserIds.length : 0,
      }))
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

    res.json({
      clubId: club.clubId,
      clubName: club.name,
      clubShortCode: club.shortCode,
      records,
      upcomingProjections,
      engagementFunnel: computeClubEngagementFunnel(clubId),
    });
  });

  app.post('/api/clubs/:id/event-analytics', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can log event attendance.',
      });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const {
      title,
      date,
      semester,
      eventType,
      format,
      registeredCount,
      attendedCount,
      capacity,
      notes,
    } = req.body as {
      title?: string;
      date?: string;
      semester?: string;
      eventType?: ClubEventType;
      format?: EventFormat;
      registeredCount?: number;
      attendedCount?: number;
      capacity?: number;
      notes?: string;
    };

    if (!title?.trim() || !date?.trim()) {
      res.status(400).json({ error: 'Event title and date are required.' });
      return;
    }

    const reg = Number(registeredCount);
    const att = Number(attendedCount);
    const cap = Number(capacity);
    if (!Number.isFinite(reg) || reg < 0 || !Number.isFinite(att) || att < 0 || !Number.isFinite(cap) || cap < 1) {
      res.status(400).json({
        error: 'Registered, attended, and capacity counts must be valid non-negative numbers (capacity >= 1).',
      });
      return;
    }

    const validTypes: ClubEventType[] = ['Club Meeting', 'Campus Event', 'Workshop', 'Networking'];
    const resolvedType: ClubEventType =
      eventType && validTypes.includes(eventType) ? eventType : 'Club Meeting';
    const validFormats: EventFormat[] = ['Virtual', 'In-Person', 'Hybrid'];
    const resolvedFormat: EventFormat =
      format && validFormats.includes(format) ? format : 'Virtual';

    const record: EventAttendanceRecord = {
      recordId: `attrec-${Date.now().toString().slice(-6)}`,
      clubId,
      semester: semester?.trim() || 'Fall 2026',
      title: title.trim(),
      date: date.trim(),
      eventType: resolvedType,
      format: resolvedFormat,
      registeredCount: Math.round(reg),
      attendedCount: Math.round(att),
      capacity: Math.round(cap),
      recordedByName: user.name,
      notes: notes?.trim() || undefined,
    };

    db.eventAttendanceRecords.push(record);
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'LOG_EVENT_ATTENDANCE',
      category: 'Publishing',
      target: `${club.shortCode}: ${record.title}`,
      clubId,
      details: `Logged ${record.attendedCount} attendees (${record.registeredCount} RSVPs) for ${record.semester}.`,
    });
    saveDb();
    res.status(201).json({ record });
  });

  app.patch('/api/clubs/:id/event-analytics/:recordId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const recordId = String(req.params.recordId);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can update event attendance.',
      });
      return;
    }

    const db = getDb();
    const record = db.eventAttendanceRecords.find(
      (r) => r.recordId === recordId && r.clubId === clubId
    );
    if (!record) {
      res.status(404).json({ error: 'Event attendance record not found.' });
      return;
    }

    const { registeredCount, attendedCount, capacity, notes } = req.body as {
      registeredCount?: number;
      attendedCount?: number;
      capacity?: number;
      notes?: string;
    };

    if (registeredCount !== undefined) {
      const reg = Number(registeredCount);
      if (!Number.isFinite(reg) || reg < 0) {
        res.status(400).json({ error: 'Registered count must be a non-negative number.' });
        return;
      }
      record.registeredCount = Math.round(reg);
    }
    if (attendedCount !== undefined) {
      const att = Number(attendedCount);
      if (!Number.isFinite(att) || att < 0) {
        res.status(400).json({ error: 'Attended count must be a non-negative number.' });
        return;
      }
      record.attendedCount = Math.round(att);
    }
    if (capacity !== undefined) {
      const cap = Number(capacity);
      if (!Number.isFinite(cap) || cap < 1) {
        res.status(400).json({ error: 'Capacity must be at least 1.' });
        return;
      }
      record.capacity = Math.round(cap);
    }
    if (typeof notes === 'string') {
      record.notes = notes.trim() || undefined;
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'UPDATE_EVENT_ATTENDANCE',
      category: 'Publishing',
      target: record.title,
      clubId,
      details: `Updated attendance headcount to ${record.attendedCount} attended / ${record.registeredCount} registered.`,
    });
    saveDb();
    res.json({ record });
  });

  // Club Project Tasks (Action Item Assignment & Progress Tracking)
  const getClubTaskAssignees = (clubId: string): ClubTaskAssigneeOption[] => {
    const db = getDb();
    const options: ClubTaskAssigneeOption[] = [];
    for (const mem of db.memberships) {
      if (mem.clubId !== clubId || mem.status !== 'Active') continue;
      const memberUser = db.users.find((u) => u.userId === mem.userId && u.status === 'Active');
      if (!memberUser) continue;
      const roleLabel =
        mem.officerTitle ||
        (mem.role === 'CLUB_LEAD'
          ? 'Club Lead'
          : mem.role === 'EDITOR'
            ? 'Editor'
            : mem.role === 'CONTRIBUTOR'
              ? 'Contributor'
              : 'Member');
      options.push({
        userId: memberUser.userId,
        name: memberUser.name,
        email: memberUser.email,
        roleLabel,
      });
    }
    return options;
  };

  app.get('/api/clubs/:id/tasks', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({
        error: 'Access denied: Only active members of this club or scoped Student Life staff can view club project tasks.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const statusOrder: Record<TaskStatus, number> = {
      Blocked: 0,
      'In Progress': 1,
      'To Do': 2,
      Completed: 3,
    };

    const tasks = [...(db.clubTasks ?? [])]
      .filter((t) => t.clubId === clubId)
      .sort((a, b) => {
        const sDiff = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
        if (sDiff !== 0) return sDiff;
        if (a.status === 'Completed' && b.status === 'Completed') {
          return b.updatedAt.localeCompare(a.updatedAt);
        }
        return a.dueDate.localeCompare(b.dueDate);
      });

    const events = db.events
      .filter((e) => e.clubId === clubId)
      .map((e) => ({ eventId: e.eventId, title: e.title, date: e.date }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const posts = db.posts
      .filter((p) => p.clubId === clubId)
      .map((p) => ({ postId: p.postId, title: p.title, status: p.status }));

    res.json({
      clubId: club.clubId,
      clubName: club.name,
      clubShortCode: club.shortCode,
      tasks,
      assignees: getClubTaskAssignees(clubId),
      events,
      posts,
    });
  });

  app.post('/api/clubs/:id/tasks', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can assign project tasks.',
      });
      return;
    }

    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const {
      title,
      description,
      category,
      priority,
      status,
      assigneeUserId,
      dueDate,
      progressPct,
      linkedEventId,
      linkedPostId,
    } = req.body as {
      title?: string;
      description?: string;
      category?: ClubTaskCategory;
      priority?: TaskPriority;
      status?: TaskStatus;
      assigneeUserId?: string;
      dueDate?: string;
      progressPct?: number;
      linkedEventId?: string;
      linkedPostId?: string;
    };

    if (!title?.trim() || !dueDate?.trim() || !assigneeUserId?.trim()) {
      res.status(400).json({
        error: 'Task title, assigned club member, and due date are required.',
      });
      return;
    }

    const assignees = getClubTaskAssignees(clubId);
    const assignee = assignees.find((a) => a.userId === assigneeUserId);
    if (!assignee) {
      res.status(400).json({
        error: 'Assignee must be an active member of this club.',
      });
      return;
    }

    const linkedEv = linkedEventId?.trim()
      ? db.events.find((e) => e.eventId === linkedEventId.trim() && e.clubId === clubId)
      : undefined;
    const linkedPost = linkedPostId?.trim()
      ? db.posts.find((p) => p.postId === linkedPostId.trim() && p.clubId === clubId)
      : undefined;

    const validCategories: ClubTaskCategory[] = [
      'Event Operations',
      'Communications',
      'Governance & Finance',
      'Membership Outreach',
    ];
    const resolvedCategory: ClubTaskCategory =
      category && validCategories.includes(category) ? category : 'Event Operations';

    const validPriorities: TaskPriority[] = ['High', 'Medium', 'Low'];
    const resolvedPriority: TaskPriority =
      priority && validPriorities.includes(priority) ? priority : 'Medium';

    const validStatuses: TaskStatus[] = ['To Do', 'In Progress', 'Blocked', 'Completed'];
    const resolvedStatus: TaskStatus =
      status && validStatuses.includes(status) ? status : 'To Do';

    let resolvedProgress =
      typeof progressPct === 'number' && Number.isFinite(progressPct)
        ? Math.max(0, Math.min(100, Math.round(progressPct)))
        : resolvedStatus === 'Completed'
          ? 100
          : resolvedStatus === 'In Progress'
            ? 40
            : 0;

    if (resolvedStatus === 'Completed') {
      resolvedProgress = 100;
    }

    const now = new Date().toISOString();
    const task: ClubProjectTask = {
      taskId: `tsk-${Date.now().toString().slice(-6)}`,
      clubId,
      title: title.trim(),
      description: description?.trim() || 'Action item assigned via Club Project Tasks.',
      category: resolvedCategory,
      priority: resolvedPriority,
      status: resolvedStatus,
      assigneeUserId: assignee.userId,
      assigneeName: assignee.name,
      assigneeRoleLabel: assignee.roleLabel,
      assignedByUserId: user.userId,
      assignedByName: user.name,
      dueDate: dueDate.trim(),
      progressPct: resolvedProgress,
      linkedEventId: linkedEv?.eventId,
      linkedEventTitle: linkedEv?.title,
      linkedPostId: linkedPost?.postId,
      linkedPostTitle: linkedPost?.title,
      createdAt: now,
      updatedAt: now,
      completedAt: resolvedStatus === 'Completed' ? now : undefined,
    };

    db.clubTasks.unshift(task);
    if (assignee.userId !== user.userId) {
      pushNotification({
        userId: assignee.userId,
        clubId,
        type: 'Membership',
        title: `New action item assigned in ${club.shortCode}`,
        message: `${user.name} assigned "${task.title}" (Due ${task.dueDate}).`,
      });
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'CREATE_CLUB_TASK',
      category: 'Membership',
      target: `${club.shortCode}: ${task.title}`,
      clubId,
      details: `Assigned "${task.title}" to ${assignee.name} (Due ${task.dueDate}).`,
    });
    saveDb();
    res.status(201).json({ task });
  });

  app.patch('/api/clubs/:id/tasks/:taskId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const taskId = String(req.params.taskId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club task access.' });
      return;
    }

    const db = getDb();
    const task = db.clubTasks.find((t) => t.taskId === taskId && t.clubId === clubId);
    if (!task) {
      res.status(404).json({ error: 'Project task not found.' });
      return;
    }

    const isLeader = hasClubCapability(user, clubId, 'SCHEDULE_CONTENT');
    const isAssignee = task.assigneeUserId === user.userId;
    if (!isLeader && !isAssignee) {
      res.status(403).json({
        error: 'Only club leaders or the assigned member can update this action item.',
      });
      return;
    }

    const {
      title,
      description,
      priority,
      status,
      progressPct,
      assigneeUserId,
      dueDate,
      linkedEventId,
      linkedPostId,
    } = req.body as {
      title?: string;
      description?: string;
      priority?: TaskPriority;
      status?: TaskStatus;
      progressPct?: number;
      assigneeUserId?: string;
      dueDate?: string;
      linkedEventId?: string | null;
      linkedPostId?: string | null;
    };

    if (
      !isLeader &&
      (title !== undefined ||
        description !== undefined ||
        priority !== undefined ||
        assigneeUserId !== undefined ||
        dueDate !== undefined ||
        linkedEventId !== undefined ||
        linkedPostId !== undefined)
    ) {
      res.status(403).json({
        error: 'Only Club Leads or Editors can reassign tasks or modify task deadlines, links, and priority.',
      });
      return;
    }

    if (isLeader) {
      if (typeof title === 'string' && title.trim()) task.title = title.trim();
      if (typeof description === 'string') task.description = description.trim();
      if (priority && ['High', 'Medium', 'Low'].includes(priority)) {
        task.priority = priority;
      }
      if (typeof dueDate === 'string' && dueDate.trim()) {
        task.dueDate = dueDate.trim();
      }
      if (typeof assigneeUserId === 'string' && assigneeUserId.trim()) {
        const assignee = getClubTaskAssignees(clubId).find((a) => a.userId === assigneeUserId);
        if (!assignee) {
          res.status(400).json({ error: 'New assignee must be an active member of this club.' });
          return;
        }
        task.assigneeUserId = assignee.userId;
        task.assigneeName = assignee.name;
        task.assigneeRoleLabel = assignee.roleLabel;
      }
      if (linkedEventId !== undefined) {
        if (!linkedEventId) {
          task.linkedEventId = undefined;
          task.linkedEventTitle = undefined;
        } else {
          const ev = db.events.find((e) => e.eventId === linkedEventId && e.clubId === clubId);
          if (ev) {
            task.linkedEventId = ev.eventId;
            task.linkedEventTitle = ev.title;
          }
        }
      }
      if (linkedPostId !== undefined) {
        if (!linkedPostId) {
          task.linkedPostId = undefined;
          task.linkedPostTitle = undefined;
        } else {
          const post = db.posts.find((p) => p.postId === linkedPostId && p.clubId === clubId);
          if (post) {
            task.linkedPostId = post.postId;
            task.linkedPostTitle = post.title;
          }
        }
      }
    }

    const now = new Date().toISOString();
    const validStatuses: TaskStatus[] = ['To Do', 'In Progress', 'Blocked', 'Completed'];

    if (status && validStatuses.includes(status)) {
      task.status = status;
      if (status === 'Completed') {
        task.progressPct = 100;
        task.completedAt = now;
      } else {
        task.completedAt = undefined;
        if (progressPct === undefined) {
          if (status === 'To Do' && task.progressPct === 100) task.progressPct = 0;
          else if (status === 'In Progress' && (task.progressPct === 0 || task.progressPct === 100)) {
            task.progressPct = 50;
          }
        }
      }
    }

    if (typeof progressPct === 'number' && Number.isFinite(progressPct)) {
      const clamped = Math.max(0, Math.min(100, Math.round(progressPct)));
      task.progressPct = clamped;
      if (clamped === 100 && (!status || status === 'Completed')) {
        task.status = 'Completed';
        task.completedAt = task.completedAt || now;
      } else if (clamped < 100 && task.status === 'Completed' && !status) {
        task.status = clamped > 0 ? 'In Progress' : 'To Do';
        task.completedAt = undefined;
      }
    }

    task.updatedAt = now;
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'UPDATE_CLUB_TASK',
      category: 'Membership',
      target: task.title,
      clubId,
      details: `Updated "${task.title}" -> ${task.status} (${task.progressPct}%), assigned to ${task.assigneeName}.`,
    });
    saveDb();
    res.json({ task });
  });

  app.delete('/api/clubs/:id/tasks/:taskId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const taskId = String(req.params.taskId);
    if (!hasClubCapability(user, clubId, 'SCHEDULE_CONTENT')) {
      res.status(403).json({
        error: 'Only Club Leads, Editors, or Student Life Administrators can remove project tasks.',
      });
      return;
    }

    const db = getDb();
    const idx = db.clubTasks.findIndex((t) => t.taskId === taskId && t.clubId === clubId);
    if (idx === -1) {
      res.status(404).json({ error: 'Project task not found.' });
      return;
    }

    const [removed] = db.clubTasks.splice(idx, 1);
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'DELETE_CLUB_TASK',
      category: 'Membership',
      target: removed.title,
      clubId,
      details: `Removed project task "${removed.title}".`,
    });
    saveDb();
    res.json({ ok: true });
  });

  // Later-Phase Inbox interactions + Unified Reply, Assignment, Tagging & Gemini Draft
  app.patch('/api/clubs/:id/inbox/:msgId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const msgId = String(req.params.msgId);
    if (!hasClubCapability(user, clubId, 'VIEW_PRIVATE_MESSAGES')) {
      res.status(403).json({ error: 'Messaging privileges required.' });
      return;
    }
    const db = getDb();
    const msg = db.inboxMessages.find((m) => m.messageId === msgId && m.clubId === clubId);
    if (!msg) {
      res.status(404).json({ error: 'Inbox thread not found.' });
      return;
    }
    const { assignedToUserId, tag } = req.body as {
      assignedToUserId?: string | null;
      tag?: InboxThreadTag;
    };
    const validTags: InboxThreadTag[] = ['Event Question', 'Join Inquiry', 'Escalation', 'General'];
    if (tag && validTags.includes(tag)) {
      msg.tag = tag;
    }
    if (assignedToUserId === null || assignedToUserId === '') {
      msg.assignedToUserId = undefined;
      msg.assignedToName = undefined;
    } else if (typeof assignedToUserId === 'string') {
      const targetUser = db.users.find((u) => u.userId === assignedToUserId && u.status === 'Active');
      if (targetUser) {
        msg.assignedToUserId = targetUser.userId;
        msg.assignedToName = targetUser.name;
        if (targetUser.userId !== user.userId) {
          pushNotification({
            userId: targetUser.userId,
            clubId,
            type: 'Membership',
            title: `Social Inbox Thread Assigned (${msg.senderName})`,
            message: `${user.name} assigned a ${msg.platform} ${msg.channel} to you: "${msg.body.slice(0, 90)}"`,
          });
        }
      }
    }
    saveDb();
    res.json({ message: msg });
  });

  app.post('/api/clubs/:id/inbox/:msgId/ai-draft', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const msgId = String(req.params.msgId);
    if (!hasClubCapability(user, clubId, 'VIEW_PRIVATE_MESSAGES')) {
      res.status(403).json({ error: 'Messaging privileges required to draft replies.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const msg = db.inboxMessages.find((m) => m.messageId === msgId && m.clubId === clubId);
    if (!club || !msg) {
      res.status(404).json({ error: 'Club or inbox thread not found.' });
      return;
    }
    try {
      const { faqSnippet } = (req.body ?? {}) as { faqSnippet?: string };
      const output = await generateInboxReplyDraft({
        clubName: club.name,
        senderName: msg.senderName,
        channel: msg.channel,
        platform: msg.platform,
        messageBody: msg.body,
        tag: msg.tag,
        faqSnippet,
      });
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
        action: 'AI_INBOX_REPLY_DRAFTED',
        category: 'AI',
        target: `${club.shortCode}: ${msg.senderName}`,
        clubId,
        details: `Generated editable inbox reply draft via ${output.modelUsed}.`,
      });
      res.json(output);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unable to generate reply draft.';
      res.status(500).json({ error: errMsg });
    }
  });

  app.post('/api/clubs/:id/inbox/:msgId/reply', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const msgId = String(req.params.msgId);
    if (!hasClubCapability(user, clubId, 'VIEW_PRIVATE_MESSAGES')) {
      res.status(403).json({ error: 'Messaging privileges required.' });
      return;
    }
    const db = getDb();
    const msg = db.inboxMessages.find((m) => m.messageId === msgId && m.clubId === clubId);
    if (!msg) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }
    const { replyText } = req.body as { replyText: string };
    msg.replied = true;
    msg.replyText = replyText;
    msg.repliedByName = user.name;
    msg.repliedAt = new Date().toISOString();
    saveDb();
    res.json({ message: msg });
  });

  app.post('/api/clubs/:id/inbox/:msgId/flag', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const msgId = String(req.params.msgId);
    if (!hasClubCapability(user, clubId, 'VIEW_PRIVATE_MESSAGES')) {
      res.status(403).json({ error: 'Messaging privileges required.' });
      return;
    }
    const db = getDb();
    const msg = db.inboxMessages.find((m) => m.messageId === msgId && m.clubId === clubId);
    if (!msg) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }
    msg.flagged = !msg.flagged;
    saveDb();
    res.json({ message: msg });
  });

  // AI Service Layer (Module 8 & B7) using server-side Gemini API
  app.post('/api/clubs/:id/ai/captions', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'AI content assistance requires draft creation permissions.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }
    try {
      const output = await generateEventCaption({
        clubName: club.name,
        ...req.body,
      });
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
        action: 'AI_CAPTION_GENERATED',
        category: 'AI',
        target: `${club.shortCode} (${req.body.platform || 'Social'})`,
        clubId,
        details: 'Generated editable draft caption via approved Gemini AI service (human review required).',
      });
      res.json(output);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI caption generation failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/clubs/:id/ai/adapt', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'AI content assistance requires draft creation permissions.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }
    try {
      const { baseCaption, eventContext } = req.body as { baseCaption: string; eventContext?: string };
      const output = await adaptPostAcrossPlatforms(club.name, baseCaption, eventContext);
      res.json(output);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI adaptation failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/clubs/:id/ai/ideas', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'AI content assistance requires draft creation permissions.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }
    try {
      const events = db.events.filter((e) => e.clubId === clubId).map((e) => `${e.title} (${e.date})`);
      const ideas = await generateClubContentIdeas(club.name, club.description, events);
      res.json({ ideas });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI idea generation failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/clubs/:id/ai/accessibility', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'Permission denied.' });
      return;
    }
    try {
      const { caption, visualDescription } = req.body as { caption: string; visualDescription: string };
      const review = await generateAccessibilityReview(caption, visualDescription);
      res.json(review);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Accessibility check failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/clubs/:id/ai/alt-text', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'Alt-text generation requires draft creation permissions.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }
    const { base64Data, mimeType, eventContext } = req.body as {
      base64Data?: string;
      mimeType?: string;
      eventContext?: string;
    };
    if (!base64Data) {
      res.status(400).json({ error: 'Image payload is required to generate alt text.' });
      return;
    }
    try {
      const output = await generateImageAltText({
        base64Data,
        mimeType: mimeType || 'image/png',
        clubName: club.name,
        eventContext,
      });
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
        action: 'AI_ALTTEXT_GENERATED',
        category: 'AI',
        target: `${club.shortCode} WCAG Alt-Text`,
        clubId,
        details: `Generated WCAG 2.1 AA image alt-text via ${output.modelUsed}.`,
      });
      res.json(output);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Alt-text generation failed.';
      res.status(500).json({ error: msg });
    }
  });

  // Multi-turn Gemini Chatbot (with optional Google Search Grounding)
  app.post('/api/ai/chat', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const { clubId, messages, model, useSearch } = req.body as {
      clubId?: string;
      messages?: ChatTurnInput[];
      model?: SupportedChatModel;
      useSearch?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Chat message history is required.' });
      return;
    }

    const db = getDb();
    let roleLabel: string = user.systemRole;
    let clubContextLine = 'Portal Scope: University Administration (CUNY SPS Office of Student Life).';

    if (clubId) {
      if (!canAccessClub(user, clubId)) {
        res.status(403).json({ error: 'Access denied to the requested club workspace context.' });
        return;
      }
      const club = db.clubs.find((c) => c.clubId === clubId);
      const effectiveRole = getUserEffectiveClubRole(user, clubId);
      roleLabel = effectiveRole ?? user.systemRole;
      if (effectiveRole === 'VIEWER') {
        res.status(403).json({ error: 'Viewer role cannot submit interactive AI assistant prompts.' });
        return;
      }
      if (club) {
        const clubAccounts = db.socialAccounts
          .filter((a) => a.clubId === clubId)
          .map((a) => `${a.platform} (${a.handle}: ${a.connection.status})`)
          .join(', ');
        const upcomingEvents = db.events
          .filter((e) => e.clubId === clubId)
          .slice(0, 4)
          .map((e) => `${e.title} on ${e.date}`)
          .join('; ');
        clubContextLine = `Club Workspace: ${club.name} (${club.shortCode}), Category: ${club.category}, Advisor: ${club.facultyAdvisor}. Connected Social Accounts: ${clubAccounts || 'None'}. Upcoming Events: ${upcomingEvents || 'None listed'}.`;
      }
    } else if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Select an authorized club workspace to use the AI Assistant.' });
      return;
    }

    const systemContext = [
      'You are the CUNY School of Professional Studies (CUNY SPS) Club Social Hub Assistant.',
      `Authenticated User: ${user.name} (${user.title}) holding role ${roleLabel}.`,
      clubContextLine,
      'Institutional Governance Rules: Social posts do not auto-publish; Student Life owns official account custodianship; never fabricate campus room numbers, budgets, or unverified policies; advise human officer review on all suggested copy.',
      roleLabel === 'SL_SUPER_ADMIN' || roleLabel === 'SL_ADMIN'
        ? 'Focus on institutional governance, compliance, leadership transition continuity, WCAG accessibility standards, and multi-club oversight.'
        : 'Focus on engaging online and hybrid CUNY SPS students, accessible copywriting, event promotion, and platform-native social best practices.',
    ].join('\n');

    try {
      const output = await sendAssistantChatMessage({
        messages,
        model,
        systemContext,
        useSearch: Boolean(useSearch),
      });
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: roleLabel,
        action: useSearch ? 'AI_CHAT_SEARCH_GROUNDED' : 'AI_CHAT_TURN',
        category: 'AI',
        target: clubId ? `${clubId} (${output.modelUsed})` : `Student Life (${output.modelUsed})`,
        clubId,
        details: `Multi-turn assistant interaction via ${output.modelUsed}${useSearch ? ' with Google Search grounding' : ''}.`,
      });
      res.json(output);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI chat request failed.';
      res.status(500).json({ error: msg });
    }
  });

  // Google Search Grounded Institutional & Trend Research
  app.post('/api/ai/search', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const { clubId, query } = req.body as { clubId?: string; query?: string };

    if (!query || !query.trim()) {
      res.status(400).json({ error: 'Search query is required.' });
      return;
    }

    const db = getDb();
    let clubContext: string | undefined;
    let actorRole: string = user.systemRole;

    if (clubId) {
      if (!canAccessClub(user, clubId)) {
        res.status(403).json({ error: 'Access denied to this club workspace.' });
        return;
      }
      const effectiveRole = getUserEffectiveClubRole(user, clubId);
      actorRole = effectiveRole ?? user.systemRole;
      if (effectiveRole === 'VIEWER') {
        res.status(403).json({ error: 'Viewer role cannot execute AI search queries.' });
        return;
      }
      const club = db.clubs.find((c) => c.clubId === clubId);
      if (club) {
        clubContext = `${club.name} (${club.shortCode}) at CUNY SPS — ${club.description}`;
      }
    } else if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Club workspace authorization required.' });
      return;
    }

    try {
      const result = await searchGroundedResearch(query, clubContext);
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole,
        action: 'AI_GOOGLE_SEARCH_RESEARCH',
        category: 'AI',
        target: clubId ?? 'Student Life',
        clubId,
        details: `Executed Google Search grounded query via gemini-4-hydrogen (${result.sources.length} sources).`,
      });
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Google Search grounded query failed.';
      res.status(500).json({ error: msg });
    }
  });

  // Audio Transcription via gemini-3.5-transcribe
  app.post('/api/ai/transcribe', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const { clubId, base64Data, mimeType, contextHint } = req.body as {
      clubId?: string;
      base64Data?: string;
      mimeType?: string;
      contextHint?: string;
    };

    if (!base64Data || !mimeType) {
      res.status(400).json({ error: 'Recorded or uploaded audio payload is required.' });
      return;
    }

    let actorRole: string = user.systemRole;
    if (clubId) {
      if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
        res.status(403).json({ error: 'Audio transcription for drafts requires Contributor permissions or higher.' });
        return;
      }
      actorRole = getUserEffectiveClubRole(user, clubId) ?? user.systemRole;
    } else if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Authorized club workspace or admin session required.' });
      return;
    }

    try {
      const result = await transcribeAudioClip({
        base64Data,
        mimeType,
        contextHint,
      });
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole,
        action: 'AI_AUDIO_TRANSCRIBED',
        category: 'AI',
        target: clubId ?? 'Student Life',
        clubId,
        details: `Transcribed audio clip (${mimeType}) via gemini-3.5-transcribe.`,
      });
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Audio transcription failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/clubs/:id/ai/transcribe', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({ error: 'Audio transcription requires draft creation permissions.' });
      return;
    }
    const { base64Data, mimeType, contextHint } = req.body as {
      base64Data?: string;
      mimeType?: string;
      contextHint?: string;
    };
    if (!base64Data || !mimeType) {
      res.status(400).json({ error: 'Audio payload and MIME type are required.' });
      return;
    }
    try {
      const result = await transcribeAudioClip({ base64Data, mimeType, contextHint });
      recordAudit({
        actorId: user.userId,
        actorName: user.name,
        actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
        action: 'AI_AUDIO_TRANSCRIBED',
        category: 'AI',
        target: clubId,
        clubId,
        details: `Transcribed audio clip (${mimeType}) via gemini-3.5-transcribe.`,
      });
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Audio transcription failed.';
      res.status(500).json({ error: msg });
    }
  });

  // Admin Users, Permissions Matrix & Access Revocation
  app.get('/api/admin/users', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Student Life Administrator privileges required.' });
      return;
    }
    const db = getDb();
    const users = db.users.map((u) => ({
      ...u,
      memberships: db.memberships
        .filter((m) => m.userId === u.userId)
        .map((m) => ({
          ...m,
          clubName: db.clubs.find((c) => c.clubId === m.clubId)?.name ?? m.clubId,
        })),
    }));
    res.json({ users, permissionsMatrix: PERMISSIONS_MATRIX });
  });

  app.post('/api/admin/users/:userId/revoke', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const targetUserId = String(req.params.userId);
    if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Student Life Administrator privileges required.' });
      return;
    }
    if (targetUserId === user.userId) {
      res.status(400).json({ error: 'Cannot revoke your own active administrator session.' });
      return;
    }
    const db = getDb();
    const target = db.users.find((u) => u.userId === targetUserId);
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    target.status = target.status === 'Active' ? 'Revoked' : 'Active';
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: target.status === 'Revoked' ? 'REVOKE_PLATFORM_ACCESS' : 'RESTORE_PLATFORM_ACCESS',
      category: 'Authentication',
      target: `${target.name} (${target.email})`,
      details: `Student Life set institutional platform status to ${target.status}.`,
    });
    saveDb();
    res.json({ user: target });
  });

  app.get('/api/admin/audit-events', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Student Life Administrator privileges required.' });
      return;
    }
    const db = getDb();
    const logs = db.auditLogs.filter((l) => !l.clubId || canAdminManageClub(user, l.clubId));
    res.json({ auditLogs: logs });
  });

  // Live Security Isolation Test (US-002 verification)
  app.post('/api/security/test-isolation', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const { targetClubId } = req.body as { targetClubId: string };
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === targetClubId);
    const allowed = canAccessClub(user, targetClubId);
    const effectiveRole = getUserEffectiveClubRole(user, targetClubId);

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.systemRole,
      action: allowed ? 'SECURITY_CHECK_AUTHORIZED' : 'SECURITY_CHECK_ISOLATION_ENFORCED',
      category: 'Authentication',
      target: `${club?.name ?? targetClubId}`,
      details: allowed
        ? `Access permitted under verified role ${effectiveRole}.`
        : `Server rejected cross-club request per BR-019 / US-002.`,
    });

    res.json({
      targetClubId,
      targetClubName: club?.name ?? targetClubId,
      allowed,
      effectiveRole,
      httpStatusSimulated: allowed ? 200 : 403,
      message: allowed
        ? `Authorized: ${user.name} holds ${effectiveRole} privileges in ${club?.name}.`
        : `403 Forbidden: ${user.name} has zero authorized membership in ${club?.name}. Request rejected by server RBAC.`,
    });
  });

  // Club WhatsApp Group Integration & Alert Broadcasts
  app.get('/api/clubs/:id/whatsapp', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Unauthorized club WhatsApp workspace access.' });
      return;
    }
    const db = getDb();
    const canManage = hasClubCapability(user, clubId, 'CONNECT_EXISTING_SOCIAL_ACCOUNT');
    const groups = (db.whatsappGroups ?? [])
      .filter((g) => g.clubId === clubId)
      .map((g) => sanitizeWhatsAppGroup(g, canManage));
    const messages = (db.whatsappMessages ?? [])
      .filter((m) => m.clubId === clubId)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    res.json({ whatsappGroups: groups, whatsappMessages: messages });
  });

  app.post('/api/clubs/:id/whatsapp/groups', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CONNECT_EXISTING_SOCIAL_ACCOUNT')) {
      res.status(403).json({
        error: 'Only Club Leads or Student Life Administrators can link WhatsApp groups.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    const {
      groupName,
      inviteLink,
      groupCategory,
      description,
      memberCountEstimate,
      deliveryMode,
      webhookUrl,
      whatsappPhoneNumberId,
      whatsappRecipientJid,
      apiToken,
      showInviteToMembers,
      autoAlertNewEvents,
      autoAlert24hReminders,
    } = req.body as {
      groupName?: string;
      inviteLink?: string;
      groupCategory?: WhatsAppGroupCategory;
      description?: string;
      memberCountEstimate?: number;
      deliveryMode?: WhatsAppDeliveryMode;
      webhookUrl?: string;
      whatsappPhoneNumberId?: string;
      whatsappRecipientJid?: string;
      apiToken?: string;
      showInviteToMembers?: boolean;
      autoAlertNewEvents?: boolean;
      autoAlert24hReminders?: boolean;
    };

    const cleanName = groupName?.trim();
    const cleanInvite = inviteLink?.trim();
    if (!cleanName || !cleanInvite) {
      res.status(400).json({ error: 'WhatsApp group name and invite link are required.' });
      return;
    }
    if (!/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//i.test(cleanInvite)) {
      res.status(400).json({
        error: 'Invite link must be an official WhatsApp URL starting with https://chat.whatsapp.com/ or https://wa.me/.',
      });
      return;
    }

    const mode: WhatsAppDeliveryMode =
      deliveryMode === 'Webhook Relay' || deliveryMode === 'WhatsApp Business Cloud API'
        ? deliveryMode
        : 'Interactive Share + Hub Outbox';
    const category: WhatsAppGroupCategory =
      groupCategory === 'Announcements Only' ||
      groupCategory === 'Event Alerts' ||
      groupCategory === 'Executive Board'
        ? groupCategory
        : 'General Community';

    const now = new Date().toISOString();
    const groupId = `wa-grp-${Date.now().toString().slice(-6)}`;
    const newGroup: WhatsAppGroupLink = {
      groupId,
      clubId,
      groupName: cleanName,
      inviteLink: cleanInvite,
      groupCategory: category,
      description: description?.trim() || undefined,
      memberCountEstimate:
        typeof memberCountEstimate === 'number' && Number.isFinite(memberCountEstimate) && memberCountEstimate > 0
          ? Math.round(memberCountEstimate)
          : undefined,
      deliveryMode: mode,
      webhookUrl: webhookUrl?.trim() || undefined,
      whatsappPhoneNumberId: whatsappPhoneNumberId?.trim() || undefined,
      whatsappRecipientJid: whatsappRecipientJid?.trim() || undefined,
      status: 'Connected',
      showInviteToMembers: showInviteToMembers !== false,
      autoAlertNewEvents: autoAlertNewEvents !== false,
      autoAlert24hReminders: autoAlert24hReminders !== false,
      linkedByUserId: user.userId,
      linkedByName: user.name,
      linkedAt: now,
      updatedAt: now,
    };

    if (apiToken?.trim()) {
      db.whatsappSecrets[groupId] = apiToken.trim();
    }
    db.whatsappGroups.unshift(newGroup);

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'LINK_WHATSAPP_GROUP',
      category: 'Integration',
      target: `${club.shortCode}: ${cleanName}`,
      clubId,
      details: `Linked club WhatsApp group "${cleanName}" (${category}) using ${mode}.`,
    });
    saveDb();
    res.status(201).json({ group: sanitizeWhatsAppGroup(newGroup, true) });
  });

  app.patch('/api/clubs/:id/whatsapp/groups/:groupId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const groupId = String(req.params.groupId);
    if (!hasClubCapability(user, clubId, 'CONNECT_EXISTING_SOCIAL_ACCOUNT')) {
      res.status(403).json({
        error: 'Only Club Leads or Student Life Administrators can update WhatsApp group settings.',
      });
      return;
    }
    const db = getDb();
    const group = (db.whatsappGroups ?? []).find(
      (g) => g.clubId === clubId && g.groupId === groupId
    );
    if (!group) {
      res.status(404).json({ error: 'Linked WhatsApp group not found.' });
      return;
    }
    const body = req.body as Partial<WhatsAppGroupLink> & { apiToken?: string };
    if (typeof body.groupName === 'string' && body.groupName.trim()) {
      group.groupName = body.groupName.trim();
    }
    if (typeof body.inviteLink === 'string' && body.inviteLink.trim()) {
      if (!/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//i.test(body.inviteLink.trim())) {
        res.status(400).json({
          error: 'Invite link must start with https://chat.whatsapp.com/ or https://wa.me/.',
        });
        return;
      }
      group.inviteLink = body.inviteLink.trim();
    }
    if (body.groupCategory) group.groupCategory = body.groupCategory;
    if (typeof body.description === 'string') {
      group.description = body.description.trim() || undefined;
    }
    if (typeof body.memberCountEstimate === 'number' && Number.isFinite(body.memberCountEstimate)) {
      group.memberCountEstimate = Math.max(1, Math.round(body.memberCountEstimate));
    }
    if (body.deliveryMode) group.deliveryMode = body.deliveryMode;
    if (typeof body.webhookUrl === 'string') {
      group.webhookUrl = body.webhookUrl.trim() || undefined;
    }
    if (typeof body.whatsappPhoneNumberId === 'string') {
      group.whatsappPhoneNumberId = body.whatsappPhoneNumberId.trim() || undefined;
    }
    if (typeof body.whatsappRecipientJid === 'string') {
      group.whatsappRecipientJid = body.whatsappRecipientJid.trim() || undefined;
    }
    if (body.status && ['Connected', 'Paused', 'Disconnected'].includes(body.status)) {
      group.status = body.status;
    }
    if (typeof body.showInviteToMembers === 'boolean') {
      group.showInviteToMembers = body.showInviteToMembers;
    }
    if (typeof body.autoAlertNewEvents === 'boolean') {
      group.autoAlertNewEvents = body.autoAlertNewEvents;
    }
    if (typeof body.autoAlert24hReminders === 'boolean') {
      group.autoAlert24hReminders = body.autoAlert24hReminders;
    }
    if (typeof body.apiToken === 'string' && body.apiToken.trim()) {
      db.whatsappSecrets[group.groupId] = body.apiToken.trim();
    }
    group.updatedAt = new Date().toISOString();

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'UPDATE_WHATSAPP_GROUP',
      category: 'Integration',
      target: `${group.groupName} (${group.status})`,
      clubId,
      details: `Updated WhatsApp group settings (${group.deliveryMode}).`,
    });
    saveDb();
    res.json({ group: sanitizeWhatsAppGroup(group, true) });
  });

  app.delete('/api/clubs/:id/whatsapp/groups/:groupId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const groupId = String(req.params.groupId);
    if (!hasClubCapability(user, clubId, 'CONNECT_EXISTING_SOCIAL_ACCOUNT')) {
      res.status(403).json({
        error: 'Only Club Leads or Student Life Administrators can unlink WhatsApp groups.',
      });
      return;
    }
    const db = getDb();
    const idx = (db.whatsappGroups ?? []).findIndex(
      (g) => g.clubId === clubId && g.groupId === groupId
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Linked WhatsApp group not found.' });
      return;
    }
    const [removed] = db.whatsappGroups.splice(idx, 1);
    delete db.whatsappSecrets[groupId];

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'UNLINK_WHATSAPP_GROUP',
      category: 'Integration',
      target: removed.groupName,
      clubId,
      details: `Unlinked WhatsApp group "${removed.groupName}" from club dashboard.`,
    });
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/clubs/:id/whatsapp/messages', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'PUBLISH_CONTENT')) {
      res.status(403).json({
        error: 'Sending WhatsApp alerts from the dashboard requires Club Lead, Editor, or Student Life Admin permissions.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    const { groupId, category, title, messageBody, linkedEventId, syncToHubNotifications } =
      req.body as {
        groupId?: string;
        category?: WhatsAppAlertCategory;
        title?: string;
        messageBody?: string;
        linkedEventId?: string;
        syncToHubNotifications?: boolean;
      };

    const group = (db.whatsappGroups ?? []).find(
      (g) => g.clubId === clubId && g.groupId === groupId
    );
    if (!group) {
      res.status(404).json({ error: 'Please select a connected club WhatsApp group.' });
      return;
    }
    if (group.status !== 'Connected') {
      res.status(400).json({
        error: `WhatsApp group "${group.groupName}" is currently ${group.status}. Resume connection before sending alerts.`,
      });
      return;
    }
    if (!title?.trim() || !messageBody?.trim()) {
      res.status(400).json({ error: 'Alert title and message body are required.' });
      return;
    }

    const validCats: WhatsAppAlertCategory[] = [
      'Announcement',
      'Event Reminder',
      'Urgent Alert',
      'Deadline',
      'Welcome',
    ];
    const resolvedCat: WhatsAppAlertCategory =
      category && validCats.includes(category) ? category : 'Announcement';
    const linkedEvent = linkedEventId
      ? db.events.find(
          (e) => e.eventId === linkedEventId && (e.clubId === clubId || e.coSponsorClubIds?.includes(clubId))
        )
      : undefined;

    const now = new Date().toISOString();
    const mem = db.memberships.find(
      (m) => m.clubId === clubId && m.userId === user.userId && m.status === 'Active'
    );
    const alert: WhatsAppAlertMessage = {
      alertId: `wa-msg-${Date.now().toString().slice(-7)}`,
      clubId,
      groupId: group.groupId,
      groupName: group.groupName,
      category: resolvedCat,
      title: title.trim(),
      messageBody: messageBody.trim(),
      linkedEventId: linkedEvent?.eventId,
      linkedEventTitle: linkedEvent?.title,
      deliveryMode: group.deliveryMode,
      deliveryStatus: 'Ready for WhatsApp Share',
      recipientCountEstimate: group.memberCountEstimate,
      syncToHubNotifications: Boolean(syncToHubNotifications),
      sentByUserId: user.userId,
      sentByName: user.name,
      sentByRoleLabel: mem?.officerTitle || getUserEffectiveClubRole(user, clubId) || user.systemRole,
      sentAt: now,
    };

    const dispatchResult = await dispatchWhatsAppAlert(group, club.name, alert);
    alert.deliveryStatus = dispatchResult.deliveryStatus;
    alert.deliveryDetails = dispatchResult.deliveryDetails;
    group.lastMessageAt = now;
    group.updatedAt = now;
    db.whatsappMessages.unshift(alert);

    if (alert.syncToHubNotifications) {
      const clubMembers = db.memberships.filter((m) => m.clubId === clubId && m.status === 'Active');
      for (const member of clubMembers) {
        if (member.userId === user.userId) continue;
        pushNotification({
          userId: member.userId,
          clubId,
          type: resolvedCat === 'Urgent Alert' ? 'Security' : 'Publishing',
          title: `WhatsApp ${resolvedCat}: ${alert.title}`,
          message: `${club.shortCode} officer ${user.name} posted to ${group.groupName}: ${alert.messageBody.slice(0, 140)}`,
        });
      }
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'SEND_WHATSAPP_ALERT',
      category: 'Publishing',
      target: `${group.groupName}: ${alert.title}`,
      clubId,
      details: `${resolvedCat} (${alert.deliveryStatus}) dispatched by ${user.name}.`,
    });
    saveDb();
    res.status(201).json({
      alert,
      formattedWhatsAppText: formatWhatsAppBroadcastText(
        club.name,
        alert.category,
        alert.title,
        alert.messageBody
      ),
    });
  });

  app.post('/api/clubs/:id/whatsapp/ai-draft', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({
        error: 'Drafting WhatsApp alerts requires Contributor permissions or higher.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    const { category, topic, linkedEventId, groupId } = req.body as {
      category?: string;
      topic?: string;
      linkedEventId?: string;
      groupId?: string;
    };
    const linkedEvent = linkedEventId
      ? db.events.find((e) => e.eventId === linkedEventId)
      : undefined;
    const grp = groupId
      ? (db.whatsappGroups ?? []).find((g) => g.groupId === groupId && g.clubId === clubId)
      : undefined;

    try {
      const draft = await generateWhatsAppAlertDraft({
        clubName: club.name,
        clubShortCode: club.shortCode,
        category: category?.trim() || 'Announcement',
        topic: topic?.trim() || '',
        eventTitle: linkedEvent?.title,
        eventDate: linkedEvent?.date,
        eventTime: linkedEvent?.time,
        eventLocation: linkedEvent?.location,
        inviteLink: grp?.inviteLink,
      });
      res.json(draft);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate WhatsApp alert draft.';
      res.status(500).json({ error: msg });
    }
  });

  // Club-Scoped Integrated Messaging Center (Broadcasts + WhatsApp Links + Member Replies)
  app.get('/api/clubs/:id/messaging-center', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Not authorized to access this club messaging center.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    const userById = new Map(db.users.map((u) => [u.userId, u]));
    const activeMembers = db.memberships
      .filter((m) => m.clubId === clubId && m.status === 'Active')
      .map((m) => {
        const u = userById.get(m.userId);
        return {
          userId: m.userId,
          name: u?.name ?? 'Club Member',
          email: u?.email ?? '',
          officerTitle: m.officerTitle ?? 'General Member',
          role: m.role,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const canManageWhatsApp = hasClubCapability(user, clubId, 'CONNECT_EXISTING_SOCIAL_ACCOUNT');
    const whatsappGroups = (db.whatsappGroups ?? [])
      .filter((g) => g.clubId === clubId && g.status === 'Connected')
      .map((g) => sanitizeWhatsAppGroup(g, canManageWhatsApp));

    const broadcasts = sortClubBroadcasts(
      (db.clubBroadcasts ?? []).filter((b) => b.clubId === clubId)
    );

    res.json({
      club: {
        clubId: club.clubId,
        name: club.name,
        shortCode: club.shortCode,
        category: club.category,
        status: club.status,
      },
      broadcasts,
      whatsappGroups,
      activeMembers,
      activeMembersCount: activeMembers.length,
      canBroadcast: hasClubCapability(user, clubId, 'PUBLISH_CONTENT'),
      canReply: true,
    });
  });

  app.post('/api/clubs/:id/messaging-center/broadcasts', async (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'PUBLISH_CONTENT')) {
      res.status(403).json({
        error: 'Sending club-wide broadcasts requires Club Lead, Editor, or Student Life Administrator permissions.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }

    const {
      title,
      body,
      channel,
      priority,
      whatsappGroupId,
      pinned,
      allowMemberReplies,
      syncWhatsAppOutbox,
    } = req.body as {
      title?: string;
      body?: string;
      channel?: BroadcastChannel;
      priority?: BroadcastPriority;
      whatsappGroupId?: string;
      pinned?: boolean;
      allowMemberReplies?: boolean;
      syncWhatsAppOutbox?: boolean;
    };

    const cleanTitle = title?.trim() ?? '';
    const cleanBody = body?.trim() ?? '';
    if (!cleanTitle || !cleanBody) {
      res.status(400).json({ error: 'Broadcast title and message body are required.' });
      return;
    }

    const resolvedChannel: BroadcastChannel =
      channel === 'internal' || channel === 'whatsapp' || channel === 'both' ? channel : 'both';
    const resolvedPriority: BroadcastPriority =
      priority === 'Important' || priority === 'Urgent' ? priority : 'Standard';

    const clubWhatsAppGroups = (db.whatsappGroups ?? []).filter(
      (g) => g.clubId === clubId && g.status === 'Connected'
    );
    const targetGroup =
      resolvedChannel === 'whatsapp' || resolvedChannel === 'both'
        ? (whatsappGroupId
            ? clubWhatsAppGroups.find((g) => g.groupId === whatsappGroupId)
            : clubWhatsAppGroups[0]) ?? undefined
        : undefined;

    if (whatsappGroupId && !targetGroup && resolvedChannel !== 'internal') {
      res.status(404).json({ error: 'Selected WhatsApp group was not found for this club.' });
      return;
    }

    const activeMembers = db.memberships.filter(
      (m) => m.clubId === clubId && m.status === 'Active'
    );
    const activeMemberIds = Array.from(new Set(activeMembers.map((m) => m.userId)));
    const senderMem = activeMembers.find((m) => m.userId === user.userId);
    const senderRoleLabel =
      senderMem?.officerTitle ||
      (isAdminUser(user) ? 'Student Life Administrator' : 'Club Officer');

    const now = new Date().toISOString();
    const formattedText = formatClubMessagingWhatsAppText(
      club.name,
      resolvedPriority,
      cleanTitle,
      cleanBody
    );
    const whatsappShareUrl =
      resolvedChannel === 'whatsapp' || resolvedChannel === 'both'
        ? `https://wa.me/?text=${encodeURIComponent(formattedText)}`
        : undefined;

    const broadcast: ClubBroadcastMessage = {
      broadcastId: `bcast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      clubId,
      clubName: club.name,
      clubShortCode: club.shortCode,
      title: cleanTitle,
      body: cleanBody,
      channel: resolvedChannel,
      priority: resolvedPriority,
      pinned: Boolean(pinned),
      allowMemberReplies: allowMemberReplies !== false,
      recipientCount: activeMemberIds.length,
      whatsappGroupId: targetGroup?.groupId,
      whatsappGroupName: targetGroup?.groupName,
      whatsappInviteLink: targetGroup?.inviteLink || undefined,
      whatsappShareUrl,
      senderUserId: user.userId,
      senderName: user.name,
      senderRoleLabel,
      replies: [],
      createdAt: now,
      updatedAt: now,
    };

    if (!Array.isArray(db.clubBroadcasts)) {
      db.clubBroadcasts = [];
    }
    db.clubBroadcasts.unshift(broadcast);

    if (resolvedChannel === 'internal' || resolvedChannel === 'both') {
      for (const memberUserId of activeMemberIds) {
        if (memberUserId === user.userId) continue;
        pushNotification({
          userId: memberUserId,
          title: `${club.shortCode} Broadcast: ${cleanTitle}`,
          message: `${user.name} (${senderRoleLabel}) sent a ${resolvedPriority.toLowerCase()} broadcast in the ${club.name} Messaging Center.`,
          type: 'Publishing',
          clubId,
        });
      }
    }

    if (
      (resolvedChannel === 'whatsapp' || resolvedChannel === 'both') &&
      targetGroup &&
      syncWhatsAppOutbox !== false
    ) {
      const waAlert: WhatsAppAlertMessage = {
        alertId: `wa-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        clubId,
        groupId: targetGroup.groupId,
        groupName: targetGroup.groupName,
        category: 'Announcement',
        title: cleanTitle,
        messageBody: cleanBody,
        deliveryMode: targetGroup.deliveryMode,
        deliveryStatus: 'Ready for WhatsApp Share',
        deliveryDetails: 'Synced from Club Messaging Center broadcast.',
        recipientCountEstimate: targetGroup.memberCountEstimate,
        syncToHubNotifications: resolvedChannel === 'both',
        sentByUserId: user.userId,
        sentByName: user.name,
        sentByRoleLabel: senderRoleLabel,
        sentAt: now,
      };
      const outcome = await dispatchWhatsAppAlert(targetGroup, club.name, waAlert);
      waAlert.deliveryStatus = outcome.deliveryStatus;
      waAlert.deliveryDetails = outcome.deliveryDetails;
      if (!Array.isArray(db.whatsappMessages)) db.whatsappMessages = [];
      db.whatsappMessages.unshift(waAlert);
      targetGroup.lastMessageAt = now;
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'SEND_CLUB_BROADCAST',
      category: 'Publishing',
      target: `${club.shortCode}: ${cleanTitle}`,
      clubId,
      details: `Sent via ${resolvedChannel} (${resolvedPriority}) to ${activeMemberIds.length} active members.${
        targetGroup ? ` Linked WhatsApp group: ${targetGroup.groupName}.` : ''
      }`,
    });

    saveDb();
    res.status(201).json({ broadcast });
  });

  app.post('/api/clubs/:id/messaging-center/broadcasts/:broadcastId/replies', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const broadcastId = String(req.params.broadcastId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'You must be an active member of this club workspace to reply.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club workspace not found.' });
      return;
    }
    const broadcast = (db.clubBroadcasts ?? []).find(
      (b) => b.broadcastId === broadcastId && b.clubId === clubId
    );
    if (!broadcast) {
      res.status(404).json({ error: 'Broadcast thread not found inside this club workspace.' });
      return;
    }
    if (!broadcast.allowMemberReplies) {
      res.status(400).json({ error: 'Member replies are currently locked for this broadcast.' });
      return;
    }

    const { body } = req.body as { body?: string };
    const cleanBody = body?.trim() ?? '';
    if (!cleanBody) {
      res.status(400).json({ error: 'Reply message cannot be empty.' });
      return;
    }

    const activeMem = db.memberships.find(
      (m) => m.clubId === clubId && m.userId === user.userId && m.status === 'Active'
    );
    const authorRoleLabel =
      activeMem?.officerTitle ||
      (isAdminUser(user) ? 'Student Life Administrator' : 'Club Member');

    const now = new Date().toISOString();
    const reply: ClubBroadcastReply = {
      replyId: `bcast-rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      authorUserId: user.userId,
      authorName: user.name,
      authorEmail: user.email,
      authorRoleLabel,
      body: cleanBody,
      createdAt: now,
    };

    broadcast.replies.push(reply);
    broadcast.updatedAt = now;

    // Notify broadcaster and active Club Leads inside this club workspace
    const notifyTargets = new Set<string>([broadcast.senderUserId]);
    for (const m of db.memberships) {
      if (m.clubId === clubId && m.status === 'Active' && m.role === 'CLUB_LEAD') {
        notifyTargets.add(m.userId);
      }
    }
    notifyTargets.delete(user.userId);

    for (const targetUserId of notifyTargets) {
      pushNotification({
        userId: targetUserId,
        title: `${club.shortCode} Reply: ${broadcast.title}`,
        message: `${user.name} (${authorRoleLabel}) replied in ${club.name} Messaging Center: "${cleanBody.slice(0, 90)}"`,
        type: 'Forum Reply',
        clubId,
      });
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'REPLY_CLUB_BROADCAST',
      category: 'Publishing',
      target: `${club.shortCode}: ${broadcast.title}`,
      clubId,
      details: `${user.name} (${authorRoleLabel}) posted a workspace reply.`,
    });

    saveDb();
    res.status(201).json({ broadcast, reply });
  });

  app.patch('/api/clubs/:id/messaging-center/broadcasts/:broadcastId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const broadcastId = String(req.params.broadcastId);
    if (!hasClubCapability(user, clubId, 'PUBLISH_CONTENT')) {
      res.status(403).json({
        error: 'Updating broadcast settings requires Club Lead, Editor, or Student Life Administrator permissions.',
      });
      return;
    }
    const db = getDb();
    const broadcast = (db.clubBroadcasts ?? []).find(
      (b) => b.broadcastId === broadcastId && b.clubId === clubId
    );
    if (!broadcast) {
      res.status(404).json({ error: 'Broadcast not found in this club workspace.' });
      return;
    }
    const { pinned, allowMemberReplies } = req.body as {
      pinned?: boolean;
      allowMemberReplies?: boolean;
    };
    if (typeof pinned === 'boolean') broadcast.pinned = pinned;
    if (typeof allowMemberReplies === 'boolean') broadcast.allowMemberReplies = allowMemberReplies;
    broadcast.updatedAt = new Date().toISOString();
    saveDb();
    res.json({ broadcast });
  });

  // =========================================================================
  // CLUB BLOG POSTS & CATEGORY / TAG TAXONOMY MANAGEMENT
  // =========================================================================
  const DEFAULT_BLOG_CATEGORIES = [
    'News',
    'Event Recap',
    'Member Spotlight',
    'Tutorial & Guide',
    'Campus Voices',
    'Research & Projects',
  ];

  const CORE_PROTECTED_BLOG_CATEGORIES = ['News', 'Event Recap', 'Member Spotlight'];

  function normalizeTagLabel(raw: string): string {
    return raw.replace(/^#+/, '').trim().slice(0, 36);
  }

  function getClubBlogTaxonomy(clubId: string): ClubBlogTaxonomy {
    const db = getDb();
    if (!db.clubBlogTaxonomies || typeof db.clubBlogTaxonomies !== 'object') {
      db.clubBlogTaxonomies = {};
    }
    const existing = db.clubBlogTaxonomies[clubId];
    const clubPosts = (db.blogPosts ?? []).filter((bp) => bp.clubId === clubId);
    const usedCats = clubPosts.map((bp) => bp.category).filter(Boolean);
    const usedTags = clubPosts.flatMap((bp) => bp.tags ?? []).map(normalizeTagLabel).filter(Boolean);

    const categories = Array.from(
      new Set([
        ...CORE_PROTECTED_BLOG_CATEGORIES,
        ...(existing?.categories ?? DEFAULT_BLOG_CATEGORIES),
        ...usedCats,
      ])
    );
    const curatedTags = Array.from(
      new Set([...(existing?.curatedTags ?? []), ...usedTags])
    );

    return {
      clubId,
      categories,
      curatedTags,
      updatedByName: existing?.updatedByName,
      updatedAt: existing?.updatedAt ?? new Date().toISOString(),
    };
  }

  app.get('/api/clubs/:id/blog-posts', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Club workspace membership required to view club blog articles.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }
    const canManageDrafts = hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT');
    const posts = sortBlogPosts(
      (db.blogPosts ?? [])
        .filter((bp) => bp.clubId === clubId)
        .filter(
          (bp) =>
            bp.status === 'Published' || canManageDrafts || bp.authorUserId === user.userId
        )
        .map(enrichBlogPost)
    );
    const taxonomy = getClubBlogTaxonomy(clubId);
    res.json({ blogPosts: posts, taxonomy });
  });

  app.put('/api/clubs/:id/blog-taxonomy', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'PUBLISH_CONTENT')) {
      res.status(403).json({
        error: 'Managing club blog categories and tags requires Club Lead, Editor, or Student Life Admin permissions.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }

    const { categories, curatedTags, renameCategory, renameTag } = req.body as {
      categories?: string[];
      curatedTags?: string[];
      renameCategory?: { from: string; to: string };
      renameTag?: { from: string; to: string };
    };

    const current = getClubBlogTaxonomy(clubId);
    let nextCategories = Array.isArray(categories)
      ? Array.from(new Set(categories.map((c) => c.trim()).filter((c) => c.length >= 2 && c.length <= 40)))
      : [...current.categories];
    let nextTags = Array.isArray(curatedTags)
      ? Array.from(new Set(curatedTags.map(normalizeTagLabel).filter((t) => t.length >= 2)))
      : [...current.curatedTags];

    // Guarantee the 3 core discoverability labels remain present
    for (const core of [...CORE_PROTECTED_BLOG_CATEGORIES].reverse()) {
      if (!nextCategories.includes(core)) {
        nextCategories.unshift(core);
      }
    }
    nextCategories = nextCategories.slice(0, 24);
    nextTags = nextTags.slice(0, 50);

    // Optional cascading category rename across this club's blog posts
    if (renameCategory?.from && renameCategory?.to) {
      const fromCat = renameCategory.from.trim();
      const toCat = renameCategory.to.trim();
      if (fromCat && toCat && toCat.length >= 2) {
        if (!CORE_PROTECTED_BLOG_CATEGORIES.includes(fromCat)) {
          nextCategories = nextCategories.map((c) => (c === fromCat ? toCat : c));
          if (!nextCategories.includes(toCat)) nextCategories.push(toCat);
          for (const bp of db.blogPosts ?? []) {
            if (bp.clubId === clubId && bp.category === fromCat) {
              bp.category = toCat;
              bp.updatedAt = new Date().toISOString();
            }
          }
        }
      }
    }

    // Optional cascading tag rename across this club's blog posts
    if (renameTag?.from && renameTag?.to) {
      const fromTag = normalizeTagLabel(renameTag.from);
      const toTag = normalizeTagLabel(renameTag.to);
      if (fromTag && toTag && toTag.length >= 2) {
        nextTags = Array.from(new Set(nextTags.map((t) => (t === fromTag ? toTag : t))));
        for (const bp of db.blogPosts ?? []) {
          if (bp.clubId === clubId && bp.tags.includes(fromTag)) {
            bp.tags = Array.from(new Set(bp.tags.map((t) => (t === fromTag ? toTag : t))));
            bp.updatedAt = new Date().toISOString();
          }
        }
      }
    }

    // Reassign any post whose removed custom category disappeared back to 'News'
    if (Array.isArray(categories)) {
      const allowedSet = new Set(nextCategories);
      for (const bp of db.blogPosts ?? []) {
        if (bp.clubId === clubId && !allowedSet.has(bp.category)) {
          bp.category = 'News';
          bp.updatedAt = new Date().toISOString();
        }
      }
    }

    const updatedTaxonomy: ClubBlogTaxonomy = {
      clubId,
      categories: Array.from(new Set(nextCategories)),
      curatedTags: Array.from(new Set(nextTags)),
      updatedByName: user.name,
      updatedAt: new Date().toISOString(),
    };
    if (!db.clubBlogTaxonomies || typeof db.clubBlogTaxonomies !== 'object') {
      db.clubBlogTaxonomies = {};
    }
    db.clubBlogTaxonomies[clubId] = updatedTaxonomy;

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'UPDATE_CLUB_BLOG_TAXONOMY',
      category: 'Governance',
      target: `${club.name} (${club.shortCode})`,
      clubId,
      details: `Updated blog taxonomy (${updatedTaxonomy.categories.length} categories, ${updatedTaxonomy.curatedTags.length} curated tags).`,
    });

    saveDb();
    const updatedPosts = sortBlogPosts(
      (db.blogPosts ?? []).filter((bp) => bp.clubId === clubId).map(enrichBlogPost)
    );
    res.json({ taxonomy: updatedTaxonomy, blogPosts: updatedPosts });
  });

  app.post('/api/clubs/:id/blog-posts', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    if (!hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT')) {
      res.status(403).json({
        error: 'Creating club blog articles requires Contributor, Editor, Club Lead, or Student Life Admin permissions.',
      });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    if (!club) {
      res.status(404).json({ error: 'Club not found.' });
      return;
    }

    const {
      title,
      subtitle,
      category,
      excerpt,
      bodyMarkdown,
      coverImageUrl,
      coverImageAlt,
      tags,
      status,
      featured,
      visibility,
      linkedEventId,
    } = req.body as {
      title?: string;
      subtitle?: string;
      category?: BlogPostCategory;
      excerpt?: string;
      bodyMarkdown?: string;
      coverImageUrl?: string;
      coverImageAlt?: string;
      tags?: string[] | string;
      status?: BlogPostStatus;
      featured?: boolean;
      visibility?: 'Public Campus' | 'Club Members Only';
      linkedEventId?: string;
    };

    const cleanTitle = (title ?? '').trim();
    const cleanBody = (bodyMarkdown ?? '').trim();
    if (!cleanTitle || cleanTitle.length < 4) {
      res.status(400).json({ error: 'Article title must be at least 4 characters.' });
      return;
    }
    if (!cleanBody || cleanBody.length < 20) {
      res.status(400).json({ error: 'Article content must be at least 20 characters.' });
      return;
    }

    const coverCheck = validateBlogCoverImageUrl(coverImageUrl);
    if (coverCheck.error) {
      res.status(400).json({ error: coverCheck.error });
      return;
    }

    const canPublish = hasClubCapability(user, clubId, 'PUBLISH_CONTENT');
    let nextStatus: BlogPostStatus = status ?? (canPublish ? 'Published' : 'In Review');
    if ((nextStatus === 'Published' || nextStatus === 'Archived') && !canPublish) {
      nextStatus = 'In Review';
    }

    const parsedTags = Array.isArray(tags)
      ? Array.from(new Set(tags.map(normalizeTagLabel).filter(Boolean))).slice(0, 8)
      : typeof tags === 'string'
        ? Array.from(new Set(tags.split(',').map(normalizeTagLabel).filter(Boolean))).slice(0, 8)
        : [];

    const cleanCategory = (category ?? '').trim() || 'News';
    const clubTaxonomy = getClubBlogTaxonomy(clubId);
    if (canPublish && ( !clubTaxonomy.categories.includes(cleanCategory) || parsedTags.some((t) => !clubTaxonomy.curatedTags.includes(t)))) {
      db.clubBlogTaxonomies[clubId] = {
        clubId,
        categories: Array.from(new Set([...clubTaxonomy.categories, cleanCategory])).slice(0, 24),
        curatedTags: Array.from(new Set([...clubTaxonomy.curatedTags, ...parsedTags])).slice(0, 50),
        updatedByName: user.name,
        updatedAt: new Date().toISOString(),
      };
    }

    const plainExcerpt =
      (excerpt ?? '').trim() ||
      cleanBody
        .replace(/^#+\s*/gm, '')
        .replace(/^>\s*/gm, '')
        .replace(/[*_`]/g, '')
        .slice(0, 210)
        .trim();

    const linkedEvent = linkedEventId
      ? db.events.find((ev) => ev.eventId === linkedEventId && ev.clubId === clubId)
      : undefined;

    const effectiveRole = getUserEffectiveClubRole(user, clubId);
    const membership = db.memberships.find(
      (m) => m.userId === user.userId && m.clubId === clubId && m.status === 'Active'
    );
    const authorRoleLabel =
      membership?.officerTitle ??
      (effectiveRole === 'SL_SUPER_ADMIN' || effectiveRole === 'SL_ADMIN'
        ? 'Student Life Admin'
        : effectiveRole === 'CLUB_LEAD'
          ? 'Club Lead'
          : effectiveRole === 'EDITOR'
            ? 'Editor'
            : 'Contributor');

    const now = new Date().toISOString();
    const newPost: ClubBlogPost = {
      blogPostId: `blog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      clubId,
      clubName: club.name,
      clubShortCode: club.shortCode,
      clubLogoUrl: club.logoUrl,
      clubAccentColor: club.accentColor,
      title: cleanTitle,
      slug: slugifyBlogTitle(cleanTitle),
      subtitle: (subtitle ?? '').trim() || undefined,
      category: cleanCategory,
      excerpt: plainExcerpt,
      bodyMarkdown: cleanBody,
      coverImageUrl: coverCheck.value,
      coverImageAlt: (coverImageAlt ?? '').trim() || undefined,
      tags: parsedTags,
      readingTimeMinutes: estimateReadingTimeMinutes(cleanBody),
      status: nextStatus,
      featured: canPublish ? Boolean(featured) : false,
      visibility: visibility === 'Club Members Only' ? 'Club Members Only' : 'Public Campus',
      linkedEventId: linkedEvent?.eventId,
      linkedEventTitle: linkedEvent?.title,
      authorUserId: user.userId,
      authorName: user.name,
      authorRoleLabel,
      reviewedByName: nextStatus === 'Published' ? user.name : undefined,
      likedByUserIds: [],
      comments: [],
      publishedAt: nextStatus === 'Published' ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    if (!Array.isArray(db.blogPosts)) db.blogPosts = [];
    db.blogPosts.unshift(newPost);

    if (nextStatus === 'In Review') {
      const leadIds = db.memberships
        .filter(
          (m) =>
            m.clubId === clubId &&
            m.status === 'Active' &&
            (m.role === 'CLUB_LEAD' || m.role === 'EDITOR') &&
            m.userId !== user.userId
        )
        .map((m) => m.userId);
      for (const recipientId of leadIds) {
        pushNotification({
          userId: recipientId,
          clubId,
          type: 'Peer Review',
          title: `Blog Article Ready for Review: ${newPost.title}`,
          message: `${user.name} submitted a ${newPost.category} blog draft for ${club.shortCode}.`,
        });
      }
    } else if (nextStatus === 'Published') {
      const memberIds = db.memberships
        .filter((m) => m.clubId === clubId && m.status === 'Active' && m.userId !== user.userId)
        .map((m) => m.userId);
      for (const recipientId of memberIds) {
        pushNotification({
          userId: recipientId,
          clubId,
          type: 'Publishing',
          title: `New Club Blog Post: ${newPost.title}`,
          message: `${user.name} published "${newPost.title}" on the ${club.name} blog.`,
        });
      }
    }

    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: effectiveRole ?? user.systemRole,
      action: 'CREATE_CLUB_BLOG_POST',
      category: 'Publishing',
      target: `${club.shortCode}: ${newPost.title}`,
      clubId,
      details: `Created club blog article (${newPost.status}, ${newPost.visibility}).`,
    });

    saveDb();
    res.status(201).json({ blogPost: enrichBlogPost(newPost) });
  });

  app.patch('/api/clubs/:id/blog-posts/:blogPostId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const blogPostId = String(req.params.blogPostId);
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const post = (db.blogPosts ?? []).find(
      (bp) => bp.blogPostId === blogPostId && bp.clubId === clubId
    );
    if (!club || !post) {
      res.status(404).json({ error: 'Blog article not found in this club workspace.' });
      return;
    }

    const canPublish = hasClubCapability(user, clubId, 'PUBLISH_CONTENT');
    const canDraft = hasClubCapability(user, clubId, 'CREATE_CONTENT_DRAFT');
    const isAuthor = post.authorUserId === user.userId;

    if (!canPublish && !(canDraft && isAuthor && post.status !== 'Published')) {
      res.status(403).json({
        error: 'You do not have permission to edit or publish this club blog article.',
      });
      return;
    }

    const {
      title,
      subtitle,
      category,
      excerpt,
      bodyMarkdown,
      coverImageUrl,
      coverImageAlt,
      tags,
      status,
      featured,
      visibility,
      linkedEventId,
    } = req.body as {
      title?: string;
      subtitle?: string;
      category?: BlogPostCategory;
      excerpt?: string;
      bodyMarkdown?: string;
      coverImageUrl?: string;
      coverImageAlt?: string;
      tags?: string[] | string;
      status?: BlogPostStatus;
      featured?: boolean;
      visibility?: 'Public Campus' | 'Club Members Only';
      linkedEventId?: string;
    };

    if (title !== undefined) {
      const cleanTitle = title.trim();
      if (cleanTitle.length < 4) {
        res.status(400).json({ error: 'Article title must be at least 4 characters.' });
        return;
      }
      post.title = cleanTitle;
      post.slug = slugifyBlogTitle(cleanTitle);
    }
    if (subtitle !== undefined) {
      post.subtitle = subtitle.trim() || undefined;
    }
    if (category !== undefined) {
      const cleanCat = category.trim();
      if (cleanCat.length >= 2 && cleanCat.length <= 40) {
        post.category = cleanCat;
        if (canPublish) {
          const tax = getClubBlogTaxonomy(clubId);
          if (!tax.categories.includes(cleanCat)) {
            db.clubBlogTaxonomies[clubId] = {
              ...tax,
              categories: [...tax.categories, cleanCat].slice(0, 24),
              updatedByName: user.name,
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }
    }
    if (bodyMarkdown !== undefined) {
      const cleanBody = bodyMarkdown.trim();
      if (cleanBody.length < 20) {
        res.status(400).json({ error: 'Article content must be at least 20 characters.' });
        return;
      }
      post.bodyMarkdown = cleanBody;
      post.readingTimeMinutes = estimateReadingTimeMinutes(cleanBody);
    }
    if (excerpt !== undefined) {
      const cleanExcerpt = excerpt.trim();
      post.excerpt =
        cleanExcerpt ||
        post.bodyMarkdown
          .replace(/^#+\s*/gm, '')
          .replace(/^>\s*/gm, '')
          .replace(/[*_`]/g, '')
          .slice(0, 210)
          .trim();
    }
    if (coverImageUrl !== undefined) {
      const coverCheck = validateBlogCoverImageUrl(coverImageUrl);
      if (coverCheck.error) {
        res.status(400).json({ error: coverCheck.error });
        return;
      }
      post.coverImageUrl = coverCheck.value;
    }
    if (coverImageAlt !== undefined) {
      post.coverImageAlt = coverImageAlt.trim() || undefined;
    }
    if (tags !== undefined) {
      post.tags = Array.isArray(tags)
        ? Array.from(new Set(tags.map(normalizeTagLabel).filter(Boolean))).slice(0, 8)
        : Array.from(new Set(tags.split(',').map(normalizeTagLabel).filter(Boolean))).slice(0, 8);
      if (canPublish && post.tags.length > 0) {
        const tax = getClubBlogTaxonomy(clubId);
        const missing = post.tags.filter((t) => !tax.curatedTags.includes(t));
        if (missing.length > 0) {
          db.clubBlogTaxonomies[clubId] = {
            ...tax,
            curatedTags: Array.from(new Set([...tax.curatedTags, ...missing])).slice(0, 50),
            updatedByName: user.name,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
    if (visibility !== undefined) {
      post.visibility = visibility === 'Club Members Only' ? 'Club Members Only' : 'Public Campus';
    }
    if (linkedEventId !== undefined) {
      const linkedEvent = linkedEventId
        ? db.events.find((ev) => ev.eventId === linkedEventId && ev.clubId === clubId)
        : undefined;
      post.linkedEventId = linkedEvent?.eventId;
      post.linkedEventTitle = linkedEvent?.title;
    }
    if (typeof featured === 'boolean' && canPublish) {
      post.featured = featured;
    }

    const now = new Date().toISOString();
    if (status !== undefined) {
      if ((status === 'Published' || status === 'Archived') && !canPublish) {
        res.status(403).json({
          error: 'Publishing or archiving blog articles requires Editor, Club Lead, or Student Life Admin permissions.',
        });
        return;
      }
      const wasPublished = post.status === 'Published';
      post.status = status;
      if (status === 'Published') {
        post.publishedAt = post.publishedAt ?? now;
        post.reviewedByName = user.name;
        if (!wasPublished) {
          const memberIds = db.memberships
            .filter((m) => m.clubId === clubId && m.status === 'Active' && m.userId !== user.userId)
            .map((m) => m.userId);
          for (const recipientId of memberIds) {
            pushNotification({
              userId: recipientId,
              clubId,
              type: 'Publishing',
              title: `New Club Blog Post: ${post.title}`,
              message: `${user.name} published "${post.title}" on the ${club.name} blog.`,
            });
          }
        }
      }
    }

    post.updatedAt = now;
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'UPDATE_CLUB_BLOG_POST',
      category: 'Publishing',
      target: `${club.shortCode}: ${post.title}`,
      clubId,
      details: `Updated club blog article (status: ${post.status}).`,
    });

    saveDb();
    res.json({ blogPost: enrichBlogPost(post) });
  });

  app.delete('/api/clubs/:id/blog-posts/:blogPostId', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const blogPostId = String(req.params.blogPostId);
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const idx = (db.blogPosts ?? []).findIndex(
      (bp) => bp.blogPostId === blogPostId && bp.clubId === clubId
    );
    if (!club || idx === -1) {
      res.status(404).json({ error: 'Blog article not found in this club workspace.' });
      return;
    }
    const post = db.blogPosts[idx];
    const canPublish = hasClubCapability(user, clubId, 'PUBLISH_CONTENT');
    const isOwnDraft = post.authorUserId === user.userId && post.status !== 'Published';
    if (!canPublish && !isOwnDraft) {
      res.status(403).json({
        error: 'Deleting published articles requires Editor, Club Lead, or Student Life Admin permissions.',
      });
      return;
    }

    db.blogPosts.splice(idx, 1);
    recordAudit({
      actorId: user.userId,
      actorName: user.name,
      actorRole: getUserEffectiveClubRole(user, clubId) ?? user.systemRole,
      action: 'DELETE_CLUB_BLOG_POST',
      category: 'Publishing',
      target: `${club.shortCode}: ${post.title}`,
      clubId,
      details: `Removed club blog article "${post.title}".`,
    });
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/clubs/:id/blog-posts/:blogPostId/like', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const blogPostId = String(req.params.blogPostId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Club membership required to appreciate articles.' });
      return;
    }
    const db = getDb();
    const post = (db.blogPosts ?? []).find(
      (bp) => bp.blogPostId === blogPostId && bp.clubId === clubId
    );
    if (!post) {
      res.status(404).json({ error: 'Blog article not found.' });
      return;
    }
    if (!Array.isArray(post.likedByUserIds)) post.likedByUserIds = [];
    const existingIdx = post.likedByUserIds.indexOf(user.userId);
    if (existingIdx >= 0) {
      post.likedByUserIds.splice(existingIdx, 1);
    } else {
      post.likedByUserIds.push(user.userId);
    }
    saveDb();
    res.json({ blogPost: enrichBlogPost(post) });
  });

  app.post('/api/clubs/:id/blog-posts/:blogPostId/comments', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const clubId = String(req.params.id);
    const blogPostId = String(req.params.blogPostId);
    if (!canAccessClub(user, clubId)) {
      res.status(403).json({ error: 'Club membership required to comment on articles.' });
      return;
    }
    const db = getDb();
    const club = db.clubs.find((c) => c.clubId === clubId);
    const post = (db.blogPosts ?? []).find(
      (bp) => bp.blogPostId === blogPostId && bp.clubId === clubId
    );
    if (!club || !post) {
      res.status(404).json({ error: 'Blog article not found.' });
      return;
    }
    const { body } = req.body as { body?: string };
    const cleanBody = (body ?? '').trim();
    if (!cleanBody) {
      res.status(400).json({ error: 'Comment text is required.' });
      return;
    }
    const membership = db.memberships.find(
      (m) => m.userId === user.userId && m.clubId === clubId && m.status === 'Active'
    );
    const effectiveRole = getUserEffectiveClubRole(user, clubId);
    const authorRoleLabel =
      membership?.officerTitle ??
      (effectiveRole === 'SL_SUPER_ADMIN' || effectiveRole === 'SL_ADMIN'
        ? 'Student Life Admin'
        : effectiveRole === 'CLUB_LEAD'
          ? 'Club Lead'
          : 'Member');

    const comment: ClubBlogComment = {
      commentId: `bcmt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      blogPostId,
      authorUserId: user.userId,
      authorName: user.name,
      authorRoleLabel,
      body: cleanBody,
      createdAt: new Date().toISOString(),
    };
    if (!Array.isArray(post.comments)) post.comments = [];
    post.comments.push(comment);
    post.updatedAt = comment.createdAt;

    if (post.authorUserId !== user.userId) {
      pushNotification({
        userId: post.authorUserId,
        clubId,
        type: 'Forum Reply',
        title: `New Comment on "${post.title}"`,
        message: `${user.name} commented: "${cleanBody.slice(0, 90)}"`,
      });
    }

    saveDb();
    res.status(201).json({ blogPost: enrichBlogPost(post), comment });
  });

  // Global Cross-Club Top-Bar Notification Center
  app.get('/api/notifications', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    scanAndAlertExpiringTokens();
    const db = getDb();
    const clubCodeById = new Map(db.clubs.map((c) => [c.clubId, c.shortCode]));
    const accessibleClubIds = new Set(
      db.clubs.filter((c) => canAccessClub(user, c.clubId)).map((c) => c.clubId)
    );

    const notifications = db.notifications
      .filter(
        (n) =>
          n.userId === user.userId ||
          (Boolean(n.clubId) && accessibleClubIds.has(n.clubId!) && isAdminUser(user))
      )
      .map((n) => ({
        ...n,
        clubShortCode: n.clubId ? clubCodeById.get(n.clubId) ?? n.clubId : undefined,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  });

  app.post('/api/notifications/read-all', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    const db = getDb();
    const accessibleClubIds = new Set(
      db.clubs.filter((c) => canAccessClub(user, c.clubId)).map((c) => c.clubId)
    );
    let updated = 0;
    for (const n of db.notifications) {
      if (
        !n.read &&
        (n.userId === user.userId ||
          (Boolean(n.clubId) && accessibleClubIds.has(n.clubId!) && isAdminUser(user)))
      ) {
        n.read = true;
        updated += 1;
      }
    }
    if (updated > 0) saveDb();
    res.json({ ok: true, updated });
  });

  app.post('/api/notifications/:id/read', (req: AuthedRequest, res) => {
    const db = getDb();
    const notif = db.notifications.find((n) => n.notificationId === req.params.id);
    if (notif) {
      notif.read = true;
      saveDb();
    }
    res.json({ ok: true, notification: notif });
  });

  app.patch('/api/notifications/:id/read', (req: AuthedRequest, res) => {
    const db = getDb();
    const notif = db.notifications.find((n) => n.notificationId === req.params.id);
    if (notif) {
      notif.read = true;
      saveDb();
    }
    res.json({ ok: true, notification: notif });
  });

  app.post('/api/admin/reset-demo', (req: AuthedRequest, res) => {
    const user = req.currentUser!;
    if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Admin privileges required.' });
      return;
    }
    resetDb();
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CUNY SPS Club Social Hub server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
