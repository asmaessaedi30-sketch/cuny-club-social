import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  CheckSquare,
  ShieldCheck,
  Square,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Club, OfficerTransitionChecklist, SocialAccount } from '../types';
import { StatusText } from './StatusText';

interface TransitionMemberRow {
  membershipId: string;
  userId: string;
  role: string;
  officerTitle?: string;
  status: string;
  name: string;
  email: string;
  departmentOrMajor: string;
  openTaskCount: number;
  custodiedAccountsCount: number;
}

interface TransitionResponse {
  transition: OfficerTransitionChecklist;
  club: Club;
  members: TransitionMemberRow[];
  socialAccounts: SocialAccount[];
  canManage: boolean;
}

interface OfficerHandoverPanelProps {
  clubId: string;
  onRefreshParent?: () => Promise<void>;
}

const ROTATION_TITLES = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Social Media Chair',
  'Events Coordinator',
];

export function OfficerHandoverPanel({ clubId, onRefreshParent }: OfficerHandoverPanelProps) {
  const { apiFetch, session } = useAuth();
  const [data, setData] = useState<TransitionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busyChecklistId, setBusyChecklistId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [advisorNote, setAdvisorNote] = useState('');
  const [coSigning, setCoSigning] = useState(false);

  const [outgoingUserId, setOutgoingUserId] = useState('');
  const [incomingUserId, setIncomingUserId] = useState('');
  const [officerTitle, setOfficerTitle] = useState('President');
  const [archiveOutgoingAsAlumni, setArchiveOutgoingAsAlumni] = useState(true);
  const [transferTasks, setTransferTasks] = useState(true);
  const [transferSocialCustody, setTransferSocialCustody] = useState(true);

  const loadTransition = useCallback(async () => {
    if (!clubId) return;
    setError('');
    try {
      const res = await apiFetch<TransitionResponse>(`/api/clubs/${clubId}/transition`);
      setData(res);
      const activeMembers = res.members.filter((m) => m.status === 'Active');
      if (activeMembers.length >= 2) {
        setOutgoingUserId((prev) =>
          prev && activeMembers.some((m) => m.userId === prev) ? prev : activeMembers[0].userId
        );
        setIncomingUserId((prev) =>
          prev && activeMembers.some((m) => m.userId === prev) ? prev : activeMembers[1].userId
        );
      } else if (activeMembers.length === 1) {
        setOutgoingUserId(activeMembers[0].userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load semester officer transition tool.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, clubId]);

  useEffect(() => {
    setLoading(true);
    void loadTransition();
  }, [loadTransition]);

  const handleToggleChecklistItem = async (itemId: string, completed: boolean) => {
    if (!data?.canManage) return;
    setBusyChecklistId(itemId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${clubId}/transition/checklist`, {
        method: 'PATCH',
        body: JSON.stringify({ itemId, completed: !completed }),
      });
      await loadTransition();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update checklist item.');
    } finally {
      setBusyChecklistId(null);
    }
  };

  const handleExecuteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outgoingUserId || !incomingUserId) return;
    setExecuting(true);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{
        summary: string;
        transferredTasksCount: number;
        transferredAccountsCount: number;
      }>(`/api/clubs/${clubId}/transition/execute`, {
        method: 'POST',
        body: JSON.stringify({
          outgoingUserId,
          incomingUserId,
          officerTitle,
          archiveOutgoingAsAlumni,
          transferTasks,
          transferSocialCustody,
        }),
      });
      setFeedback(res.summary);
      await loadTransition();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to execute officer handover.');
    } finally {
      setExecuting(false);
    }
  };

  const handleAdvisorSignOff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCoSigning(true);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${clubId}/transition/advisor-signoff`, {
        method: 'POST',
        body: JSON.stringify({ note: advisorNote.trim() || undefined }),
      });
      setAdvisorNote('');
      setFeedback('Recorded Faculty Advisor endorsement for semester officer transition.');
      await loadTransition();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record Faculty Advisor sign-off.');
    } finally {
      setCoSigning(false);
    }
  };

  if (loading) {
    return <div className="h-44 bg-slate-100 rounded-lg animate-pulse" />;
  }

  if (!data) return null;

  const { transition, club, members, socialAccounts, canManage } = data;
  const completedCount = transition.checklistItems.filter((i) => i.completed).length;
  const activeMembers = members.filter((m) => m.status === 'Active');
  const alumniMembers = members.filter((m) => m.status === 'Alumni');
  const canCoSign = Boolean(
    session?.effectiveAdminRole ||
      (session?.user.name &&
        club.facultyAdvisor.toLowerCase() === session.user.name.toLowerCase()) ||
      session?.memberships.some(
        (m) =>
          m.clubId === clubId &&
          m.status === 'Active' &&
          (m.officerTitle ?? '').toLowerCase() === 'faculty advisor'
      )
  );

  return (
    <section
      aria-label="Officer Handover and Semester Transition Tool"
      className="bg-white border border-slate-200 rounded-lg overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-[#004B87] shrink-0" />
            <h2 className="text-sm font-bold text-slate-900">
              Officer Handover &amp; Semester Transition Tool ({transition.fromSemester} →{' '}
              {transition.toSemester})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
            Target Effective Date: {transition.targetEffectiveDate} · {completedCount}/
            {transition.checklistItems.length} checklist steps completed ·{' '}
            {alumniMembers.length} archived alumni
          </p>
        </div>

        <StatusText status={transition.status} />
      </div>

      <div className="p-5 space-y-5">
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
        {!feedback && transition.lastRotationNote && (
          <div className="p-3 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md">
            <strong>Last Completed Rotation:</strong> {transition.lastRotationNote}
          </div>
        )}

        {/* Faculty Advisor Transition Endorsement */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-900">
              Faculty Advisor Endorsement ({club.facultyAdvisor})
            </div>
            {transition.advisorSignOff ? (
              <StatusText status="Co-Signed" />
            ) : (
              <StatusText status="Advisor Sign-Off Pending" />
            )}
          </div>
          {transition.advisorSignOff ? (
            <div className="text-xs text-emerald-800 font-mono-tabular">
              Verified by {transition.advisorSignOff.signedByName} on{' '}
              {new Date(transition.advisorSignOff.signedAt).toLocaleString()}
              {transition.advisorSignOff.note ? ` — ${transition.advisorSignOff.note}` : ''}
            </div>
          ) : (
            <div className="text-xs text-slate-600">
              Pending Faculty Advisor co-sign confirming incoming executive officer continuity.
            </div>
          )}

          {canCoSign && !transition.advisorSignOff && (
            <form onSubmit={handleAdvisorSignOff} className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="text"
                value={advisorNote}
                onChange={(e) => setAdvisorNote(e.target.value)}
                placeholder="Optional advisor endorsement note..."
                aria-label="Faculty Advisor transition endorsement note"
                className="flex-1 min-w-[200px] px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
              <button
                type="submit"
                disabled={coSigning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{coSigning ? 'Recording Co-Sign...' : 'Co-Sign Transition'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Transition Checklist */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-800">
            Semester-End Handover Checklist
          </div>
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
            {transition.checklistItems.map((item) => {
              const Icon = item.completed ? CheckSquare : Square;
              return (
                <button
                  key={item.itemId}
                  type="button"
                  disabled={!canManage || busyChecklistId === item.itemId}
                  onClick={() => void handleToggleChecklistItem(item.itemId, item.completed)}
                  className={`w-full px-4 py-3 text-left flex items-start justify-between gap-3 text-xs transition-colors ${
                    canManage ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span className="flex items-start gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        item.completed ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    />
                    <span
                      className={
                        item.completed ? 'text-slate-500 line-through' : 'text-slate-800 font-medium'
                      }
                    >
                      {item.label}
                    </span>
                  </span>
                  {item.completed && item.completedBy && (
                    <span className="text-[11px] font-mono-tabular text-slate-400 whitespace-nowrap shrink-0">
                      {item.completedBy}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Officer Rotation & Custody Transfer Form */}
        {canManage ? (
          <form
            onSubmit={handleExecuteHandover}
            className="p-4 bg-slate-50/70 border border-slate-200 rounded-md space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-900">
                Execute Officer Rotation &amp; Operational Custody Transfer
              </div>
              <span className="text-[11px] font-mono-tabular text-slate-500">
                {socialAccounts.length} club social account{socialAccounts.length === 1 ? '' : 's'} tracked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Officer Role to Rotate
                </label>
                <select
                  value={officerTitle}
                  onChange={(e) => setOfficerTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {ROTATION_TITLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Outgoing Officer
                </label>
                <select
                  value={outgoingUserId}
                  onChange={(e) => setOutgoingUserId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {activeMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.officerTitle ?? m.role} · {m.openTaskCount} open tasks)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Incoming Successor
                </label>
                <select
                  value={incomingUserId}
                  onChange={(e) => setIncomingUserId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {activeMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.officerTitle ?? m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={archiveOutgoingAsAlumni}
                  onChange={(e) => setArchiveOutgoingAsAlumni(e.target.checked)}
                  className="accent-[#004B87]"
                />
                <span>Archive outgoing officer to Alumni status</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transferTasks}
                  onChange={(e) => setTransferTasks(e.target.checked)}
                  className="accent-[#004B87]"
                />
                <span>Transfer pending Club Project Tasks</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transferSocialCustody}
                  onChange={(e) => setTransferSocialCustody(e.target.checked)}
                  className="accent-[#004B87]"
                />
                <span>Transfer official social account custody</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#004B87] shrink-0" />
                <span>All role rotations &amp; custody handoffs are logged to the Student Life audit trail.</span>
              </div>
              <button
                type="submit"
                disabled={executing || activeMembers.length < 2 || outgoingUserId === incomingUserId}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{executing ? 'Rotating Officer...' : 'Execute Officer Handover'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md">
            Officer handover execution is restricted to Club Leads and Student Life Administrators.
          </div>
        )}
      </div>
    </section>
  );
}
