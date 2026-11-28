/**
 * Ecosystem State & Role-Based Store for CUNY SPS Club Social Hub
 * Supports the 3 distinct access layers:
 *   - Layer 1: General Students / Public Visitors (No login required)
 *   - Layer 2: Club Members & Club Leaders / Executives (CUNY email login)
 *   - Layer 3: Student Association & Platform Admins (Parsh, Anthony)
 */

import {
  isSupabaseConfigured,
  fetchJoinRequestsFromSupabase,
  upsertJoinRequestToSupabase,
  fetchBudgetRequestsFromSupabase,
  upsertBudgetRequestToSupabase,
  fetchCollabRequestsFromSupabase,
  upsertCollabRequestToSupabase,
  fetchMembersFromSupabase,
  upsertMemberToSupabase,
  subscribeToRealtimeEcosystem,
} from '../lib/supabaseClient';

export type UserRoleLayer = 'GUEST' | 'MEMBER' | 'LEADER' | 'ADMIN';

export interface EcosystemUser {
  userId: string;
  name: string;
  email: string;
  roleLayer: UserRoleLayer;
  title: string;
  departmentOrMajor: string;
  associatedClubId?: string;
  associatedClubName?: string;
  isPlatformAdmin?: boolean;
  avatarInitials: string;
}

export interface ClubMemberRecord {
  memberId: string;
  clubId: string;
  clubName: string;
  name: string;
  email: string;
  major?: string;
  role: 'President / Co-Chair' | 'Vice President' | 'Treasurer' | 'Secretary' | 'Social Media Lead' | 'Active Member' | 'Faculty Advisor';
  joinedDate?: string;
  status: 'Active' | 'Alumni' | 'Pending';
}

