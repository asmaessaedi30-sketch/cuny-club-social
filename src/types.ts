export type RoleName =
  | 'SL_SUPER_ADMIN'
  | 'SL_ADMIN'
  | 'CLUB_LEAD'
  | 'EDITOR'
  | 'CONTRIBUTOR'
  | 'VIEWER';

export type PortalMode = 'ADMIN' | 'CLUB';

export type ClubStatus = 'Active' | 'Pending Approval' | 'Suspended' | 'Archived';

export type SocialPlatform =
  | 'Facebook Pages'
  | 'Instagram Professional'
  | 'LinkedIn'
  | 'TikTok'
  | 'YouTube'
  | 'X';

export type ConnectionStatus =
  | 'Connected'
  | 'Expired'
  | 'Disconnected'
  | 'Pending Setup'
  | 'Revoked';

export type AccountRequestType =
  | 'New Official Account'
  | 'Ownership Transfer'
  | 'Account Closure'
  | 'Account Archival';

export type AccountRequestStatus =
  | 'Submitted'
  | 'Under Student Life Review'
  | 'Awaiting CUNY Approval'
  | 'Approved for Setup'
  | 'Setup in Progress'
  | 'Connected'
  | 'More Information Required'
  | 'Rejected'
  | 'Cancelled'
  | 'Setup Blocked';

export type PostStatus =
  | 'Draft'
  | 'In Review'
  | 'Scheduled'
  | 'Publishing'
  | 'Published'
  | 'Failed';

export type MembershipStatus = 'Active' | 'Invited' | 'Revoked' | 'Alumni';

export interface User {
  userId: string;
  name: string;
  email: string;
  identitySubject: string;
  title: string;
  departmentOrMajor: string;
  systemRole: 'SL_SUPER_ADMIN' | 'SL_ADMIN' | 'STANDARD_USER';
  assignedAdminClubIds?: string[]; // Scoped clubs for SL_ADMIN
  status: 'Active' | 'Revoked';
  lastLoginAt: string;
  emailRemindersEnabled?: boolean;
}

export interface ClubGovernanceSummary {
  authorizedLeadersCount: number;
  connectedAccountsCount: number;
  issueAccountsCount: number;
  pendingRequestsCount: number;
  governanceStatus:
    | 'Compliant'
    | 'Attention Required'
    | 'Transition Scheduled'
    | 'Pending Approval'
    | 'Suspended';
}

export interface ClubBudgetSummary {
  clubId: string;
  clubName: string;
  clubShortCode: string;
  allocatedUsd: number;
  encumberedUsd: number;
  reimbursedUsd: number;
  remainingUsd: number;
}

export type BudgetIncreaseRequestStatus = 'Pending' | 'Approved' | 'Denied';

export interface BudgetIncreaseRequest {
  requestId: string;
  clubId: string;
  clubName: string;
  clubShortCode: string;
  currentAllocatedUsd: number;
  requestedAdditionalUsd: number;
  proposedTotalUsd: number;
  eventOrInitiativeTitle: string;
  fundingBreakdown: string;
  reason: string;
  expectedAttendance?: number;
  eventDate?: string;
  status: BudgetIncreaseRequestStatus;
  submittedByUserId: string;
  submittedByName: string;
  submittedByEmail: string;
  submittedAt: string;
  updatedAt: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  decisionNotes?: string;
  approvedAdditionalUsd?: number;
}

export interface Club {
  clubId: string;
  name: string;
  shortCode: string;
  description: string;
  category: string;
  status: ClubStatus;
  facultyAdvisor: string;
  onboardedAt: string;
  logoUrl?: string;
  accentColor?: string;
  tagline?: string;
  meetingSchedule?: string;
  contactEmail?: string;
  websiteUrl?: string;
  upcomingLeadershipChange?: string;
  semesterBudgetAllocatedUsd?: number;
  budgetSummary?: ClubBudgetSummary;
  governanceSummary?: ClubGovernanceSummary;
}

export type ClubOfficerTitle =
  | 'President'
  | 'Vice President'
  | 'Secretary'
  | 'Treasurer'
  | 'Social Media Chair'
  | 'Events Coordinator'
  | 'General Member'
  | 'Faculty Advisor';

