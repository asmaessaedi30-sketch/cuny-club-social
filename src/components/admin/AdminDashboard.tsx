import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { formatRoleLabel, useAuth } from '../../context/AuthContext';
import type {
  AccountRequest,
  AccountRequestStatus,
  AuditLog,
  BudgetIncreaseRequest,
  Club,
  ClubBudgetSummary,
  ClubEngagementFunnel,
  ClubStatus,
  Post,
  ResourceSubmission,
  SocialAccount,
} from '../../types';
import { ClubLogoMark, StudentLifeLogo } from '../BrandMarks';
import { ClubProfileEditor } from '../club/ClubProfileEditor';
import { StatusText } from '../StatusText';

export interface AdminMemberOverviewRow {
  membershipId: string;
  userId: string;
  clubId: string;
  role: string;
  officerTitle?: string;
  status: string;
  authorizedBy: string;
  authorizedAt: string;
  userName: string;
  userEmail: string;
  departmentOrMajor: string;
  userStatus: string;
  clubName: string;
  clubShortCode: string;
}

export interface AdminOverviewData {
  summary: {
    participatingClubs: number;
    totalClubs: number;
    connectedAccounts: number;
    pendingRequests: number;
    pendingBudgetRequests?: number;
    activeClubLeaders: number;
    securityAlerts: number;
    integrationIssues: number;
  };
  clubs: Club[];
  socialAccounts: (SocialAccount & { clubName: string })[];
  accountRequests: AccountRequest[];
  leaders: {
    membershipId: string;
    userId: string;
    clubId: string;
    role: string;
    status: string;
    authorizedBy: string;
    authorizedAt: string;
    userName: string;
    userEmail: string;
    clubName: string;
  }[];
  memberships?: AdminMemberOverviewRow[];
  auditLogs: AuditLog[];
  posts: Post[];
  eligibleUsers: { userId: string; name: string; email: string; departmentOrMajor: string }[];
  budgetLedgers?: ClubBudgetSummary[];
  budgetIncreaseRequests?: BudgetIncreaseRequest[];
  resourceSubmissions?: ResourceSubmission[];
  engagementFunnel?: ClubEngagementFunnel;
}

export type AdminWorkbenchSection =
  | 'overview'
  | 'workspaces'
  | 'leaders'
  | 'requests'
  | 'budget-requests'
  | 'memberships'
  | 'audit';

interface AdminDashboardProps {
  data: AdminOverviewData;
  onNavigate: (tab: string) => void;
  onOpenClubWorkspace: (clubId: string) => void;
  onRefresh?: () => Promise<void>;
}

const REQUEST_PIPELINE_STEPS: AccountRequestStatus[] = [
  'Submitted',
  'Under Student Life Review',
  'Awaiting CUNY Approval',
  'Approved for Setup',
  'Setup in Progress',
  'Connected',
];

const ALL_DECISION_STATUSES: AccountRequestStatus[] = [
  ...REQUEST_PIPELINE_STEPS,
  'More Information Required',
  'Rejected',
  'Cancelled',
  'Setup Blocked',
];

const AUDIT_CATEGORIES = [
  'All',
  'Authentication',
  'Governance',
  'Membership',
  'Publishing',
  'Integration',
  'AI',
] as const;

