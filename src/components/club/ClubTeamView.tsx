import React, { useState } from 'react';
import { Check, ShieldAlert, UserPlus, UserX } from 'lucide-react';
import { formatRoleLabel, useAuth } from '../../context/AuthContext';
import type { ClubMembership, ClubOfficerTitle, Invitation, RoleName } from '../../types';
import { StatusText } from '../StatusText';

interface EnrichedMember extends ClubMembership {
  name: string;
  email: string;
  departmentOrMajor: string;
  userStatus: string;
}

interface ClubTeamViewProps {
  clubId: string;
  effectiveRole: RoleName | null;
  members: EnrichedMember[];
  invitations: Invitation[];
  onRefresh: () => Promise<void>;
}

const ASSIGNABLE_ROLES: ClubMembership['role'][] = [
  'CLUB_LEAD',
  'EDITOR',
  'CONTRIBUTOR',
  'VIEWER',
];

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

export function ClubTeamView({
  clubId,
  effectiveRole,
  members,
  invitations,
  onRefresh,
}: ClubTeamViewProps) {
  const { apiFetch } = useAuth();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [role, setRole] = useState<ClubMembership['role']>('EDITOR');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const canManageTeam =
    effectiveRole === 'SL_SUPER_ADMIN' ||
    effectiveRole === 'SL_ADMIN' ||
    effectiveRole === 'CLUB_LEAD';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await apiFetch(`/api/clubs/${clubId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ recipientEmail, recipientName, role }),
      });
      setNotice(`Institutional invitation sent to ${recipientEmail}.`);
      setRecipientEmail('');
      setRecipientName('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send invitation.');
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptInvite = async (invId: string) => {
    setError('');
    try {
      await apiFetch(`/api/clubs/${clubId}/invitations/${invId}/accept`, {
        method: 'POST',
      });
      setNotice('Officer verified institutional identity and accepted invitation.');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation.');
    }
  };

  const handleRoleChange = async (userId: string, newRole: ClubMembership['role']) => {
    setError('');
    try {
      await apiFetch(`/api/clubs/${clubId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    }
  };

  const handleOfficerTitleChange = async (userId: string, officerTitle: string) => {
    setError('');
    try {
      await apiFetch(`/api/clubs/${clubId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ officerTitle }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update officer title.');
    }
  };

  const handleRevoke = async (userId: string, currentStatus: string) => {
    setError('');
    try {
      await apiFetch(`/api/clubs/${clubId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: currentStatus === 'Active' ? 'Revoked' : 'Active' }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update membership status.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Club Team & Permissions Management</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Authorized Club Leads invite verified CUNY SPS members and assign club-scoped roles
          without requiring individual Student Life approval (A7, BR-005, BR-006).
        </p>
      </div>

      {!canManageTeam && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-center gap-3 text-xs text-slate-700">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Read-only view: Only authorized Club Leads or Student Life Administrators can invite
            members or modify club roles.
          </span>
        </div>
      )}

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

      {canManageTeam && (
        <form
          onSubmit={handleInvite}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#004B87]" />
              <span>Invite Eligible Club Officer</span>
            </h2>
            <span className="text-xs text-slate-500">
              Requires @spsmail.cuny.edu or @sps.cuny.edu
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g., Priya Sharma"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Institutional Email
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="priya.sharma@spsmail.cuny.edu"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Assigned Club Role (BR-006)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ClubMembership['role'])}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {formatRoleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">
              Club leaders cannot assign university administrator privileges (SL Admin).
            </span>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
            >
              {busy ? 'Sending...' : 'Send Institutional Invitation'}
            </button>
          </div>
        </form>
      )}

      {/* Active Members Roster */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Club Members & Officers ({members.length})
          </h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Officer Role</th>
              <th className="py-3 px-4">Hub Permission</th>
              <th className="py-3 px-4">Authorized By</th>
              <th className="py-3 px-4">Status</th>
              {canManageTeam && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {members.map((m) => (
              <tr key={m.membershipId} className="hover:bg-slate-50/70">
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-900">{m.name}</div>
                  <div className="text-xs font-mono text-slate-500">{m.email}</div>
                </td>
                <td className="py-3 px-4 text-xs">
                  {canManageTeam ? (
                    <select
                      value={m.officerTitle ?? 'General Member'}
                      onChange={(e) =>
                        void handleOfficerTitleChange(m.userId, e.target.value)
                      }
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                    >
                      {OFFICER_TITLES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium text-slate-800">
                      {m.officerTitle ?? 'General Member'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-xs">
                  {canManageTeam ? (
                    <select
                      value={m.role}
                      onChange={(e) =>
                        void handleRoleChange(m.userId, e.target.value as ClubMembership['role'])
                      }
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {formatRoleLabel(r)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-700">{formatRoleLabel(m.role)}</span>
                  )}
                </td>
                <td className="py-3 px-4 text-xs text-slate-600">
                  <div>{m.authorizedBy}</div>
                  <div className="font-mono-tabular text-slate-400">
                    {new Date(m.authorizedAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <StatusText status={m.status} />
                </td>
                {canManageTeam && (
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => void handleRevoke(m.userId, m.status)}
                      className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap cursor-pointer ${
                        m.status === 'Active'
                          ? 'text-red-700 hover:underline'
                          : 'text-emerald-700 hover:underline'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>{m.status === 'Active' ? 'Remove / Revoke' : 'Restore'}</span>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Pending & Historical Invitations ({invitations.length})
          </h2>
        </div>
        {invitations.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">No invitations sent yet.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4">Assigned Role</th>
                <th className="py-2.5 px-4">Invited By</th>
                <th className="py-2.5 px-4">Status</th>
                {canManageTeam && <th className="py-2.5 px-4 text-right">Verification</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invitations.map((inv) => (
                <tr key={inv.invitationId}>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-slate-900">{inv.recipientName}</div>
                    <div className="font-mono text-slate-500">{inv.recipientEmail}</div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">{formatRoleLabel(inv.role)}</td>
                  <td className="py-2.5 px-4 text-slate-600">{inv.invitedByName}</td>
                  <td className="py-2.5 px-4">
                    <StatusText status={inv.status} />
                  </td>
                  {canManageTeam && (
                    <td className="py-2.5 px-4 text-right">
                      {inv.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => void handleAcceptInvite(inv.invitationId)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Simulate Recipient Acceptance</span>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