export interface ClubMembership {
  membershipId: string;
  userId: string;
  clubId: string;
  role: 'CLUB_LEAD' | 'EDITOR' | 'CONTRIBUTOR' | 'VIEWER';
  officerTitle?: ClubOfficerTitle | string;
  status: MembershipStatus;
  authorizedBy: string;
  authorizedAt: string;
}

export interface ClubMemberDirectoryEntry extends ClubMembership {
  name: string;
  email: string;
  departmentOrMajor: string;
  userStatus: string;
  clubName: string;
  clubShortCode: string;
  canManage: boolean;
}

export interface AccountCustodian {
  custodianId: string;
  accountId: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  staffDepartment: string;
  responsibility: string;
  assignedAt: string;
}

export interface PlatformConnection {
  connectionId: string;
  accountId: string;
  tokenReference: string; // Masked ref only; raw tokens never exposed
  status: ConnectionStatus;
  connectedBy: string;
  connectedAt: string;
  expiresAt: string;
  lastCheckedAt: string;
  errorMessage?: string;
}

export interface SocialAccount {
  accountId: string;
  clubId: string;
  platform: SocialPlatform;
  accountName: string;
  handle: string;
  institutionalOwner: string;
  pilotTier: 'Pilot Priority' | 'Later Phase';
  publishingSupported: boolean;
  analyticsSupported: boolean;
  metaPageId?: string;
  igBusinessAccountId?: string;
  hasLiveMetaToken?: boolean;
  tokenExpiresInDays?: number;
  custodian: AccountCustodian;
  connection: PlatformConnection;
}

export interface ApprovalRecord {
  approvalId: string;
  requestId: string;
  authority: string;
  actorName: string;
  decision: string;
  notes: string;
  timestamp: string;
}

export interface AccountRequest {
  requestId: string;
  clubId: string;
  clubName: string;
  requestType: AccountRequestType;
  platform: SocialPlatform;
  proposedAccountName: string;
  targetAccountId?: string;
  businessPurpose: string;
  intendedAudience: string;
  responsibleRepresentatives: string;
  status: AccountRequestStatus;
  submittedByUserId: string;
  submittedByName: string;
  submittedAt: string;
  updatedAt: string;
  approvals: ApprovalRecord[];
}

