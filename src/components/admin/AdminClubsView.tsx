import React, { useState } from 'react';
import { DollarSign, FileText, Pencil, Plus, Users, X } from 'lucide-react';
import { formatRoleLabel, useAuth } from '../../context/AuthContext';
import type { Club, ClubCharterRenewalSummary } from '../../types';
import { exportCharterRenewalPdf } from '../../utils/resourcePdfExport';
import { ClubLogoMark } from '../BrandMarks';
import { ClubProfileEditor } from '../club/ClubProfileEditor';
import { StatusText } from '../StatusText';

interface AdminClubMemberRow {
  membershipId: string;
  userId: string;
  role: string;
  officerTitle?: string;
  status: string;
  authorizedBy: string;
  authorizedAt: string;
  userName: string;
  userEmail: string;
  departmentOrMajor: string;
  userStatus: string;
}

interface AdminClubsViewProps {
  clubs: Club[];
  onRefresh: () => Promise<void>;
  onOpenClubWorkspace: (clubId: string) => void;
}

export function AdminClubsView({ clubs, onRefresh, onOpenClubWorkspace }: AdminClubsViewProps) {
  const { apiFetch } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [category, setCategory] = useState('Academic & Research');
  const [facultyAdvisor, setFacultyAdvisor] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingBudgetClubId, setEditingBudgetClubId] = useState<string | null>(null);
  const [editingProfileClubId, setEditingProfileClubId] = useState<string | null>(null);
  const [budgetCapInput, setBudgetCapInput] = useState('');
  const [inspectingClubId, setInspectingClubId] = useState<string | null>(null);
  const [clubMembers, setClubMembers] = useState<AdminClubMemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const handleToggleMembership = async (clubId: string) => {
    if (inspectingClubId === clubId) {
      setInspectingClubId(null);
      return;
    }
    setInspectingClubId(clubId);
    setLoadingMembers(true);
    setError('');
    try {
      const res = await apiFetch<{ members: AdminClubMemberRow[] }>(
        `/api/admin/clubs/${clubId}/members`
      );
      setClubMembers(res.members ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load club membership roster.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiFetch('/api/admin/clubs', {
        method: 'POST',
        body: JSON.stringify({
          name,
          shortCode,
          category,
          facultyAdvisor,
          description,
          activateImmediately: true,
        }),
      });
      setShowCreate(false);
      setName('');
      setShortCode('');
      setFacultyAdvisor('');
      setDescription('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create club workspace.');
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (clubId: string, status: Club['status']) => {
    try {
      await apiFetch(`/api/admin/clubs/${clubId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update club status.');
    }
  };

  const handleSaveBudgetCap = async (clubId: string) => {
    setError('');
    setNotice('');
    const amount = Number(budgetCapInput);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid non-negative annual Student Activity Fee cap.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/admin/clubs/${clubId}/budget`, {
        method: 'PATCH',
        body: JSON.stringify({ allocatedUsd: amount }),
      });
      setEditingBudgetClubId(null);
      setNotice(`Updated annual Student Activity Fee budget cap to $${amount.toFixed(2)}.`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update club budget allocation.');
    } finally {
      setBusy(false);
    }
  };

  const handleExportCharterRenewal = async (clubId: string) => {
    setError('');
    setNotice('');
    try {
      const dossier = await apiFetch<ClubCharterRenewalSummary>(`/api/clubs/${clubId}/charter-renewal`);
      const filename = exportCharterRenewalPdf(dossier);
      setNotice(`Generated annual charter renewal packet (${filename}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export charter renewal dossier.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Participating Clubs Directory</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Only approved CUNY SPS student organizations receive active club workspaces (BR-003).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Approved Workspace</span>
        </button>
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

      {showCreate && (
        <form
          onSubmit={handleCreateClub}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Activate New Club Workspace (US-003)
            </h2>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Close form"
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
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                placeholder="e.g., HIS-SPS"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
              >
                <option>Technology & Innovation</option>
                <option>Academic & Research</option>
                <option>Health & Human Services</option>
                <option>Business & Leadership</option>
                <option>Community & Culture</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Faculty / Staff Advisor
              </label>
              <input
                type="text"
                required
                value={facultyAdvisor}
                onChange={(e) => setFacultyAdvisor(e.target.value)}
                placeholder="e.g., Dr. Elena Morales"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Club Mission & Scope
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summarize the organization's student mission and communications purpose..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
            >
              {busy ? 'Creating...' : 'Create & Activate Workspace'}
            </button>
          </div>
        </form>
      )}

      {editingProfileClubId && (() => {
        const targetClub = clubs.find((c) => c.clubId === editingProfileClubId);
        if (!targetClub) return null;
        return (
          <ClubProfileEditor
            key={targetClub.clubId}
            club={targetClub}
            mode="admin"
            canEdit
            onSaved={async (updatedClub) => {
              setEditingProfileClubId(null);
              setNotice(`Updated club profile picture & details for ${updatedClub.name} (${updatedClub.shortCode}).`);
              await onRefresh();
            }}
            onCancel={() => setEditingProfileClubId(null)}
          />
        );
      })()}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Club Workspace</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Faculty Advisor</th>
              <th className="py-3 px-4">SAF Budget Balance</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {clubs.map((club) => {
              const budget = club.budgetSummary;
              const isEditingBudget = editingBudgetClubId === club.clubId;
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
                        <div className="font-semibold text-slate-900">{club.name}</div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">
                          {club.shortCode} · Onboarded {new Date(club.onboardedAt).toLocaleDateString()}
                        </div>
                        {(club.tagline || club.meetingSchedule) && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {club.tagline}
                            {club.tagline && club.meetingSchedule ? ' · ' : ''}
                            {club.meetingSchedule}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{club.category}</td>
                  <td className="py-3 px-4 text-xs text-slate-700">{club.facultyAdvisor}</td>
                  <td className="py-3 px-4 text-xs">
                    {isEditingBudget ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={budgetCapInput}
                          onChange={(e) => setBudgetCapInput(e.target.value)}
                          className="w-24 px-2 py-1 text-xs font-mono-tabular border border-slate-300 rounded"
                          aria-label="Budget allocation cap"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleSaveBudgetCap(club.clubId)}
                          className="px-2 py-1 text-[11px] font-medium text-white bg-[#004B87] rounded cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBudgetClubId(null)}
                          className="px-1.5 py-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : budget ? (
                      <div className="space-y-0.5">
                        <div className="font-mono-tabular font-medium text-slate-900">
                          ${budget.remainingUsd.toFixed(2)} left{' '}
                          <span className="text-slate-500 font-normal">
                            / ${budget.allocatedUsd.toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBudgetClubId(club.clubId);
                            setBudgetCapInput(String(budget.allocatedUsd));
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-[#004B87] hover:underline cursor-pointer"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>Adjust Cap</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono-tabular">
                        ${(club.semesterBudgetAllocatedUsd ?? 500).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={club.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProfileClubId((prev) =>
                            prev === club.clubId ? null : club.clubId
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{editingProfileClubId === club.clubId ? 'Close Editor' : 'Edit Profile'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleMembership(club.clubId)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{inspectingClubId === club.clubId ? 'Hide Members' : 'View Membership'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleExportCharterRenewal(club.clubId)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-[#004B87] whitespace-nowrap cursor-pointer"
                        title="Download Student Life Annual Charter Renewal Dossier PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Charter PDF</span>
                      </button>
                      {club.status === 'Pending Approval' ? (
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(club.clubId, 'Active')}
                          className="text-xs font-medium text-emerald-700 hover:underline whitespace-nowrap cursor-pointer"
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
                            Inspect Portal
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(club.clubId, 'Suspended')}
                            className="text-xs font-medium text-slate-500 hover:text-red-700 whitespace-nowrap cursor-pointer"
                          >
                            Suspend
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(club.clubId, 'Active')}
                          className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {inspectingClubId && (() => {
        const targetClub = clubs.find((c) => c.clubId === inspectingClubId);
        return (
          <section className="bg-white border border-[#004B87] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-sky-50/50 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Verified Club Membership Roster — {targetClub?.name} ({targetClub?.shortCode})
                </h2>
                <p className="text-xs text-slate-600">
                  Institutional visibility across all active, alumni, and revoked member records
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingClubId(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-300 bg-white rounded-md cursor-pointer"
                aria-label="Close membership panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {loadingMembers ? (
              <div className="p-6 text-xs text-slate-500">Loading verified club members...</div>
            ) : clubMembers.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">No members recorded in this club workspace.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-2.5 px-4">Member</th>
                      <th className="py-2.5 px-4">Role &amp; Title</th>
                      <th className="py-2.5 px-4">Program</th>
                      <th className="py-2.5 px-4">Authorized By</th>
                      <th className="py-2.5 px-4">Membership Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {clubMembers.map((m) => (
                      <tr key={m.membershipId}>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{m.userName}</div>
                          <div className="font-mono text-[11px] text-slate-500">{m.userEmail}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div>{formatRoleLabel(m.role)}</div>
                          {m.officerTitle && (
                            <div className="text-[11px] text-[#004B87] font-medium">{m.officerTitle}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{m.departmentOrMajor || 'CUNY SPS'}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {m.authorizedBy} · {new Date(m.authorizedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusText status={m.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })()}
    </div>
  );
}
