import fs from 'node:fs';
import path from 'node:path';
import type {
  AccountRequest,
  AuditLog,
  BudgetIncreaseRequest,
  Club,
  ClubAnnouncement,
  ClubBlogPost,
  ClubBlogTaxonomy,
  ClubBroadcastMessage,
  ClubEvent,
  ClubJoinRequest,
  ClubMembership,
  ClubProjectTask,
  CrossClubReshareRequest,
  EmailDeliveryWebhookEvent,
  EmailReminderRecord,
  EventAttendanceRecord,
  ForumThread,
  InboxMessage,
  Invitation,
  NotificationItem,
  OfficerTransitionChecklist,
  PlatformMetric,
  Post,
  ResourceSubmission,
  SocialAccount,
  User,
  WhatsAppAlertMessage,
  WhatsAppGroupLink,
} from '../src/types.ts';

export interface StoredSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  authPass: string;
  fromAddress: string;
  appUrl: string;
  providerLabel: string;
  webhookSecret: string;
  updatedAt: string;
  updatedByName: string;
  lastTestedAt?: string;
  lastTestStatus?: 'Verified' | 'Simulated' | 'Failed';
  lastTestMessage?: string;
}

export interface HubDatabase {
  users: User[];
  clubs: Club[];
  memberships: ClubMembership[];
  socialAccounts: SocialAccount[];
  accountRequests: AccountRequest[];
  posts: Post[];
  events: ClubEvent[];
  eventAttendanceRecords: EventAttendanceRecord[];
  clubTasks: ClubProjectTask[];
  announcements: ClubAnnouncement[];
  emailReminders: EmailReminderRecord[];
  emailWebhookEvents: EmailDeliveryWebhookEvent[];
  smtpConfig: StoredSmtpConfig;
  forumThreads: ForumThread[];
  joinRequests: ClubJoinRequest[];
  officerTransitions: OfficerTransitionChecklist[];
  resourceSubmissions: ResourceSubmission[];
  budgetIncreaseRequests: BudgetIncreaseRequest[];
  budgetBaseline500Migrated?: boolean;
  reshareRequests: CrossClubReshareRequest[];
  metaTokenSecrets: Record<string, string>;
  analytics: PlatformMetric[];
  invitations: Invitation[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  inboxMessages: InboxMessage[];
  whatsappGroups: WhatsAppGroupLink[];
  whatsappMessages: WhatsAppAlertMessage[];
  whatsappSecrets: Record<string, string>;
  clubBroadcasts: ClubBroadcastMessage[];
  blogPosts: ClubBlogPost[];
  clubBlogTaxonomies: Record<string, ClubBlogTaxonomy>;
  publicCatalogEventsSeeded?: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'hub-store.json');

function createInitialClubTasks(): ClubProjectTask[] {
  return [
    {
      taskId: 'tsk-101',
      clubId: 'club-ai',
      title: 'Finalize AI Club Meeting Slide Deck & Demo Order',
      description:
        'Confirm 5 student project lightning demos, collect GitHub repo links, and upload captioned slides to the shared club drive.',
      category: 'Event Operations',
      priority: 'High',
      status: 'In Progress',
      assigneeUserId: 'usr-editor-ai',
      assigneeName: 'Devon Brooks',
      assigneeRoleLabel: 'Social Media Chair',
      assignedByUserId: 'usr-lead-ai',
      assignedByName: 'Aisha Rahman',
      dueDate: '2026-11-18',
      progressPct: 75,
      linkedEventId: 'evt-1',
      linkedEventTitle: 'AI Club Meeting',
      linkedPostId: 'post-ai-101',
      linkedPostTitle: 'AI Club Meeting',
      createdAt: '2026-11-10T14:00:00.000Z',
      updatedAt: '2026-11-13T11:30:00.000Z',
    },
    {
      taskId: 'tsk-102',
      clubId: 'club-ai',
      title: 'Draft Post-Event Accessibility & Alt-Text Recap Carousel',
      description:
        'Prepare Instagram & Facebook recap post with WCAG-compliant alt text and summary notes for asynchronous students.',
      category: 'Communications',
      priority: 'Medium',
      status: 'To Do',
      assigneeUserId: 'usr-contrib-ai',
      assigneeName: 'Sofia Patel',
      assigneeRoleLabel: 'Secretary',
      assignedByUserId: 'usr-lead-ai',
      assignedByName: 'Aisha Rahman',
      dueDate: '2026-11-21',
      progressPct: 25,
      linkedEventId: 'evt-3',
      linkedEventTitle: 'AI Club General Meeting',
      linkedPostId: 'post-ai-103',
      linkedPostTitle: 'Finals Week Study & Prompt Workshop Draft',
      createdAt: '2026-11-11T16:15:00.000Z',
      updatedAt: '2026-11-12T09:10:00.000Z',
    },
    {
      taskId: 'tsk-103',
      clubId: 'club-ai',
      title: 'Submit Spring 2027 Officer Transition & LinkedIn Custodian Form',
      description:
        'Complete Office of Student Life transition checklist for incoming co-chair Noah Kim and verify custodian paperwork for REQ-2026-014.',
      category: 'Governance & Finance',
      priority: 'High',
      status: 'In Progress',
      assigneeUserId: 'usr-lead-ai',
      assigneeName: 'Aisha Rahman',
      assigneeRoleLabel: 'President',
      assignedByUserId: 'usr-lead-ai',
      assignedByName: 'Aisha Rahman',
      dueDate: '2026-11-25',
      progressPct: 60,
      createdAt: '2026-11-08T10:00:00.000Z',
      updatedAt: '2026-11-13T08:45:00.000Z',
    },
    {
      taskId: 'tsk-104',
      clubId: 'club-ai',
      title: 'Approve December AI Club Meeting Faculty Room Request',
      description:
        'Sign off on the Student Life event proposal form and confirm faculty sponsor coverage for Dec 8 study lounge session.',
      category: 'Governance & Finance',
      priority: 'Medium',
      status: 'Completed',
      assigneeUserId: 'usr-viewer-ai',
      assigneeName: 'Prof. Jordan Reyes',
      assigneeRoleLabel: 'Faculty Advisor',
      assignedByUserId: 'usr-lead-ai',
      assignedByName: 'Aisha Rahman',
      dueDate: '2026-11-12',
      progressPct: 100,
      createdAt: '2026-11-05T13:00:00.000Z',
      updatedAt: '2026-11-11T17:20:00.000Z',
      completedAt: '2026-11-11T17:20:00.000Z',
    },
    {
      taskId: 'tsk-201',
      clubId: 'club-msa',
      title: 'Confirm Halal Catering & Tea Service Setup for MSA Community Welcome',
      description:
        'Coordinate beverage station count with Office of Student Life and print QR check-in table cards for incoming members.',
      category: 'Event Operations',
      priority: 'High',
      status: 'Completed',
      assigneeUserId: 'usr-lead-msa',
      assigneeName: 'Zainab Siddiqui',
      assigneeRoleLabel: 'President',
      assignedByUserId: 'usr-lead-msa',
      assignedByName: 'Zainab Siddiqui',
      dueDate: '2026-11-15',
      progressPct: 100,
      linkedEventId: 'evt-4',
      linkedEventTitle: 'Islamic Studies Club – New Club (Club Fair)',
      createdAt: '2026-11-09T12:00:00.000Z',
      updatedAt: '2026-11-13T10:00:00.000Z',
      completedAt: '2026-11-13T10:00:00.000Z',
    },
    {
      taskId: 'tsk-202',
      clubId: 'club-msa',
      title: 'Refresh @cunysps.msa Meta Custodian Token & Graphics Kit',
      description:
        'Verify token renewal window with Student Life Coordinator Marcus Sterling and publish bilingual finals support reminders.',
      category: 'Communications',
      priority: 'Medium',
      status: 'In Progress',
      assigneeUserId: 'usr-lead-msa',
      assigneeName: 'Zainab Siddiqui',
      assigneeRoleLabel: 'President',
      assignedByUserId: 'usr-lead-msa',
      assignedByName: 'Zainab Siddiqui',
      dueDate: '2026-11-26',
      progressPct: 55,
      linkedPostId: 'post-msa-201',
      linkedPostTitle: 'MSA Community Tea & Finals Study Circle',
      createdAt: '2026-11-11T15:00:00.000Z',
      updatedAt: '2026-11-12T18:30:00.000Z',
    },
  ];
}

function createInitialEventAttendanceRecords(): EventAttendanceRecord[] {
  return [
    // Artificial Intelligence Club — Fall 2026
    {
      recordId: 'attrec-ai-f1',
      clubId: 'club-ai',
      semester: 'Fall 2026',
      title: 'Fall Orientation & AI Club Welcome',
      date: '2026-09-08',
      eventType: 'Club Meeting',
      format: 'Virtual',
      registeredCount: 38,
      attendedCount: 29,
      capacity: 60,
      recordedByName: 'Aisha Rahman',
      notes: 'Strong first-week turnout from B.S. Information Systems cohort.',
    },
    {
      recordId: 'attrec-ai-f2',
      clubId: 'club-ai',
      semester: 'Fall 2026',
      title: 'Prompt Engineering & Evaluation Lab',
      date: '2026-09-22',
      eventType: 'Workshop',
      format: 'Virtual',
      registeredCount: 46,
      attendedCount: 37,
      capacity: 60,
      recordedByName: 'Aisha Rahman',
      notes: 'Hands-on evaluation rubric exercise.',
    },
    {
      recordId: 'attrec-ai-f3',
      clubId: 'club-ai',
      semester: 'Fall 2026',
      title: 'Industry Alumni Career Mixer',
      date: '2026-10-06',
      eventType: 'Networking',
      format: 'Hybrid',
      registeredCount: 54,
      attendedCount: 44,
      capacity: 65,
      recordedByName: 'Devon Brooks',
      notes: '24 in-person at 119 W 31st St + 20 on Zoom.',
    },
    {
      recordId: 'attrec-ai-f4',
      clubId: 'club-ai',
      semester: 'Fall 2026',
      title: 'October General Body Meeting',
      date: '2026-10-15',
      eventType: 'Club Meeting',
      format: 'Virtual',
      registeredCount: 41,
      attendedCount: 34,
      capacity: 60,
      recordedByName: 'Aisha Rahman',
    },
    {
      recordId: 'attrec-ai-f5',
      clubId: 'club-ai',
      semester: 'Fall 2026',
      title: 'RAG Architecture & Ethics Deep Dive',
      date: '2026-10-27',
      eventType: 'Workshop',
      format: 'Virtual',
      registeredCount: 64,
      attendedCount: 53,
      capacity: 75,
      recordedByName: 'Devon Brooks',
      notes: '24h email reminders boosted live check-in conversion to 82.8%.',
    },
    {
      recordId: 'attrec-ai-f6',
      clubId: 'club-ai',
      semester: 'Fall 2026',
      title: 'CUNY Cross-Campus AI Ethics Panel',
      date: '2026-11-05',
      eventType: 'Campus Event',
      format: 'Hybrid',
      registeredCount: 78,
      attendedCount: 66,
      capacity: 85,
      recordedByName: 'Aisha Rahman',
      notes: 'Joint campus showcase with Student Life leadership.',
    },
    {
      recordId: 'attrec-ai-f7',
      clubId: 'club-ai',
      semester: 'Fall 2026',
      title: 'Civic Tech Prototyping Sprint Kickoff',
      date: '2026-11-12',
      eventType: 'Workshop',
      format: 'Virtual',
      registeredCount: 70,
      attendedCount: 61,
      capacity: 80,
      recordedByName: 'Aisha Rahman',
    },
    // Artificial Intelligence Club — Spring 2026 baseline
    {
      recordId: 'attrec-ai-s1',
      clubId: 'club-ai',
      semester: 'Spring 2026',
      title: 'Spring Kickoff & Roadmap Town Hall',
      date: '2026-02-10',
      eventType: 'Club Meeting',
      format: 'Virtual',
      registeredCount: 32,
      attendedCount: 24,
      capacity: 50,
      recordedByName: 'Aisha Rahman',
    },
    {
      recordId: 'attrec-ai-s2',
      clubId: 'club-ai',
      semester: 'Spring 2026',
      title: 'Intro to Python & APIs Workshop',
      date: '2026-03-04',
      eventType: 'Workshop',
      format: 'Virtual',
      registeredCount: 44,
      attendedCount: 35,
      capacity: 50,
      recordedByName: 'Aisha Rahman',
    },
    {
      recordId: 'attrec-ai-s3',
      clubId: 'club-ai',
      semester: 'Spring 2026',
      title: 'Spring Career & Internship Roundtable',
      date: '2026-04-08',
      eventType: 'Networking',
      format: 'Hybrid',
      registeredCount: 49,
      attendedCount: 39,
      capacity: 60,
      recordedByName: 'Devon Brooks',
    },
    {
      recordId: 'attrec-ai-s4',
      clubId: 'club-ai',
      semester: 'Spring 2026',
      title: 'End-of-Term Student Demo Day',
      date: '2026-05-06',
      eventType: 'Campus Event',
      format: 'Hybrid',
      registeredCount: 58,
      attendedCount: 48,
      capacity: 70,
      recordedByName: 'Aisha Rahman',
    },

    // Muslim Student Association (MSA) — Fall 2026 & Spring 2026
    {
      recordId: 'attrec-msa-f1',
      clubId: 'club-msa',
      semester: 'Fall 2026',
      title: 'MSA Fall Welcome & Chai Social',
      date: '2026-09-15',
      eventType: 'Club Meeting',
      format: 'Hybrid',
      registeredCount: 42,
      attendedCount: 36,
      capacity: 55,
      recordedByName: 'Zainab Siddiqui',
    },
    {
      recordId: 'attrec-msa-f2',
      clubId: 'club-msa',
      semester: 'Fall 2026',
      title: 'Interfaith Dialogue & Campus Belonging Panel',
      date: '2026-10-08',
      eventType: 'Campus Event',
      format: 'Hybrid',
      registeredCount: 58,
      attendedCount: 49,
      capacity: 70,
      recordedByName: 'Zainab Siddiqui',
    },
    {
      recordId: 'attrec-msa-f3',
      clubId: 'club-msa',
      semester: 'Fall 2026',
      title: 'Community Service Pack-a-Care Kit Drive',
      date: '2026-10-28',
      eventType: 'Workshop',
      format: 'In-Person',
      registeredCount: 45,
      attendedCount: 41,
      capacity: 50,
      recordedByName: 'Zainab Siddiqui',
    },
    {
      recordId: 'attrec-msa-s1',
      clubId: 'club-msa',
      semester: 'Spring 2026',
      title: 'Spring Community Iftar & Reflection Night',
      date: '2026-03-18',
      eventType: 'Campus Event',
      format: 'Hybrid',
      registeredCount: 68,
      attendedCount: 62,
      capacity: 75,
      recordedByName: 'Zainab Siddiqui',
    },
  ];
}

function createInitialForumThreads(): ForumThread[] {
  return [
    {
      threadId: 'thr-1',
      clubId: 'club-ai',
      category: 'Question',
      title: 'Will Thursday’s AI Club Meeting slides & recording be shared for online students?',
      body: 'Several B.S. in Information Systems students have overlapping evening courses on Thursday. Can we share a summary deck and recording link in our Zoom recap after the session?',
      authorId: 'usr-viewer-ai',
      authorName: 'Prof. Jordan Reyes',
      authorRoleLabel: 'Faculty Advisor',
      pinned: true,
      resolved: true,
      subscriberUserIds: ['usr-viewer-ai', 'usr-lead-ai', 'usr-editor-ai'],
      createdAt: '2026-11-12T15:10:00.000Z',
      updatedAt: '2026-11-13T10:20:00.000Z',
      replies: [
        {
          replyId: 'rep-101',
          threadId: 'thr-1',
          authorId: 'usr-lead-ai',
          authorName: 'Aisha Rahman',
          authorRoleLabel: 'President',
          body: 'Yes! We will record the first 30-minute project framing demo and post the captioned video plus slide PDF link in our Friday follow-up thread.',
          createdAt: '2026-11-12T18:05:00.000Z',
        },
        {
          replyId: 'rep-102',
          threadId: 'thr-1',
          authorId: 'usr-editor-ai',
          authorName: 'Devon Brooks',
          authorRoleLabel: 'Social Media Chair',
          body: 'Confirmed—I also added captions and alt-text verification to our Instagram carousel draft so asynchronous students get the full summary.',
          createdAt: '2026-11-13T10:20:00.000Z',
        },
      ],
    },
    {
      threadId: 'thr-2',
      clubId: 'club-ai',
      category: 'Resource Share',
      title: 'Starter Reading List: Responsible AI & Prompt Evaluation Benchmarks',
      body: 'Compiled a quick starter list of open-access papers and NIST AI Risk Management Framework links for members joining this semester’s Civic Tech tracks.',
      authorId: 'usr-contrib-ai',
      authorName: 'Sofia Patel',
      authorRoleLabel: 'Secretary',
      pinned: false,
      resolved: false,
      subscriberUserIds: ['usr-contrib-ai', 'usr-lead-ai'],
      createdAt: '2026-11-11T14:00:00.000Z',
      updatedAt: '2026-11-11T19:45:00.000Z',
      replies: [
        {
          replyId: 'rep-103',
          threadId: 'thr-2',
          authorId: 'usr-lead-ai',
          authorName: 'Aisha Rahman',
          authorRoleLabel: 'President',
          body: 'Thanks Sofia! Adding this to our onboarding packet for incoming spring members.',
          createdAt: '2026-11-11T19:45:00.000Z',
        },
      ],
    },
    {
      threadId: 'thr-3',
      clubId: 'club-ai',
      category: 'Event Ideas',
      title: 'Topic Requests for the Dec 8 Finals Week Study & Project Showcase Jam',
      body: 'Reply below if there are specific coursework topics, Git workflows, or portfolio walkthroughs you would like mentors to cover during the meeting. @Devon Brooks can we feature 2 student demos?',
      authorId: 'usr-editor-ai',
      authorName: 'Devon Brooks',
      authorRoleLabel: 'Social Media Chair',
      pinned: false,
      resolved: false,
      subscriberUserIds: ['usr-editor-ai', 'usr-lead-ai'],
      mentionedUserIds: ['usr-editor-ai'],
      createdAt: '2026-11-13T12:15:00.000Z',
      updatedAt: '2026-11-13T12:15:00.000Z',
      replies: [],
    },
    {
      threadId: 'thr-4',
      clubId: 'club-msa',
      category: 'Event Ideas',
      title: 'Winter Community Coat Drive & Finals Tea Circle Topics',
      body: 'Sharing ideas for our upcoming community tea circle and partner drop-off boxes with Student Life before finals begin.',
      authorId: 'usr-lead-msa',
      authorName: 'Zainab Siddiqui',
      authorRoleLabel: 'President',
      pinned: true,
      resolved: false,
      subscriberUserIds: ['usr-lead-msa', 'usr-lead-ai'],
      createdAt: '2026-11-12T09:30:00.000Z',
      updatedAt: '2026-11-12T09:30:00.000Z',
      replies: [],
    },
  ];
}

function createInitialJoinRequests(): ClubJoinRequest[] {
  return [
    {
      joinRequestId: 'jr-101',
      clubId: 'club-ai',
      clubName: 'Artificial Intelligence Club',
      clubShortCode: 'AI-CLUB',
      userId: 'usr-candidate-ai',
      studentName: 'Noah Kim',
      studentEmail: 'noah.kim@spsmail.cuny.edu',
      departmentOrMajor: 'B.S. in Information Systems',
      reason:
        'Interested in joining the Spring 2027 civic tech prototyping track and supporting student software workshops.',
      preferredInterest: 'Events Coordinator / Co-Chair Elect',
      status: 'Pending',
      createdAt: '2026-11-12T17:15:00.000Z',
    },
  ];
}

function createInitialOfficerTransitions(): OfficerTransitionChecklist[] {
  return [
    {
      transitionId: 'trn-club-ai-2027',
      clubId: 'club-ai',
      fromSemester: 'Fall 2026',
      toSemester: 'Spring 2027',
      targetEffectiveDate: '2027-01-15',
      status: 'In Progress',
      requiresAdvisorSignOff: true,
      updatedAt: '2026-11-13T10:00:00.000Z',
      checklistItems: [
        {
          itemId: 'chk-1',
          label: 'Confirm incoming President, Secretary, and Treasurer eligibility with Office of Student Life',
          completed: true,
          completedBy: 'Aisha Rahman',
          completedAt: '2026-11-10T14:00:00.000Z',
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
    },
    {
      transitionId: 'trn-club-msa-2027',
      clubId: 'club-msa',
      fromSemester: 'Fall 2026',
      toSemester: 'Spring 2027',
      targetEffectiveDate: '2027-01-15',
      status: 'In Progress',
      requiresAdvisorSignOff: true,
      updatedAt: '2026-11-13T09:00:00.000Z',
      checklistItems: [
        {
          itemId: 'chk-1',
          label: 'Confirm incoming President, Secretary, and Treasurer eligibility with Office of Student Life',
          completed: true,
          completedBy: 'Zainab Siddiqui',
          completedAt: '2026-11-11T12:00:00.000Z',
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
    },
  ];
}

function createInitialResourceSubmissions(): ResourceSubmission[] {
  return [
    {
      submissionId: 'SUB-2026-101',
      clubId: 'club-ai',
      clubName: 'Artificial Intelligence Club',
      clubShortCode: 'AI-CLUB',
      type: 'Event Proposal',
      title: 'AI Club Meeting — Venue & Hybrid Captioning Packet',
      summary: 'Co-sponsored Hybrid (Zoom + 119 W 31st St) · 2026-11-19 at 18:30 ET · Est. $95.00 (60% AI-CLUB / 40% WSTEM)',
      amountUsd: 95,
      eventDate: '2026-11-19',
      coSponsorClubIds: ['club-women-stem'],
      budgetSplits: [
        { clubId: 'club-ai', clubShortCode: 'AI-CLUB', sharePct: 60 },
        { clubId: 'club-women-stem', clubShortCode: 'WSTEM', sharePct: 40 },
      ],
      offCampusVenue: false,
      requiresAdvisorSignOff: false,
      payload: {
        eventFormat: 'Hybrid',
        expectedAttendance: '45',
        fundingSource: 'Student Activity Fee Allocation',
      },
      status: 'Approved',
      submittedByUserId: 'usr-lead-ai',
      submittedByName: 'Aisha Rahman',
      submittedByEmail: 'aisha.rahman@spsmail.cuny.edu',
      submittedAt: '2026-11-04T15:20:00.000Z',
      updatedAt: '2026-11-06T11:10:00.000Z',
      reviewedByName: 'Dr. Elena Vance',
      reviewedAt: '2026-11-06T11:10:00.000Z',
      reviewNotes: 'Approved by Office of Student Life; co-sponsorship split recorded.',
    },
    {
      submissionId: 'SUB-2026-102',
      clubId: 'club-msa',
      clubName: 'Muslim Student Association (MSA)',
      clubShortCode: 'MSA',
      type: 'Financial Reimbursement',
      title: 'Community Tea & Study Circle Refreshments & Printed Flyers',
      summary: '2 receipt line items · Total $72.40 · Event 2026-11-18',
      amountUsd: 72.4,
      eventDate: '2026-11-18',
      payload: {
        approvedProposalId: 'EVT-2026-038',
        payeeName: 'Zainab Siddiqui',
      },
      status: 'Approved',
      submittedByUserId: 'usr-lead-msa',
      submittedByName: 'Zainab Siddiqui',
      submittedByEmail: 'zainab.siddiqui@spsmail.cuny.edu',
      submittedAt: '2026-11-12T18:00:00.000Z',
      updatedAt: '2026-11-13T10:15:00.000Z',
      reviewedByName: 'Marcus Sterling',
      reviewedAt: '2026-11-13T10:15:00.000Z',
      reviewNotes: 'Receipts verified against Student Activity Fee allocation.',
    },
    {
      submissionId: 'SUB-2026-103',
      clubId: 'club-ai',
      clubName: 'Artificial Intelligence Club',
      clubShortCode: 'AI-CLUB',
      type: 'Event Proposal',
      title: 'NYC Civic AI Off-Campus Museum & Policy Field Symposium',
      summary: 'Off-Campus Partner Site (Civic Hall NYC) · 2026-12-10 · Est. $420.00 (High-Budget Advisor Co-Sign Required)',
      amountUsd: 420,
      eventDate: '2026-12-10',
      offCampusVenue: true,
      requiresAdvisorSignOff: true,
      payload: {
        eventFormat: 'In-Person',
        expectedAttendance: '35',
        fundingSource: 'Student Activity Fee Allocation',
      },
      status: 'Submitted',
      submittedByUserId: 'usr-lead-ai',
      submittedByName: 'Aisha Rahman',
      submittedByEmail: 'aisha.rahman@spsmail.cuny.edu',
      submittedAt: '2026-11-13T16:30:00.000Z',
      updatedAt: '2026-11-13T16:30:00.000Z',
    },
  ];
}

function createInitialReshareRequests(): CrossClubReshareRequest[] {
  return [
    {
      requestId: 'rsh-101',
      sourceClubId: 'club-ai',
      sourceClubName: 'Artificial Intelligence Club',
      sourceClubShortCode: 'AI-CLUB',
      targetClubId: 'club-msa',
      targetClubName: 'Muslim Student Association (MSA)',
      targetClubShortCode: 'MSA',
      sourcePostId: 'post-ai-101',
      sourcePostTitle: 'AI Club Meeting',
      sourceCaption:
        'Join the Artificial Intelligence Club this Thursday at 6:30 PM ET for our AI Club Meeting. Collaborate with fellow students on responsible AI prototypes, governance workflows, and full-stack demos.',
      requestedByUserId: 'usr-editor-ai',
      requestedByName: 'Devon Brooks',
      note: 'Open campus tech night—would Muslim Student Association (MSA) like to cross-post to your student community?',
      status: 'Pending',
      createdAt: '2026-11-13T15:30:00.000Z',
    },
  ];
}

function createInitialSmtpConfig(): StoredSmtpConfig {
  return {
    host: process.env.SMTP_HOST?.trim() || '',
    port: Number(process.env.SMTP_PORT || '587'),
    secure: Number(process.env.SMTP_PORT || '587') === 465,
    authUser: process.env.SMTP_USER?.trim() || '',
    authPass: process.env.SMTP_PASS?.trim() || '',
    fromAddress:
      process.env.SMTP_FROM?.trim() ||
      'CUNY SPS Club Social Hub <studentlife-noreply@sps.cuny.edu>',
    appUrl: process.env.APP_URL?.trim() || 'https://sps.cuny.edu/student-life',
    providerLabel: process.env.SMTP_HOST?.trim()
      ? 'Configured SMTP Relay'
      : 'Institutional Notification Outbox (Ready for SMTP Relay)',
    webhookSecret: 'cuny-sps-mail-webhook-dev',
    updatedAt: '2026-11-13T12:00:00.000Z',
    updatedByName: 'Dr. Elena Vance',
  };
}

function createInitialAnnouncements(): ClubAnnouncement[] {
  return [
    {
      announcementId: 'ann-1',
      title: 'Spring 2027 Officer Transition & Re-Registration Deadline (Dec 4)',
      message:
        'All student clubs with graduating leaders must submit incoming Club Lead verification forms and confirm institutional custodian continuity before December 4, 2026 to avoid social publishing interruptions.',
      priority: 'Critical',
      pinned: true,
      audience: 'All Recognized Student Clubs',
      expiresAt: '2026-12-04',
      postedByUserId: 'usr-sl-super',
      postedByName: 'Dr. Elena Vance',
      postedByTitle: 'Director of Student Life',
      createdAt: '2026-11-13T16:00:00.000Z',
      updatedAt: '2026-11-13T16:00:00.000Z',
    },
    {
      announcementId: 'ann-2',
      title: 'Updated FY27 Event Proposal & Financial Reimbursement Forms Released',
      message:
        'Version 2026.2 of the CUNY SPS branding SVG lockups, guest speaker co-sponsorship templates, and Student Life financial reimbursement vouchers are now available in Club Resources.',
      priority: 'Important',
      pinned: true,
      audience: 'All Club Treasurers & Event Leads',
      expiresAt: '2026-12-18',
      postedByUserId: 'usr-sl-scoped',
      postedByName: 'Marcus Sterling',
      postedByTitle: 'Student Life Coordinator',
      createdAt: '2026-11-12T14:30:00.000Z',
      updatedAt: '2026-11-12T14:30:00.000Z',
    },
    {
      announcementId: 'ann-3',
      title: '90-Day Official Social Platform OAuth Token Audit',
      message:
        'Club Leads and Social Media Chairs should review their My Social Accounts connection health weekly and notify the designated staff custodian whenever a Meta token approaches expiration.',
      priority: 'General',
      pinned: false,
      audience: 'All Active Clubs',
      postedByUserId: 'usr-sl-super',
      postedByName: 'Dr. Elena Vance',
      postedByTitle: 'Director of Student Life',
      createdAt: '2026-11-09T11:00:00.000Z',
      updatedAt: '2026-11-09T11:00:00.000Z',
    },
  ];
}

function createInitialBudgetIncreaseRequests(): BudgetIncreaseRequest[] {
  return [
    {
      requestId: 'BGT-2026-101',
      clubId: 'club-ai',
      clubName: 'Artificial Intelligence Club',
      clubShortCode: 'AI-CLUB',
      currentAllocatedUsd: 500,
      requestedAdditionalUsd: 2000,
      proposedTotalUsd: 2500,
      eventOrInitiativeTitle: 'Spring 2027 CUNY SPS AI Gala & Industry Keynote',
      fundingBreakdown: 'Catering & Refreshments ($1,150) · Guest Speaker Fees & Travel ($850)',
      reason:
        'Artificial Intelligence Club needs $2,000 in additional funding beyond our $500 baseline allocation to cover catering and keynote speaker fees for our flagship AI Gala event serving 120+ CUNY SPS students, alumni, and faculty.',
      expectedAttendance: 120,
      eventDate: '2027-04-15',
      status: 'Pending',
      submittedByUserId: 'usr-lead-ai',
      submittedByName: 'Aisha Rahman',
      submittedByEmail: 'aisha.rahman@sps.cuny.edu',
      submittedAt: '2026-11-13T16:45:00.000Z',
      updatedAt: '2026-11-13T16:45:00.000Z',
    },
  ];
}

function createInitialClubBroadcasts(): ClubBroadcastMessage[] {
  const aiInvite = 'https://chat.whatsapp.com/LiEAv8DRlII7pMqN60PGj6';
  const aiShareText =
    '[Artificial Intelligence Club — Broadcast]\n*AI Club Meeting — Logistics & Project Teams*\n\nHi everyone! Join us Thursday, Nov 19 at 6:30 PM ET (119 W 31st St Room 402 + Zoom). Reply right here in our workspace if you need a demo slot or team match!';
  const msaInvite = 'https://chat.whatsapp.com/F8DqIiNLEv27IY9vXE09UZ';
  const msaShareText =
    '[Muslim Student Association (MSA) — Broadcast]\n*MSA Community Tea & Study Circle — Room & Dietary Notes*\n\nAs-salamu alaykum! Our Wed Nov 18 tea & study circle starts at 5:30 PM ET in the Student Lounge + Zoom. Reply here with tea/snack preferences or study topics!';

  return [
    {
      broadcastId: 'bcast-ai-101',
      clubId: 'club-ai',
      clubName: 'Artificial Intelligence Club',
      clubShortCode: 'AI-CLUB',
      title: 'AI Club Meeting — Logistics & Project Teams',
      body: 'Hi everyone! We are excited for Thursday, Nov 19 at 6:30 PM ET (119 W 31st St Room 402 + Zoom). Bring your laptop for lightning demos, and reply directly below in our AI Club workspace if you want to present a 5-minute prototype or join a team!',
      channel: 'both',
      priority: 'Important',
      pinned: true,
      allowMemberReplies: true,
      recipientCount: 4,
      whatsappGroupId: 'wa-grp-ai-community',
      whatsappGroupName: 'AI Club General Community',
      whatsappInviteLink: aiInvite,
      whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(aiShareText)}`,
      senderUserId: 'usr-lead-ai',
      senderName: 'Aisha Rahman',
      senderRoleLabel: 'President',
      replies: [
        {
          replyId: 'brep-101',
          authorUserId: 'usr-contrib-ai',
          authorName: 'Sofia Patel',
          authorEmail: 'sofia.patel@spsmail.cuny.edu',
          authorRoleLabel: 'Secretary',
          body: 'I can bring printed sign-in QR sheets and help pair new members into civic-tech breakout tables!',
          createdAt: '2026-11-13T17:15:00.000Z',
        },
        {
          replyId: 'brep-102',
          authorUserId: 'usr-editor-ai',
          authorName: 'Devon Brooks',
          authorEmail: 'devon.brooks@spsmail.cuny.edu',
          authorRoleLabel: 'Social Media Chair',
          body: 'Slides & Zoom waiting room checklist are ready—feel free to drop demo repo links here ahead of 6:15 PM.',
          createdAt: '2026-11-13T17:40:00.000Z',
        },
      ],
      createdAt: '2026-11-13T16:55:00.000Z',
      updatedAt: '2026-11-13T17:40:00.000Z',
    },
    {
      broadcastId: 'bcast-msa-201',
      clubId: 'club-msa',
      clubName: 'Muslim Student Association (MSA)',
      clubShortCode: 'MSA',
      title: 'MSA Community Tea & Study Circle — Room & Dietary Notes',
      body: 'As-salamu alaykum! Our Wednesday, Nov 18 Community Tea & Study Circle starts at 5:30 PM ET in the 119 W 31st St Student Lounge and via Zoom. Reply right here in the MSA workspace with any tea/snack preferences or finals study topics you would like covered.',
      channel: 'both',
      priority: 'Standard',
      pinned: true,
      allowMemberReplies: true,
      recipientCount: 2,
      whatsappGroupId: 'wa-grp-msa-community',
      whatsappGroupName: 'Muslim Student Association (MSA) Alerts & Community',
      whatsappInviteLink: msaInvite,
      whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(msaShareText)}`,
      senderUserId: 'usr-lead-msa',
      senderName: 'Zainab Siddiqui',
      senderRoleLabel: 'President',
      replies: [],
      createdAt: '2026-11-12T19:15:00.000Z',
      updatedAt: '2026-11-12T19:15:00.000Z',
    },
  ];
}

function createCatalogClubs(): Club[] {
  return [
    {
      clubId: 'club-anime',
      name: 'Anime Club',
      shortCode: 'ANIME',
      description:
        'A welcoming, inclusive community where CUNY SPS students connect over anime, manga, watch parties, and creative fandom discussions.',
      category: 'Arts, Media & Creative',
      status: 'Active',
      facultyAdvisor: 'Prof. Kenji Takahashi',
      onboardedAt: '2026-11-01T12:00:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-ai',
      name: 'Artificial Intelligence Club',
      shortCode: 'AI-CLUB',
      description:
        'Student-led organization dedicated to helping CUNY SPS students of all backgrounds explore artificial intelligence, hands-on technical projects, and ethical innovation.',
      category: 'Academic & Technology',
      status: 'Active',
      facultyAdvisor: 'Prof. Jordan Reyes',
      onboardedAt: '2026-10-15T14:00:00.000Z',
      upcomingLeadershipChange: 'Spring 2027 Co-Chair transition scheduled (Noah Kim)',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-arts-crafts',
      name: 'Arts and Crafts Club',
      shortCode: 'CRAFTS',
      description:
        'Creative community for DIY workshops, sketching, fiber arts, digital illustration, and stress-relief craft socials.',
      category: 'Arts, Media & Creative',
      status: 'Active',
      facultyAdvisor: 'Prof. Claire Bennett',
      onboardedAt: '2026-11-01T12:05:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-bsu',
      name: 'Black Student Union',
      shortCode: 'BSU',
      description:
        'Empowering Black and African diaspora students at CUNY SPS through leadership development, cultural celebration, mentorship, and advocacy.',
      category: 'Identity, Faith & Cultural',
      status: 'Active',
      facultyAdvisor: 'Dr. Monique Carter',
      onboardedAt: '2026-11-01T12:10:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-book',
      name: 'Book Club',
      shortCode: 'BOOK',
      description:
        'Monthly virtual and hybrid reading discussions spanning contemporary fiction, memoirs, social sciences, and student recommendations.',
      category: 'Arts, Media & Creative',
      status: 'Active',
      facultyAdvisor: 'Prof. Miriam Weiss',
      onboardedAt: '2026-11-01T12:15:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-christian-fellowship',
      name: 'Christian Fellowship Club',
      shortCode: 'CFC',
      description:
        'Fellowship, spiritual reflection, community service, and supportive dialogue welcoming CUNY SPS students of all backgrounds.',
      category: 'Identity, Faith & Cultural',
      status: 'Active',
      facultyAdvisor: 'Prof. Grace Okafor',
      onboardedAt: '2026-11-01T12:20:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-cosplay',
      name: 'Cosplay Club',
      shortCode: 'COSPLAY',
      description:
        'Design, prop fabrication, character costume craftsmanship, and convention community meetups for CUNY SPS creators.',
      category: 'Arts, Media & Creative',
      status: 'Active',
      facultyAdvisor: 'Prof. Kenji Takahashi',
      onboardedAt: '2026-11-01T12:25:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-creative-writing',
      name: 'Creative Writing Club',
      shortCode: 'CWC',
      description:
        'Peer critique circles, poetry slams, short-story prompts, and literary publishing workshops for aspiring writers.',
      category: 'Arts, Media & Creative',
      status: 'Active',
      facultyAdvisor: 'Prof. Daniel Alvarez',
      onboardedAt: '2026-11-01T12:30:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-delta-alpha-pi',
      name: 'Delta Alpha Pi Honor Society',
      shortCode: 'DAPi',
      description:
        'International honor society recognizing high-achieving college students with disabilities while advancing leadership and campus accessibility.',
      category: 'Honor Societies',
      status: 'Active',
      facultyAdvisor: 'Dr. Rachel Goldman',
      onboardedAt: '2026-11-01T12:35:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-disability-access',
      name: 'Disability and Access Coalition',
      shortCode: 'DAC',
      description:
        'Student advocacy group championing universal design, assistive technology awareness, and inclusive student experiences at CUNY SPS.',
      category: 'Advocacy & Community',
      status: 'Active',
      facultyAdvisor: 'Dr. Rachel Goldman',
      onboardedAt: '2026-11-01T12:40:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-film-tv',
      name: 'Film & Television Club',
      shortCode: 'FILM',
      description:
        'Screenings, cinematography breakdowns, screenwriting discussions, and media criticism for cinema and television enthusiasts.',
      category: 'Arts, Media & Creative',
      status: 'Active',
      facultyAdvisor: 'Prof. Marcus Vance',
      onboardedAt: '2026-11-01T12:45:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-green',
      name: 'Green Club',
      shortCode: 'GREEN',
      description:
        'Environmental sustainability, climate literacy, urban ecology initiatives, and NYC green-space volunteer events.',
      category: 'Advocacy & Community',
      status: 'Active',
      facultyAdvisor: 'Dr. Naomi Park',
      onboardedAt: '2026-11-01T12:50:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-hian',
      name: 'Health Information and Administration Network (HIAN) Leadership',
      shortCode: 'HIAN',
      description:
        'Professional network connecting Health Information Management and Health Services Administration students with healthcare leaders.',
      category: 'Academic & Professional',
      status: 'Active',
      facultyAdvisor: 'Dr. Priya Nair',
      onboardedAt: '2026-11-01T12:55:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-human-relations-soc',
      name: 'Human Relations and Sociology Club',
      shortCode: 'HRSC',
      description:
        'Exploring organizational dynamics, social research, workplace equity, and community sociology through panels and peer exchange.',
      category: 'Academic & Professional',
      status: 'Active',
      facultyAdvisor: 'Dr. Elena Morales',
      onboardedAt: '2026-11-01T13:00:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-latinx',
      name: 'Latinx Student Union',
      shortCode: 'LSU',
      description:
        'Celebrating Latinx heritage, academic persistence, cultural programming, and community solidarity across CUNY SPS.',
      category: 'Identity, Faith & Cultural',
      status: 'Active',
      facultyAdvisor: 'Prof. Sofia Mendoza',
      onboardedAt: '2026-11-01T13:05:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-makeup-beauty',
      name: 'Makeup and Beauty Club',
      shortCode: 'MBC',
      description:
        'Creative expression, skincare education, artistry tutorials, and inclusive beauty industry conversations.',
      category: 'Social & Special Interest',
      status: 'Active',
      facultyAdvisor: 'Prof. Claire Bennett',
      onboardedAt: '2026-11-01T13:10:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-melo',
      name: 'Management and Entrepreneur Leadership Organization (MELO)',
      shortCode: 'MELO',
      description:
        'Business strategy, startup pitch nights, executive leadership workshops, and alumni mentorship for management students.',
      category: 'Academic & Professional',
      status: 'Active',
      facultyAdvisor: 'Prof. Samuel Ortiz',
      onboardedAt: '2026-11-01T13:15:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-mental-health',
      name: 'Mental Health Club',
      shortCode: 'MHC',
      description:
        'Destigmatizing mental wellness, mindfulness workshops, and peer support programming tailored for online and adult learners.',
      category: 'Wellness & Peer Support',
      status: 'Active',
      facultyAdvisor: 'Dr. Hannah Morales',
      onboardedAt: '2026-11-01T13:20:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-museum-studies',
      name: 'Museum Studies Club',
      shortCode: 'MSC',
      description:
        'Curatorial dialogue, museum accessibility, archival preservation, and cultural institution tours across New York City.',
      category: 'Academic & Professional',
      status: 'Active',
      facultyAdvisor: 'Dr. Arthur Pendelton',
      onboardedAt: '2026-11-01T13:25:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-msa',
      name: 'Muslim Student Association (MSA)',
      shortCode: 'MSA',
      description:
        'CUNY SPS Muslim Student Association fostering spiritual fellowship, cultural dialogue, community service, and inclusive campus events for Muslim students and allies.',
      category: 'Identity, Faith & Cultural',
      status: 'Active',
      facultyAdvisor: 'Prof. Tariq Siddiqui',
      onboardedAt: '2026-10-22T15:30:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-neurodiversity',
      name: 'Neurodiversity Club',
      shortCode: 'NEURO',
      description:
        'Peer community celebrating neurodivergent learners through sensory-friendly study spaces, executive-function tools, and advocacy.',
      category: 'Wellness & Peer Support',
      status: 'Active',
      facultyAdvisor: 'Dr. Rachel Goldman',
      onboardedAt: '2026-11-01T13:30:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-parent',
      name: 'Parent Club',
      shortCode: 'PARENT',
      description:
        'Supporting parenting students and family caregivers at CUNY SPS with peer resource sharing, family-friendly meetups, and advocacy.',
      category: 'Advocacy & Community',
      status: 'Active',
      facultyAdvisor: 'Prof. Carla Rivera',
      onboardedAt: '2026-11-01T13:35:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-photography',
      name: 'Photography Club',
      shortCode: 'PHOTO',
      description:
        'Visual storytelling, photo walks across NYC, lighting critiques, and digital editing workshops for all experience levels.',
      category: 'Arts, Media & Creative',
      status: 'Active',
      facultyAdvisor: 'Prof. Marcus Vance',
      onboardedAt: '2026-11-01T13:40:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-pride',
      name: 'Pride Club',
      shortCode: 'PRIDE',
      description:
        'LGBTQIA+ student community promoting belonging, campus education, intersectional solidarity, and celebratory pride programming.',
      category: 'Identity, Faith & Cultural',
      status: 'Active',
      facultyAdvisor: 'Prof. Jordan Reyes',
      onboardedAt: '2026-11-01T13:45:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-psychology',
      name: 'Psychology Club',
      shortCode: 'PSYCH',
      description:
        'Academic colloquia, graduate school preparation, behavioral research spotlights, and community mental health initiatives.',
      category: 'Academic & Professional',
      status: 'Active',
      facultyAdvisor: 'Dr. Hannah Morales',
      onboardedAt: '2026-11-01T13:50:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-retail-therapy',
      name: 'Retail Therapy Roundtable Club',
      shortCode: 'RTRC',
      description:
        'Exploring consumer trends, merchandising, e-commerce strategy, and personal style in relaxed roundtable conversations.',
      category: 'Social & Special Interest',
      status: 'Active',
      facultyAdvisor: 'Prof. Samuel Ortiz',
      onboardedAt: '2026-11-01T13:55:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-shrm',
      name: 'SHRM Student Chapter',
      shortCode: 'SHRM',
      description:
        'Society for Human Resource Management student chapter offering HR certification prep, talent strategy panels, and career networking.',
      category: 'Academic & Professional',
      status: 'Active',
      facultyAdvisor: 'Dr. Elena Morales',
      onboardedAt: '2026-11-01T14:00:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-sigma-beta-delta',
      name: 'Sigma Beta Delta Honor Society',
      shortCode: 'SBD',
      description:
        'International honor society recognizing academic excellence among undergraduate and graduate business, management, and administration students.',
      category: 'Honor Societies',
      status: 'Active',
      facultyAdvisor: 'Prof. Samuel Ortiz',
      onboardedAt: '2026-11-01T14:05:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-social-impact',
      name: 'Social Impact & Activism Club',
      shortCode: 'SIAC',
      description:
        'Driving civic awareness, housing and disability justice dialogue, environmental advocacy, and changemaker workshops across CUNY.',
      category: 'Advocacy & Community',
      status: 'Active',
      facultyAdvisor: 'Dr. Naomi Park',
      onboardedAt: '2026-11-01T14:10:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-sasu',
      name: 'South Asian Student Union',
      shortCode: 'SASU',
      description:
        'Building community among South Asian students and allies through cultural showcases, chai chats, and peer mentorship.',
      category: 'Identity, Faith & Cultural',
      status: 'Active',
      facultyAdvisor: 'Dr. Priya Nair',
      onboardedAt: '2026-11-01T14:15:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-svo',
      name: 'Student Veterans Organization',
      shortCode: 'SVO',
      description:
        'Peer support, academic transition resources, career advocacy, and camaraderie for military-connected and veteran CUNY SPS students.',
      category: 'Advocacy & Community',
      status: 'Active',
      facultyAdvisor: 'Prof. Samuel Ortiz',
      onboardedAt: '2026-11-01T14:20:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-study-lounge',
      name: 'Study Lounge Club',
      shortCode: 'LOUNGE',
      description:
        'Co-working Pomodoro sessions, finals accountability circles, and cross-major peer study meetups for online students.',
      category: 'Social & Special Interest',
      status: 'Active',
      facultyAdvisor: 'Prof. Miriam Weiss',
      onboardedAt: '2026-11-01T14:25:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-women-stem',
      name: 'Women in STEM Club',
      shortCode: 'WSTEM',
      description:
        'Advancing women and non-binary scholars in computing, data, health informatics, and quantitative sciences via mentorship and build nights.',
      category: 'Academic & Technology',
      status: 'Active',
      facultyAdvisor: 'Dr. Priya Nair',
      onboardedAt: '2026-11-01T14:30:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
    {
      clubId: 'club-youth-studies',
      name: 'Youth Studies Club',
      shortCode: 'YSC',
      description:
        'Connecting Youth Studies and Education scholars around youth advocacy, community programming, and research colloquia.',
      category: 'Academic & Professional',
      status: 'Active',
      facultyAdvisor: 'Prof. Carla Rivera',
      onboardedAt: '2026-11-01T14:35:00.000Z',
      semesterBudgetAllocatedUsd: 500,
    },
  ];
}

function createInitialDatabase(): HubDatabase {
  const users: User[] = [
    {
      userId: 'usr-sl-super',
      name: 'Dr. Elena Vance',
      email: 'elena.vance@sps.cuny.edu',
      identitySubject: 'cuny-sso|evance-001',
      title: 'Director of Student Life',
      departmentOrMajor: 'Office of Student Life',
      systemRole: 'SL_SUPER_ADMIN',
      status: 'Active',
      lastLoginAt: '2026-11-13T18:10:00.000Z',
    },
    {
      userId: 'usr-sa-parsh',
      name: 'Parshotam Lal (Parsh)',
      email: 'Parshotam.Lal@cuny.edu',
      identitySubject: 'cuny-sso|parsh-003',
      title: 'Student Association Co-Chair / Platform Admin',
      departmentOrMajor: 'Student Association Executive Board',
      systemRole: 'SL_SUPER_ADMIN',
      status: 'Active',
      lastLoginAt: '2026-11-28T10:00:00.000Z',
    },
    {
      userId: 'usr-sl-anthony',
      name: 'Anthony Sweeney',
      email: 'anthony.sweeney@cuny.edu',
      identitySubject: 'cuny-sso|anthony-004',
      title: 'Student Life Systems Admin',
      departmentOrMajor: 'Office of Student Life',
      systemRole: 'SL_SUPER_ADMIN',
      status: 'Active',
      lastLoginAt: '2026-11-28T10:00:00.000Z',
    },
    {
      userId: 'usr-sa-vanessa',
      name: 'Vanessa',
      email: 'vanessa.admin@sps.cuny.edu',
      identitySubject: 'cuny-sso|vanessa-005',
      title: 'Student Association Treasurer & Governance Lead',
      departmentOrMajor: 'Student Life Oversight',
      systemRole: 'SL_SUPER_ADMIN',
      status: 'Active',
      lastLoginAt: '2026-11-28T10:00:00.000Z',
    },
    {
      userId: 'usr-sl-scoped',
      name: 'Marcus Sterling',
      email: 'marcus.sterling@sps.cuny.edu',
      identitySubject: 'cuny-sso|msterling-002',
      title: 'Student Life Coordinator',
      departmentOrMajor: 'Office of Student Life',
      systemRole: 'SL_ADMIN',
      assignedAdminClubIds: ['club-ai', 'club-msa'],
      status: 'Active',
      lastLoginAt: '2026-11-13T17:45:00.000Z',
    },
    {
      userId: 'usr-lead-ai-abdul',
      name: 'Abdul Rahman',
      email: 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu',
      identitySubject: 'cuny-sso|arahman-45',
      title: 'AI Club President',
      departmentOrMajor: 'M.S. in Data Science',
      systemRole: 'STANDARD_USER',
      status: 'Active',
      lastLoginAt: '2026-11-28T11:00:00.000Z',
    },
    {
      userId: 'usr-sec-ai-mehreen',
      name: 'Mehreen Gillani',
      email: 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu',
      identitySubject: 'cuny-sso|mgillani-42',
      title: 'AI Club Secretary',
      departmentOrMajor: 'B.S. in Information Systems',
      systemRole: 'STANDARD_USER',
      status: 'Active',
      lastLoginAt: '2026-11-28T10:30:00.000Z',
    },
    {
      userId: 'usr-tres-ai-alina',
      name: 'Alina Repin',
      email: 'alina.repin79@login.cuny.edu',
      identitySubject: 'cuny-sso|arepin-79',
      title: 'AI Club Treasurer',
      departmentOrMajor: 'B.S. in Information Systems',
      systemRole: 'STANDARD_USER',
      status: 'Active',
      lastLoginAt: '2026-11-28T09:45:00.000Z',
    },
    {
      userId: 'usr-lead-msa-abdul',
      name: 'Abdul Rahman',
      email: 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu',
      identitySubject: 'cuny-sso|arahman-45-msa',
      title: 'MSA President',
      departmentOrMajor: 'M.S. in Data Science',
      systemRole: 'STANDARD_USER',
      status: 'Active',
      lastLoginAt: '2026-11-28T11:00:00.000Z',
    },
    {
      userId: 'usr-vp-msa-vasilah',
      name: 'Vasilah Siddiqui',
      email: 'Vasilah.Siddiqui42@login.cuny.edu',
      identitySubject: 'cuny-sso|vsiddiqui-42',
      title: 'MSA Vice President',
      departmentOrMajor: 'B.A. in Psychology',
      systemRole: 'STANDARD_USER',
      status: 'Active',
      lastLoginAt: '2026-11-28T10:15:00.000Z',
    },
    {
      userId: 'usr-sec-msa-sarosh',
      name: 'Sarosh Karim',
      email: 'SAROSH.KARIM45@login.cuny.edu',
      identitySubject: 'cuny-sso|skarim-45',
      title: 'MSA Secretary',
      departmentOrMajor: 'B.A. in Communication & Media',
      systemRole: 'STANDARD_USER',
      status: 'Active',
      lastLoginAt: '2026-11-28T10:00:00.000Z',
    },
    {
      userId: 'usr-tres-msa-mehreen',
      name: 'Mehreen Gillani',
      email: 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu',
      identitySubject: 'cuny-sso|mgillani-42-msa',
      title: 'MSA Treasurer',
      departmentOrMajor: 'B.S. in Information Systems',
      systemRole: 'STANDARD_USER',
      status: 'Active',
      lastLoginAt: '2026-11-28T10:30:00.000Z',
    },
    {
      userId: 'usr-lead-msa-asma',
      name: 'Asma Essaedi',
      email: 'ASMA.ESSAEDI89@stu-mail.sps.cuny.edu',
      identitySubject: 'cuny-sso|aessaedi-89',
      title: 'Marketing Lead & Social Media Coordinator',
      departmentOrMajor: 'B.S. in Information Systems',
      systemRole: 'STANDARD_USER',
      status: 'Active',
      lastLoginAt: '2026-11-28T11:20:00.000Z',
    },
    {
      userId: 'usr-viewer-ai',
      name: 'Prof. Jordan Reyes',
      email: 'jordan.reyes@sps.cuny.edu',
      identitySubject: 'cuny-sso|jreyes-042',
      title: 'Faculty Advisor',
      departmentOrMajor: 'Applied Technology & AI',
      systemRole: 'STANDARD_USER',
      status: 'Active',
      lastLoginAt: '2026-11-12T20:15:00.000Z',
    },
  ];

  const clubs: Club[] = createCatalogClubs();

  const memberships: ClubMembership[] = [
    // AI Club Executive Board
    {
      membershipId: 'mem-1',
      userId: 'usr-lead-ai-abdul',
      clubId: 'club-ai',
      role: 'CLUB_LEAD',
      officerTitle: 'President',
      status: 'Active',
      authorizedBy: 'Dr. Elena Vance',
      authorizedAt: '2026-10-15T14:05:00.000Z',
    },
    {
      membershipId: 'mem-2',
      userId: 'usr-sec-ai-mehreen',
      clubId: 'club-ai',
      role: 'EDITOR',
      officerTitle: 'Secretary',
      status: 'Active',
      authorizedBy: 'Abdul Rahman',
      authorizedAt: '2026-10-16T10:00:00.000Z',
    },
    {
      membershipId: 'mem-3',
      userId: 'usr-tres-ai-alina',
      clubId: 'club-ai',
      role: 'CONTRIBUTOR',
      officerTitle: 'Treasurer',
      status: 'Active',
      authorizedBy: 'Abdul Rahman',
      authorizedAt: '2026-10-17T11:30:00.000Z',
    },
    {
      membershipId: 'mem-4',
      userId: 'usr-viewer-ai',
      clubId: 'club-ai',
      role: 'VIEWER',
      officerTitle: 'Faculty Advisor',
      status: 'Active',
      authorizedBy: 'Dr. Elena Vance',
      authorizedAt: '2026-10-15T14:10:00.000Z',
    },
    // MSA Executive Board
    {
      membershipId: 'mem-5',
      userId: 'usr-lead-msa-abdul',
      clubId: 'club-msa',
      role: 'CLUB_LEAD',
      officerTitle: 'President',
      status: 'Active',
      authorizedBy: 'Dr. Elena Vance',
      authorizedAt: '2026-10-22T15:35:00.000Z',
    },
    {
      membershipId: 'mem-6',
      userId: 'usr-vp-msa-vasilah',
      clubId: 'club-msa',
      role: 'CLUB_LEAD',
      officerTitle: 'Vice President',
      status: 'Active',
      authorizedBy: 'Abdul Rahman',
      authorizedAt: '2026-10-22T15:40:00.000Z',
    },
    {
      membershipId: 'mem-7',
      userId: 'usr-sec-msa-sarosh',
      clubId: 'club-msa',
      role: 'CONTRIBUTOR',
      officerTitle: 'Secretary',
      status: 'Active',
      authorizedBy: 'Abdul Rahman',
      authorizedAt: '2026-10-22T15:45:00.000Z',
    },
    {
      membershipId: 'mem-8',
      userId: 'usr-tres-msa-mehreen',
      clubId: 'club-msa',
      role: 'CONTRIBUTOR',
      officerTitle: 'Treasurer',
      status: 'Active',
      authorizedBy: 'Abdul Rahman',
      authorizedAt: '2026-10-22T15:50:00.000Z',
    },
    {
      membershipId: 'mem-9',
      userId: 'usr-lead-msa-asma',
      clubId: 'club-msa',
      role: 'EDITOR',
      officerTitle: 'Marketing Lead & Social Media Coordinator',
      status: 'Active',
      authorizedBy: 'Abdul Rahman',
      authorizedAt: '2026-10-22T15:55:00.000Z',
    },
  ];

  const socialAccounts: SocialAccount[] = [
    {
      accountId: 'acc-ai-fb',
      clubId: 'club-ai',
      platform: 'Facebook Pages',
      accountName: 'Artificial Intelligence Club Official',
      handle: '@cunyspsaiclub',
      institutionalOwner: 'CUNY SPS Office of Student Life & CUNY Communications',
      pilotTier: 'Pilot Priority',
      publishingSupported: true,
      analyticsSupported: true,
      custodian: {
        custodianId: 'cust-1',
        accountId: 'acc-ai-fb',
        userId: 'usr-sl-super',
        staffName: 'Dr. Elena Vance',
        staffEmail: 'elena.vance@sps.cuny.edu',
        staffDepartment: 'Office of Student Life',
        responsibility: 'Primary Institutional Custodian & Business Owner',
        assignedAt: '2026-10-15T14:20:00.000Z',
      },
      connection: {
        connectionId: 'conn-1',
        accountId: 'acc-ai-fb',
        tokenReference: 'vault://cuny-sps/secrets/fb-page-ai-9012',
        status: 'Connected',
        connectedBy: 'Dr. Elena Vance',
        connectedAt: '2026-10-16T09:00:00.000Z',
        expiresAt: '2027-01-15T09:00:00.000Z',
        lastCheckedAt: '2026-11-13T19:00:00.000Z',
      },
    },
    {
      accountId: 'acc-ai-ig',
      clubId: 'club-ai',
      platform: 'Instagram Professional',
      accountName: 'Artificial Intelligence Club',
      handle: '@cunysps.ai',
      institutionalOwner: 'CUNY SPS Office of Student Life & CUNY Communications',
      pilotTier: 'Pilot Priority',
      publishingSupported: true,
      analyticsSupported: true,
      custodian: {
        custodianId: 'cust-2',
        accountId: 'acc-ai-ig',
        userId: 'usr-sl-scoped',
        staffName: 'Marcus Sterling',
        staffEmail: 'marcus.sterling@sps.cuny.edu',
        staffDepartment: 'Office of Student Life',
        responsibility: 'Designated Staff Account Administrator',
        assignedAt: '2026-10-16T09:30:00.000Z',
      },
      connection: {
        connectionId: 'conn-2',
        accountId: 'acc-ai-ig',
        tokenReference: 'vault://cuny-sps/secrets/ig-pro-ai-4418',
        status: 'Connected',
        connectedBy: 'Aisha Rahman',
        connectedAt: '2026-10-18T11:15:00.000Z',
        expiresAt: '2027-02-01T11:15:00.000Z',
        lastCheckedAt: '2026-11-13T19:00:00.000Z',
      },
    },
    {
      accountId: 'acc-msa-ig',
      clubId: 'club-msa',
      platform: 'Instagram Professional',
      accountName: 'Muslim Student Association (MSA)',
      handle: '@cunysps.msa',
      institutionalOwner: 'CUNY SPS Office of Student Life',
      pilotTier: 'Pilot Priority',
      publishingSupported: true,
      analyticsSupported: true,
      custodian: {
        custodianId: 'cust-3',
        accountId: 'acc-msa-ig',
        userId: 'usr-sl-scoped',
        staffName: 'Marcus Sterling',
        staffEmail: 'marcus.sterling@sps.cuny.edu',
        staffDepartment: 'Office of Student Life',
        responsibility: 'Designated Staff Account Administrator',
        assignedAt: '2026-10-23T10:00:00.000Z',
      },
      connection: {
        connectionId: 'conn-3',
        accountId: 'acc-msa-ig',
        tokenReference: 'vault://cuny-sps/secrets/ig-pro-msa-7721',
        status: 'Connected',
        connectedBy: 'Zainab Siddiqui',
        connectedAt: '2026-10-24T12:00:00.000Z',
        expiresAt: new Date(Date.now() + 9 * 86400000).toISOString(),
        lastCheckedAt: '2026-11-13T18:30:00.000Z',
      },
    },
  ];

  const accountRequests: AccountRequest[] = [
    {
      requestId: 'REQ-2026-014',
      clubId: 'club-ai',
      clubName: 'Artificial Intelligence Club',
      requestType: 'New Official Account',
      platform: 'LinkedIn',
      proposedAccountName: 'Artificial Intelligence Club Showcase Page',
      businessPurpose:
        'Publish student software engineering demos, speaker recaps, and career networking events for alumni and industry partners.',
      intendedAudience: 'CUNY SPS students, alumni, and technology employers',
      responsibleRepresentatives: 'Aisha Rahman (Co-Chair), Prof. Jordan Reyes (Advisor)',
      status: 'Under Student Life Review',
      submittedByUserId: 'usr-lead-ai',
      submittedByName: 'Aisha Rahman',
      submittedAt: '2026-11-10T14:20:00.000Z',
      updatedAt: '2026-11-11T09:15:00.000Z',
      approvals: [
        {
          approvalId: 'apr-101',
          requestId: 'REQ-2026-014',
          authority: 'Club Social Hub Submission Check',
          actorName: 'System Validation',
          decision: 'Submitted',
          notes: 'All required governance fields and faculty advisor attribution verified.',
          timestamp: '2026-11-10T14:20:00.000Z',
        },
      ],
    },
    {
      requestId: 'REQ-2026-012',
      clubId: 'club-msa',
      clubName: 'Muslim Student Association (MSA)',
      requestType: 'New Official Account',
      platform: 'Facebook Pages',
      proposedAccountName: 'CUNY SPS Muslim Student Association',
      businessPurpose:
        'Promote weekly community gatherings, interfaith dialogues, charity drives, and finals support circles across CUNY SPS.',
      intendedAudience: 'Prospective and current CUNY SPS students and community allies',
      responsibleRepresentatives: 'Zainab Siddiqui (President), Prof. Tariq Siddiqui (Advisor)',
      status: 'Awaiting CUNY Approval',
      submittedByUserId: 'usr-lead-msa',
      submittedByName: 'Zainab Siddiqui',
      submittedAt: '2026-11-04T11:00:00.000Z',
      updatedAt: '2026-11-07T16:40:00.000Z',
      approvals: [
        {
          approvalId: 'apr-102',
          requestId: 'REQ-2026-012',
          authority: 'CUNY SPS Office of Student Life',
          actorName: 'Marcus Sterling',
          decision: 'Student Life Approved',
          notes: 'Club eligibility confirmed. Forwarded to CUNY Office of Communications and Marketing for official handle approval.',
          timestamp: '2026-11-07T16:40:00.000Z',
        },
      ],
    },
  ];

  const posts: Post[] = [
    {
      postId: 'post-ai-101',
      clubId: 'club-ai',
      title: 'AI Club Meeting',
      caption:
        'Join the Artificial Intelligence Club this Thursday at 6:30 PM ET for our AI Club Meeting. Collaborate with fellow students on responsible AI prototypes, governance workflows, and full-stack demos.',
      platformAdaptations: {
        'Facebook Pages':
          'Join the Artificial Intelligence Club this Thursday, Nov 19 at 6:30 PM ET for our AI Club Meeting! Open to all CUNY SPS students interested in software engineering, AI governance, and hands-on product design. RSVP through the Student Life portal.',
        'Instagram Professional':
          'Build with us this Thursday at 6:30 PM ET. The Artificial Intelligence Club is hosting our AI Club Meeting—bring your ideas, meet collaborators, and explore responsible university tech. Link in bio via Student Life.',
      },
      hashtags: ['#CUNYSPS', '#AIClub', '#ResponsibleAI', '#StudentInnovation'],
      callToAction: 'Register in the Student Life Events Hub',
      relatedEvent: 'AI Club Meeting',
      eventDate: '2026-11-19',
      authorId: 'usr-editor-ai',
      authorName: 'Devon Brooks',
      status: 'Scheduled',
      targetAccountIds: ['acc-ai-fb', 'acc-ai-ig'],
      scheduledAt: '2026-11-16T15:00:00.000Z',
      createdAt: '2026-11-12T16:20:00.000Z',
      updatedAt: '2026-11-12T16:20:00.000Z',
      aiAssisted: true,
      aiReviewedByHuman: true,
      publishAttempts: [],
    },
    {
      postId: 'post-ai-102',
      clubId: 'club-ai',
      title: 'Club Social Hub Pilot Announcement',
      caption:
        'We are proud to pilot the CUNY SPS Club Social Hub—giving student leaders centralized scheduling, institutional continuity, and collaborative publishing tools.',
      hashtags: ['#CUNYSPS', '#StudentLife', '#EdTech'],
      callToAction: 'Learn more at our next general body meeting',
      relatedEvent: 'AI Club Meeting',
      eventDate: '2026-11-24',
      authorId: 'usr-lead-ai',
      authorName: 'Aisha Rahman',
      status: 'Published',
      targetAccountIds: ['acc-ai-fb', 'acc-ai-ig'],
      publishedAt: '2026-11-10T18:00:00.000Z',
      createdAt: '2026-11-10T17:10:00.000Z',
      updatedAt: '2026-11-10T18:00:04.000Z',
      aiAssisted: false,
      aiReviewedByHuman: true,
      publishAttempts: [
        {
          attemptId: 'att-1',
          postId: 'post-ai-102',
          accountId: 'acc-ai-fb',
          platform: 'Facebook Pages',
          handle: '@cunyspsaiclub',
          outcome: 'Success',
          providerPostId: 'fb_graph_984120319',
          attemptedAt: '2026-11-10T18:00:02.000Z',
        },
        {
          attemptId: 'att-2',
          postId: 'post-ai-102',
          accountId: 'acc-ai-ig',
          platform: 'Instagram Professional',
          handle: '@cunysps.ai',
          outcome: 'Success',
          providerPostId: 'ig_media_773120984',
          attemptedAt: '2026-11-10T18:00:04.000Z',
        },
      ],
    },
    {
      postId: 'post-ai-103',
      clubId: 'club-ai',
      title: 'Finals Week Study & Prompt Workshop Draft',
      caption:
        'Drafting a collaborative study session announcement for Finals Week. Editors: please attach the approved event flyer and verify date before scheduling.',
      hashtags: ['#CUNYSPS', '#FinalsPrep'],
      relatedEvent: 'AI Club General Meeting',
      eventDate: '2026-12-08',
      authorId: 'usr-contrib-ai',
      authorName: 'Sofia Patel',
      status: 'Draft',
      targetAccountIds: ['acc-ai-ig'],
      createdAt: '2026-11-13T14:40:00.000Z',
      updatedAt: '2026-11-13T14:40:00.000Z',
      aiAssisted: true,
      aiReviewedByHuman: true,
      publishAttempts: [],
    },
    {
      postId: 'post-msa-201',
      clubId: 'club-msa',
      title: 'MSA Community Tea & Finals Study Circle',
      caption:
        'Join Muslim Student Association (MSA) this Wednesday at 5:30 PM ET for warm tea, community reflection, and peer finals study tables.',
      hashtags: ['#CUNYSPS', '#CUNYSPSMSA', '#CommunityCare'],
      relatedEvent: 'Islamic Studies Club – New Club (Club Fair)',
      eventDate: '2026-11-18',
      authorId: 'usr-lead-msa',
      authorName: 'Zainab Siddiqui',
      status: 'Scheduled',
      targetAccountIds: ['acc-msa-ig'],
      scheduledAt: '2026-11-15T16:00:00.000Z',
      createdAt: '2026-11-11T12:00:00.000Z',
      updatedAt: '2026-11-11T12:00:00.000Z',
      aiAssisted: false,
      aiReviewedByHuman: true,
      publishAttempts: [],
    },
  ];

  const events: ClubEvent[] = [
    {
      eventId: 'evt-1',
      clubId: 'club-ai',
      title: 'AI Club Meeting',
      date: '2026-11-19',
      time: '18:30',
      location: 'Hybrid · 119 W 31st St Room 402 + Zoom',
      description: 'Collaborative prototyping session for student civic tech apps (co-hosted with Women in STEM Club).',
      eventType: 'Campus Event',
      isPublic: true,
      coSponsorClubIds: ['club-women-stem'],
      inPersonCapacity: 35,
      rsvpModes: {
        'usr-lead-ai': 'In-Person',
        'usr-editor-ai': 'In-Person',
        'usr-contrib-ai': 'Virtual',
        'usr-viewer-ai': 'In-Person',
      },
      waitlistUserIds: [],
      checkInCode: 'AI1984',
      checkedInUserIds: ['usr-lead-ai', 'usr-editor-ai'],
      guestWalkInCount: 0,
      rsvpUserIds: ['usr-lead-ai', 'usr-editor-ai', 'usr-contrib-ai', 'usr-viewer-ai'],
      feedbackResponses: [
        {
          feedbackId: 'fb-101',
          userId: 'usr-lead-ai',
          respondentName: 'Aisha Rahman',
          rating: 5,
          relevantToGoals: true,
          takeaway: 'Live civic-tech project demos gave first-year M.S. students clear repo starting points.',
          submittedAt: '2026-11-13T19:30:00.000Z',
        },
        {
          feedbackId: 'fb-102',
          userId: 'usr-editor-ai',
          respondentName: 'Devon Brooks',
          rating: 4,
          relevantToGoals: true,
          takeaway: 'Hybrid captioning worked seamlessly for online participants.',
          submittedAt: '2026-11-13T19:45:00.000Z',
        },
      ],
    },
    {
      eventId: 'evt-2',
      clubId: 'club-ai',
      title: 'AI Club Meeting',
      date: '2026-11-24',
      time: '19:00',
      location: 'Zoom',
      description: 'Pilot feedback review and spring semester officer planning.',
      eventType: 'Club Meeting',
      isPublic: true,
      checkInCode: 'AI2409',
      checkedInUserIds: [],
      guestWalkInCount: 0,
      rsvpUserIds: ['usr-editor-ai', 'usr-contrib-ai'],
    },
    {
      eventId: 'evt-3',
      clubId: 'club-ai',
      title: 'AI Club General Meeting',
      date: '2026-12-08',
      time: '18:00',
      location: 'Virtual Study Lounge',
      description: 'Peer study and project showcase prep.',
      eventType: 'Workshop',
      isPublic: true,
      checkInCode: 'AI0818',
      checkedInUserIds: [],
      guestWalkInCount: 0,
      rsvpUserIds: ['usr-contrib-ai'],
    },
    {
      eventId: 'evt-4',
      clubId: 'club-msa',
      title: 'Islamic Studies Club – New Club (Club Fair)',
      date: '2026-11-18',
      time: '17:30',
      location: 'Hybrid · 119 W 31st St Student Lounge + Zoom',
      description: 'Warm tea, community fellowship, and quiet study space open to all CUNY SPS students.',
      eventType: 'Campus Event',
      isPublic: true,
      checkInCode: 'MS1817',
      checkedInUserIds: ['usr-lead-msa'],
      guestWalkInCount: 0,
      rsvpUserIds: ['usr-lead-msa', 'usr-lead-ai'],
    },
    {
      eventId: 'evt-5',
      clubId: 'club-social-impact',
      title: 'Social Impact and Activism Club – NEW! (Club Fair)',
      date: '2026-11-21',
      time: '17:00',
      location: 'Zoom',
      description: 'Student-led discussion on disability access, civic engagement, and CUNY advocacy resources.',
      eventType: 'Campus Event',
      isPublic: true,
      checkInCode: 'SI2117',
      checkedInUserIds: [],
      guestWalkInCount: 0,
      rsvpUserIds: ['usr-lead-ai'],
    },
    (() => {
      const target = new Date(Date.now() + 18 * 60 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const dStr = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
      const tStr = `${pad(target.getHours())}:00`;
      return {
        eventId: 'evt-6',
        clubId: 'club-ai',
        title: 'AI Club Meeting',
        date: dStr,
        time: tStr,
        location: 'Zoom / CUNY SPS Virtual Commons',
        description: 'Open Q&A for project teams ahead of weekly club build demos.',
        eventType: 'Club Meeting' as const,
        postedByName: 'Aisha Rahman',
        isPublic: true,
        approvalStatus: 'Approved' as const,
        checkInCode: 'AI6001',
        checkedInUserIds: [],
        guestWalkInCount: 0,
        rsvpUserIds: ['usr-lead-ai', 'usr-editor-ai'],
      };
    })(),
    {
      eventId: 'evt-7',
      clubId: 'club-women-stem',
      title: 'Women in STEM Club Meeting',
      date: '2026-11-23',
      time: '18:00',
      location: 'Zoom / CUNY SPS Virtual Commons',
      description: 'Alumni and faculty researchers share pathways into data science, engineering, and graduate fellowships.',
      eventType: 'Networking',
      postedByName: 'Office of Student Life',
      isPublic: true,
      approvalStatus: 'Approved',
      checkInCode: 'WS2318',
      checkedInUserIds: [],
      guestWalkInCount: 0,
      rsvpUserIds: ['usr-lead-ai'],
    },
    {
      eventId: 'evt-8',
      clubId: 'club-psychology',
      title: 'Psychology Club Meeting',
      date: '2026-11-26',
      time: '17:30',
      location: 'Hybrid · 119 W 31st St Room 305 + Zoom',
      description: 'Interactive seminar exploring organizational psychology practices, stress resilience, and peer support.',
      eventType: 'Workshop',
      postedByName: 'Office of Student Life',
      isPublic: true,
      approvalStatus: 'Approved',
      checkInCode: 'PS2617',
      checkedInUserIds: [],
      guestWalkInCount: 0,
      rsvpUserIds: [],
    },
    {
      eventId: 'evt-9',
      clubId: 'club-bsu',
      title: 'Black Student Union Meeting (Club Fair)',
      date: '2026-12-02',
      time: '18:30',
      location: '119 W 31st St Student Lounge',
      description: 'Community networking evening celebrating student leaders, mentorship circles, and spring event planning.',
      eventType: 'Campus Event',
      postedByName: 'Office of Student Life',
      isPublic: true,
      approvalStatus: 'Approved',
      checkInCode: 'BS0218',
      checkedInUserIds: [],
      guestWalkInCount: 0,
      rsvpUserIds: [],
    },
    {
      eventId: 'evt-10',
      clubId: 'club-creative-writing',
      title: 'Creative Writing Club Meeting',
      date: '2026-12-05',
      time: '19:00',
      location: 'Zoom / Live Literary Salon',
      description: 'Open mic poetry, short fiction readings, and editorial submissions preview for the winter literary issue.',
      eventType: 'Campus Event',
      postedByName: 'Office of Student Life',
      isPublic: true,
      approvalStatus: 'Approved',
      checkInCode: 'CW0519',
      checkedInUserIds: [],
      guestWalkInCount: 0,
      rsvpUserIds: [],
    },
  ];

  const analytics: PlatformMetric[] = [
    {
      metricId: 'met-ai-fb',
      clubId: 'club-ai',
      accountId: 'acc-ai-fb',
      platform: 'Facebook Pages',
      handle: '@cunyspsaiclub',
      reportingPeriod: 'Last 30 Days (Oct 15 – Nov 13, 2026)',
      availability: 'Available via Official API',
      publishedPosts: 8,
      publishingSuccessRate: 100,
      engagementCount: 312,
      reach: 2480,
      impressions: 3910,
      followerGrowth: 46,
      dailySeries: [
        { date: 'Nov 07', reach: 290, engagement: 34 },
        { date: 'Nov 08', reach: 310, engagement: 41 },
        { date: 'Nov 09', reach: 265, engagement: 28 },
        { date: 'Nov 10', reach: 540, engagement: 79 },
        { date: 'Nov 11', reach: 420, engagement: 52 },
        { date: 'Nov 12', reach: 355, engagement: 43 },
        { date: 'Nov 13', reach: 300, engagement: 35 },
      ],
    },
    {
      metricId: 'met-ai-ig',
      clubId: 'club-ai',
      accountId: 'acc-ai-ig',
      platform: 'Instagram Professional',
      handle: '@cunysps.ai',
      reportingPeriod: 'Last 30 Days (Oct 15 – Nov 13, 2026)',
      availability: 'Available via Official API',
      publishedPosts: 7,
      publishingSuccessRate: 100,
      engagementCount: 486,
      reach: 3190,
      impressions: 4620,
      followerGrowth: 72,
      dailySeries: [
        { date: 'Nov 07', reach: 380, engagement: 58 },
        { date: 'Nov 08', reach: 410, engagement: 64 },
        { date: 'Nov 09', reach: 360, engagement: 49 },
        { date: 'Nov 10', reach: 690, engagement: 112 },
        { date: 'Nov 11', reach: 520, engagement: 84 },
        { date: 'Nov 12', reach: 440, engagement: 67 },
        { date: 'Nov 13', reach: 390, engagement: 52 },
      ],
    },
    {
      metricId: 'met-msa-ig',
      clubId: 'club-msa',
      accountId: 'acc-msa-ig',
      platform: 'Instagram Professional',
      handle: '@cunysps.msa',
      reportingPeriod: 'Last 30 Days (Oct 22 – Nov 13, 2026)',
      availability: 'Available via Official API',
      publishedPosts: 5,
      publishingSuccessRate: 100,
      engagementCount: 228,
      reach: 1890,
      impressions: 2740,
      followerGrowth: 38,
      dailySeries: [
        { date: 'Nov 07', reach: 220, engagement: 26 },
        { date: 'Nov 08', reach: 245, engagement: 31 },
        { date: 'Nov 09', reach: 215, engagement: 24 },
        { date: 'Nov 10', reach: 340, engagement: 45 },
        { date: 'Nov 11', reach: 310, engagement: 38 },
        { date: 'Nov 12', reach: 290, engagement: 34 },
        { date: 'Nov 13', reach: 270, engagement: 30 },
      ],
    },
  ];

  const invitations: Invitation[] = [
    {
      invitationId: 'inv-1',
      clubId: 'club-ai',
      recipientEmail: 'noah.kim@spsmail.cuny.edu',
      recipientName: 'Noah Kim',
      role: 'EDITOR',
      invitedByUserId: 'usr-lead-ai',
      invitedByName: 'Aisha Rahman',
      status: 'Pending',
      createdAt: '2026-11-12T18:00:00.000Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      eventId: 'AUD-9047',
      actorId: 'usr-lead-ai',
      actorName: 'Aisha Rahman',
      actorRole: 'CLUB_LEAD',
      action: 'INVITE_CLUB_MEMBER',
      category: 'Membership',
      target: 'noah.kim@spsmail.cuny.edu (EDITOR)',
      clubId: 'club-ai',
      details: 'Invited verified CUNY SPS student officer to Artificial Intelligence Club.',
      timestamp: '2026-11-12T18:00:00.000Z',
    },
    {
      eventId: 'AUD-9046',
      actorId: 'usr-lead-ai',
      actorName: 'Aisha Rahman',
      actorRole: 'CLUB_LEAD',
      action: 'SUBMIT_ACCOUNT_REQUEST',
      category: 'Governance',
      target: 'REQ-2026-014 (LinkedIn Showcase)',
      clubId: 'club-ai',
      details: 'Requested new official LinkedIn Showcase account for Artificial Intelligence Club.',
      timestamp: '2026-11-10T14:20:00.000Z',
    },
    {
      eventId: 'AUD-9045',
      actorId: 'usr-lead-ai',
      actorName: 'Aisha Rahman',
      actorRole: 'CLUB_LEAD',
      action: 'PUBLISH_SUCCEEDED',
      category: 'Publishing',
      target: 'post-ai-102 (FB + IG)',
      clubId: 'club-ai',
      details: 'Published announcement to @cunyspsaiclub and @cunysps.ai via official APIs.',
      timestamp: '2026-11-10T18:00:04.000Z',
    },
    {
      eventId: 'AUD-9044',
      actorId: 'usr-sl-scoped',
      actorName: 'Marcus Sterling',
      actorRole: 'SL_ADMIN',
      action: 'APPROVE_INTERNAL_REQUEST',
      category: 'Governance',
      target: 'REQ-2026-012 (Muslim Student Association (MSA) Facebook)',
      clubId: 'club-msa',
      details: 'Advanced Muslim Student Association (MSA) Facebook Page request to Awaiting CUNY Approval.',
      timestamp: '2026-11-07T16:40:00.000Z',
    },
    {
      eventId: 'AUD-9043',
      actorId: 'usr-sl-super',
      actorName: 'Dr. Elena Vance',
      actorRole: 'SL_SUPER_ADMIN',
      action: 'AUTHORIZE_CLUB_LEADER',
      category: 'Governance',
      target: 'Aisha Rahman -> Artificial Intelligence Club',
      clubId: 'club-ai',
      details: 'Granted CLUB_LEAD workspace privileges after Student Life verification.',
      timestamp: '2026-10-15T14:05:00.000Z',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      notificationId: 'notif-1',
      userId: 'usr-sl-super',
      type: 'Security',
      title: 'Instagram token renewal approaching for Muslim Student Association (MSA)',
      message: 'Account @cunysps.msa expires within 14 days; coordinate OAuth refresh with the staff custodian.',
      read: false,
      createdAt: '2026-11-13T13:20:00.000Z',
    },
    {
      notificationId: 'notif-2',
      userId: 'usr-sl-super',
      type: 'Approval',
      title: 'New account request awaiting Student Life review',
      message: 'Artificial Intelligence Club submitted REQ-2026-014 for a LinkedIn Showcase Page.',
      read: false,
      createdAt: '2026-11-10T14:20:00.000Z',
    },
    {
      notificationId: 'notif-3',
      userId: 'usr-lead-ai',
      clubId: 'club-ai',
      type: 'Publishing',
      title: 'Scheduled post queued for Nov 16',
      message: 'AI Club Meeting is scheduled for @cunyspsaiclub and @cunysps.ai.',
      read: false,
      createdAt: '2026-11-12T16:20:00.000Z',
    },
    {
      notificationId: 'notif-4',
      userId: 'usr-editor-ai',
      clubId: 'club-ai',
      type: 'Publishing',
      title: 'Contributor draft awaiting editor review',
      message: 'Sofia Patel saved draft "Finals Week Study & Prompt Workshop Draft".',
      read: false,
      createdAt: '2026-11-13T14:40:00.000Z',
    },
  ];

  const inboxMessages: InboxMessage[] = [
    {
      messageId: 'msg-1',
      clubId: 'club-ai',
      accountId: 'acc-ai-ig',
      platform: 'Instagram Professional',
      senderName: 'Elena M.',
      senderHandle: '@elena_sps26',
      channel: 'Comment',
      body: 'Will the AI & AI Club Meeting recording be posted for asynchronous online students?',
      receivedAt: '2026-11-13T15:10:00.000Z',
      flagged: false,
      replied: false,
      tag: 'Event Question',
      assignedToUserId: 'usr-editor-ai',
      assignedToName: 'Devon Brooks',
    },
    {
      messageId: 'msg-2',
      clubId: 'club-ai',
      accountId: 'acc-ai-fb',
      platform: 'Facebook Pages',
      senderName: 'Tariq Hassan',
      senderHandle: 'Tariq Hassan',
      channel: 'Direct Message',
      body: 'Hi! Can non-Information Systems majors join the AI Club pilot team?',
      receivedAt: '2026-11-13T11:45:00.000Z',
      flagged: true,
      replied: true,
      tag: 'Join Inquiry',
      assignedToUserId: 'usr-lead-ai',
      assignedToName: 'Aisha Rahman',
      replyText: 'Yes! All CUNY SPS undergraduate and graduate students across every major are welcome.',
      repliedByName: 'Aisha Rahman',
      repliedAt: '2026-11-13T12:10:00.000Z',
    },
  ];

  const announcements = createInitialAnnouncements();
  const emailReminders: EmailReminderRecord[] = [];
  const emailWebhookEvents: EmailDeliveryWebhookEvent[] = [];
  const smtpConfig = createInitialSmtpConfig();
  const forumThreads = createInitialForumThreads();
  const eventAttendanceRecords = createInitialEventAttendanceRecords();
  const clubTasks = createInitialClubTasks();
  const joinRequests = createInitialJoinRequests();
  const officerTransitions = createInitialOfficerTransitions();
  const resourceSubmissions = createInitialResourceSubmissions();
  const budgetIncreaseRequests = createInitialBudgetIncreaseRequests();
  const clubBroadcasts = createInitialClubBroadcasts();
  const reshareRequests = createInitialReshareRequests();

  const whatsappGroups: WhatsAppGroupLink[] = [
    {
      groupId: 'wa-grp-ai-community',
      clubId: 'club-ai',
      groupName: 'AI Club General Community',
      inviteLink: 'https://chat.whatsapp.com/LiEAv8DRlII7pMqN60PGj6',
      groupCategory: 'General Community',
      description: 'Main WhatsApp chat for build night reminders, Zoom room alerts, and peer AI study resources.',
      memberCountEstimate: 64,
      deliveryMode: 'Interactive Share + Hub Outbox',
      status: 'Connected',
      showInviteToMembers: true,
      autoAlertNewEvents: true,
      autoAlert24hReminders: true,
      linkedByUserId: 'usr-lead-ai',
      linkedByName: 'Aisha Rahman',
      linkedAt: '2026-10-20T14:00:00.000Z',
      updatedAt: '2026-11-13T16:15:00.000Z',
      lastMessageAt: '2026-11-13T16:15:00.000Z',
    },
    {
      groupId: 'wa-grp-msa-community',
      clubId: 'club-msa',
      groupName: 'Muslim Student Association (MSA) Alerts & Community',
      inviteLink: 'https://chat.whatsapp.com/F8DqIiNLEv27IY9vXE09UZ',
      groupCategory: 'Event Alerts',
      description: 'Official WhatsApp group for tea & study circles, Jummah updates, community service drives, and event reminders.',
      memberCountEstimate: 52,
      deliveryMode: 'Interactive Share + Hub Outbox',
      status: 'Connected',
      showInviteToMembers: true,
      autoAlertNewEvents: true,
      autoAlert24hReminders: true,
      linkedByUserId: 'usr-lead-msa',
      linkedByName: 'Zainab Siddiqui',
      linkedAt: '2026-10-25T11:30:00.000Z',
      updatedAt: '2026-11-12T19:00:00.000Z',
      lastMessageAt: '2026-11-12T19:00:00.000Z',
    },
  ];

  const whatsappMessages: WhatsAppAlertMessage[] = [
    {
      alertId: 'wa-msg-101',
      clubId: 'club-ai',
      groupId: 'wa-grp-ai-community',
      groupName: 'AI Club General Community',
      category: 'Event Reminder',
      title: 'AI Club Meeting — Hybrid Room & Zoom Ready',
      messageBody:
        'Hi Artificial Intelligence Club members! Join us Thursday, Nov 19 at 6:30 PM ET (119 W 31st St Room 402 + Zoom) for lightning civic tech demos and hands-on prototyping. Bring your laptop and questions!',
      linkedEventId: 'evt-1',
      linkedEventTitle: 'AI Club Meeting',
      deliveryMode: 'Interactive Share + Hub Outbox',
      deliveryStatus: 'Ready for WhatsApp Share',
      deliveryDetails: 'Logged in Club WhatsApp Outbox with 1-click WhatsApp share dispatch.',
      recipientCountEstimate: 64,
      syncToHubNotifications: true,
      sentByUserId: 'usr-lead-ai',
      sentByName: 'Aisha Rahman',
      sentByRoleLabel: 'President',
      sentAt: '2026-11-13T16:15:00.000Z',
    },
    {
      alertId: 'wa-msg-201',
      clubId: 'club-msa',
      groupId: 'wa-grp-msa-community',
      groupName: 'Muslim Student Association (MSA) Alerts & Community',
      category: 'Announcement',
      title: 'MSA Community Tea & Study Circle — Wed Nov 18 at 5:30 PM ET',
      messageBody:
        'As-salamu alaykum! Join Muslim Student Association (MSA) this Wednesday at 5:30 PM ET in the 119 W 31st St Student Lounge or on Zoom for warm tea, community reflection, and finals prep tables.',
      linkedEventId: 'evt-4',
      linkedEventTitle: 'Islamic Studies Club – New Club (Club Fair)',
      deliveryMode: 'Interactive Share + Hub Outbox',
      deliveryStatus: 'Ready for WhatsApp Share',
      deliveryDetails: 'Logged in Club WhatsApp Outbox with 1-click WhatsApp share dispatch.',
      recipientCountEstimate: 52,
      syncToHubNotifications: true,
      sentByUserId: 'usr-lead-msa',
      sentByName: 'Zainab Siddiqui',
      sentByRoleLabel: 'President',
      sentAt: '2026-11-12T19:00:00.000Z',
    },
  ];

  const blogPosts: ClubBlogPost[] = [
    {
      blogPostId: 'blog-ai-101',
      clubId: 'club-ai',
      clubName: 'Artificial Intelligence Club',
      clubShortCode: 'AI-CLUB',
      title: 'How CUNY SPS Students Built Five Civic Tech Prototypes in One Evening',
      slug: 'how-cuny-sps-students-built-five-civic-tech-prototypes',
      subtitle: 'Inside our AI Club Meeting with accessible Transit, 311, and Study Aids',
      category: 'Event Recap',
      excerpt:
        'Over 45 undergraduate and graduate students teamed up across time zones to ship five open-source civic prototypes addressing NYC transit accessibility, multilingual city resources, and study navigation.',
      bodyMarkdown: [
        'Last Thursday evening, members of the Artificial Intelligence Club and co-sponsors from the Women in STEM Club gathered virtually and at 119 W 31st Street for our AI Club Meeting.',
        '## What Student Teams Built',
        'Rather than focusing on toy chatbots, every team tackled a real public-interest challenge faced by working adults and NYC commuters:',
        '- **Subway Access Checker**: A lightweight accessibility companion mapping elevator outage alerts to step-free transfer routes.',
        '- **Plain-Language Housing Rights Guide**: A bilingual summary helper translating NYC tenant notices into plain checklists.',
        '- **Asynchronous Study Group Matcher**: Built by first-year Information Systems students to pair evening learners by course schedule.',
        '> "Building alongside peers who work full-time jobs during the day showed how practical, community-centered engineering can thrive at CUNY SPS." — Aisha Rahman, Club President',
        '## Next Steps & Open Repositories',
        'Project walkthrough slides and accessibility checklists are pinned in the Club Forums. Join our upcoming AI Club Meeting if you want help packaging a demo for the Spring AI Gala.',
      ].join('\n\n'),
      tags: ['Civic Tech', 'AI Club', 'Accessibility', 'Student Projects'],
      readingTimeMinutes: 3,
      status: 'Published',
      featured: true,
      visibility: 'Public Campus',
      linkedEventId: 'evt-1',
      linkedEventTitle: 'AI Club Meeting',
      authorUserId: 'usr-lead-ai',
      authorName: 'Aisha Rahman',
      authorRoleLabel: 'President',
      reviewedByName: 'Prof. Martin Alvarez',
      likedByUserIds: ['usr-lead-ai', 'usr-editor-ai', 'usr-contrib-ai', 'usr-sl-super'],
      comments: [
        {
          commentId: 'bcmt-101',
          blogPostId: 'blog-ai-101',
          authorUserId: 'usr-editor-ai',
          authorName: 'Devon Brooks',
          authorRoleLabel: 'Social Media Chair',
          body: 'Loved seeing the step-free transit route demo — sharing a short clip to our LinkedIn page this week!',
          createdAt: '2026-11-11T16:20:00.000Z',
        },
        {
          commentId: 'bcmt-102',
          blogPostId: 'blog-ai-101',
          authorUserId: 'usr-contrib-ai',
          authorName: 'Sofia Patel',
          authorRoleLabel: 'Secretary',
          body: 'Notes and repo links are now archived in our Google Drive starter folder too.',
          createdAt: '2026-11-12T10:05:00.000Z',
        },
      ],
      publishedAt: '2026-11-11T14:00:00.000Z',
      createdAt: '2026-11-10T21:15:00.000Z',
      updatedAt: '2026-11-12T10:05:00.000Z',
    },
    {
      blogPostId: 'blog-ai-102',
      clubId: 'club-ai',
      clubName: 'Artificial Intelligence Club',
      clubShortCode: 'AI-CLUB',
      title: 'Practical Guide: Evaluating Prompt Reliability for Course Research',
      slug: 'practical-guide-evaluating-prompt-reliability',
      subtitle: 'A rubric created by club officers for checking citations, edge cases, and academic integrity',
      category: 'Tutorial & Guide',
      excerpt:
        'Before relying on any language model output in capstone research, run through our three-part verification checklist covering primary sources, counterfactual tests, and bias audits.',
      bodyMarkdown: [
        'As students across Data Science, Psychology, and Health Information Administration experiment with AI workflows, verifying source fidelity matters more than ever.',
        '## Three-Step Verification Habit',
        '- **Verify Primary Citations**: Never cite a paper or policy stat without opening the original DOI or `.gov` source.',
        '- **Test Boundary Inputs**: Check how your prompt behaves on ambiguous, non-standard, or multi-lingual edge cases.',
        '- **Document Tool Disclosure**: Always follow your syllabus disclosure policy for AI-assisted editing or brainstorming.',
        'Draft feedback from officers welcome before we publish campus-wide next Monday.',
      ].join('\n\n'),
      tags: ['Research Methods', 'AI Ethics', 'Study Guide'],
      readingTimeMinutes: 2,
      status: 'In Review',
      featured: false,
      visibility: 'Public Campus',
      linkedEventId: 'evt-3',
      linkedEventTitle: 'AI Club General Meeting',
      authorUserId: 'usr-contrib-ai',
      authorName: 'Sofia Patel',
      authorRoleLabel: 'Secretary',
      likedByUserIds: ['usr-lead-ai'],
      comments: [],
      createdAt: '2026-11-13T15:10:00.000Z',
      updatedAt: '2026-11-13T18:45:00.000Z',
    },
    {
      blogPostId: 'blog-msa-101',
      clubId: 'club-msa',
      clubName: 'Muslim Student Association (MSA)',
      clubShortCode: 'MSA',
      title: 'Building Community Across Online & Hybrid Semesters at CUNY SPS',
      slug: 'building-community-across-online-hybrid-semesters',
      subtitle: 'Reflections from our Monthly Community Tea & Study Circle series',
      category: 'News',
      excerpt:
        'How asynchronous and evening students stay connected through hybrid tea hours, shared finals prep tables, and interfaith campus service drives.',
      bodyMarkdown: [
        'At an online-forward school like CUNY SPS, meaningful student fellowship happens when we intentionally design spaces for both remote learners and Midtown Manhattan commuters.',
        '## Highlights from Fall Semester',
        'Our weekly tea and study sessions brought together nursing, business, and technology majors to share exam prep strategies, career mentorship, and winter coat drive coordination.',
        '> "Having a familiar group of peers log in from work breaks and living rooms across all five boroughs makes CUNY SPS feel like a true neighborhood campus." — Zainab Siddiqui, MSA President',
        '## Join Us This Wednesday',
        'Everyone is welcome at our next Community Tea & Study Circle at 5:30 PM ET (Room 410 + Zoom).',
      ].join('\n\n'),
      tags: ['Community', 'News', 'Hybrid Campus'],
      readingTimeMinutes: 2,
      status: 'Published',
      featured: true,
      visibility: 'Public Campus',
      linkedEventId: 'evt-4',
      linkedEventTitle: 'Islamic Studies Club – New Club (Club Fair)',
      authorUserId: 'usr-lead-msa',
      authorName: 'Zainab Siddiqui',
      authorRoleLabel: 'President',
      reviewedByName: 'Dr. Hina Qureshi',
      likedByUserIds: ['usr-lead-msa', 'usr-lead-ai', 'usr-sl-super'],
      comments: [],
      publishedAt: '2026-11-12T12:00:00.000Z',
      createdAt: '2026-11-11T19:00:00.000Z',
      updatedAt: '2026-11-12T12:00:00.000Z',
    },
    {
      blogPostId: 'blog-ai-103',
      clubId: 'club-ai',
      clubName: 'Artificial Intelligence Club',
      clubShortCode: 'AI-CLUB',
      title: 'Spring AI Gala Planning & Speaker Nominations Open for Club Members',
      slug: 'spring-ai-gala-planning-speaker-nominations',
      subtitle: 'Submit alumni panelist ideas and student project showcase proposals by December 1',
      category: 'News',
      excerpt:
        'Following our $2,000 Student Life funding increase request, the Artificial Intelligence Club is opening speaker and student lightning-talk nominations for our annual Spring AI Gala.',
      bodyMarkdown: [
        'Planning is officially underway for the Spring CUNY SPS AI Gala, bringing together industry alumni, faculty advisors, and student builders.',
        '## How to Get Involved',
        '- **Lightning Talks**: Propose a 5-minute demonstration of a course or independent AI tool.',
        '- **Speaker Committee**: Help coordinate alumni Q&A panels on NYC public-interest tech careers.',
        'Drop your ideas in the Club Forums or reply in the Messaging Center.',
      ].join('\n\n'),
      tags: ['Club News', 'Spring Gala', 'Announcements'],
      readingTimeMinutes: 2,
      status: 'Published',
      featured: false,
      visibility: 'Public Campus',
      authorUserId: 'usr-lead-ai',
      authorName: 'Aisha Rahman',
      authorRoleLabel: 'President',
      reviewedByName: 'Aisha Rahman',
      likedByUserIds: ['usr-lead-ai', 'usr-editor-ai'],
      comments: [],
      publishedAt: '2026-11-13T11:00:00.000Z',
      createdAt: '2026-11-13T10:30:00.000Z',
      updatedAt: '2026-11-13T11:00:00.000Z',
    },
    {
      blogPostId: 'blog-wstem-101',
      clubId: 'club-women-stem',
      clubName: 'Women in STEM Club',
      clubShortCode: 'WSTEM',
      title: 'Mentorship Pairs & Career Pathways for Women in Computing & Data',
      slug: 'mentorship-pairs-career-pathways-women-stem',
      subtitle: 'Spring mentorship cohort applications open for undergraduates and alumni',
      category: 'Member Spotlight',
      excerpt:
        'Meet three returning CUNY SPS STEM scholars who transitioned from career-changer coursework into NYC public-sector analytics and software engineering roles.',
      bodyMarkdown: [
        'Our peer mentorship ring pairs incoming STEM students with senior capstoners and alumni working across healthcare technology, civic data, and cloud engineering.',
        '## What Mentees Receive',
        '- Monthly 1-on-1 portfolio and resume clinics.',
        '- Co-sponsored technical workshops alongside the Artificial Intelligence Club.',
        '- Safe, supportive mock interview practice tailored to adult learners.',
      ].join('\n\n'),
      tags: ['Mentorship', 'STEM Careers', 'Alumni'],
      readingTimeMinutes: 2,
      status: 'Published',
      featured: true,
      visibility: 'Public Campus',
      authorUserId: 'usr-sl-super',
      authorName: 'Dr. Elena Vance',
      authorRoleLabel: 'Student Life Contributor',
      likedByUserIds: ['usr-lead-ai'],
      comments: [],
      publishedAt: '2026-11-09T15:30:00.000Z',
      createdAt: '2026-11-09T14:00:00.000Z',
      updatedAt: '2026-11-09T15:30:00.000Z',
    },
  ];

  const clubBlogTaxonomies: Record<string, ClubBlogTaxonomy> = {
    'club-ai': {
      clubId: 'club-ai',
      categories: ['News', 'Event Recap', 'Member Spotlight', 'Tutorial & Guide', 'Research & Projects'],
      curatedTags: [
        'Civic Tech',
        'AI Club',
        'Accessibility',
        'Student Projects',
        'AI Ethics',
        'Research Methods',
        'Spring Gala',
        'Announcements',
      ],
      updatedByName: 'Aisha Rahman',
      updatedAt: '2026-11-13T11:00:00.000Z',
    },
    'club-msa': {
      clubId: 'club-msa',
      categories: ['News', 'Event Recap', 'Member Spotlight', 'Campus Voices'],
      curatedTags: ['Community', 'Hybrid Campus', 'Interfaith', 'Service Drive', 'Study Circle'],
      updatedByName: 'Zainab Siddiqui',
      updatedAt: '2026-11-12T12:00:00.000Z',
    },
    'club-women-stem': {
      clubId: 'club-women-stem',
      categories: ['News', 'Event Recap', 'Member Spotlight', 'Tutorial & Guide'],
      curatedTags: ['Mentorship', 'STEM Careers', 'Alumni', 'Workshops'],
      updatedByName: 'Dr. Elena Vance',
      updatedAt: '2026-11-09T15:30:00.000Z',
    },
  };

  return {
    users,
    clubs,
    memberships,
    socialAccounts,
    accountRequests,
    posts,
    events,
    eventAttendanceRecords,
    clubTasks,
    announcements,
    emailReminders,
    emailWebhookEvents,
    smtpConfig,
    forumThreads,
    joinRequests,
    officerTransitions,
    resourceSubmissions,
    budgetIncreaseRequests,
    budgetBaseline500Migrated: true,
    reshareRequests,
    metaTokenSecrets: {},
    analytics,
    invitations,
    auditLogs,
    notifications,
    inboxMessages,
    whatsappGroups,
    whatsappMessages,
    whatsappSecrets: {},
    clubBroadcasts,
    blogPosts,
    clubBlogTaxonomies,
    publicCatalogEventsSeeded: true,
  };
}

let cachedDb: HubDatabase | null = null;

export function getDb(): HubDatabase {
  if (cachedDb) return cachedDb;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      cachedDb = JSON.parse(raw) as HubDatabase;
      let migrated = false;
      if (!Array.isArray(cachedDb.announcements)) {
        cachedDb.announcements = createInitialAnnouncements();
        migrated = true;
      }
      if (!Array.isArray(cachedDb.emailReminders)) {
        cachedDb.emailReminders = [];
        migrated = true;
      }
      if (!Array.isArray(cachedDb.emailWebhookEvents)) {
        cachedDb.emailWebhookEvents = [];
        migrated = true;
      }
      if (!cachedDb.smtpConfig) {
        cachedDb.smtpConfig = createInitialSmtpConfig();
        migrated = true;
      }
      if (!Array.isArray(cachedDb.forumThreads)) {
        cachedDb.forumThreads = createInitialForumThreads();
        migrated = true;
      }
      if (!Array.isArray(cachedDb.eventAttendanceRecords)) {
        cachedDb.eventAttendanceRecords = createInitialEventAttendanceRecords();
        migrated = true;
      }
      if (!Array.isArray(cachedDb.clubTasks)) {
        cachedDb.clubTasks = createInitialClubTasks();
        migrated = true;
      }
      if (!Array.isArray(cachedDb.joinRequests)) {
        cachedDb.joinRequests = createInitialJoinRequests();
        migrated = true;
      }
      if (!Array.isArray(cachedDb.officerTransitions)) {
        cachedDb.officerTransitions = createInitialOfficerTransitions();
        migrated = true;
      }
      if (!Array.isArray(cachedDb.resourceSubmissions)) {
        cachedDb.resourceSubmissions = createInitialResourceSubmissions();
        migrated = true;
      }
      if (!Array.isArray(cachedDb.reshareRequests)) {
        cachedDb.reshareRequests = createInitialReshareRequests();
        migrated = true;
      }
      if (!cachedDb.metaTokenSecrets || typeof cachedDb.metaTokenSecrets !== 'object') {
        cachedDb.metaTokenSecrets = {};
        migrated = true;
      }
      const seedDb = createInitialDatabase();
      if (!Array.isArray(cachedDb.budgetIncreaseRequests)) {
        cachedDb.budgetIncreaseRequests = seedDb.budgetIncreaseRequests;
        migrated = true;
      }
      if (!Array.isArray(cachedDb.whatsappGroups)) {
        cachedDb.whatsappGroups = seedDb.whatsappGroups;
        migrated = true;
      } else {
        const aiWaGroup = cachedDb.whatsappGroups.find((g) => g.groupId === 'wa-grp-ai-community');
        if (
          aiWaGroup &&
          aiWaGroup.inviteLink !== 'https://chat.whatsapp.com/LiEAv8DRlII7pMqN60PGj6'
        ) {
          aiWaGroup.inviteLink = 'https://chat.whatsapp.com/LiEAv8DRlII7pMqN60PGj6';
          migrated = true;
        }
        const msaWaGroup = cachedDb.whatsappGroups.find((g) => g.groupId === 'wa-grp-msa-community');
        if (
          msaWaGroup &&
          msaWaGroup.inviteLink !== 'https://chat.whatsapp.com/F8DqIiNLEv27IY9vXE09UZ'
        ) {
          msaWaGroup.inviteLink = 'https://chat.whatsapp.com/F8DqIiNLEv27IY9vXE09UZ';
          migrated = true;
        }
      }
      if (!Array.isArray(cachedDb.whatsappMessages)) {
        cachedDb.whatsappMessages = seedDb.whatsappMessages;
        migrated = true;
      }
      if (!cachedDb.whatsappSecrets || typeof cachedDb.whatsappSecrets !== 'object') {
        cachedDb.whatsappSecrets = {};
        migrated = true;
      }
      if (!Array.isArray(cachedDb.clubBroadcasts)) {
        cachedDb.clubBroadcasts = seedDb.clubBroadcasts;
        migrated = true;
      } else {
        for (const b of cachedDb.clubBroadcasts) {
          if (b.clubId === 'club-ai' && b.whatsappInviteLink !== 'https://chat.whatsapp.com/LiEAv8DRlII7pMqN60PGj6') {
            b.whatsappInviteLink = 'https://chat.whatsapp.com/LiEAv8DRlII7pMqN60PGj6';
            migrated = true;
          }
          if (b.clubId === 'club-msa' && b.whatsappInviteLink !== 'https://chat.whatsapp.com/F8DqIiNLEv27IY9vXE09UZ') {
            b.whatsappInviteLink = 'https://chat.whatsapp.com/F8DqIiNLEv27IY9vXE09UZ';
            migrated = true;
          }
        }
      }
      if (!Array.isArray(cachedDb.blogPosts)) {
        cachedDb.blogPosts = seedDb.blogPosts;
        migrated = true;
      } else {
        for (const bp of cachedDb.blogPosts) {
          if (bp.category === 'Club News') {
            bp.category = 'News';
            migrated = true;
          }
        }
        if (!cachedDb.blogPosts.some((bp) => bp.blogPostId === 'blog-ai-103')) {
          const aiNews = seedDb.blogPosts.find((bp) => bp.blogPostId === 'blog-ai-103');
          if (aiNews) {
            cachedDb.blogPosts.push(aiNews);
            migrated = true;
          }
        }
      }
      if (!cachedDb.clubBlogTaxonomies || typeof cachedDb.clubBlogTaxonomies !== 'object') {
        cachedDb.clubBlogTaxonomies = seedDb.clubBlogTaxonomies;
        migrated = true;
      }
      const removedClubIds = new Set(['club-data', 'club-psych', 'club-cyber']);
      const removedUserIds = new Set(['usr-lead-data', 'usr-lead-psych']);

      const needsRosterSync =
        (cachedDb.clubs ?? []).some((c) => removedClubIds.has(c.clubId)) ||
        cachedDb.clubs?.find((c) => c.clubId === 'club-ai')?.name !== 'Artificial Intelligence Club' ||
        cachedDb.clubs?.find((c) => c.clubId === 'club-msa')?.name !== 'Muslim Student Association (MSA)' ||
        !(cachedDb.clubs ?? []).some((c) => c.clubId === 'club-msa') ||
        (cachedDb.clubs ?? []).length < seedDb.clubs.length;

      if (needsRosterSync) {
        // Purge removed clubs & demo users cleanly
        cachedDb.clubs = (cachedDb.clubs ?? []).filter((c) => !removedClubIds.has(c.clubId));
        cachedDb.users = (cachedDb.users ?? []).filter((u) => !removedUserIds.has(u.userId));
        cachedDb.memberships = (cachedDb.memberships ?? []).filter(
          (m) => !removedClubIds.has(m.clubId) && !removedUserIds.has(m.userId)
        );
        cachedDb.socialAccounts = (cachedDb.socialAccounts ?? []).filter(
          (a) => !removedClubIds.has(a.clubId)
        );
        cachedDb.accountRequests = (cachedDb.accountRequests ?? []).filter(
          (r) => !removedClubIds.has(r.clubId)
        );
        cachedDb.posts = (cachedDb.posts ?? []).filter((p) => !removedClubIds.has(p.clubId));
        cachedDb.events = (cachedDb.events ?? []).filter((ev) => !removedClubIds.has(ev.clubId));
        cachedDb.eventAttendanceRecords = (cachedDb.eventAttendanceRecords ?? []).filter(
          (rec) => !removedClubIds.has(rec.clubId)
        );
        cachedDb.clubTasks = (cachedDb.clubTasks ?? []).filter((t) => !removedClubIds.has(t.clubId));
        cachedDb.forumThreads = (cachedDb.forumThreads ?? []).filter(
          (thr) => !removedClubIds.has(thr.clubId)
        );
        cachedDb.joinRequests = (cachedDb.joinRequests ?? []).filter(
          (jr) => !removedClubIds.has(jr.clubId)
        );
        cachedDb.officerTransitions = (cachedDb.officerTransitions ?? []).filter(
          (trn) => !removedClubIds.has(trn.clubId)
        );
        cachedDb.resourceSubmissions = (cachedDb.resourceSubmissions ?? []).filter(
          (sub) => !removedClubIds.has(sub.clubId)
        );
        cachedDb.reshareRequests = (cachedDb.reshareRequests ?? []).filter(
          (r) => !removedClubIds.has(r.sourceClubId) && !removedClubIds.has(r.targetClubId)
        );
        cachedDb.analytics = (cachedDb.analytics ?? []).filter((m) => !removedClubIds.has(m.clubId));
        cachedDb.invitations = (cachedDb.invitations ?? []).filter(
          (inv) => !removedClubIds.has(inv.clubId)
        );
        cachedDb.auditLogs = (cachedDb.auditLogs ?? []).filter(
          (log) => !log.clubId || !removedClubIds.has(log.clubId)
        );
        cachedDb.notifications = (cachedDb.notifications ?? []).filter(
          (n) => !n.clubId || !removedClubIds.has(n.clubId)
        );
        cachedDb.inboxMessages = (cachedDb.inboxMessages ?? []).filter(
          (msg) => !removedClubIds.has(msg.clubId)
        );

        // Sync club-ai -> Artificial Intelligence Club & club-msa -> Muslim Student Association (MSA) + catalog order
        const existingClubMap = new Map((cachedDb.clubs ?? []).map((c) => [c.clubId, c]));
        const syncedClubs: Club[] = [];
        for (const seedClub of seedDb.clubs) {
          const existing = existingClubMap.get(seedClub.clubId);
          if (existing) {
            if (seedClub.clubId === 'club-ai' || seedClub.clubId === 'club-msa') {
              existing.name = seedClub.name;
              existing.shortCode = seedClub.shortCode;
              existing.description = seedClub.description;
              existing.category = seedClub.category;
            }
            syncedClubs.push(existing);
            existingClubMap.delete(seedClub.clubId);
          } else {
            syncedClubs.push(seedClub);
          }
        }
        // Preserve any custom admin-created clubs appended after seed catalog
        for (const customClub of existingClubMap.values()) {
          syncedClubs.push(customClub);
        }
        cachedDb.clubs = syncedClubs;

        // Sync AI Club & MSA name references on existing records
        for (const acc of cachedDb.socialAccounts) {
          if (acc.clubId === 'club-ai') {
            acc.accountName = acc.accountName.replace(/CUNY SPS AI Club/g, 'Artificial Intelligence Club');
          }
          if (acc.clubId === 'club-msa') {
            acc.accountName = acc.accountName.replace(/CUNY SPS MSA/g, 'Muslim Student Association (MSA)');
          }
        }
        for (const req of cachedDb.accountRequests) {
          if (req.clubId === 'club-ai') {
            req.clubName = 'Artificial Intelligence Club';
          }
          if (req.clubId === 'club-msa') {
            req.clubName = 'Muslim Student Association (MSA)';
          }
        }
        for (const jr of cachedDb.joinRequests) {
          if (jr.clubId === 'club-ai') {
            jr.clubName = 'Artificial Intelligence Club';
          }
          if (jr.clubId === 'club-msa') {
            jr.clubName = 'Muslim Student Association (MSA)';
          }
        }
        for (const sub of cachedDb.resourceSubmissions) {
          if (sub.clubId === 'club-ai') {
            sub.clubName = 'Artificial Intelligence Club';
          }
          if (sub.clubId === 'club-msa') {
            sub.clubName = 'Muslim Student Association (MSA)';
          }
          if (Array.isArray(sub.coSponsorClubIds)) {
            sub.coSponsorClubIds = sub.coSponsorClubIds.map((id) =>
              id === 'club-data' ? 'club-women-stem' : id
            );
          }
          if (Array.isArray(sub.budgetSplits)) {
            sub.budgetSplits = sub.budgetSplits.map((split) =>
              split.clubId === 'club-data'
                ? { ...split, clubId: 'club-women-stem', clubShortCode: 'WSTEM' }
                : split
            );
          }
        }
        for (const rsh of cachedDb.reshareRequests) {
          if (rsh.targetClubId === 'club-msa') {
            rsh.targetClubName = 'Muslim Student Association (MSA)';
            rsh.note = rsh.note?.replace(/CUNY SPS MSA/g, 'Muslim Student Association (MSA)');
          }
        }
        for (const tsk of cachedDb.clubTasks) {
          if (tsk.clubId === 'club-msa' && tsk.linkedEventTitle) {
            tsk.linkedEventTitle = tsk.linkedEventTitle.replace(
              /CUNY SPS MSA/g,
              'Muslim Student Association (MSA)'
            );
          }
        }
        for (const post of cachedDb.posts) {
          if (post.clubId === 'club-msa') {
            post.caption = post.caption.replace(/CUNY SPS MSA/g, 'Muslim Student Association (MSA)');
            if (post.relatedEvent) {
              post.relatedEvent = post.relatedEvent.replace(
                /CUNY SPS MSA/g,
                'Muslim Student Association (MSA)'
              );
            }
          }
        }
        for (const log of cachedDb.auditLogs) {
          if (log.clubId === 'club-msa') {
            log.target = log.target.replace(/CUNY SPS MSA/g, 'Muslim Student Association (MSA)');
            log.details = log.details.replace(/CUNY SPS MSA/g, 'Muslim Student Association (MSA)');
          }
        }
        for (const n of cachedDb.notifications) {
          n.title = n.title.replace(/CUNY SPS MSA/g, 'Muslim Student Association (MSA)');
        }
        for (const ev of cachedDb.events) {
          if (ev.clubId === 'club-msa') {
            ev.title = ev.title.replace(/CUNY SPS MSA/g, 'Muslim Student Association (MSA)');
          }
          if (Array.isArray(ev.coSponsorClubIds)) {
            ev.coSponsorClubIds = ev.coSponsorClubIds.map((id) =>
              id === 'club-data' ? 'club-women-stem' : id
            );
          }
          if (ev.eventId === 'evt-1' && ev.description.includes('DSAS')) {
            ev.description = ev.description.replace('DSAS', 'Women in STEM Club');
          }
        }

        // Update scoped admin club assignment
        const scopedAdmin = cachedDb.users.find((u) => u.userId === 'usr-sl-scoped');
        if (scopedAdmin) {
          scopedAdmin.assignedAdminClubIds = Array.from(
            new Set([
              ...(scopedAdmin.assignedAdminClubIds ?? []).filter((id) => !removedClubIds.has(id)),
              'club-ai',
              'club-msa',
            ])
          );
        }

        // Upsert CUNY SPS MSA lead & starter records if not yet present
        if (!cachedDb.users.some((u) => u.userId === 'usr-lead-msa')) {
          const msaLead = seedDb.users.find((u) => u.userId === 'usr-lead-msa');
          if (msaLead) cachedDb.users.push(msaLead);
        }
        for (const mem of seedDb.memberships) {
          if (mem.clubId === 'club-msa' && !cachedDb.memberships.some((m) => m.userId === mem.userId && m.clubId === mem.clubId)) {
            cachedDb.memberships.push(mem);
          }
        }
        for (const acc of seedDb.socialAccounts) {
          if (acc.clubId === 'club-msa' && !cachedDb.socialAccounts.some((a) => a.accountId === acc.accountId)) {
            cachedDb.socialAccounts.push(acc);
          }
        }
        for (const ev of seedDb.events) {
          if ((ev.clubId === 'club-msa' || ev.clubId === 'club-social-impact') && !cachedDb.events.some((e) => e.eventId === ev.eventId)) {
            cachedDb.events.push(ev);
          }
        }
        for (const rec of seedDb.eventAttendanceRecords) {
          if (rec.clubId === 'club-msa' && !cachedDb.eventAttendanceRecords.some((r) => r.recordId === rec.recordId)) {
            cachedDb.eventAttendanceRecords.push(rec);
          }
        }
        for (const met of seedDb.analytics) {
          if (met.clubId === 'club-msa' && !cachedDb.analytics.some((m) => m.metricId === met.metricId)) {
            cachedDb.analytics.push(met);
          }
        }
        for (const sub of seedDb.resourceSubmissions) {
          if (sub.clubId === 'club-msa' && !cachedDb.resourceSubmissions.some((s) => s.submissionId === sub.submissionId)) {
            cachedDb.resourceSubmissions.push(sub);
          }
        }
        for (const req of seedDb.accountRequests) {
          if (req.clubId === 'club-msa' && !cachedDb.accountRequests.some((r) => r.requestId === req.requestId)) {
            cachedDb.accountRequests.push(req);
          }
        }
        for (const thr of seedDb.forumThreads) {
          if (thr.clubId === 'club-msa' && !cachedDb.forumThreads.some((t) => t.threadId === thr.threadId)) {
            cachedDb.forumThreads.push(thr);
          }
        }
        for (const tsk of seedDb.clubTasks) {
          if (tsk.clubId === 'club-msa' && !cachedDb.clubTasks.some((t) => t.taskId === tsk.taskId)) {
            cachedDb.clubTasks.push(tsk);
          }
        }
        for (const trn of seedDb.officerTransitions) {
          if (trn.clubId === 'club-msa' && !cachedDb.officerTransitions.some((t) => t.transitionId === trn.transitionId)) {
            cachedDb.officerTransitions.push(trn);
          }
        }

        migrated = true;
      }

      if (!cachedDb.budgetBaseline500Migrated) {
        for (const c of cachedDb.clubs ?? []) {
          c.semesterBudgetAllocatedUsd = 500;
        }
        cachedDb.budgetBaseline500Migrated = true;
        migrated = true;
      }
      for (const c of cachedDb.clubs ?? []) {
        if (typeof c.semesterBudgetAllocatedUsd !== 'number') {
          c.semesterBudgetAllocatedUsd = 500;
          migrated = true;
        }
      }
      if (!cachedDb.resourceSubmissions.some((s) => s.submissionId === 'SUB-2026-103')) {
        const sub103 = createInitialResourceSubmissions().find(
          (s) => s.submissionId === 'SUB-2026-103'
        );
        if (sub103) {
          cachedDb.resourceSubmissions.unshift(sub103);
          migrated = true;
        }
      }
      for (const trn of cachedDb.officerTransitions ?? []) {
        if (typeof trn.requiresAdvisorSignOff !== 'boolean') {
          trn.requiresAdvisorSignOff = true;
          migrated = true;
        }
      }
      if (!cachedDb.events.some((e) => e.eventId === 'evt-6')) {
        const target = new Date(Date.now() + 18 * 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        cachedDb.events.push({
          eventId: 'evt-6',
          clubId: 'club-ai',
          title: 'AI Club Meeting',
          date: `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`,
          time: `${pad(target.getHours())}:00`,
          location: 'Zoom / CUNY SPS Virtual Commons',
          description: 'Open Q&A for project teams ahead of weekly club build demos.',
          eventType: 'Club Meeting',
          postedByName: 'Aisha Rahman',
          isPublic: true,
          checkInCode: 'AI6001',
          checkedInUserIds: [],
          guestWalkInCount: 0,
          rsvpUserIds: ['usr-lead-ai', 'usr-editor-ai'],
        });
        migrated = true;
      }
      const seedDefaults: Record<string, string[]> = {
        'evt-1': ['usr-lead-ai', 'usr-editor-ai', 'usr-contrib-ai', 'usr-viewer-ai'],
        'evt-2': ['usr-editor-ai', 'usr-contrib-ai'],
        'evt-3': ['usr-contrib-ai'],
        'evt-4': ['usr-lead-msa', 'usr-lead-ai'],
        'evt-5': ['usr-lead-ai'],
      };
      for (const ev of cachedDb.events ?? []) {
        if (!Array.isArray(ev.rsvpUserIds)) {
          ev.rsvpUserIds = seedDefaults[ev.eventId] ?? [];
          migrated = true;
        }
        if (!ev.checkInCode) {
          ev.checkInCode = `${ev.clubId.replace('club-', '').slice(0, 2).toUpperCase()}${ev.eventId.replace(/[^0-9]/g, '').padStart(4, '0').slice(-4)}`;
          migrated = true;
        }
        if (!Array.isArray(ev.checkedInUserIds)) {
          ev.checkedInUserIds = [];
          migrated = true;
        }
        if (typeof ev.isPublic !== 'boolean') {
          ev.isPublic = true;
          migrated = true;
        }
        if (!ev.approvalStatus) {
          ev.approvalStatus = 'Approved';
          migrated = true;
        }
        if (ev.eventId === 'evt-9' && ev.clubId === 'club-black-student-union') {
          ev.clubId = 'club-bsu';
          migrated = true;
        }
      }
      if (!cachedDb.publicCatalogEventsSeeded) {
        const extraSeedEvents = createInitialDatabase().events.filter((e) =>
          ['evt-7', 'evt-8', 'evt-9', 'evt-10'].includes(e.eventId)
        );
        for (const extra of extraSeedEvents) {
          if (!cachedDb.events.some((ev) => ev.eventId === extra.eventId)) {
            cachedDb.events.push(extra);
          }
        }
        cachedDb.publicCatalogEventsSeeded = true;
        migrated = true;
      }
      for (const thr of cachedDb.forumThreads ?? []) {
        if (!Array.isArray(thr.subscriberUserIds)) {
          thr.subscriberUserIds = [thr.authorId];
          migrated = true;
        }
      }
      if (migrated) {
        saveDb();
      }
      return cachedDb;
    }
  } catch {
    // Fall back to fresh seed if store file is malformed
  }
  cachedDb = createInitialDatabase();
  saveDb();
  return cachedDb;
}

export function saveDb(): void {
  if (!cachedDb) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(cachedDb, null, 2), 'utf-8');
  } catch {
    // Keep operating in memory if disk write is restricted
  }
}

export function resetDb(): HubDatabase {
  cachedDb = createInitialDatabase();
  saveDb();
  return cachedDb;
}

export function recordAudit(entry: Omit<AuditLog, 'eventId' | 'timestamp'>): AuditLog {
  const db = getDb();
  const nextNum = 9050 + db.auditLogs.length;
  const log: AuditLog = {
    eventId: `AUD-${nextNum}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  db.auditLogs.unshift(log);
  saveDb();
  return log;
}

export function pushNotification(entry: Omit<NotificationItem, 'notificationId' | 'createdAt' | 'read'>): void {
  const db = getDb();
  db.notifications.unshift({
    notificationId: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    read: false,
    createdAt: new Date().toISOString(),
    ...entry,
  });
  saveDb();
}