export interface JoinClubRequest {
  id: string;
  clubId: string;
  clubName: string;
  studentName: string;
  studentEmail: string;
  major: string;
  interestReason: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface BudgetRequest {
  id: string;
  clubId: string;
  clubName: string;
  submittedBy: string;
  submitterEmail: string;
  title: string;
  amount: number;
  category: 'Event Supplies & Refreshments' | 'Guest Speaker Honorarium' | 'Software & Compute Licenses' | 'Marketing & Merchandise' | 'Conference & Competition Travel';
  justification: string;
  intendedEventDate?: string;
  submittedAt: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  adminDecisionNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface CollaborationRequest {
  id: string;
  initiatingClubId: string;
  initiatingClubName: string;
  targetClubId: string;
  targetClubName: string;
  submittedBy: string;
  submitterEmail: string;
  eventTitle: string;
  proposedDate: string;
  proposedFormat: 'Virtual (Zoom)' | 'In-Person (Manhattan Campus)' | 'Hybrid';
  pitchDescription: string;
  expectedAttendees: number;
  submittedAt: string;
  status: 'Pending' | 'Accepted' | 'Declined';
  responseNotes?: string;
  respondedBy?: string;
  respondedAt?: string;
}

// Preloaded Institutional Personas for 3 Access Layers
export const DEFAULT_PERSONAS: EcosystemUser[] = [
  // Layer 3: Student Association & Platform Admins
  {
    userId: 'admin-parsh',
    name: 'Parshotam Lal (Parsh)',
    email: 'Parshotam.Lal@cuny.edu',
    roleLayer: 'ADMIN',
    title: 'Student Association Co-Chair / Platform Admin',
    departmentOrMajor: 'Student Association Executive Board',
    isPlatformAdmin: true,
    avatarInitials: 'PL',
  },
  {
    userId: 'admin-anthony',
    name: 'Anthony Sweeney',
    email: 'anthony.sweeney@cuny.edu',
    roleLayer: 'ADMIN',
    title: 'Student Life Systems Admin',
    departmentOrMajor: 'Office of Student Life',
    isPlatformAdmin: true,
    avatarInitials: 'AS',
  },

  // Layer 2: Club Leaders / Executives - AI Club
  {
    userId: 'lead-ai-abdul',
    name: 'Abdul Rahman',
    email: 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu',
    roleLayer: 'LEADER',
    title: 'AI Club President',
    departmentOrMajor: 'CUNY SPS Student',
    associatedClubId: 'club-ai',
    associatedClubName: 'AI Club',
    avatarInitials: 'AR',
  },
  {
    userId: 'lead-ai-mehreen',
    name: 'Mehreen Gillani',
    email: 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu',
    roleLayer: 'LEADER',
    title: 'AI Club Secretary',
    departmentOrMajor: 'CUNY SPS Student',
    associatedClubId: 'club-ai',
    associatedClubName: 'AI Club',
    avatarInitials: 'MG',
  },
  {
    userId: 'lead-ai-alina',
    name: 'Alina Repin',
    email: 'alina.repin79@login.cuny.edu',
    roleLayer: 'LEADER',
    title: 'AI Club Treasurer',
    departmentOrMajor: 'CUNY SPS Student',
    associatedClubId: 'club-ai',
    associatedClubName: 'AI Club',
    avatarInitials: 'AR',
  },

  // Layer 2: Club Leaders / Executives - MSA
  {
    userId: 'lead-msa-abdul',
    name: 'Abdul Rahman',
    email: 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu',
    roleLayer: 'LEADER',
    title: 'MSA President',
    departmentOrMajor: 'CUNY SPS Student',
    associatedClubId: 'club-msa',
    associatedClubName: 'Muslim Students Association (MSA)',
    avatarInitials: 'AR',
  },
  {
    userId: 'lead-msa-vasilah',
    name: 'Vasilah Siddiqui',
    email: 'Vasilah.Siddiqui42@login.cuny.edu',
    roleLayer: 'LEADER',
    title: 'MSA Vice President',
    departmentOrMajor: 'CUNY SPS Student',
    associatedClubId: 'club-msa',
    associatedClubName: 'Muslim Students Association (MSA)',
    avatarInitials: 'VS',
  },
  {
    userId: 'lead-msa-sarosh',
    name: 'Sarosh Karim',
    email: 'SAROSH.KARIM45@login.cuny.edu',
    roleLayer: 'LEADER',
    title: 'MSA Secretary',
    departmentOrMajor: 'CUNY SPS Student',
    associatedClubId: 'club-msa',
    associatedClubName: 'Muslim Students Association (MSA)',
    avatarInitials: 'SK',
  },
  {
    userId: 'lead-msa-mehreen',
    name: 'Mehreen Gillani',
    email: 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu',
    roleLayer: 'LEADER',
    title: 'MSA Treasurer',
    departmentOrMajor: 'CUNY SPS Student',
    associatedClubId: 'club-msa',
    associatedClubName: 'Muslim Students Association (MSA)',
    avatarInitials: 'MG',
  },
  {
    userId: 'lead-msa-asma',
    name: 'Asma Essaedi',
    email: 'ASMA.ESSAEDI89@stu-mail.sps.cuny.edu',
    roleLayer: 'LEADER',
    title: 'Marketing Lead & Social Media Coordinator',
    departmentOrMajor: 'CUNY SPS Student',
    associatedClubId: 'club-msa',
    associatedClubName: 'Muslim Students Association (MSA)',
    avatarInitials: 'AE',
  },
];

// Official Verified Member Directory Rosters (Zero Dummy Records)
const INITIAL_MEMBERS: ClubMemberRecord[] = [
  // AI Club Verified Executive Board
  {
    memberId: 'mem-ai-001',
    clubId: 'club-ai',
    clubName: 'AI Club',
    name: 'Abdul Rahman',
    email: 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu',
    role: 'President / Co-Chair',
    status: 'Active',
  },
  {
    memberId: 'mem-ai-002',
    clubId: 'club-ai',
    clubName: 'AI Club',
    name: 'Mehreen Gillani',
    email: 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu',
    role: 'Secretary',
    status: 'Active',
  },
  {
    memberId: 'mem-ai-003',
    clubId: 'club-ai',
    clubName: 'AI Club',
    name: 'Alina Repin',
    email: 'alina.repin79@login.cuny.edu',
    role: 'Treasurer',
    status: 'Active',
  },

  // MSA Verified Executive Board
  {
    memberId: 'mem-msa-001',
    clubId: 'club-msa',
    clubName: 'Muslim Students Association (MSA)',
    name: 'Abdul Rahman',
    email: 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu',
    role: 'President / Co-Chair',
    status: 'Active',
  },
  {
    memberId: 'mem-msa-002',
    clubId: 'club-msa',
    clubName: 'Muslim Students Association (MSA)',
    name: 'Vasilah Siddiqui',
    email: 'Vasilah.Siddiqui42@login.cuny.edu',
    role: 'Vice President',
    status: 'Active',
  },
  {
    memberId: 'mem-msa-003',
    clubId: 'club-msa',
    clubName: 'Muslim Students Association (MSA)',
    name: 'Sarosh Karim',
    email: 'SAROSH.KARIM45@login.cuny.edu',
    role: 'Secretary',
    status: 'Active',
  },
  {
    memberId: 'mem-msa-004',
    clubId: 'club-msa',
    clubName: 'Muslim Students Association (MSA)',
    name: 'Mehreen Gillani',
    email: 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu',
    role: 'Treasurer',
    status: 'Active',
  },
  {
    memberId: 'mem-msa-005',
    clubId: 'club-msa',
    clubName: 'Muslim Students Association (MSA)',
    name: 'Asma Essaedi',
    email: 'ASMA.ESSAEDI89@stu-mail.sps.cuny.edu',
    role: 'Social Media Lead',
    status: 'Active',
  },
];

// Clean queues: Start fresh without fabricated dummy requests
const INITIAL_JOIN_REQUESTS: JoinClubRequest[] = [];
const INITIAL_BUDGET_REQUESTS: BudgetRequest[] = [];
const INITIAL_COLLAB_REQUESTS: CollaborationRequest[] = [];

/**
 * Find all matching personas for an email (case-insensitive & trimmed).
 * If a leader has multiple roles (e.g. Abdul Rahman in AI Club and MSA), returns all matching personas.
 */
export function findPersonasByEmail(email: string): EcosystemUser[] {
  if (!email) return [];
  const normalized = email.trim().toLowerCase();
  return DEFAULT_PERSONAS.filter((p) => p.email.trim().toLowerCase() === normalized);
}

/**
 * Validates whether an email belongs to CUNY SPS / CUNY identity system
 */
export function isCunyEmailAddress(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.trim().toLowerCase().split('@')[1];
  return (
    domain === 'login.cuny.edu' ||
    domain === 'stu-mail.sps.cuny.edu' ||
    domain === 'spsmail.cuny.edu' ||
    domain === 'cuny.edu' ||
    domain.endsWith('.cuny.edu')
  );
}

const STORAGE_KEYS = {
  CURRENT_USER: 'cuny_hub_current_user_v6',
  MEMBERS: 'cuny_hub_members_v6',
  JOIN_REQUESTS: 'cuny_hub_join_requests_v6',
  BUDGET_REQUESTS: 'cuny_hub_budget_requests_v6',
  COLLAB_REQUESTS: 'cuny_hub_collab_requests_v6',
};

class EcosystemStore {
  private currentUser: EcosystemUser | null = null;
  private members: ClubMemberRecord[] = INITIAL_MEMBERS;
  private joinRequests: JoinClubRequest[] = INITIAL_JOIN_REQUESTS;
  private budgetRequests: BudgetRequest[] = INITIAL_BUDGET_REQUESTS;
  private collabRequests: CollaborationRequest[] = INITIAL_COLLAB_REQUESTS;
  private listeners: Set<() => void> = new Set();
  private realtimeUnsubscribe: (() => void) | null = null;
  private isSyncingWithCloud = false;

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined' && isSupabaseConfigured) {
      this.initSupabaseSync();
    }
  }

