import { integrationStatus } from '../../utils/integrationStatus';
import { useState } from 'react';
import { AlertTriangle, KeyRound, Lock, PlusCircle, Settings2, ShieldCheck, Unplug } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { RoleName, SocialAccount } from '../../types';
import { StatusText } from '../StatusText';

interface ClubSocialAccountsProps {
  clubId: string;
  effectiveRole: RoleName | null;
  accounts: SocialAccount[];
  onRefresh: () => Promise<void>;
  onNavigateRequests: () => void;
}

const FEASIBILITY_MATRIX = [
  {
    platform: 'Facebook Pages',
    publishing: 'Supported through authorized Graph Page APIs',
    analytics: 'Available based on Page permissions',
    tier: 'Pilot priority',
  },
  {
    platform: 'Instagram Professional',
    publishing: 'Supported for eligible Business / Creator accounts',
    analytics: 'Insights & media metrics supported',
    tier: 'Pilot priority',
  },
  {
    platform: 'LinkedIn',
    publishing: 'Organization APIs require vetted partner review',
    analytics: 'Approved organizational use cases only',
    tier: 'Later phase',
  },
  {
    platform: 'TikTok',
    publishing: 'Content Posting API restricted for unaudited apps',
    analytics: 'Separate feasibility review required',
    tier: 'Later phase',
  },
  {
    platform: 'YouTube',
    publishing: 'Official Data API supports uploads subject to quota',
    analytics: 'Channel analytics API available',
    tier: 'Later phase',
  },
  {
    platform: 'X',
    publishing: 'Usage-based API pricing model requires evaluation',
    analytics: 'Restricted by tier',
    tier: 'Later phase',
  },
];

