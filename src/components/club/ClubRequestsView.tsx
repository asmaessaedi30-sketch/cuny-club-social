import React, { useState } from 'react';
import { FilePlus2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type {
  AccountRequest,
  AccountRequestType,
  RoleName,
  SocialAccount,
  SocialPlatform,
} from '../../types';
import { StatusText } from '../StatusText';

interface ClubRequestsViewProps {
  clubId: string;
  effectiveRole: RoleName | null;
  requests: AccountRequest[];
  accounts: SocialAccount[];
  onRefresh: () => Promise<void>;
}

export function ClubRequestsView({
  clubId,
  effectiveRole,
  requests,
  accounts,
  onRefresh,
}: ClubRequestsViewProps) {
  const { apiFetch } = useAuth();
  const [requestType, setRequestType] = useState<AccountRequestType>('New Official Account');
  const [platform, setPlatform] = useState<SocialPlatform>('Instagram Professional');
  const [proposedAccountName, setProposedAccountName] = useState('');
  const [targetAccountId, setTargetAccountId] = useState(accounts[0]?.accountId ?? '');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [intendedAudience, setIntendedAudience] = useState('');
  const [responsibleRepresentatives, setResponsibleRepresentatives] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canSubmitRequest =
    effectiveRole === 'SL_SUPER_ADMIN' ||
    effectiveRole === 'SL_ADMIN' ||
    effectiveRole === 'CLUB_LEAD';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await apiFetch(`/api/clubs/${clubId}/account-requests`, {
        method: 'POST',
        body: JSON.stringify({
          requestType,
          platform,
          proposedAccountName,
          targetAccountId:
            requestType === 'New Official Account' ? undefined : targetAccountId || undefined,
          businessPurpose,
          intendedAudience,
          responsibleRepresentatives,
        }),
      });
      setNotice(
        'Governance request submitted to Student Life for eligibility review and required CUNY Communications coordination.'
      );
      setProposedAccountName('');
      setBusinessPurpose('');
      setIntendedAudience('');
      setResponsibleRepresentatives('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Official Account Requests</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Submit requests for new official social media accounts, ownership transfers, or account
          closures/archival (A6, US-009, US-012).
        </p>
      </div>

      {!canSubmitRequest && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-center gap-3 text-xs text-slate-700">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Only authorized Club Leads or Student Life Administrators can submit official account
            requests.
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

      {canSubmitRequest && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FilePlus2 className="w-4 h-4 text-[#004B87]" />
            <h2 className="text-sm font-semibold text-slate-900">
              Submit Official Account Governance Request
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Request Type</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as AccountRequestType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="New Official Account">New Official Account</option>
                <option value="Ownership Transfer">Ownership Transfer</option>
                <option value="Account Closure">Account Closure</option>
                <option value="Account Archival">Account Archival</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="Facebook Pages">Facebook Pages</option>
                <option value="Instagram Professional">Instagram Professional</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
                <option value="X">X</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {requestType === 'New Official Account'
                  ? 'Proposed Account Name / Handle'
                  : 'Target Account Handle'}
              </label>
              <input
                type="text"
                required
                value={proposedAccountName}
                onChange={(e) => setProposedAccountName(e.target.value)}
                placeholder="e.g., @cunysps.aiclub"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {requestType !== 'New Official Account' && accounts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Existing Official Account
              </label>
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>
                    {a.platform} — {a.handle}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Intended Audience
              </label>
              <input
                type="text"
                required
                value={intendedAudience}
                onChange={(e) => setIntendedAudience(e.target.value)}
                placeholder="e.g., Current CUNY SPS students & prospective applicants"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Responsible Club Representatives & Advisor
              </label>
              <input
                type="text"
                required
                value={responsibleRepresentatives}
                onChange={(e) => setResponsibleRepresentatives(e.target.value)}
                placeholder="e.g., Aisha Rahman (Co-Chair), Prof. Jordan Reyes"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Business Purpose & Justification
            </label>
            <textarea
              rows={2}
              required
              value={businessPurpose}
              onChange={(e) => setBusinessPurpose(e.target.value)}
              placeholder="Describe how this account advances recognized student club communications..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
            >
              {busy ? 'Submitting...' : 'Submit Governance Request'}
            </button>
          </div>
        </form>
      )}

      {/* Request History */}
      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Submitted Account Requests ({requests.length})
          </h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">
            No account requests have been submitted for this workspace.
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.requestId} className="p-5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono-tabular font-semibold text-slate-600">
                    {req.requestId}
                  </span>
                  <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
                  <span className="text-sm font-bold text-slate-900">
                    {req.requestType}: {req.proposedAccountName}
                  </span>
                </div>
                <StatusText status={req.status} />
              </div>
              <p className="text-xs text-slate-600">{req.businessPurpose}</p>
              <div className="text-[11px] text-slate-500">
                Platform: {req.platform} · Submitted by {req.submittedByName} on{' '}
                {new Date(req.submittedAt).toLocaleDateString()}
              </div>
              {req.approvals.length > 0 && (
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                  Latest decision: <span className="font-semibold">{req.approvals[req.approvals.length - 1].decision}</span>{' '}
                  by {req.approvals[req.approvals.length - 1].authority} —{' '}
                  {req.approvals[req.approvals.length - 1].notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