  public isCloudSyncActive(): boolean {
    return isSupabaseConfigured;
  }

  public getIsSyncing(): boolean {
    return this.isSyncingWithCloud;
  }

  private async initSupabaseSync() {
    await this.syncFromSupabase();

    if (this.realtimeUnsubscribe) {
      this.realtimeUnsubscribe();
    }

    this.realtimeUnsubscribe = subscribeToRealtimeEcosystem((table, eventType, payload) => {
      console.log(`[Supabase Realtime] Change on ${table} (${eventType}):`, payload);
      this.syncFromSupabase();
    });
  }

  public async syncFromSupabase() {
    if (!isSupabaseConfigured) return;
    this.isSyncingWithCloud = true;
    this.notify();

    try {
      const [remoteJoins, remoteBudgets, remoteCollabs, remoteMembers] = await Promise.all([
        fetchJoinRequestsFromSupabase(),
        fetchBudgetRequestsFromSupabase(),
        fetchCollabRequestsFromSupabase(),
        fetchMembersFromSupabase(),
      ]);

      if (remoteJoins && remoteJoins.length > 0) {
        this.joinRequests = remoteJoins;
      }
      if (remoteBudgets && remoteBudgets.length > 0) {
        this.budgetRequests = remoteBudgets;
      }
      if (remoteCollabs && remoteCollabs.length > 0) {
        this.collabRequests = remoteCollabs;
      }
      if (remoteMembers && remoteMembers.length > 0) {
        this.members = remoteMembers;
      }

      this.saveToStorage();
    } catch (err) {
      console.warn('[Supabase Sync] Error during background synchronization:', err);
    } finally {
      this.isSyncingWithCloud = false;
      this.notify();
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedUser) this.currentUser = JSON.parse(savedUser);

      const savedMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (savedMembers) this.members = JSON.parse(savedMembers);

      const savedJoins = localStorage.getItem(STORAGE_KEYS.JOIN_REQUESTS);
      if (savedJoins) this.joinRequests = JSON.parse(savedJoins);

      const savedBudgets = localStorage.getItem(STORAGE_KEYS.BUDGET_REQUESTS);
      if (savedBudgets) this.budgetRequests = JSON.parse(savedBudgets);

      const savedCollabs = localStorage.getItem(STORAGE_KEYS.COLLAB_REQUESTS);
      if (savedCollabs) this.collabRequests = JSON.parse(savedCollabs);
    } catch (e) {
      console.warn('Failed to load ecosystem data from localStorage', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      if (this.currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(this.members));
      localStorage.setItem(STORAGE_KEYS.JOIN_REQUESTS, JSON.stringify(this.joinRequests));
      localStorage.setItem(STORAGE_KEYS.BUDGET_REQUESTS, JSON.stringify(this.budgetRequests));
      localStorage.setItem(STORAGE_KEYS.COLLAB_REQUESTS, JSON.stringify(this.collabRequests));
    } catch (e) {
      console.warn('Failed to save ecosystem data to localStorage', e);
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error(err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Auth & Session
  public getCurrentUser(): EcosystemUser | null {
    return this.currentUser;
  }

  public getRoleLayer(): UserRoleLayer {
    return this.currentUser?.roleLayer ?? 'GUEST';
  }

  public setCurrentUser(user: EcosystemUser | null) {
    this.currentUser = user;
    this.saveToStorage();
  }

  public logout() {
    this.currentUser = null;
    this.saveToStorage();
  }

  // Members & Rosters
  public getMembers(clubId?: string): ClubMemberRecord[] {
    if (clubId) {
      return this.members.filter((m) => m.clubId === clubId);
    }
    return this.members;
  }

  public getClubMembershipCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.members.forEach((m) => {
      counts[m.clubId] = (counts[m.clubId] || 0) + 1;
    });
    return counts;
  }

  // Student -> Club Join Requests
  public getJoinRequests(clubId?: string): JoinClubRequest[] {
    if (clubId) {
      return this.joinRequests.filter((r) => r.clubId === clubId);
    }
    return this.joinRequests;
  }

  public submitJoinRequest(req: Omit<JoinClubRequest, 'id' | 'submittedAt' | 'status'>): JoinClubRequest {
    const newReq: JoinClubRequest = {
      ...req,
      id: `req-join-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'Pending',
    };
    this.joinRequests = [newReq, ...this.joinRequests];
    this.saveToStorage();
    if (isSupabaseConfigured) {
      upsertJoinRequestToSupabase(newReq);
    }
    return newReq;
  }

  public reviewJoinRequest(id: string, status: 'Approved' | 'Rejected', reviewerName: string) {
    let targetUpdated: JoinClubRequest | undefined;
    let newlyCreatedMember: ClubMemberRecord | undefined;

    this.joinRequests = this.joinRequests.map((r) => {
      if (r.id === id) {
        targetUpdated = {
          ...r,
          status,
          reviewedBy: reviewerName,
          reviewedAt: new Date().toISOString(),
        };
        return targetUpdated;
      }
      return r;
    });

    // If approved, automatically add student to Club Members roster!
    if (status === 'Approved') {
      const targetReq = this.joinRequests.find((r) => r.id === id);
      if (targetReq && !this.members.some((m) => m.email.toLowerCase() === targetReq.studentEmail.toLowerCase() && m.clubId === targetReq.clubId)) {
        newlyCreatedMember = {
          memberId: `mem-${Date.now()}`,
          clubId: targetReq.clubId,
          clubName: targetReq.clubName,
          name: targetReq.studentName,
          email: targetReq.studentEmail,
          major: targetReq.major,
          role: 'Active Member',
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'Active',
        };
        this.members = [...this.members, newlyCreatedMember];
      }
    }

    this.saveToStorage();

    if (isSupabaseConfigured) {
      if (targetUpdated) upsertJoinRequestToSupabase(targetUpdated);
      if (newlyCreatedMember) upsertMemberToSupabase(newlyCreatedMember);
    }
  }

  // Club Leader -> Admin Budget Requests
  public getBudgetRequests(clubId?: string): BudgetRequest[] {
    if (clubId) {
      return this.budgetRequests.filter((b) => b.clubId === clubId);
    }
    return this.budgetRequests;
  }

  public submitBudgetRequest(req: Omit<BudgetRequest, 'id' | 'submittedAt' | 'status'>): BudgetRequest {
    const newReq: BudgetRequest = {
      ...req,
      id: `bgt-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'Submitted',
    };
    this.budgetRequests = [newReq, ...this.budgetRequests];
    this.saveToStorage();
    if (isSupabaseConfigured) {
      upsertBudgetRequestToSupabase(newReq);
    }
    return newReq;
  }

  public reviewBudgetRequest(
    id: string,
    status: 'Approved' | 'Rejected' | 'Under Review',
    reviewerName: string,
    adminNotes?: string
  ) {
    let targetUpdated: BudgetRequest | undefined;

    this.budgetRequests = this.budgetRequests.map((b) => {
      if (b.id === id) {
        targetUpdated = {
          ...b,
          status,
          adminDecisionNotes: adminNotes ?? b.adminDecisionNotes,
          reviewedBy: reviewerName,
          reviewedAt: new Date().toISOString(),
        };
        return targetUpdated;
      }
      return b;
    });
    this.saveToStorage();

    if (isSupabaseConfigured && targetUpdated) {
      upsertBudgetRequestToSupabase(targetUpdated);
    }
  }

  // Club Leader -> Other Clubs Collaboration Requests
  public getCollaborationRequests(clubId?: string): CollaborationRequest[] {
    if (clubId) {
      return this.collabRequests.filter(
        (c) => c.initiatingClubId === clubId || c.targetClubId === clubId
      );
    }
    return this.collabRequests;
  }

  public submitCollaborationRequest(
    req: Omit<CollaborationRequest, 'id' | 'submittedAt' | 'status'>
  ): CollaborationRequest {
    const newReq: CollaborationRequest = {
      ...req,
      id: `collab-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'Pending',
    };
    this.collabRequests = [newReq, ...this.collabRequests];
    this.saveToStorage();
    if (isSupabaseConfigured) {
      upsertCollabRequestToSupabase(newReq);
    }
    return newReq;
  }

  public reviewCollaborationRequest(
    id: string,
    status: 'Accepted' | 'Declined',
    responderName: string,
    responseNotes?: string
  ) {
    let targetUpdated: CollaborationRequest | undefined;

    this.collabRequests = this.collabRequests.map((c) => {
      if (c.id === id) {
        targetUpdated = {
          ...c,
          status,
          responseNotes: responseNotes ?? c.responseNotes,
          respondedBy: responderName,
          respondedAt: new Date().toISOString(),
        };
        return targetUpdated;
      }
      return c;
    });
    this.saveToStorage();

    if (isSupabaseConfigured && targetUpdated) {
      upsertCollabRequestToSupabase(targetUpdated);
    }
  }

  // Export Roster Data for CUNY Central Reporting
  public exportMembersCsv(clubId?: string): string {
    const records = this.getMembers(clubId);
    const headers = ['Member ID', 'Club ID', 'Club Name', 'Full Name', 'CUNY Email', 'Officer / Member Role', 'Status'];
    const rows = records.map((r) => [
      r.memberId,
      r.clubId,
      `"${r.clubName.replace(/"/g, '""')}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      r.email,
      `"${r.role}"`,
      r.status,
    ]);
    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  public exportEmailsText(clubId?: string): string {
    const records = this.getMembers(clubId);
    return Array.from(new Set(records.map((r) => r.email))).join('; ');
  }
}

export const ecosystemStore = new EcosystemStore();
