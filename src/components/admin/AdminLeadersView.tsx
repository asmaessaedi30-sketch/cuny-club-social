import React, { useState } from 'react';
import { ArrowRightLeft, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AdminOverviewData } from './AdminDashboard';
import { StatusText } from '../StatusText';

interface AdminLeadersViewProps {
  data: AdminOverviewData;
  onRefresh: () => Promise<void>;
}

export function AdminLeadersView({ data, onRefresh }: AdminLeadersViewProps) {
  const { apiFetch } = useAuth();
  const [selectedClubId, setSelectedClubId] = useState(data.clubs[0]?.clubId ?? '');
  const [incomingUserId, setIncomingUserId] = useState(data.eligibleUsers[0]?.userId ?? '');
  const [outgoingUserId, setOutgoingUserId] = useState('');
  const [reason, setReason] = useState('Verified semester officer transition');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleAuthorizeOrTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    setBusy(true);
    try {
      await apiFetch(`/api/admin/clubs/${selectedClubId}/leaders`, {
        method: 'POST',
        body: JSON.stringify({
          userId: incomingUserId,
          outgoingLeaderUserId: outgoingUserId || undefined,
          reason,
        }),
      });
      setFeedback(
        outgoingUserId
          ? 'Leadership transfer completed. Outgoing leader access revoked while university staff account custodianship remained unchanged.'
          : 'Club leader authorized and recorded in the audit log.'
      );
      setOutgoingUserId('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authorize leader.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Club Leader Authorization & Leadership Continuity
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Student Life authorizes designated Presidents and Co-Chairs before granting club management
          privileges (BR-004, US-021, US-024).
        </p>
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-start gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-4 h-4 text-[#004B87] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Institutional Continuity Guarantee (US-024):</span>{' '}
          Changing student club leaders never alters designated CUNY SPS staff account custodianship or
          official social media platform ownership.
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {feedback && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAuthorizeOrTransfer}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowRightLeft className="w-4 h-4 text-[#004B87]" />
            <h2 className="text-sm font-semibold text-slate-900">
              Authorize Leader or Execute Transfer
            </h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Target Club Workspace
            </label>
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
            >
              {data.clubs.map((c) => (
                <option key={c.clubId} value={c.clubId}>
                  {c.name} ({c.shortCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Incoming Verified Institutional User
            </label>
            <select
              value={incomingUserId}
              onChange={(e) => setIncomingUserId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
            >
              {data.eligibleUsers.map((u) => (
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
              <option value="">None — Add co-chair / leader without revoking</option>
              {data.leaders
                .filter((l) => l.clubId === selectedClubId && l.status === 'Active')
                .map((l) => (
                  <option key={l.membershipId} value={l.userId}>
                    Revoke {l.userName} ({l.userEmail})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Verification Reason / Note
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {outgoingUserId ? 'Execute Leadership Transfer' : 'Authorize Club Leader'}
            </span>
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Authorized Club Leadership Roster</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Leader</th>
                <th className="py-3 px-4">Club</th>
                <th className="py-3 px-4">Authorized By</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {data.leaders.map((leader) => (
                <tr key={leader.membershipId} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{leader.userName}</div>
                    <div className="text-xs font-mono text-slate-500">{leader.userEmail}</div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">{leader.clubName}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    <div>{leader.authorizedBy}</div>
                    <div className="font-mono-tabular text-slate-400">
                      {new Date(leader.authorizedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={leader.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
