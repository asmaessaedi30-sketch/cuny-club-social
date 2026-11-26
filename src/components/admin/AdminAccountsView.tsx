import { integrationStatus } from '../../utils/integrationStatus';
import { useState } from 'react';
import { KeyRound, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AdminOverviewData } from './AdminDashboard';
import { StatusText } from '../StatusText';

interface AdminAccountsViewProps {
  data: AdminOverviewData;
  onRefresh: () => Promise<void>;
}

export function AdminAccountsView({ data, onRefresh }: AdminAccountsViewProps) {
  const { apiFetch } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const handleReconnect = async (clubId: string, accountId: string) => {
    setBusyId(accountId);
    setMessage('');
    try {
      await apiFetch(`/api/clubs/${clubId}/social-accounts/${accountId}/connect`, {
        method: 'POST',
      });
      setMessage('Hub connection record updated. Provider authorization has not been verified by this action.');
      await onRefresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to reconnect account.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Centralized Official Social Account Inventory
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          All official club accounts maintain documented university ownership and designated staff
          custodianship (BR-009, BR-010).
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs text-slate-800 bg-slate-100 border border-slate-200 rounded-md">
          {message}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Account & Platform</th>
              <th className="py-3 px-4">Participating Club</th>
              <th className="py-3 px-4">Designated Staff Custodian</th>
              <th className="py-3 px-4">Token Vault Ref</th>
              <th className="py-3 px-4">Connection</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {data.socialAccounts.map((acc) => (
              <tr key={acc.accountId} className="hover:bg-slate-50/70">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-900">{acc.handle}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {acc.platform} · {acc.pilotTier}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-700">
                  <div className="font-medium text-slate-900">{acc.clubName}</div>
                  <div className="text-slate-500 truncate max-w-[200px]">{acc.institutionalOwner}</div>
                </td>
                <td className="py-3.5 px-4 text-xs">
                  <div className="font-medium text-slate-900">{acc.custodian.staffName}</div>
                  <div className="font-mono text-slate-500">{acc.custodian.staffEmail}</div>
                </td>
                <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[180px]">{acc.connection.tokenReference}</span>
                  </div>
                  <div className="font-mono-tabular text-slate-400 mt-0.5">
                    Expires {new Date(acc.connection.expiresAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <StatusText status={integrationStatus(acc).label} /><p className="mt-1 max-w-xs text-xs text-slate-500">{integrationStatus(acc).detail}</p>
                </td>
                <td className="py-3.5 px-4 text-right">
                  {acc.connection.status !== 'Connected' ? (
                    <button
                      type="button"
                      disabled={busyId === acc.accountId}
                      onClick={() => void handleReconnect(acc.clubId, acc.accountId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{busyId === acc.accountId ? 'Reconnecting...' : 'Reconnect'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === acc.accountId}
                      onClick={() => void handleReconnect(acc.clubId, acc.accountId)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Update record</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