function csvEscape(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

export function AdminDashboard({
  data,
  onNavigate,
  onOpenClubWorkspace,
  onRefresh,
}: AdminDashboardProps) {
  const { apiFetch, session } = useAuth();
  const {
    summary,
    clubs,
    socialAccounts,
    accountRequests,
    leaders,
    auditLogs,
    eligibleUsers,
    memberships = [],
  } = data;

  const [activeSection, setActiveSection] = useState<AdminWorkbenchSection>('overview');
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Club Workspaces creation & filtering state
  const [showCreateClubForm, setShowCreateClubForm] = useState(false);
  const [clubSearch, setClubSearch] = useState('');
  const [clubStatusFilter, setClubStatusFilter] = useState<'All' | ClubStatus>('All');
  const [newClubName, setNewClubName] = useState('');
  const [newClubCode, setNewClubCode] = useState('');
  const [newClubCategory, setNewClubCategory] = useState('Academic & Research');
  const [newClubAdvisor, setNewClubAdvisor] = useState('');
  const [newClubDescription, setNewClubDescription] = useState('');
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [clubBusy, setClubBusy] = useState(false);
  const [updatingClubId, setUpdatingClubId] = useState<string | null>(null);
  const [editingClubProfileId, setEditingClubProfileId] = useState<string | null>(null);

  // Leader Authorization & Transfer state
  const [leaderClubId, setLeaderClubId] = useState(clubs[0]?.clubId ?? '');
  const [incomingUserId, setIncomingUserId] = useState(eligibleUsers[0]?.userId ?? '');
  const [outgoingUserId, setOutgoingUserId] = useState('');
  const [leaderReason, setLeaderReason] = useState('Verified semester officer authorization');
  const [leaderSearch, setLeaderSearch] = useState('');
  const [leaderBusy, setLeaderBusy] = useState(false);

  // Account Requests review & decision state
  const [requestFilter, setRequestFilter] = useState<'pending' | 'all' | 'resolved'>('pending');
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    accountRequests[0]?.requestId ?? ''
  );
  const [decisionStatus, setDecisionStatus] = useState<AccountRequestStatus>(
    'Awaiting CUNY Approval'
  );
  const [decisionAuthority, setDecisionAuthority] = useState('CUNY SPS Office of Student Life');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  // Membership Lists inspector state
  const [selectedRosterClubId, setSelectedRosterClubId] = useState<string>('ALL');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>('ALL');
  const [liveClubMembers, setLiveClubMembers] = useState<AdminMemberOverviewRow[] | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  // Audit Logs state
  const [liveAuditLogs, setLiveAuditLogs] = useState<AuditLog[] | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditQuery, setAuditQuery] = useState('');
  const [auditCategory, setAuditCategory] =
    useState<(typeof AUDIT_CATEGORIES)[number]>('All');
  const [securityOnly, setSecurityOnly] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Club Funding Increase Requests state
  const [budgetRequestFilter, setBudgetRequestFilter] = useState<'pending' | 'all' | 'resolved'>(
    'pending'
  );
  const [budgetApprovedAmounts, setBudgetApprovedAmounts] = useState<Record<string, string>>({});
  const [budgetDecisionNotes, setBudgetDecisionNotes] = useState<Record<string, string>>({});
  const [busyBudgetRequestId, setBusyBudgetRequestId] = useState<string | null>(null);

  const budgetIncreaseRequests = useMemo(
    () => data.budgetIncreaseRequests ?? [],
    [data.budgetIncreaseRequests]
  );
  const pendingBudgetRequests = useMemo(
    () => budgetIncreaseRequests.filter((r) => r.status === 'Pending'),
    [budgetIncreaseRequests]
  );
  const filteredBudgetRequests = useMemo(() => {
    if (budgetRequestFilter === 'pending') return pendingBudgetRequests;
    if (budgetRequestFilter === 'resolved') {
      return budgetIncreaseRequests.filter((r) => r.status !== 'Pending');
    }
    return budgetIncreaseRequests;
  }, [budgetIncreaseRequests, pendingBudgetRequests, budgetRequestFilter]);

  useEffect(() => {
    if (clubs.length > 0 && !clubs.some((c) => c.clubId === leaderClubId)) {
      setLeaderClubId(clubs[0].clubId);
    }
  }, [clubs, leaderClubId]);

  useEffect(() => {
    if (
      eligibleUsers.length > 0 &&
      !eligibleUsers.some((u) => u.userId === incomingUserId)
    ) {
      setIncomingUserId(eligibleUsers[0].userId);
    }
  }, [eligibleUsers, incomingUserId]);

  useEffect(() => {
    if (
      accountRequests.length > 0 &&
      !accountRequests.some((r) => r.requestId === selectedRequestId)
    ) {
      setSelectedRequestId(accountRequests[0].requestId);
    }
  }, [accountRequests, selectedRequestId]);

  const pendingRequests = useMemo(
    () =>
      accountRequests.filter(
        (r) => !['Connected', 'Rejected', 'Cancelled'].includes(r.status)
      ),
    [accountRequests]
  );

  const filteredRequests = useMemo(() => {
    if (requestFilter === 'pending') return pendingRequests;
    if (requestFilter === 'resolved') {
      return accountRequests.filter((r) =>
        ['Connected', 'Rejected', 'Cancelled'].includes(r.status)
      );
    }
    return accountRequests;
  }, [accountRequests, pendingRequests, requestFilter]);

  const selectedRequest = useMemo(() => {
    const pool = filteredRequests.length > 0 ? filteredRequests : accountRequests;
    return pool.find((r) => r.requestId === selectedRequestId) ?? pool[0];
  }, [filteredRequests, accountRequests, selectedRequestId]);

  const filteredClubs = useMemo(() => {
    const q = clubSearch.trim().toLowerCase();
    return clubs.filter((c) => {
      if (clubStatusFilter !== 'All' && c.status !== clubStatusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.shortCode.toLowerCase().includes(q) ||
        c.facultyAdvisor.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [clubs, clubSearch, clubStatusFilter]);

  const filteredLeaders = useMemo(() => {
    const q = leaderSearch.trim().toLowerCase();
    if (!q) return leaders;
    return leaders.filter(
      (l) =>
        l.userName.toLowerCase().includes(q) ||
        l.userEmail.toLowerCase().includes(q) ||
        l.clubName.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q)
    );
  }, [leaders, leaderSearch]);

  const activeAuditSource = liveAuditLogs ?? auditLogs;

  const filteredAuditLogs = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    return activeAuditSource.filter((log) => {
      if (auditCategory !== 'All' && log.category !== auditCategory) return false;
      if (securityOnly) {
        const flagMatch =
          log.action.includes('REVOKE') ||
          log.action.includes('REJECT') ||
          log.action.includes('FAILED') ||
          log.action.includes('ISOLATION') ||
          log.action.includes('BLOCKED') ||
          log.category === 'Authentication';
        if (!flagMatch) return false;
      }
      if (!q) return true;
      return (
        log.eventId.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorRole.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    });
  }, [activeAuditSource, auditQuery, auditCategory, securityOnly]);

  const displayedMembers = useMemo(() => {
    const source =
      selectedRosterClubId !== 'ALL' && liveClubMembers
        ? liveClubMembers
        : memberships.filter(
            (m) => selectedRosterClubId === 'ALL' || m.clubId === selectedRosterClubId
          );
    const q = memberSearch.trim().toLowerCase();
    return source.filter((m) => {
      if (memberRoleFilter !== 'ALL' && m.role !== memberRoleFilter) return false;
      if (!q) return true;
      return (
        m.userName.toLowerCase().includes(q) ||
        m.userEmail.toLowerCase().includes(q) ||
        m.clubName.toLowerCase().includes(q) ||
        m.clubShortCode.toLowerCase().includes(q) ||
        (m.officerTitle ?? '').toLowerCase().includes(q) ||
        (m.departmentOrMajor ?? '').toLowerCase().includes(q)
      );
    });
  }, [
    memberships,
    liveClubMembers,
    selectedRosterClubId,
    memberSearch,
    memberRoleFilter,
  ]);

  const reconnectionAccounts = socialAccounts.filter(
    (a) => a.connection.status !== 'Connected'
  );
  const upcomingTransitions = clubs.filter((c) => Boolean(c.upcomingLeadershipChange));

  const clearBanners = () => {
    setActionError('');
    setActionNotice('');
  };

  // Fetch club-specific membership roster on demand from backend
  const handleSelectRosterClub = async (clubId: string) => {
    setSelectedRosterClubId(clubId);
    setLiveClubMembers(null);
    if (clubId === 'ALL') return;
    setLoadingMembers(true);
    clearBanners();
    try {
      const clubMeta = clubs.find((c) => c.clubId === clubId);
      const res = await apiFetch<{
        members: {
          membershipId: string;
          userId: string;
          clubId: string;
          role: string;
          officerTitle?: string;
          status: string;
          authorizedBy: string;
          authorizedAt: string;
          userName: string;
          userEmail: string;
          departmentOrMajor: string;
          userStatus: string;
        }[];
      }>(`/api/admin/clubs/${clubId}/members`);
      setLiveClubMembers(
        (res.members ?? []).map((m) => ({
          ...m,
          clubName: clubMeta?.name ?? clubId,
          clubShortCode: clubMeta?.shortCode ?? clubId,
        }))
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to load verified club membership roster.'
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInspectClubMembers = (clubId: string) => {
    setActiveSection('memberships');
    void handleSelectRosterClub(clubId);
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    clearBanners();
    setClubBusy(true);
    try {
      const res = await apiFetch<{ club: Club }>('/api/admin/clubs', {
        method: 'POST',
        body: JSON.stringify({
          name: newClubName,
          shortCode: newClubCode,
          category: newClubCategory,
          facultyAdvisor: newClubAdvisor,
          description: newClubDescription,
          activateImmediately,
        }),
      });
      setNewClubName('');
      setNewClubCode('');
      setNewClubAdvisor('');
      setNewClubDescription('');
      setShowCreateClubForm(false);
      setActionNotice(
        `Created club workspace "${res.club.name}" (${res.club.shortCode}) with status ${res.club.status}.`
      );
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to create club workspace.');
    } finally {
      setClubBusy(false);
    }
  };

  const handleUpdateClubStatus = async (club: Club, nextStatus: ClubStatus) => {
    clearBanners();
    setUpdatingClubId(club.clubId);
    try {
      await apiFetch(`/api/admin/clubs/${club.clubId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setActionNotice(`Updated "${club.name}" workspace status to ${nextStatus}.`);
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update club status.');
    } finally {
      setUpdatingClubId(null);
    }
  };

  const handleAuthorizeOrTransferLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderClubId || !incomingUserId) {
      setActionError('Select both a club workspace and a verified CUNY user.');
      return;
    }
    clearBanners();
    setLeaderBusy(true);
    try {
      await apiFetch(`/api/admin/clubs/${leaderClubId}/leaders`, {
        method: 'POST',
        body: JSON.stringify({
          userId: incomingUserId,
          outgoingLeaderUserId: outgoingUserId || undefined,
          reason: leaderReason,
        }),
      });
      const targetClubName =
        clubs.find((c) => c.clubId === leaderClubId)?.name ?? leaderClubId;
      const incomingName =
        eligibleUsers.find((u) => u.userId === incomingUserId)?.name ?? incomingUserId;
      setActionNotice(
        outgoingUserId
          ? `Leadership transfer completed for ${targetClubName}: ${incomingName} authorized while staff custodianship remained unchanged.`
          : `Authorized ${incomingName} as Club Lead for ${targetClubName} and logged to the audit trail.`
      );
      setOutgoingUserId('');
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to authorize club leader.');
    } finally {
      setLeaderBusy(false);
    }
  };

  const handleRecordDecision = async (
    reqItem: AccountRequest,
    nextStatus: AccountRequestStatus,
    authority: string,
    notesText: string
  ) => {
    setBusyRequestId(reqItem.requestId);
    clearBanners();
    try {
      await apiFetch(`/api/admin/account-requests/${reqItem.requestId}/decisions`, {
        method: 'POST',
        body: JSON.stringify({
          nextStatus,
          authority,
          notes: notesText.trim() || `Recorded ${nextStatus} decision via Student Life Admin Console.`,
        }),
      });
      setDecisionNotes('');
      setActionNotice(
        `Recorded "${nextStatus}" on ${reqItem.requestId} (${reqItem.proposedAccountName}).`
      );
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to record governance decision.'
      );
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleBudgetIncreaseDecision = async (
    reqItem: BudgetIncreaseRequest,
    decision: 'Approved' | 'Denied'
  ) => {
    clearBanners();
    const notes = (budgetDecisionNotes[reqItem.requestId] ?? '').trim();
    if (decision === 'Denied' && !notes) {
      setActionError(
        `Please enter a reason in Decision Notes before denying ${reqItem.requestId} (${reqItem.clubShortCode}).`
      );
      return;
    }
    const rawOverride = budgetApprovedAmounts[reqItem.requestId];
    const approvedAdditionalUsd =
      decision === 'Approved'
        ? Number(rawOverride !== undefined && rawOverride !== '' ? rawOverride : reqItem.requestedAdditionalUsd)
        : undefined;
    if (decision === 'Approved' && (!Number.isFinite(approvedAdditionalUsd) || (approvedAdditionalUsd ?? 0) <= 0)) {
      setActionError('Enter a valid positive approved funding increase amount.');
      return;
    }
    setBusyBudgetRequestId(reqItem.requestId);
    try {
      const res = await apiFetch<{ request: BudgetIncreaseRequest; club: Club }>(
        `/api/admin/budget-increase-requests/${reqItem.requestId}/decision`,
        {
          method: 'POST',
          body: JSON.stringify({
            decision,
            approvedAdditionalUsd,
            decisionNotes: notes || undefined,
          }),
        }
      );
      setBudgetDecisionNotes((prev) => {
        const next = { ...prev };
        delete next[reqItem.requestId];
        return next;
      });
      setBudgetApprovedAmounts((prev) => {
        const next = { ...prev };
        delete next[reqItem.requestId];
        return next;
      });
      setActionNotice(
        decision === 'Approved'
          ? `Approved +$${(res.request.approvedAdditionalUsd ?? reqItem.requestedAdditionalUsd).toFixed(2)} for ${reqItem.clubName}. New semester cap: $${(res.club.semesterBudgetAllocatedUsd ?? res.request.proposedTotalUsd).toFixed(2)}.`
          : `Denied funding increase request ${reqItem.requestId} for ${reqItem.clubName}.`
      );
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to record funding increase decision.'
      );
    } finally {
      setBusyBudgetRequestId(null);
    }
  };

  const handleToggleUserPlatformAccess = async (member: AdminMemberOverviewRow) => {
    if (member.userId === session?.user.userId) return;
    clearBanners();
    setRevokingUserId(member.userId);
    try {
      const res = await apiFetch<{ user: { status: string; name: string } }>(
        `/api/admin/users/${member.userId}/revoke`,
        { method: 'POST' }
      );
      setActionNotice(
        `${res.user.name} institutional platform status updated to ${res.user.status}.`
      );
      if (selectedRosterClubId !== 'ALL') {
        await handleSelectRosterClub(selectedRosterClubId);
      }
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update user platform access.'
      );
    } finally {
      setRevokingUserId(null);
    }
  };

  const handleRefreshAuditLogs = async () => {
    clearBanners();
    setLoadingAudit(true);
    try {
      const res = await apiFetch<{ auditLogs: AuditLog[] }>('/api/admin/audit-events');
      setLiveAuditLogs(res.auditLogs ?? []);
      setActionNotice(
        `Synchronized ${res.auditLogs?.length ?? 0} institutional audit record(s).`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to refresh audit logs.');
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleExportAuditCsv = () => {
    const header = [
      'Event ID',
      'Timestamp',
      'Actor Name',
      'Actor Role',
      'Category',
      'Action',
      'Target',
      'Details',
    ].join(',');
    const rows = filteredAuditLogs.map((log) =>
      [
        csvEscape(log.eventId),
        csvEscape(log.timestamp),
        csvEscape(log.actorName),
        csvEscape(log.actorRole),
        csvEscape(log.category),
        csvEscape(log.action),
        csvEscape(log.target),
        csvEscape(log.details),
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cuny-sps-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setActionNotice(`Exported ${filteredAuditLogs.length} audit log record(s) to CSV.`);
  };

  const cards: {
    label: string;
    value: number;
    detail: string;
    section: AdminWorkbenchSection;
    alert?: boolean;
  }[] = [
    {
      label: 'Participating Clubs',
      value: summary.participatingClubs,
      detail: `${summary.totalClubs} total workspaces`,
      section: 'workspaces',
    },
    {
      label: 'Connected Accounts',
      value: summary.connectedAccounts,
      detail: 'Official institutional inventory',
      section: 'overview',
    },
    {
      label: 'Pending Requests',
      value: summary.pendingRequests,
      detail: 'Creation, transfer & closure',
      section: 'requests',
    },
    {
      label: 'Active Club Leaders',
      value: summary.activeClubLeaders,
      detail: 'Authorized presidents & co-chairs',
      section: 'leaders',
    },
    {
      label: 'Security Alerts',
      value: summary.securityAlerts,
      detail: 'Audit events requiring review',
      section: 'audit',
      alert: summary.securityAlerts > 0,
    },
    {
      label: 'Verified Memberships',
      value: memberships.length,
      detail: 'Students & officers across clubs',
      section: 'memberships',
    },
  ];

  const sectionTabs: { id: AdminWorkbenchSection; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'workspaces', label: 'Club Workspaces', count: clubs.length },
    { id: 'leaders', label: 'Authorize Leaders', count: leaders.length },
    { id: 'requests', label: 'Account Requests', count: pendingRequests.length },
    { id: 'budget-requests', label: 'Funding Requests', count: pendingBudgetRequests.length },
    { id: 'memberships', label: 'Membership Lists', count: memberships.length },
    { id: 'audit', label: 'Audit Logs', count: activeAuditSource.length },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Header & Primary Action */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <StudentLifeLogo className="h-12 w-auto" />
          <div>
            <div className="text-xs font-semibold text-[#004B87]">
              CUNY SPS Office of Student Life · Institutional Governance Console
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
              CUNY SPS Student Life Admin Console
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Create and activate approved club workspaces, authorize club leaders, review official
              account requests, inspect verified membership lists, and audit platform activity.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveSection('audit');
              void handleRefreshAuditLogs();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:border-[#004B87] hover:text-[#004B87] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('workspaces');
              setShowCreateClubForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Club Workspace</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center justify-between gap-3"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-red-700 hover:text-red-900 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {actionNotice && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between gap-3">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice('')}
            className="text-emerald-800 hover:text-emerald-950 cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 6 Institutional Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => setActiveSection(card.section)}
            className={`text-left bg-white border rounded-lg p-4 transition-colors cursor-pointer ${
              activeSection === card.section
                ? 'border-[#004B87]'
                : 'border-slate-200 hover:border-slate-400'
            }`}
          >
            <div className="text-xs font-medium text-slate-500">{card.label}</div>
            <div
              className={`mt-2 text-2xl font-bold font-mono-tabular ${
                card.alert ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {card.value}
            </div>
            <div className="mt-1 text-xs text-slate-500 truncate">{card.detail}</div>
          </button>
        ))}
      </div>

      {/* Operations Workbench Navigation Bar */}
      <div
        role="tablist"
        aria-label="Student Life Staff Operations"
        className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto"
      >
        {sectionTabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSection(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white text-[#004B87] font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="font-mono-tabular text-[11px] text-slate-400">
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================================================================== */}
      {/* OVERVIEW SECTION                                                   */}
      {/* ================================================================== */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Five Core Staff Capabilities Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <Building2 className="w-4 h-4 text-[#004B87] shrink-0" />
                  <span>Club Workspaces</span>
                </div>
                <p className="text-xs text-slate-500">
                  {summary.participatingClubs} active / {summary.totalClubs} total clubs
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('workspaces');
                  setShowCreateClubForm(true);
                }}
                className="inline-flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-[#004B87] bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded cursor-pointer whitespace-nowrap"
              >
                <span>Create / Activate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <UserCheck className="w-4 h-4 text-[#004B87] shrink-0" />
                  <span>Authorize Leaders</span>
                </div>
                <p className="text-xs text-slate-500">
                  {summary.activeClubLeaders} authorized presidents &amp; co-chairs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('leaders')}
                className="inline-flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-[#004B87] bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded cursor-pointer whitespace-nowrap"
              >
                <span>Authorize / Transfer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <ClipboardCheck className="w-4 h-4 text-[#004B87] shrink-0" />
                  <span>Account Requests</span>
                </div>
                <p className="text-xs text-slate-500">
                  {pendingRequests.length} open (Creation, Transfer, Closure)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('requests')}
                className="inline-flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-[#004B87] bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded cursor-pointer whitespace-nowrap"
              >
                <span>Review &amp; Decide</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <Users className="w-4 h-4 text-[#004B87] shrink-0" />
                  <span>Membership Lists</span>
                </div>
                <p className="text-xs text-slate-500">
                  {memberships.length} verified student &amp; officer rosters
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('memberships')}
                className="inline-flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-[#004B87] bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded cursor-pointer whitespace-nowrap"
              >
                <span>View Rosters</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <Activity className="w-4 h-4 text-[#004B87] shrink-0" />
                  <span>Audit Logs</span>
                </div>
                <p className="text-xs text-slate-500">
                  {activeAuditSource.length} immutable platform events
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('audit')}
                className="inline-flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-[#004B87] bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded cursor-pointer whitespace-nowrap"
              >
                <span>Inspect &amp; Export</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Governance Operating Model (Slide 6 & Slide 13) */}
          <section
            aria-label="Three Levels of Responsibility and Hub Architecture"
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#004B87]" />
                  <span>CUNY SPS Governance Operating Model (Three Responsibility Levels)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorized club officers publish independently—Student Life retains university
                  custodianship, leader authorization, account approvals, and audit controls.
                </p>
              </div>
              <span className="text-[11px] font-mono-tabular text-[#004B87] font-semibold whitespace-nowrap">
                CUNY Comms Account SLA: ~10 Business Days
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="p-4 space-y-2 bg-sky-50/30">
                <div className="text-[11px] font-mono font-semibold text-[#004B87]">
                  L1 · OWN &amp; ADMINISTER (STUDENT LIFE CONSOLE)
                </div>
                <div className="text-sm font-bold text-slate-900">
                  CUNY SPS Management &amp; Student Life
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Retains institutional ownership &amp; workspace activation</li>
                  <li>• Authorizes club presidents &amp; designated club leaders</li>
                  <li>• Reviews account creation, closure &amp; transfer requests</li>
                  <li>• Maintains roster visibility, token custody &amp; access revocation</li>
                </ul>
              </div>

              <div className="p-4 space-y-2">
                <div className="text-[11px] font-mono font-semibold text-slate-500">
                  L2 · RUN WORKSPACES
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Club Presidents &amp; Officers
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Approved leaders operate club workspaces &amp; events</li>
                  <li>• Invite members via verified CUNY identities</li>
                  <li>• Assign role-based publishing &amp; drafting permissions</li>
                  <li>• Draft, schedule &amp; publish without routine pre-approval</li>
                </ul>
              </div>

              <div className="p-4 space-y-2">
                <div className="text-[11px] font-mono font-semibold text-slate-500">
                  L3 · BUILD &amp; HAND OVER
                </div>
                <div className="text-sm font-bold text-slate-900">
                  CUNY SPS AI Club Engineering Pilot
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Builds, tests &amp; documents pilot architecture</li>
                  <li>• Delivers Meta Graph &amp; RBAC governance workflows</li>
                  <li>• Transitions administrative operations to university staff</li>
                </ul>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                  <KeyRound className="w-3.5 h-3.5 text-[#004B87]" />
                  <span>CUNY Identity &amp; RBAC</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                  <Lock className="w-3.5 h-3.5 text-[#004B87]" />
                  <span>Encrypted Token Vault (Staff Custodian)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-[#004B87]" />
                  <span>CUNY Comms Approval Handoff</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                  <Activity className="w-3.5 h-3.5 text-[#004B87]" />
                  <span>Immutable Audit Log</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('audit')}
                className="text-xs font-medium text-[#004B87] hover:underline cursor-pointer whitespace-nowrap"
              >
                Open Audit Log Manager →
              </button>
            </div>
          </section>

          {/* Pending Account Requests + Connected Social Inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Pending Account Requests ({pendingRequests.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Approve, forward to CUNY Communications, or reject creation, transfer, and closure requests.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('requests')}
                  className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Request Inspector
                </button>
              </div>
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  All official account creation, transfer, and closure requests have been resolved.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {pendingRequests.map((req) => {
                    const isBusy = busyRequestId === req.requestId;
                    return (
                      <div key={req.requestId} className="px-5 py-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono-tabular">
                              <span className="font-semibold text-slate-700">{req.requestId}</span>
                              <span aria-hidden="true">·</span>
                              <span>{req.clubName}</span>
                              <span aria-hidden="true">·</span>
                              <span>{req.platform}</span>
                            </div>
                            <div className="text-sm font-semibold text-slate-900">
                              {req.requestType}: {req.proposedAccountName}
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {req.businessPurpose}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <StatusText status={req.status} />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                          {req.status !== 'Awaiting CUNY Approval' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleRecordDecision(
                                  req,
                                  'Awaiting CUNY Approval',
                                  'CUNY SPS Office of Student Life',
                                  'Student Life eligibility verified; forwarded to CUNY Office of Communications and Marketing (10-business-day SLA).'
                                )
                              }
                              className="px-2.5 py-1 text-xs font-medium text-[#004B87] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              Forward to CUNY Comms
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void handleRecordDecision(
                                req,
                                req.status === 'Approved for Setup'
                                  ? 'Connected'
                                  : 'Approved for Setup',
                                'CUNY Office of Communications and Marketing',
                                req.status === 'Approved for Setup'
                                  ? 'Staff custodian connected account to institutional token vault.'
                                  : 'CUNY Communications & Student Life approved request within authority.'
                              )
                            }
                            className="px-2.5 py-1 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            {req.status === 'Approved for Setup'
                              ? 'Mark Connected'
                              : 'Approve Setup'}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void handleRecordDecision(
                                req,
                                'Rejected',
                                'CUNY SPS Office of Student Life',
                                'Rejected during Student Life governance review.'
                              )
                            }
                            className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Connected Official Social Account Inventory */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Connected Social Account Inventory
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    University-owned handles, staff custodians &amp; token health
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('social-accounts')}
                  className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Full Inventory
                </button>
              </div>
              <div className="divide-y divide-slate-200">
                {socialAccounts.slice(0, 5).map((acc) => (
                  <div key={acc.accountId} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {acc.handle}{' '}
                        <span className="font-normal text-slate-500">· {acc.platform}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {acc.clubName} · Custodian: {acc.custodian.staffName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {acc.connection.tokenReference}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusText status={acc.connection.status} />
                    </div>
                  </div>
                ))}

                {reconnectionAccounts.length === 0 ? (
                  <div className="px-5 py-3 bg-emerald-50/60 flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>All official institutional social integrations are healthy.</span>
                  </div>
                ) : (
                  <div className="px-5 py-3 bg-amber-50/70 flex items-center gap-2 text-xs text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      {reconnectionAccounts.length} account(s) require staff custodian token
                      reconnection.
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Pending Club Funding Increase Requests */}
          {pendingBudgetRequests.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#004B87]" />
                    <span>Pending Club Funding Increase Requests ({pendingBudgetRequests.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Club leaders start at a $500.00 semester cap and submit itemized requests for supplemental event funding.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('budget-requests')}
                  className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Funding Queue
                </button>
              </div>
              <div className="divide-y divide-slate-200">
                {pendingBudgetRequests.map((reqItem) => {
                  const isBusy = busyBudgetRequestId === reqItem.requestId;
                  const approvedVal =
                    budgetApprovedAmounts[reqItem.requestId] ??
                    String(reqItem.requestedAdditionalUsd);
                  const noteVal = budgetDecisionNotes[reqItem.requestId] ?? '';
                  return (
                    <div key={reqItem.requestId} className="p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-slate-500">
                            <span className="font-semibold text-slate-700">{reqItem.requestId}</span>
                            <span>·</span>
                            <span>{reqItem.clubName} ({reqItem.clubShortCode})</span>
                            <span>·</span>
                            <span>Submitted by {reqItem.submittedByName}</span>
                          </div>
                          <div className="text-sm font-bold text-slate-900">
                            {reqItem.eventOrInitiativeTitle}
                          </div>
                          <div className="text-xs font-mono-tabular text-[#004B87] font-semibold">
                            +${reqItem.requestedAdditionalUsd.toFixed(2)} requested (${reqItem.currentAllocatedUsd.toFixed(2)} → ${reqItem.proposedTotalUsd.toFixed(2)} proposed cap)
                          </div>
                        </div>
                        <StatusText status={reqItem.status} />
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-md p-3">
                        <div>
                          <div className="font-semibold text-slate-600">Expense Breakdown</div>
                          <div className="text-slate-800 mt-0.5">{reqItem.fundingBreakdown}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-600">Reason &amp; Impact</div>
                          <div className="text-slate-700 mt-0.5">{reqItem.reason}</div>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-2.5">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-medium text-slate-600 whitespace-nowrap">
                            Approve ($)
                          </label>
                          <input
                            type="number"
                            min={1}
                            step="10"
                            value={approvedVal}
                            onChange={(e) =>
                              setBudgetApprovedAmounts((prev) => ({
                                ...prev,
                                [reqItem.requestId]: e.target.value,
                              }))
                            }
                            className="w-24 px-2 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded focus:outline-none focus:border-[#004B87]"
                            aria-label={`Approved amount for ${reqItem.requestId}`}
                          />
                        </div>
                        <input
                          type="text"
                          value={noteVal}
                          onChange={(e) =>
                            setBudgetDecisionNotes((prev) => ({
                              ...prev,
                              [reqItem.requestId]: e.target.value,
                            }))
                          }
                          placeholder="Review note / denial reason (required to deny)..."
                          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#004B87]"
                          aria-label={`Decision notes for ${reqItem.requestId}`}
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleBudgetIncreaseDecision(reqItem, 'Approved')}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded whitespace-nowrap cursor-pointer"
                          >
                            {isBusy ? 'Saving...' : 'Approve Increase'}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleBudgetIncreaseDecision(reqItem, 'Denied')}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 disabled:opacity-50 rounded whitespace-nowrap cursor-pointer"
                          >
                            Deny Request
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Club Semester Budget Ledgers */}
          {data.budgetLedgers && data.budgetLedgers.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#004B87]" />
                    <span>Club Semester Budget Ledgers (Student Activity Fee)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Standard $500.00 starting allocation plus approved supplemental funding vs. encumbrances and payouts.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSection('budget-requests')}
                    className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Funding Increase Queue ({pendingBudgetRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('club-resources')}
                    className="text-xs font-medium text-slate-600 hover:text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Financial packets
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 px-4">Organization</th>
                      <th className="py-2.5 px-4 text-right">Annual Cap</th>
                      <th className="py-2.5 px-4 text-right">Encumbered</th>
                      <th className="py-2.5 px-4 text-right">Reimbursed</th>
                      <th className="py-2.5 px-4 text-right">Remaining</th>
                      <th className="py-2.5 px-4 w-44">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {data.budgetLedgers.map((b) => {
                      const spentOrHeld = b.encumberedUsd + b.reimbursedUsd;
                      const pct =
                        b.allocatedUsd > 0
                          ? Math.min(100, Math.round((spentOrHeld / b.allocatedUsd) * 100))
                          : 0;
                      return (
                        <tr key={b.clubId} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => onOpenClubWorkspace(b.clubId)}
                              className="font-semibold text-slate-900 hover:text-[#004B87] hover:underline text-left cursor-pointer"
                            >
                              {b.clubName}
                            </button>
                            <div className="text-[11px] font-mono text-slate-500">
                              {b.clubShortCode}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-slate-700">
                            ${b.allocatedUsd.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-amber-700">
                            ${b.encumberedUsd.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">
                            ${b.reimbursedUsd.toFixed(2)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono-tabular font-semibold ${
                              b.remainingUsd < 100 ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            ${b.remainingUsd.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full ${pct >= 85 ? 'bg-amber-600' : 'bg-[#004B87]'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-mono-tabular text-[11px] text-slate-600 w-9 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Leadership Transitions & Recent Administrative Audit Records Preview */}
          <section className="bg-white border border-slate-200 rounded-lg flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Leadership Transitions &amp; Recent Audit Activity
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest leader authorizations, workspace activations, account decisions, and security checks.
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSection('leaders')}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline cursor-pointer whitespace-nowrap"
                >
                  Authorize Leaders
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('audit')}
                  className="text-xs font-medium text-[#004B87] hover:underline cursor-pointer whitespace-nowrap"
                >
                  Manage Audit Logs
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {upcomingTransitions.map((club) => (
                <div key={club.clubId} className="px-5 py-3 bg-amber-50/50 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-900">
                      Upcoming Transition: {club.name}
                    </div>
                    <div className="text-slate-600">{club.upcomingLeadershipChange}</div>
                  </div>
                </div>
              ))}
              {activeAuditSource.slice(0, 6).map((log) => (
                <div key={log.eventId} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-medium text-slate-900 flex items-center gap-2">
                      <span className="font-mono font-semibold">{log.action}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 truncate">{log.category}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {log.actorName} · {log.target}
                    </div>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-400 whitespace-nowrap shrink-0">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ================================================================== */}
      {/* WORKSPACES SECTION (Create & Activate Club Workspaces)             */}
      {/* ================================================================== */}
      {activeSection === 'workspaces' && (
        <section
          aria-label="Create and Activate Club Workspaces"
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Create &amp; Activate Club Workspaces
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Provision approved CUNY SPS student organizations, activate pending charters, or suspend inactive workspaces.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('clubs')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Charter &amp; Budget View</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateClubForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showCreateClubForm ? 'Hide Create Form' : 'New Club Workspace'}</span>
              </button>
            </div>
          </div>

          {showCreateClubForm && (
            <form
              onSubmit={handleCreateClub}
              className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Register &amp; Activate New Club Workspace
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateClubForm(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Close create club workspace form"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Official Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    placeholder="e.g., CUNY SPS Health Informatics Society"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Workspace Short Code
                  </label>
                  <input
                    type="text"
                    required
                    value={newClubCode}
                    onChange={(e) => setNewClubCode(e.target.value)}
                    placeholder="e.g., HIS-SPS"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Organization Category
                  </label>
                  <select
                    value={newClubCategory}
                    onChange={(e) => setNewClubCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
                  >
                    <option>Academic &amp; Research</option>
                    <option>Technology &amp; Innovation</option>
                    <option>Health &amp; Human Services</option>
                    <option>Business &amp; Leadership</option>
                    <option>Community &amp; Culture</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Faculty / Staff Advisor
                  </label>
                  <input
                    type="text"
                    required
                    value={newClubAdvisor}
                    onChange={(e) => setNewClubAdvisor(e.target.value)}
                    placeholder="e.g., Dr. Elena Morales"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Club Mission &amp; Scope
                </label>
                <textarea
                  rows={2}
                  value={newClubDescription}
                  onChange={(e) => setNewClubDescription(e.target.value)}
                  placeholder="Summarize organization mission, target CUNY SPS students, and campus activities..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activateImmediately}
                    onChange={(e) => setActivateImmediately(e.target.checked)}
                    className="accent-[#004B87]"
                  />
                  <span>Activate workspace immediately upon creation (otherwise Pending Approval)</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateClubForm(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={clubBusy}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    {clubBusy
                      ? 'Saving...'
                      : activateImmediately
                        ? 'Create & Activate Workspace'
                        : 'Create as Pending Approval'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                placeholder="Filter clubs by name, short code, category, or advisor..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {(['All', 'Active', 'Pending Approval', 'Suspended'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setClubStatusFilter(status)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    clubStatusFilter === status
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {editingClubProfileId && (() => {
            const targetClub = clubs.find((c) => c.clubId === editingClubProfileId);
            if (!targetClub) return null;
            return (
              <ClubProfileEditor
                key={targetClub.clubId}
                club={targetClub}
                mode="admin"
                canEdit
                onSaved={async (updatedClub) => {
                  setEditingClubProfileId(null);
                  setActionNotice(
                    `Updated club profile picture & details for ${updatedClub.name} (${updatedClub.shortCode}).`
                  );
                  if (onRefresh) await onRefresh();
                }}
                onCancel={() => setEditingClubProfileId(null)}
              />
            );
          })()}

          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Student Organization</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Faculty Advisor</th>
                  <th className="py-3 px-4 text-right">Authorized Leads</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Workspace Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredClubs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No club workspaces match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredClubs.map((club) => {
                    const isUpdating = updatingClubId === club.clubId;
                    return (
                      <tr key={club.clubId} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <ClubLogoMark
                              clubId={club.clubId}
                              clubShortCode={club.shortCode}
                              clubName={club.name}
                              logoUrl={club.logoUrl}
                              accentColor={club.accentColor}
                              size="sm"
                            />
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{club.name}</div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {club.shortCode} · Onboarded{' '}
                                {new Date(club.onboardedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{club.category}</td>
                        <td className="py-3 px-4 text-slate-700">{club.facultyAdvisor}</td>
                        <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-800">
                          {club.governanceSummary?.authorizedLeadersCount ?? 0}
                        </td>
                        <td className="py-3 px-4">
                          <StatusText status={club.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingClubProfileId((prev) =>
                                  prev === club.clubId ? null : club.clubId
                                )
                              }
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>{editingClubProfileId === club.clubId ? 'Close' : 'Edit Profile'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInspectClubMembers(club.clubId)}
                              className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                            >
                              Members
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLeaderClubId(club.clubId);
                                setActiveSection('leaders');
                              }}
                              className="text-xs font-medium text-slate-700 hover:text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                            >
                              Authorize Lead
                            </button>
                            {club.status === 'Pending Approval' ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => void handleUpdateClubStatus(club, 'Active')}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded whitespace-nowrap cursor-pointer disabled:opacity-50"
                              >
                                Activate
                              </button>
                            ) : club.status === 'Active' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onOpenClubWorkspace(club.clubId)}
                                  className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                                >
                                  Open Portal
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => void handleUpdateClubStatus(club, 'Suspended')}
                                  className="text-xs font-medium text-red-700 hover:underline whitespace-nowrap cursor-pointer disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => void handleUpdateClubStatus(club, 'Active')}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded whitespace-nowrap cursor-pointer disabled:opacity-50"
                              >
                                Restore Active
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* AUTHORIZE LEADERS SECTION                                          */}
      {/* ================================================================== */}
      {activeSection === 'leaders' && (
        <section
          aria-label="Authorize Club Leaders and Leadership Transfers"
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Authorize Club Leaders &amp; Semester Transitions
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Assign Student Life–approved Presidents or Co-Chairs while keeping designated staff social account custodianship intact.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('club-leaders')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Dedicated Leaders View</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleAuthorizeOrTransferLeader}
              className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <ArrowRightLeft className="w-4 h-4 text-[#004B87]" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Authorize Leader or Execute Transfer
                </h3>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Club Workspace
                </label>
                <select
                  value={leaderClubId}
                  onChange={(e) => {
                    setLeaderClubId(e.target.value);
                    setOutgoingUserId('');
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
                >
                  {clubs.map((c) => (
                    <option key={c.clubId} value={c.clubId}>
                      {c.name} ({c.shortCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Incoming Verified CUNY SPS Student
                </label>
                <select
                  value={incomingUserId}
                  onChange={(e) => setIncomingUserId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
                >
                  {eligibleUsers.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Revoke Outgoing Leader (Optional Transfer)
                </label>
                <select
                  value={outgoingUserId}
                  onChange={(e) => setOutgoingUserId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
                >
                  <option value="">None — Authorize additional co-leader</option>
                  {leaders
                    .filter((l) => l.clubId === leaderClubId && l.status === 'Active')
                    .map((l) => (
                      <option key={l.membershipId} value={l.userId}>
                        Revoke {l.userName} ({l.userEmail})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Authorization Rationale / Election Note
                </label>
                <input
                  type="text"
                  required
                  value={leaderReason}
                  onChange={(e) => setLeaderReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>

              <button
                type="submit"
                disabled={leaderBusy || eligibleUsers.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {leaderBusy
                    ? 'Recording Authorization...'
                    : outgoingUserId
                      ? 'Execute Leadership Transfer'
                      : 'Authorize Club Leader'}
                </span>
              </button>
            </form>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Authorized Leadership Roster ({filteredLeaders.length})
                </h3>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={leaderSearch}
                    onChange={(e) => setLeaderSearch(e.target.value)}
                    placeholder="Filter leaders..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Leader</th>
                      <th className="py-3 px-4">Club</th>
                      <th className="py-3 px-4">Authorized By</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Transition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredLeaders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No leader records match the current search.
                        </td>
                      </tr>
                    ) : (
                      filteredLeaders.map((leader) => (
                        <tr key={leader.membershipId} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{leader.userName}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {leader.userEmail}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{leader.clubName}</td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{leader.authorizedBy}</div>
                            <div className="font-mono-tabular text-[11px] text-slate-400">
                              {new Date(leader.authorizedAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <StatusText status={leader.status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            {leader.status === 'Active' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setLeaderClubId(leader.clubId);
                                  setOutgoingUserId(leader.userId);
                                }}
                                className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                              >
                                Prepare Handover
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* ACCOUNT REQUESTS SECTION (Review, Approve & Reject)                */}
      {/* ================================================================== */}
      {activeSection === 'requests' && (
        <section
          aria-label="Review, Approve, and Reject Account Requests"
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Review Official Account Requests
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Evaluate business purpose, track CUNY Communications 10-business-day coordination, and approve or reject within Student Life authority.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {(
                [
                  { id: 'pending', label: `Open (${pendingRequests.length})` },
                  { id: 'all', label: `All (${accountRequests.length})` },
                  {
                    id: 'resolved',
                    label: `Resolved (${accountRequests.length - pendingRequests.length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRequestFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    requestFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Queue Column */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50/70 text-xs font-semibold text-slate-700">
                Requests ({filteredRequests.length})
              </div>
              {filteredRequests.length === 0 ? (
                <div className="p-6 text-xs text-slate-500 text-center">
                  No account requests in this filter.
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const isSelected = selectedRequest?.requestId === req.requestId;
                  return (
                    <button
                      key={req.requestId}
                      type="button"
                      onClick={() => setSelectedRequestId(req.requestId)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono-tabular font-semibold text-slate-700">
                          {req.requestId}
                        </span>
                        <StatusText status={req.status} />
                      </div>
                      <div className="mt-1.5 text-sm font-semibold text-slate-900">
                        {req.proposedAccountName}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {req.clubName} · {req.requestType} · {req.platform}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Inspector & Decision Column */}
            {selectedRequest ? (
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-xs font-mono-tabular text-slate-500">
                      {selectedRequest.requestId} · Submitted{' '}
                      {new Date(selectedRequest.submittedAt).toLocaleDateString()} by{' '}
                      {selectedRequest.submittedByName}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {selectedRequest.requestType}: {selectedRequest.proposedAccountName}
                    </h3>
                    <div className="text-xs text-slate-600 mt-1">
                      {selectedRequest.clubName} · Platform: {selectedRequest.platform}
                    </div>
                  </div>
                  <StatusText status={selectedRequest.status} />
                </div>

                {/* Institutional Workflow Steps */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Institutional Approval Pipeline
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {REQUEST_PIPELINE_STEPS.map((step, idx) => {
                      const activeIdx = REQUEST_PIPELINE_STEPS.indexOf(selectedRequest.status);
                      const passed = activeIdx >= idx;
                      const current = selectedRequest.status === step;
                      return (
                        <div
                          key={step}
                          className={`p-2 rounded border text-[11px] leading-tight ${
                            current
                              ? 'border-[#004B87] bg-sky-50 font-semibold text-[#004B87]'
                              : passed
                                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                                : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          <div className="font-mono-tabular text-[10px] mb-0.5">0{idx + 1}</div>
                          <div>{step}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-slate-500">Business Purpose</div>
                    <p className="text-slate-800 mt-1 leading-relaxed">
                      {selectedRequest.businessPurpose}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold text-slate-500">Intended Audience</div>
                      <p className="text-slate-800 mt-0.5">{selectedRequest.intendedAudience}</p>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-500">
                        Responsible Representatives
                      </div>
                      <p className="text-slate-800 mt-0.5">
                        {selectedRequest.responsibleRepresentatives}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Approve / Reject Action Bar + Custom Stage Form */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-[#004B87]" />
                      <span>Record Administrative Decision</span>
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busyRequestId === selectedRequest.requestId}
                        onClick={() =>
                          void handleRecordDecision(
                            selectedRequest,
                            'Approved for Setup',
                            'CUNY Office of Communications and Marketing',
                            decisionNotes ||
                              'Approved for institutional account setup and staff custody connection.'
                          )
                        }
                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        Approve Setup
                      </button>
                      <button
                        type="button"
                        disabled={busyRequestId === selectedRequest.requestId}
                        onClick={() =>
                          void handleRecordDecision(
                            selectedRequest,
                            'Rejected',
                            'CUNY SPS Office of Student Life',
                            decisionNotes || 'Rejected during Student Life governance review.'
                          )
                        }
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        Reject Request
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Custom Stage Transition
                      </label>
                      <select
                        value={decisionStatus}
                        onChange={(e) =>
                          setDecisionStatus(e.target.value as AccountRequestStatus)
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
                      >
                        {ALL_DECISION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Recording Authority
                      </label>
                      <select
                        value={decisionAuthority}
                        onChange={(e) => setDecisionAuthority(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
                      >
                        <option>CUNY SPS Office of Student Life</option>
                        <option>CUNY Office of Communications and Marketing</option>
                        <option>CUNY SPS IT / Account Custodianship</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Decision Notes &amp; Compliance Rationale
                    </label>
                    <textarea
                      rows={2}
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder="Document eligibility verification, CUNY communications reference, or rejection reason..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={busyRequestId === selectedRequest.requestId}
                      onClick={() =>
                        void handleRecordDecision(
                          selectedRequest,
                          decisionStatus,
                          decisionAuthority,
                          decisionNotes
                        )
                      }
                      className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer whitespace-nowrap"
                    >
                      {busyRequestId === selectedRequest.requestId
                        ? 'Recording...'
                        : 'Save Stage Transition'}
                    </button>
                  </div>
                </div>

                {/* Approval History */}
                <div className="pt-4 border-t border-slate-200 space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-700">
                    Approval Decision History ({selectedRequest.approvals.length})
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {selectedRequest.approvals.map((apr) => (
                      <div key={apr.approvalId} className="py-2 text-xs space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {apr.decision} · {apr.authority}
                          </span>
                          <span className="font-mono-tabular text-slate-400">
                            {new Date(apr.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          {apr.actorName}: {apr.notes}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
                Select an account request from the queue to inspect and record a decision.
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* FUNDING INCREASE REQUESTS SECTION (Approve or Deny)                */}
      {/* ================================================================== */}
      {activeSection === 'budget-requests' && (
        <section
          aria-label="Review, Approve, and Deny Club Funding Increase Requests"
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Club Funding Increase Requests ({filteredBudgetRequests.length})
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Every club starts with a $500.00 Student Activity Fee allocation. Review itemized event justifications and approve or deny supplemental funding.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {(
                [
                  { id: 'pending', label: `Pending (${pendingBudgetRequests.length})` },
                  { id: 'all', label: `All (${budgetIncreaseRequests.length})` },
                  {
                    id: 'resolved',
                    label: `Decided (${budgetIncreaseRequests.length - pendingBudgetRequests.length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBudgetRequestFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    budgetRequestFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredBudgetRequests.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
              No funding increase requests match the active filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBudgetRequests.map((reqItem) => {
                const isBusy = busyBudgetRequestId === reqItem.requestId;
                const approvedVal =
                  budgetApprovedAmounts[reqItem.requestId] ??
                  String(reqItem.requestedAdditionalUsd);
                const noteVal = budgetDecisionNotes[reqItem.requestId] ?? '';
                return (
                  <div
                    key={reqItem.requestId}
                    className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-slate-500">
                          <span className="font-semibold text-slate-800">{reqItem.requestId}</span>
                          <span>·</span>
                          <span>
                            {reqItem.clubName} ({reqItem.clubShortCode})
                          </span>
                          <span>·</span>
                          <span>Submitted {new Date(reqItem.submittedAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          {reqItem.eventOrInitiativeTitle}
                        </h3>
                        <div className="text-xs text-slate-600">
                          Requested by <span className="font-medium text-slate-800">{reqItem.submittedByName}</span> ({reqItem.submittedByEmail})
                          {reqItem.eventDate ? ` · Event Date: ${reqItem.eventDate}` : ''}
                          {reqItem.expectedAttendance ? ` · Est. Attendance: ${reqItem.expectedAttendance}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                        <StatusText status={reqItem.status} />
                        <div className="text-xs font-mono-tabular font-semibold text-[#004B87]">
                          +${reqItem.requestedAdditionalUsd.toFixed(2)} requested (${reqItem.currentAllocatedUsd.toFixed(2)} → ${reqItem.proposedTotalUsd.toFixed(2)})
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                        <div className="font-semibold text-slate-600">Itemized Cost Breakdown</div>
                        <p className="text-slate-800 mt-1">{reqItem.fundingBreakdown}</p>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                        <div className="font-semibold text-slate-600">Reason for Increased Funding</div>
                        <p className="text-slate-700 mt-1 leading-relaxed">{reqItem.reason}</p>
                      </div>
                    </div>

                    {reqItem.status === 'Pending' ? (
                      <div className="pt-2 flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-slate-700 whitespace-nowrap">
                            Approved Increase ($)
                          </label>
                          <input
                            type="number"
                            min={1}
                            step="10"
                            value={approvedVal}
                            onChange={(e) =>
                              setBudgetApprovedAmounts((prev) => ({
                                ...prev,
                                [reqItem.requestId]: e.target.value,
                              }))
                            }
                            className="w-28 px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                          />
                        </div>
                        <input
                          type="text"
                          value={noteVal}
                          onChange={(e) =>
                            setBudgetDecisionNotes((prev) => ({
                              ...prev,
                              [reqItem.requestId]: e.target.value,
                            }))
                          }
                          placeholder="Approval guidance or denial reason (required to deny)..."
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleBudgetIncreaseDecision(reqItem, 'Approved')}
                            className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                          >
                            {isBusy ? 'Processing...' : 'Approve Funding Increase'}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleBudgetIncreaseDecision(reqItem, 'Denied')}
                            className="px-3.5 py-1.5 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                          >
                            Deny Request
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-800">
                            {reqItem.reviewedByName ?? 'Student Life Admin'}:
                          </span>{' '}
                          <span className="text-slate-700">{reqItem.decisionNotes}</span>
                          {reqItem.status === 'Approved' && reqItem.approvedAdditionalUsd !== undefined && (
                            <span className="ml-2 font-mono-tabular font-semibold text-emerald-700">
                              (+${reqItem.approvedAdditionalUsd.toFixed(2)} approved)
                            </span>
                          )}
                        </div>
                        {reqItem.reviewedAt && (
                          <span className="font-mono-tabular text-[11px] text-slate-500">
                            {new Date(reqItem.reviewedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ================================================================== */}
      {/* MEMBERSHIP LISTS SECTION (View & Manage Club Rosters)              */}
      {/* ================================================================== */}
      {activeSection === 'memberships' && (
        <section
          aria-label="Club Membership Lists and Access Control"
          className="bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#004B87]" />
                <span>Club Membership Lists &amp; Officer Rosters</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect verified CUNY SPS student memberships, officer titles, authorization history, and revoke platform access when needed.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search member, email, title..."
                  aria-label="Search club members"
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>

              <select
                aria-label="Filter membership by club"
                value={selectedRosterClubId}
                onChange={(e) => void handleSelectRosterClub(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-[#004B87]"
              >
                <option value="ALL">All Participating Clubs ({memberships.length})</option>
                {clubs.map((c) => (
                  <option key={c.clubId} value={c.clubId}>
                    {c.name} ({c.shortCode})
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter membership by role"
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-[#004B87]"
              >
                <option value="ALL">All Roles</option>
                <option value="CLUB_LEAD">Club Lead</option>
                <option value="EDITOR">Editor</option>
                <option value="CONTRIBUTOR">Contributor</option>
                <option value="VIEWER">Viewer / Advisor</option>
              </select>
            </div>
          </div>

          {loadingMembers ? (
            <div className="p-6 text-xs text-slate-500">
              Loading verified club membership roster...
            </div>
          ) : displayedMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No verified club member records match the active filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Verified Student</th>
                    <th className="py-2.5 px-4">Club</th>
                    <th className="py-2.5 px-4">Role &amp; Officer Title</th>
                    <th className="py-2.5 px-4">Program / Major</th>
                    <th className="py-2.5 px-4">Authorized By</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Platform Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {displayedMembers.map((m) => {
                    const isSelf = m.userId === session?.user.userId;
                    const isRevoking = revokingUserId === m.userId;
                    return (
                      <tr key={m.membershipId} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{m.userName}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {m.userEmail}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{m.clubName}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {m.clubShortCode}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">
                            {formatRoleLabel(m.role)}
                          </div>
                          {m.officerTitle && (
                            <div className="text-[11px] text-[#004B87] font-medium">
                              {m.officerTitle}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {m.departmentOrMajor || 'CUNY SPS'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{m.authorizedBy}</div>
                          <div className="font-mono-tabular text-[11px] text-slate-400">
                            {new Date(m.authorizedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusText
                            status={m.userStatus === 'Revoked' ? 'Revoked' : m.status}
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isSelf && (
                            <button
                              type="button"
                              disabled={isRevoking}
                              onClick={() => void handleToggleUserPlatformAccess(m)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border cursor-pointer disabled:opacity-50 whitespace-nowrap ${
                                m.userStatus === 'Active'
                                  ? 'text-red-700 border-red-200 hover:bg-red-50'
                                  : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                              }`}
                            >
                              {m.userStatus === 'Active' ? (
                                <>
                                  <ShieldOff className="w-3 h-3" />
                                  <span>Revoke Access</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Restore Access</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ================================================================== */}
      {/* AUDIT LOGS SECTION (Search, Filter, Inspect & Export)              */}
      {/* ================================================================== */}
      {activeSection === 'audit' && (
        <section
          aria-label="Platform Activity Audit Log Manager"
          className="space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Administrative &amp; Security Audit Logs ({filteredAuditLogs.length})
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Immutable institutional record of sign-ins, workspace activations, leader authorizations, account decisions, publishing, and access revocations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loadingAudit}
                onClick={() => void handleRefreshAuditLogs()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                <span>{loadingAudit ? 'Syncing...' : 'Refresh Logs'}</span>
              </button>
              <button
                type="button"
                disabled={filteredAuditLogs.length === 0}
                onClick={handleExportAuditCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Category Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  placeholder="Search event ID, actor, action, target, or details..."
                  aria-label="Filter audit logs"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={securityOnly}
                  onChange={(e) => setSecurityOnly(e.target.checked)}
                  className="accent-[#004B87]"
                />
                <span>Security &amp; Access Alerts Only</span>
              </label>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
              {AUDIT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAuditCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    auditCategory === cat
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor &amp; Role</th>
                  <th className="py-3 px-4">Category / Action</th>
                  <th className="py-3 px-4">Target &amp; Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No audit records match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => {
                    const isExpanded = expandedAuditId === log.eventId;
                    const isAlert =
                      log.action.includes('REVOKE') ||
                      log.action.includes('REJECT') ||
                      log.action.includes('FAILED') ||
                      log.action.includes('ISOLATION');
                    return (
                      <tr
                        key={log.eventId}
                        onClick={() =>
                          setExpandedAuditId(isExpanded ? null : log.eventId)
                        }
                        className="hover:bg-slate-50/70 align-top cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-700 whitespace-nowrap">
                          {log.eventId}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{log.actorName}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {log.actorRole}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={`font-mono font-semibold ${
                              isAlert ? 'text-red-700' : 'text-slate-900'
                            }`}
                          >
                            {log.action}
                          </div>
                          <div className="text-slate-500">{log.category}</div>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <div className="font-medium text-slate-800">{log.target}</div>
                          <div
                            className={`text-slate-500 mt-0.5 ${
                              isExpanded ? '' : 'line-clamp-2'
                            }`}
                          >
                            {log.details}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
