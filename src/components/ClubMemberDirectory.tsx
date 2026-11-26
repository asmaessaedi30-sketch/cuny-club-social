import { DataLoadState } from './DataLoadState';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BookUser,
  CheckCircle2,
  Megaphone,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { formatRoleLabel, useAuth } from '../context/AuthContext';
import type {
  Club,
  ClubJoinRequest,
  ClubMemberDirectoryEntry,
  ClubMembership,
  ClubOfficerTitle,
} from '../types';
import { ClubMessagingCenter } from './club/ClubMessagingCenter';
import { OfficerHandoverPanel } from './OfficerHandoverPanel';
import { StatusText } from './StatusText';

interface EligibleStudent {
  userId: string;
  name: string;
  email: string;
  departmentOrMajor: string;
}

interface MemberDirectoryResponse {
  entries: ClubMemberDirectoryEntry[];
  clubs: Club[];
  eligibleStudents: EligibleStudent[];
}

interface ClubMemberDirectoryProps {
  activeClubId?: string | null;
  onRefreshParent?: () => Promise<void>;
}

const OFFICER_TITLES: ClubOfficerTitle[] = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Social Media Chair',
  'Events Coordinator',
  'General Member',
  'Faculty Advisor',
];

const PLATFORM_ROLES: ClubMembership['role'][] = [
  'CLUB_LEAD',
  'EDITOR',
  'CONTRIBUTOR',
  'VIEWER',
];