export interface MediaAsset {
  assetId: string;
  clubId: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  altText: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PublishAttempt {
  attemptId: string;
  postId: string;
  accountId: string;
  platform: SocialPlatform;
  handle: string;
  outcome: 'Success' | 'Failed';
  providerPostId?: string;
  errorCode?: string;
  errorMessage?: string;
  nextAction?: string;
  attemptedAt: string;
}

export interface PeerReviewComment {
  commentId: string;
  authorId: string;
  authorName: string;
  authorRoleLabel: string;
  body: string;
  createdAt: string;
}

export interface CrossClubReshareRequest {
  requestId: string;
  sourceClubId: string;
  sourceClubName: string;
  sourceClubShortCode: string;
  targetClubId: string;
  targetClubName: string;
  targetClubShortCode: string;
  sourcePostId: string;
  sourcePostTitle: string;
  sourceCaption: string;
  requestedByUserId: string;
  requestedByName: string;
  note?: string;
  status: 'Pending' | 'Approved' | 'Declined';
  decidedByName?: string;
  decidedAt?: string;
  createdPostId?: string;
  createdAt: string;
}

export interface Post {
  postId: string;
  clubId: string;
  title: string;
  caption: string;
  platformAdaptations?: Partial<Record<SocialPlatform, string>>;
  hashtags: string[];
  callToAction?: string;
  relatedEvent?: string;
  eventDate?: string;
  authorId: string;
  authorName: string;
  status: PostStatus;
  targetAccountIds: string[];
  mediaAsset?: MediaAsset;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  aiAssisted: boolean;
  aiReviewedByHuman: boolean;
  peerReviewRequestedBy?: string;
  peerReviewRequestedAt?: string;
  peerReviewComments?: PeerReviewComment[];
  publishAttempts: PublishAttempt[];
}

export type ClubEventType = 'Club Meeting' | 'Campus Event' | 'Workshop' | 'Networking';

export type EventRecurrence = 'None' | 'Weekly' | 'Biweekly';

export interface EventFeedbackResponse {
  feedbackId: string;
  userId: string;
  respondentName: string;
  rating: number; // 1 to 5
  relevantToGoals: boolean;
  takeaway: string;
  submittedAt: string;
}

export interface ClubEvent {
  eventId: string;
  clubId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  eventType?: ClubEventType;
  postedByName?: string;
  createdAt?: string;
  updatedAt?: string;
  clubName?: string;
  clubShortCode?: string;
  clubLogoUrl?: string;
  clubAccentColor?: string;
  coSponsorClubIds?: string[];
  coSponsorClubCodes?: string[];
  rsvpUserIds?: string[];
  rsvpCount?: number;
  userHasRsvped?: boolean;
  inPersonCapacity?: number;
  virtualCapacity?: number;
  rsvpModes?: Record<string, 'In-Person' | 'Virtual'>;
  waitlistUserIds?: string[];
  userOnWaitlist?: boolean;
  waitlistCount?: number;
  inPersonConfirmedCount?: number;
  virtualConfirmedCount?: number;
  userRsvpMode?: 'In-Person' | 'Virtual';
  reminderSentCount?: number;
  reminderScheduledFor?: string;
  isPublic?: boolean;
  approvalStatus?: 'Approved' | 'Pending Student Life Review' | 'Declined';
  checkInCode?: string;
  checkedInUserIds?: string[];
  checkedInCount?: number;
  guestWalkInCount?: number;
  userCheckedIn?: boolean;
  syncedAnalyticsRecordId?: string;
  recurrence?: EventRecurrence;
  recurrenceSeriesId?: string;
  recurrenceCount?: number;
  feedbackResponses?: EventFeedbackResponse[];
  avgFeedbackRating?: number;
  feedbackCount?: number;
  userSubmittedFeedback?: boolean;
}

export type EventFormat = 'Virtual' | 'In-Person' | 'Hybrid';

export interface EventAttendanceRecord {
  recordId: string;
  clubId: string;
  semester: string;
  title: string;
  date: string;
  eventType: ClubEventType;
  format: EventFormat;
  registeredCount: number;
  attendedCount: number;
  capacity: number;
  recordedByName: string;
  coSponsorClubIds?: string[];
  avgFeedbackRating?: number;
  feedbackCount?: number;
  notes?: string;
}

export interface ClubEngagementFunnel {
  socialReach: number;
  socialEngagements: number;
  eventRsvps: number;
  verifiedCheckIns: number;
  joinRequestsSubmitted: number;
  newMembersApproved: number;
}

export interface EventAnalyticsPayload {
  clubId: string;
  clubName: string;
  clubShortCode: string;
  records: EventAttendanceRecord[];
  upcomingProjections: {
    eventId: string;
    title: string;
    date: string;
    time: string;
    eventType: ClubEventType;
    location: string;
    rsvpCount: number;
    waitlistCount?: number;
  }[];
  engagementFunnel: ClubEngagementFunnel;
}

export interface PlatformMetric {
  metricId: string;
  clubId: string;
  accountId: string;
  platform: SocialPlatform;
  handle: string;
  reportingPeriod: string;
  availability: 'Available via Official API' | 'Restricted in Pilot' | 'Unavailable';
  publishedPosts: number;
  publishingSuccessRate: number;
  engagementCount: number;
  reach: number;
  impressions: number;
  followerGrowth: number;
  dailySeries: { date: string; reach: number; engagement: number }[];
}

export interface Invitation {
  invitationId: string;
  clubId: string;
  recipientEmail: string;
  recipientName: string;
  role: 'CLUB_LEAD' | 'EDITOR' | 'CONTRIBUTOR' | 'VIEWER';
  invitedByUserId: string;
  invitedByName: string;
  status: 'Pending' | 'Accepted' | 'Revoked';
  createdAt: string;
}

export interface AuditLog {
  eventId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  category: 'Authentication' | 'Governance' | 'Membership' | 'Publishing' | 'Integration' | 'AI';
  target: string;
  clubId?: string;
  details: string;
  timestamp: string;
}

export interface NotificationItem {
  notificationId: string;
  userId: string;
  clubId?: string;
  clubShortCode?: string;
  type:
    | 'Approval'
    | 'Publishing'
    | 'Security'
    | 'Membership'
    | 'Event Reminder'
    | 'Forum Mention'
    | 'Forum Reply'
    | 'Join Request'
    | 'Resource Submission'
    | 'Peer Review'
    | 'Reshare Request'
    | 'Advisor Sign-Off';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type EmailReminderDeliveryStatus =
  | 'Sent (SMTP)'
  | 'Delivered (Hub Outbox)' // Legacy records only; not proof of delivery
  | 'Queued (Hub Outbox)'
  | 'Delivered (Webhook Verified)'
  | 'Bounced'
  | 'Deferred'
  | 'Failed';

export interface EmailDeliveryWebhookEvent {
  webhookEventId: string;
  reminderId?: string;
  providerMessageId: string;
  recipientEmail: string;
  eventType: 'delivered' | 'deferred' | 'bounced';
  detail: string;
  timestamp: string;
}

export interface EmailReminderRecord {
  reminderId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  clubId: string;
  clubName: string;
  clubShortCode: string;
  recipientUserId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  triggerMode: '24h Automated' | 'Manual Early Dispatch';
  deliveryStatus: EmailReminderDeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
  sentAt: string;
  webhookEvents?: EmailDeliveryWebhookEvent[];
}

export interface SmtpConfigView {
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  hasPassword: boolean;
  fromAddress: string;
  appUrl: string;
  providerLabel: string;
  webhookUrl: string;
  webhookSecretConfigured: boolean;
  envSmtpActive: boolean;
  updatedAt: string;
  updatedByName: string;
  lastTestedAt?: string;
  lastTestStatus?: 'Verified' | 'Simulated' | 'Failed';
  lastTestMessage?: string;
}

export interface ScheduledReminderSlot {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  clubId: string;
  clubName: string;
  clubShortCode: string;
  reminderScheduledFor: string;
  eligibleMemberCount: number;
  dispatchedCount: number;
  status: 'Sent (24h Window)' | 'Scheduled (24h Prior)' | 'Event Passed' | 'Invalid Event Time';
}

export type InboxThreadTag = 'Event Question' | 'Join Inquiry' | 'Escalation' | 'General';

export interface InboxMessage {
  messageId: string;
  clubId: string;
  accountId: string;
  platform: SocialPlatform;
  senderName: string;
  senderHandle: string;
  channel: 'Comment' | 'Direct Message';
  body: string;
  receivedAt: string;
  flagged: boolean;
  replied: boolean;
  replyText?: string;
  repliedByName?: string;
  repliedAt?: string;
  assignedToUserId?: string;
  assignedToName?: string;
  tag?: InboxThreadTag;
}

export interface SessionContext {
  user: User;
  memberships: (ClubMembership & { clubName: string; clubShortCode: string; clubStatus: ClubStatus })[];
  effectiveAdminRole: 'SL_SUPER_ADMIN' | 'SL_ADMIN' | null;
}

export interface PermissionRow {
  capability: string;
  slSuperAdmin: string;
  slAdmin: string;
  clubLead: string;
  editor: string;
  contributor: string;
  viewer: string;
}

export type ChatModelId = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  sources?: GroundingSource[];
  timestamp: string;
}

export type ClubResourceCategory =
  | 'Branding Assets'
  | 'Event Proposal Templates'
  | 'Financial Reimbursement Forms';

export interface ClubResource {
  resourceId: string;
  title: string;
  category: ClubResourceCategory;
  description: string;
  fileName: string;
  fileFormat: 'SVG' | 'MD' | 'CSV' | 'HTML';
  mimeType: string;
  version: string;
  updatedAt: string;
  publishedBy: string;
  audienceNote: string;
}

export type AnnouncementPriority = 'Critical' | 'Important' | 'General';

export interface ClubAnnouncement {
  announcementId: string;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  pinned: boolean;
  audience: string;
  expiresAt?: string;
  postedByUserId: string;
  postedByName: string;
  postedByTitle: string;
  createdAt: string;
  updatedAt: string;
}

export type ForumCategory = 'Question' | 'Discussion' | 'Resource Share' | 'Event Ideas';

export interface ForumReply {
  replyId: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorRoleLabel: string;
  body: string;
  mentionedUserIds?: string[];
  createdAt: string;
}

export interface ForumThread {
  threadId: string;
  clubId: string;
  category: ForumCategory;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRoleLabel: string;
  pinned: boolean;
  resolved: boolean;
  replies: ForumReply[];
  subscriberUserIds?: string[];
  mentionedUserIds?: string[];
  promotedEventId?: string;
  promotedTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Blocked' | 'Completed';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type ClubTaskCategory =
  | 'Event Operations'
  | 'Communications'
  | 'Governance & Finance'
  | 'Membership Outreach';

export interface ClubTaskAssigneeOption {
  userId: string;
  name: string;
  email: string;
  roleLabel: string;
}

export interface ClubProjectTask {
  taskId: string;
  clubId: string;
  title: string;
  description: string;
  category: ClubTaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeUserId: string;
  assigneeName: string;
  assigneeRoleLabel: string;
  assignedByUserId: string;
  assignedByName: string;
  dueDate: string;
  progressPct: number;
  linkedEventId?: string;
  linkedEventTitle?: string;
  linkedPostId?: string;
  linkedPostTitle?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ClubJoinRequest {
  joinRequestId: string;
  clubId: string;
  clubName: string;
  clubShortCode: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  departmentOrMajor: string;
  reason: string;
  preferredInterest: string;
  status: 'Pending' | 'Approved' | 'Declined';
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export interface PublicClubSummary {
  clubId: string;
  name: string;
  shortCode: string;
  description: string;
  category: string;
  facultyAdvisor: string;
  activeMemberCount: number;
  upcomingPublicEventsCount: number;
  presidentName?: string;
  logoUrl?: string;
  accentColor?: string;
  tagline?: string;
  meetingSchedule?: string;
  contactEmail?: string;
  websiteUrl?: string;
}

export interface TransitionChecklistItem {
  itemId: string;
  label: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface AdvisorSignOffRecord {
  signedByUserId: string;
  signedByName: string;
  signedAt: string;
  note?: string;
}

export interface OfficerTransitionChecklist {
  transitionId: string;
  clubId: string;
  fromSemester: string;
  toSemester: string;
  targetEffectiveDate: string;
  status: 'In Progress' | 'Completed';
  checklistItems: TransitionChecklistItem[];
  lastRotationNote?: string;
  requiresAdvisorSignOff?: boolean;
  advisorSignOff?: AdvisorSignOffRecord;
  updatedAt: string;
}

export type ResourceSubmissionType = 'Event Proposal' | 'Financial Reimbursement';
export type ResourceSubmissionStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Revisions Requested';

export interface BudgetSplitAllocation {
  clubId: string;
  clubShortCode: string;
  sharePct: number;
}

export interface ResourceSubmission {
  submissionId: string;
  clubId: string;
  clubName: string;
  clubShortCode: string;
  type: ResourceSubmissionType;
  title: string;
  summary: string;
  amountUsd?: number;
  eventDate?: string;
  payload: Record<string, unknown>;
  status: ResourceSubmissionStatus;
  submittedByUserId: string;
  submittedByName: string;
  submittedByEmail: string;
  submittedAt: string;
  updatedAt: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  coSponsorClubIds?: string[];
  budgetSplits?: BudgetSplitAllocation[];
  offCampusVenue?: boolean;
  requiresAdvisorSignOff?: boolean;
  advisorSignOff?: AdvisorSignOffRecord;
}

export interface ClubCharterRenewalSummary {
  clubId: string;
  clubName: string;
  clubShortCode: string;
  category: string;
  status: ClubStatus;
  facultyAdvisor: string;
  onboardedAt: string;
  generatedAt: string;
  semesterLabel: string;
  activeMembersCount: number;
  alumniMembersCount: number;
  officers: { name: string; email: string; officerTitle: string; role: string }[];
  eventsHostedCount: number;
  totalSemesterAttendance: number;
  avgAttendanceRatePct: number;
  avgEventSatisfaction: number | null;
  connectedSocialAccountsCount: number;
  healthySocialAccountsCount: number;
  auditComplianceRatePct: number;
  publishedPostsCount: number;
  budgetSummary: ClubBudgetSummary;
  resourceSubmissionsCount: number;
  approvedReimbursementsCount: number;
}

export type WhatsAppDeliveryMode =
  | 'Interactive Share + Hub Outbox'
  | 'Webhook Relay'
  | 'WhatsApp Business Cloud API';

export type WhatsAppAlertCategory =
  | 'Announcement'
  | 'Event Reminder'
  | 'Urgent Alert'
  | 'Deadline'
  | 'Welcome';

export type WhatsAppGroupCategory =
  | 'General Community'
  | 'Announcements Only'
  | 'Event Alerts'
  | 'Executive Board';

export interface WhatsAppGroupLink {
  groupId: string;
  clubId: string;
  groupName: string;
  inviteLink: string;
  groupCategory: WhatsAppGroupCategory;
  description?: string;
  memberCountEstimate?: number;
  deliveryMode: WhatsAppDeliveryMode;
  webhookUrl?: string;
  whatsappPhoneNumberId?: string;
  whatsappRecipientJid?: string;
  hasApiToken?: boolean;
  status: 'Connected' | 'Paused' | 'Disconnected';
  showInviteToMembers: boolean;
  autoAlertNewEvents: boolean;
  autoAlert24hReminders: boolean;
  linkedByUserId: string;
  linkedByName: string;
  linkedAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

export interface WhatsAppAlertMessage {
  alertId: string;
  clubId: string;
  groupId: string;
  groupName: string;
  category: WhatsAppAlertCategory;
  title: string;
  messageBody: string;
  linkedEventId?: string;
  linkedEventTitle?: string;
  deliveryMode: WhatsAppDeliveryMode;
  deliveryStatus:
    | 'Delivered via Cloud API'
    | 'Delivered via Webhook'
    | 'Ready for WhatsApp Share'
    | 'Failed';
  deliveryDetails?: string;
  recipientCountEstimate?: number;
  syncToHubNotifications: boolean;
  sentByUserId: string;
  sentByName: string;
  sentByRoleLabel: string;
  sentAt: string;
}

export type BroadcastChannel = 'internal' | 'whatsapp' | 'both';
export type BroadcastPriority = 'Standard' | 'Important' | 'Urgent';

export interface ClubBroadcastReply {
  replyId: string;
  authorUserId: string;
  authorName: string;
  authorEmail: string;
  authorRoleLabel: string;
  body: string;
  createdAt: string;
}

export interface ClubBroadcastMessage {
  broadcastId: string;
  clubId: string;
  clubName: string;
  clubShortCode: string;
  title: string;
  body: string;
  channel: BroadcastChannel;
  priority: BroadcastPriority;
  pinned: boolean;
  allowMemberReplies: boolean;
  recipientCount: number;
  whatsappGroupId?: string;
  whatsappGroupName?: string;
  whatsappInviteLink?: string;
  whatsappShareUrl?: string;
  senderUserId: string;
  senderName: string;
  senderRoleLabel: string;
  replies: ClubBroadcastReply[];
  createdAt: string;
  updatedAt: string;
}

export type BlogPostStatus = 'Draft' | 'In Review' | 'Published' | 'Archived';
export type CoreBlogPostCategory =
  | 'News'
  | 'Event Recap'
  | 'Member Spotlight'
  | 'Tutorial & Guide'
  | 'Campus Voices'
  | 'Research & Projects';
export type BlogPostCategory = CoreBlogPostCategory | (string & {});

export interface ClubBlogTaxonomy {
  clubId: string;
  categories: string[];
  curatedTags: string[];
  updatedByName?: string;
  updatedAt: string;
}

export interface ClubBlogComment {
  commentId: string;
  blogPostId: string;
  authorUserId: string;
  authorName: string;
  authorRoleLabel: string;
  body: string;
  createdAt: string;
}

export interface ClubBlogPost {
  blogPostId: string;
  clubId: string;
  clubName: string;
  clubShortCode: string;
  clubLogoUrl?: string;
  clubAccentColor?: string;
  title: string;
  slug: string;
  subtitle?: string;
  category: BlogPostCategory;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  tags: string[];
  readingTimeMinutes: number;
  status: BlogPostStatus;
  featured: boolean;
  visibility: 'Public Campus' | 'Club Members Only';
  linkedEventId?: string;
  linkedEventTitle?: string;
  authorUserId: string;
  authorName: string;
  authorRoleLabel: string;
  reviewedByName?: string;
  likedByUserIds: string[];
  comments: ClubBlogComment[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}


