import { useState } from 'react';
import { AlertCircle, CheckSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AccountRequest, AccountRequestStatus } from '../../types';
import { StatusText } from '../StatusText';

interface AdminRequestsViewProps {
  requests: AccountRequest[];
  onRefresh: () => Promise<void>;
}

const PIPELINE_STEPS: AccountRequestStatus[] = [
  'Submitted',
  'Under Student Life Review',
  'Awaiting CUNY Approval',
  'Approved for Setup',
  'Setup in Progress',
  'Connected',
];

const ALL_DECISION_STATUSES: AccountRequestStatus[] = [
  ...PIPELINE_STEPS,
  'More Information Required',
  'Rejected',
  'Cancelled',
  'Setup Blocked',
];

export function AdminRequestsView({ requests, onRefresh }: AdminRequestsViewProps) {
  const { apiFetch } = useAuth();
  const [selectedId, setSelectedId] = useState<string>(requests[0]?.requestId ?? '');
  const [nextStatus, setNextStatus] = useState<AccountRequestStatus>('Awaiting CUNY Approval');
  const [authority, setAuthority] = useState('CUNY SPS Office of Student Life');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selected = requests.find((r) => r.requestId === selectedId) ?? requests[0];

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setBusy(true);
    try {
      await apiFetch(`/api/admin/account-requests/${selected.requestId}/decisions`, {
        method: 'POST',
        body: JSON.stringify({ nextStatus, notes, authority }),
      });
      setNotes('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record decision.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Official Account Governance & Approval Requests
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Review account creation, ownership transfer, and closure requests across institutional
          approval stages (A6, US-010).
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">CUNY Communications Governance (A6):</span> Official account
          creation, ownership transfer, and account closure requests require Student Life eligibility
          review plus coordination with the{' '}
          <span className="font-semibold">CUNY Office of Communications and Marketing (typically 10 business days)</span>.
          Approval here tracks Student Life review and never bypasses external CUNY Communications approval.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Request Queue */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-700">
            Request Queue ({requests.length})
          </div>
          {requests.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No requests in queue.</div>
          ) : (
            requests.map((req) => {
              const isSelected = selected?.requestId === req.requestId;
              return (
                <button
                  key={req.requestId}
                  type="button"
                  onClick={() => setSelectedId(req.requestId)}
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

        {/* Selected Request Inspector + Decision Form */}
        {selected && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-mono-tabular text-slate-500">
                  {selected.requestId} · Submitted {new Date(selected.submittedAt).toLocaleDateString()}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {selected.requestType}: {selected.proposedAccountName}
                </h2>
                <div className="text-xs text-slate-600 mt-1">
                  {selected.clubName} · Requested Platform: {selected.platform}
                </div>
              </div>
              <StatusText status={selected.status} />
            </div>

            {/* Pipeline progress bar */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Institutional Workflow Stage</div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {PIPELINE_STEPS.map((step, idx) => {
                  const activeIdx = PIPELINE_STEPS.indexOf(selected.status);
                  const passed = activeIdx >= idx;
                  const current = selected.status === step;
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
                <p className="text-slate-800 mt-1 leading-relaxed">{selected.businessPurpose}</p>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="font-semibold text-slate-500">Intended Audience</div>
                  <p className="text-slate-800 mt-0.5">{selected.intendedAudience}</p>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Responsible Representatives</div>
                  <p className="text-slate-800 mt-0.5">{selected.responsibleRepresentatives}</p>
                </div>
              </div>
            </div>

            {/* Decision Form */}
            <form onSubmit={handleDecision} className="pt-4 border-t border-slate-200 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#004B87]" />
                <span>Record Administrative Decision</span>
              </h3>
              {error && (
                <div role="alert" className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Transition Status To
                  </label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as AccountRequestStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
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
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#004B87]"
                  >
                    <option>CUNY SPS Office of Student Life</option>
                    <option>CUNY Office of Communications and Marketing</option>
                    <option>CUNY SPS IT / Account Custodianship</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Decision Notes & Compliance Rationale
                </label>
                <textarea
                  rows={2}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document eligibility verification, CUNY communications reference, or follow-up details..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
                >
                  {busy ? 'Recording...' : 'Record Decision & Notify Club'}
                </button>
              </div>
            </form>

            {/* Approval History */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="text-xs font-semibold text-slate-700">Approval Decision History</h3>
              <div className="divide-y divide-slate-100">
                {selected.approvals.map((apr) => (
                  <div key={apr.approvalId} className="py-2.5 text-xs space-y-0.5">
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
        )}
      </div>
    </div>
  );
}