export function ClubSocialAccounts({
  clubId,
  effectiveRole,
  accounts,
  onRefresh,
  onNavigateRequests,
}: ClubSocialAccountsProps) {
  const { apiFetch } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [metaOpenId, setMetaOpenId] = useState<string | null>(null);
  const [metaPageId, setMetaPageId] = useState('');
  const [igBusinessAccountId, setIgBusinessAccountId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const canManageConnections =
    effectiveRole === 'SL_SUPER_ADMIN' ||
    effectiveRole === 'SL_ADMIN' ||
    effectiveRole === 'CLUB_LEAD';

  const handleConnect = async (accountId: string) => {
    setBusyId(accountId);
    setNotice('');
    setError('');
    try {
      await apiFetch(`/api/clubs/${clubId}/social-accounts/${accountId}/connect`, {
        method: 'POST',
      });
      setNotice('Hub connection record updated. Review the status below; this action does not verify provider authorization.');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect account.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setBusyId(accountId);
    setNotice('');
    setError('');
    try {
      await apiFetch(`/api/clubs/${clubId}/social-accounts/${accountId}/disconnect`, {
        method: 'POST',
      });
      setNotice('Integration disconnected from Club Social Hub. Institutional account custodianship remains unchanged.');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disconnect account.');
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenMetaConfig = (acc: SocialAccount) => {
    if (metaOpenId === acc.accountId) {
      setMetaOpenId(null);
      return;
    }
    setMetaOpenId(acc.accountId);
    setMetaPageId(acc.metaPageId ?? '');
    setIgBusinessAccountId(acc.igBusinessAccountId ?? '');
    setMetaAccessToken('');
  };

  const handleSaveMetaConfig = async (accountId: string, clearToken = false) => {
    setBusyId(accountId);
    setNotice('');
    setError('');
    try {
      await apiFetch(`/api/clubs/${clubId}/social-accounts/${accountId}/meta-config`, {
        method: 'POST',
        body: JSON.stringify({
          metaPageId,
          igBusinessAccountId,
          accessToken: clearToken ? undefined : metaAccessToken.trim() || undefined,
          clearToken,
        }),
      });
      setMetaAccessToken('');
      setMetaOpenId(null);
      setNotice(
        clearToken
          ? 'Cleared stored Meta Graph access token (reverted to Hub sandbox simulation).'
          : 'Saved account configuration. Provider authorization still needs verification.'
      );
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save Meta Graph API credentials.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Social Accounts</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Review account setup and publishing mode. A stored connection is not proof of live provider authorization.
          </p>
        </div>
        {canManageConnections && (
          <button
            type="button"
            onClick={onNavigateRequests}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Request New Official Account</span>
          </button>
        )}
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-start gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-4 h-4 text-[#004B87] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Account Creation & Ownership Policy:</span>{' '}
          New social media accounts cannot be auto-generated by clicking a button. All new accounts,
          transfers, and closures go through Student Life & CUNY Communications review, and
          connecting/disconnecting never alters underlying institutional custodianship.
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

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        {accounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No approved social accounts are linked to this club workspace yet.
          </div>
        ) : (
          accounts.map((acc) => {
            const isMeta =
              acc.platform === 'Facebook Pages' || acc.platform === 'Instagram Professional';
            const expiringSoon =
              acc.connection.status === 'Connected' &&
              typeof acc.tokenExpiresInDays === 'number' &&
              acc.tokenExpiresInDays <= 14;
            return (
              <div key={acc.accountId} className="p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base font-bold text-slate-900">{acc.handle}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-xs font-medium text-slate-700">{acc.platform}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <StatusText status={integrationStatus(acc).label} />

                    </div>
                    <p className="max-w-xl text-xs text-slate-600">{integrationStatus(acc).detail}</p>
                    <div className="text-xs text-slate-600">
                      Institutional Owner: <span className="font-medium">{acc.institutionalOwner}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      <span>
                        Staff Custodian: {acc.custodian.staffName} ({acc.custodian.staffEmail})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Lock className="w-3 h-3" />
                        <span>{acc.connection.tokenReference}</span>
                      </span>
                      {typeof acc.tokenExpiresInDays === 'number' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            Expires in {Math.max(0, acc.tokenExpiresInDays)}d
                          </span>
                        </>
                      )}
                    </div>
                    {expiringSoon && (
                      <div className="p-2.5 mt-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                        <span>
                          Recorded token expiry in {acc.tokenExpiresInDays} day(s) — contact custodian{' '}
                          <strong>{acc.custodian.staffName}</strong> to review reconnect options.
                        </span>
                      </div>
                    )}
                    {acc.connection.errorMessage && (
                      <p className="text-xs text-red-700 pt-1">{acc.connection.errorMessage}</p>
                    )}
                  </div>

                  {canManageConnections && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isMeta && (
                        <button
                          type="button"
                          onClick={() => handleOpenMetaConfig(acc)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5 text-[#004B87]" />
                          <span>Meta API Config</span>
                        </button>
                      )}
                      {acc.connection.status !== 'Connected' ? (
                        <button
                          type="button"
                          disabled={busyId === acc.accountId}
                          onClick={() => void handleConnect(acc.accountId)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>{busyId === acc.accountId ? 'Authorizing...' : 'Update connection record'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === acc.accountId}
                          onClick={() => void handleDisconnect(acc.accountId)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:border-red-300 hover:text-red-700 rounded-md whitespace-nowrap cursor-pointer"
                        >
                          <Unplug className="w-3.5 h-3.5" />
                          <span>Disconnect Integration</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {metaOpenId === acc.accountId && canManageConnections && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                    <div className="text-xs font-semibold text-slate-900">
                      Live Meta Graph / Instagram API Credentials ({acc.handle})
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Store your Page ID, Instagram Business Account ID, and long-lived Page Access Token
                      server-side. Leave empty to continue using safe Hub publishing simulation.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Facebook Page ID
                        </label>
                        <input
                          type="text"
                          value={metaPageId}
                          onChange={(e) => setMetaPageId(e.target.value)}
                          placeholder="e.g., 104839201928"
                          className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          IG Business Account ID
                        </label>
                        <input
                          type="text"
                          value={igBusinessAccountId}
                          onChange={(e) => setIgBusinessAccountId(e.target.value)}
                          placeholder="e.g., 1784140091823"
                          className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Access Token (Write-Only Server Vault)
                        </label>
                        <input
                          type="password"
                          value={metaAccessToken}
                          onChange={(e) => setMetaAccessToken(e.target.value)}
                          placeholder={acc.hasLiveMetaToken ? 'Token saved (enter new to rotate)' : 'Paste Meta OAuth token'}
                          className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {acc.hasLiveMetaToken && (
                        <button
                          type="button"
                          disabled={busyId === acc.accountId}
                          onClick={() => void handleSaveMetaConfig(acc.accountId, true)}
                          className="px-3 py-1.5 text-xs text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded cursor-pointer"
                        >
                          Clear Live Token
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setMetaOpenId(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busyId === acc.accountId}
                        onClick={() => void handleSaveMetaConfig(acc.accountId, false)}
                        className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded cursor-pointer"
                      >
                        Save Meta Credentials
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Section B6 Social Media Integration Feasibility Reference */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Supported Official Platform API Roadmap (Section B6)
          </h2>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
              <th className="py-2.5 px-4">Platform</th>
              <th className="py-2.5 px-4">Publishing Feasibility</th>
              <th className="py-2.5 px-4">Engagement / Analytics</th>
              <th className="py-2.5 px-4">Pilot Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {FEASIBILITY_MATRIX.map((row) => (
              <tr key={row.platform}>
                <td className="py-2.5 px-4 font-semibold text-slate-900">{row.platform}</td>
                <td className="py-2.5 px-4 text-slate-600">{row.publishing}</td>
                <td className="py-2.5 px-4 text-slate-600">{row.analytics}</td>
                <td className="py-2.5 px-4 font-medium text-[#004B87]">{row.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