export function ClubMemberDirectory({
  activeClubId,
  onRefreshParent,
}: ClubMemberDirectoryProps) {
  const { apiFetch, session } = useAuth();
  const [entries, setEntries] = useState<ClubMemberDirectoryEntry[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudent[]>([]);
  const [joinRequests, setJoinRequests] = useState<ClubJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Filters
  const [clubFilter, setClubFilter] = useState<string>('ALL');
  const [officerFilter, setOfficerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Officer Handover Panel toggle
  const [showHandoverPanel, setShowHandoverPanel] = useState(false);
  const [handoverClubId, setHandoverClubId] = useState('');
  const [decidingJoinId, setDecidingJoinId] = useState<string | null>(null);

  // Integrated Club Messaging Center toggle
  const [showMessagingCenter, setShowMessagingCenter] = useState(false);
  const [messagingClubId, setMessagingClubId] = useState('');
  const messagingSectionRef = React.useRef<HTMLDivElement | null>(null);

  // Add Member Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');
  const [targetClubId, setTargetClubId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMajor, setNewMajor] = useState('B.S. Information Systems');
  const [newOfficerTitle, setNewOfficerTitle] = useState<ClubOfficerTitle>('Secretary');
  const [newPlatformRole, setNewPlatformRole] = useState<ClubMembership['role']>('CONTRIBUTOR');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [res, jrRes] = await Promise.all([
        apiFetch<MemberDirectoryResponse>('/api/member-directory'),
        apiFetch<{ joinRequests: ClubJoinRequest[] }>('/api/join-requests'),
      ]);
      setEntries(res.entries);
      setClubs(res.clubs);
      setEligibleStudents(res.eligibleStudents);
      setJoinRequests(jrRes.joinRequests ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load club member directory.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const manageableClubs = useMemo(() => {
    return clubs.filter((c) => {
      if (session?.effectiveAdminRole) return true;
      return session?.memberships.some(
        (m) => m.clubId === c.clubId && m.status === 'Active' && m.role === 'CLUB_LEAD'
      );
    });
  }, [clubs, session]);

  useEffect(() => {
    if (manageableClubs.length > 0 && !manageableClubs.some((c) => c.clubId === targetClubId)) {
      const preferred =
        activeClubId && manageableClubs.some((c) => c.clubId === activeClubId)
          ? activeClubId
          : manageableClubs[0].clubId;
      setTargetClubId(preferred);
    }
    if (manageableClubs.length > 0 && !manageableClubs.some((c) => c.clubId === handoverClubId)) {
      const preferred =
        activeClubId && manageableClubs.some((c) => c.clubId === activeClubId)
          ? activeClubId
          : manageableClubs[0].clubId;
      setHandoverClubId(preferred);
    }
    if (clubs.length > 0 && !clubs.some((c) => c.clubId === messagingClubId)) {
      const preferred =
        activeClubId && clubs.some((c) => c.clubId === activeClubId)
          ? activeClubId
          : manageableClubs[0]?.clubId ?? clubs[0].clubId;
      setMessagingClubId(preferred);
    }
  }, [activeClubId, clubs, manageableClubs, targetClubId, handoverClubId, messagingClubId]);

  useEffect(() => {
    if (eligibleStudents.length > 0 && !selectedUserId) {
      setSelectedUserId(eligibleStudents[0].userId);
    }
  }, [eligibleStudents, selectedUserId]);

  const handleJoinRequestDecision = async (
    jr: ClubJoinRequest,
    decision: 'Approved' | 'Declined'
  ) => {
    setDecidingJoinId(jr.joinRequestId);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/clubs/${jr.clubId}/join-requests/${jr.joinRequestId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          officerTitle: 'General Member',
          role: 'CONTRIBUTOR',
        }),
      });
      setNotice(
        decision === 'Approved'
          ? `Approved ${jr.studentName} into ${jr.clubName} Member Directory.`
          : `Declined join request from ${jr.studentName}.`
      );
      await loadDirectory();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process join request.');
    } finally {
      setDecidingJoinId(null);
    }
  };

  const handleUpdateMember = async (
    entry: ClubMemberDirectoryEntry,
    patch: { officerTitle?: string; role?: ClubMembership['role']; status?: 'Active' | 'Revoked' }
  ) => {
    const key = `${entry.clubId}-${entry.userId}`;
    setSavingKey(key);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/clubs/${entry.clubId}/members/${entry.userId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (patch.officerTitle) {
        setNotice(`Assigned ${entry.name} as ${patch.officerTitle} for ${entry.clubName}.`);
      } else if (patch.role) {
        setNotice(`Updated ${entry.name}'s hub role to ${formatRoleLabel(patch.role)}.`);
      } else if (patch.status) {
        setNotice(`${entry.name}'s membership status updated to ${patch.status}.`);
      }
      await loadDirectory();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update club member role.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClubId) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/clubs/${targetClubId}/members`, {
        method: 'POST',
        body: JSON.stringify(
          addMode === 'existing'
            ? {
                userId: selectedUserId,
                officerTitle: newOfficerTitle,
                role: newPlatformRole,
              }
            : {
                name: newName,
                email: newEmail,
                departmentOrMajor: newMajor,
                officerTitle: newOfficerTitle,
                role: newPlatformRole,
              }
        ),
      });
      setNotice(`Added student member as ${newOfficerTitle}.`);
      setNewName('');
      setNewEmail('');
      setShowAddForm(false);
      await loadDirectory();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add student member.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 || clubFilter !== 'ALL' || officerFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setClubFilter('ALL');
    setOfficerFilter('ALL');
  };

  const filteredEntries = useMemo(() => {
    const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter((entry) => {
      if (clubFilter !== 'ALL' && entry.clubId !== clubFilter) return false;
      const officerTitle = entry.officerTitle ?? 'General Member';
      if (officerFilter !== 'ALL' && officerTitle !== officerFilter) {
        return false;
      }
      if (tokens.length === 0) return true;

      const searchableFields = [
        entry.name.toLowerCase(),
        officerTitle.toLowerCase(),
        formatRoleLabel(entry.role).toLowerCase(),
        entry.role.toLowerCase(),
        entry.email.toLowerCase(),
        entry.departmentOrMajor.toLowerCase(),
        entry.clubName.toLowerCase(),
        entry.clubShortCode.toLowerCase(),
      ];

      return tokens.every((token) =>
        searchableFields.some((field) => field.includes(token))
      );
    });
  }, [entries, clubFilter, officerFilter, searchQuery]);

  const groupedByClub = useMemo(() => {
    const groups = new Map<string, { club: Club; members: ClubMemberDirectoryEntry[] }>();
    for (const club of clubs) {
      if (clubFilter !== 'ALL' && club.clubId !== clubFilter) continue;
      groups.set(club.clubId, { club, members: [] });
    }
    for (const entry of filteredEntries) {
      const existing = groups.get(entry.clubId);
      if (existing) {
        existing.members.push(entry);
      } else {
        groups.set(entry.clubId, {
          club: {
            clubId: entry.clubId,
            name: entry.clubName,
            shortCode: entry.clubShortCode,
            description: '',
            category: 'Student Organization',
            status: 'Active',
            facultyAdvisor: '',
            onboardedAt: '',
          },
          members: [entry],
        });
      }
    }
    return Array.from(groups.values()).filter(
      (g) =>
        g.members.length > 0 ||
        (!hasActiveFilters && clubFilter !== 'ALL' && g.club.clubId === clubFilter)
    );
  }, [clubs, clubFilter, filteredEntries, hasActiveFilters]);

  const activeMemberCount = entries.filter((e) => e.status === 'Active').length;
  const officerCount = entries.filter(
    (e) =>
      e.status === 'Active' &&
      e.officerTitle &&
      e.officerTitle !== 'General Member' &&
      e.officerTitle !== 'Faculty Advisor'
  ).length;

  if (loading || loadError) return <DataLoadState label="member directory" loading={loading} error={loadError} onRetry={() => void loadDirectory()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Club Member Directory</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Roster of student members associated with each club, with officer role assignment
            (President, Vice President, Secretary, Treasurer) and club-scoped access controls.
          </p>
        </div>

        {(clubs.length > 0 || manageableClubs.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {clubs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMessagingCenter((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer ${
                  showMessagingCenter
                    ? 'bg-[#004B87] text-white border-[#004B87]'
                    : 'text-[#004B87] bg-white border-[#004B87] hover:bg-sky-50'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>{showMessagingCenter ? 'Hide Messaging Center' : 'Messaging Center'}</span>
              </button>
            )}
            {manageableClubs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowHandoverPanel((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{showHandoverPanel ? 'Hide Officer Handover' : 'Semester Officer Handover'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setShowAddForm((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? 'Close Member Form' : 'Add / Assign Member'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Institutional Policy Note */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#004B87] shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold text-slate-900">Role Governance (BR-006):</span>{' '}
            Club Leads and Student Life Administrators can assign club officer titles and
            permissions per club without granting university-wide admin privileges.
          </span>
        </div>
        <div className="font-mono-tabular text-slate-600 whitespace-nowrap shrink-0">
          {activeMemberCount} active members · {officerCount} officers
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {notice}
        </div>
      )}

      {/* Pending Club Join Requests Approval Queue */}
      {(() => {
        const manageableClubIds = new Set(manageableClubs.map((c) => c.clubId));
        const pendingRequests = joinRequests.filter(
          (jr) => jr.status === 'Pending' && manageableClubIds.has(jr.clubId)
        );
        if (pendingRequests.length === 0) return null;
        return (
          <section
            aria-label="Pending Club Join Requests"
            className="bg-white border border-[#004B87] rounded-lg overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 bg-sky-50/50 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Pending Student Requests to Join ({pendingRequests.length})
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Approve incoming CUNY SPS students directly into your Club Member Directory.
                </p>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {pendingRequests.map((jr) => (
                <div
                  key={jr.joinRequestId}
                  className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {jr.studentName}
                      </span>
                      <span className="font-mono text-slate-500">{jr.studentEmail}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-medium text-[#004B87]">
                        {jr.clubName} ({jr.clubShortCode})
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {jr.departmentOrMajor} · Interest: {jr.preferredInterest}
                    </div>
                    <div className="text-slate-700 italic">&ldquo;{jr.reason}&rdquo;</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      disabled={decidingJoinId === jr.joinRequestId}
                      onClick={() => void handleJoinRequestDecision(jr, 'Approved')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve into Directory</span>
                    </button>
                    <button
                      type="button"
                      disabled={decidingJoinId === jr.joinRequestId}
                      onClick={() => void handleJoinRequestDecision(jr, 'Declined')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:text-red-700 hover:border-red-300 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Integrated Club Messaging Center */}
      {showMessagingCenter && messagingClubId && (
        <div ref={messagingSectionRef}>
          <ClubMessagingCenter
            clubId={messagingClubId}
            variant="directory"
            defaultOpenComposer
            clubOptions={clubs.map((c) => ({
              clubId: c.clubId,
              name: c.name,
              shortCode: c.shortCode,
            }))}
            onSelectClub={setMessagingClubId}
            onRefreshParent={async () => {
              await loadDirectory();
              if (onRefreshParent) await onRefreshParent();
            }}
          />
        </div>
      )}

      {/* Semester Officer Handover Panel */}
      {showHandoverPanel && manageableClubs.length > 0 && handoverClubId && (
        <div className="space-y-3">
          {manageableClubs.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="handover-club-select" className="font-semibold text-slate-700">
                Transitioning Club Workspace:
              </label>
              <select
                id="handover-club-select"
                value={handoverClubId}
                onChange={(e) => setHandoverClubId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800"
              >
                {manageableClubs.map((c) => (
                  <option key={c.clubId} value={c.clubId}>
                    {c.name} ({c.shortCode})
                  </option>
                ))}
              </select>
            </div>
          )}
          <OfficerHandoverPanel
            clubId={handoverClubId}
            onRefreshParent={async () => {
              await loadDirectory();
              if (onRefreshParent) await onRefreshParent();
            }}
          />
        </div>
      )}

      {/* Add / Assign Student Member Form */}
      {showAddForm && manageableClubs.length > 0 && (
        <form
          onSubmit={handleAddMember}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#004B87]" />
              <span>Enroll or Assign Club Member</span>
            </h2>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md w-fit">
              <button
                type="button"
                onClick={() => setAddMode('existing')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  addMode === 'existing'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verified Student Roster
              </button>
              <button
                type="button"
                onClick={() => setAddMode('new')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  addMode === 'new'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                New Institutional Student
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Student Club
              </label>
              <select
                value={targetClubId}
                onChange={(e) => setTargetClubId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              >
                {manageableClubs.map((c) => (
                  <option key={c.clubId} value={c.clubId}>
                    {c.name} ({c.shortCode})
                  </option>
                ))}
              </select>
            </div>

            {addMode === 'existing' ? (
              <div className="md:col-span-1">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Select Verified Student
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {eligibleStudents.map((stu) => (
                    <option key={stu.userId} value={stu.userId}>
                      {stu.name} ({stu.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Jordan Patel"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    CUNY SPS Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="jordan.patel@spsmail.cuny.edu"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Program / Major
                  </label>
                  <input
                    type="text"
                    value={newMajor}
                    onChange={(e) => setNewMajor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Club Officer Title
              </label>
              <select
                value={newOfficerTitle}
                onChange={(e) => setNewOfficerTitle(e.target.value as ClubOfficerTitle)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              >
                {OFFICER_TITLES.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Hub Permission Role
              </label>
              <select
                value={newPlatformRole}
                onChange={(e) => setNewPlatformRole(e.target.value as ClubMembership['role'])}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              >
                {PLATFORM_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {formatRoleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Assign Member to Club'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name or role (e.g., President, Secretary, Club Lead)..."
              aria-label="Search club members by name or role"
              className="w-full pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]/20 focus:border-[#004B87]"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear member search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              aria-label="Filter by student club"
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:border-[#004B87]"
            >
              <option value="ALL">All Authorized Clubs ({clubs.length})</option>
              {clubs.map((c) => (
                <option key={c.clubId} value={c.clubId}>
                  {c.name} ({c.shortCode})
                </option>
              ))}
            </select>

            <select
              value={officerFilter}
              onChange={(e) => setOfficerFilter(e.target.value)}
              aria-label="Filter by officer role"
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:border-[#004B87]"
            >
              <option value="ALL">All Officer Roles</option>
              {OFFICER_TITLES.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
          <span className="font-mono-tabular">
            Showing {filteredEntries.length} of {entries.length} member records
            {searchQuery.trim() ? ` · Query: "${searchQuery.trim()}"` : ''}
          </span>
          <span>Search matches member name, officer title, hub access role, email, major, or club</span>
        </div>
      </div>

      {/* Club-Grouped Member Rosters */}
      {groupedByClub.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
          <p className="text-sm text-slate-600">
            {hasActiveFilters
              ? 'No student club members match your current search or role filter.'
              : 'No student club members found in your authorized organizations.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#004B87] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md whitespace-nowrap cursor-pointer"
            >
              Clear Search &amp; Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByClub.map(({ club, members }) => (
            <section
              key={club.clubId}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <BookUser className="w-4 h-4 text-[#004B87] shrink-0" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {club.name}{' '}
                      <span className="font-mono text-xs font-normal text-slate-500">
                        ({club.shortCode})
                      </span>
                    </h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-mono-tabular text-slate-500">
                    {members.filter((m) => m.status === 'Active').length} active / {members.length}{' '}
                    total listed
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMessagingClubId(club.clubId);
                      setShowMessagingCenter(true);
                      setTimeout(() => {
                        messagingSectionRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'nearest',
                        });
                      }, 50);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#004B87] bg-white border border-slate-300 hover:border-[#004B87] hover:bg-sky-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Message Members</span>
                  </button>
                </div>
              </div>

              {members.length === 0 ? (
                <div className="p-6 text-xs text-slate-500">
                  No members assigned to {club.name} yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Student Member</th>
                        <th className="py-3 px-4">Academic Program</th>
                        <th className="py-3 px-4">Club Officer Role</th>
                        <th className="py-3 px-4">Hub Access Level</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Membership</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {members.map((member) => {
                        const rowKey = `${member.clubId}-${member.userId}`;
                        const busy = savingKey === rowKey;
                        const currentTitle = member.officerTitle ?? 'General Member';
                        const titleOptions = OFFICER_TITLES.includes(
                          currentTitle as ClubOfficerTitle
                        )
                          ? OFFICER_TITLES
                          : [currentTitle, ...OFFICER_TITLES];

                        return (
                          <tr key={member.membershipId} className="hover:bg-slate-50/70">
                            <td className="py-3.5 px-4">
                              <div className="text-sm font-semibold text-slate-900">
                                {member.name}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500">
                                {member.email}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              {member.departmentOrMajor}
                            </td>
                            <td className="py-3.5 px-4">
                              {member.canManage ? (
                                <select
                                  aria-label={`Officer role for ${member.name} in ${club.name}`}
                                  disabled={busy}
                                  value={currentTitle}
                                  onChange={(e) =>
                                    void handleUpdateMember(member, {
                                      officerTitle: e.target.value,
                                    })
                                  }
                                  className="px-2.5 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87] disabled:opacity-50"
                                >
                                  {titleOptions.map((title) => (
                                    <option key={title} value={title}>
                                      {title}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="font-semibold text-slate-800">
                                  {currentTitle}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {member.canManage ? (
                                <select
                                  aria-label={`Hub access level for ${member.name} in ${club.name}`}
                                  disabled={busy}
                                  value={member.role}
                                  onChange={(e) =>
                                    void handleUpdateMember(member, {
                                      role: e.target.value as ClubMembership['role'],
                                    })
                                  }
                                  className="px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87] disabled:opacity-50"
                                >
                                  {PLATFORM_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                      {formatRoleLabel(r)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-600">
                                  {formatRoleLabel(member.role)}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusText status={member.status} />
                              <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                                {new Date(member.authorizedAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {member.canManage ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void handleUpdateMember(member, {
                                      status: member.status === 'Active' ? 'Revoked' : 'Active',
                                    })
                                  }
                                  className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap cursor-pointer disabled:opacity-50 ${
                                    member.status === 'Active'
                                      ? 'text-red-700 hover:underline'
                                      : 'text-emerald-700 hover:underline'
                                  }`}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>{member.status === 'Active' ? 'Revoke' : 'Restore'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">Read-only</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
