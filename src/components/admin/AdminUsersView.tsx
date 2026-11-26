import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { formatRoleLabel, useAuth } from '../../context/AuthContext';
import type { Club, PermissionRow, User } from '../../types';
import { StatusText } from '../StatusText';

interface EnrichedUser extends User {
  memberships: { clubId: string; clubName: string; role: string; status: string }[];
}

interface AdminUsersViewProps {
  clubs: Club[];
}

export function AdminUsersView({ clubs }: AdminUsersViewProps) {
  const { apiFetch, session } = useAuth();
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [matrix, setMatrix] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [testClubId, setTestClubId] = useState(clubs[0]?.clubId ?? 'club-psychology');
  const [isolationResult, setIsolationResult] = useState<{
    allowed: boolean;
    httpStatusSimulated: number;
    message: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ users: EnrichedUser[]; permissionsMatrix: PermissionRow[] }>(
        '/api/admin/users'
      );
      setUsers(res.users);
      setMatrix(res.permissionsMatrix);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleToggleRevoke = async (userId: string) => {
    await apiFetch(`/api/admin/users/${userId}/revoke`, { method: 'POST' });
    await loadData();
  };

  const handleRunIsolationCheck = async () => {
    const res = await apiFetch<{
      allowed: boolean;
      httpStatusSimulated: number;
      message: string;
    }>('/api/security/test-isolation', {
      method: 'POST',
      body: JSON.stringify({ targetClubId: testClubId }),
    });
    setIsolationResult(res);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Users, Platform Access & Role-Based Permissions Matrix
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Inspect institutional identities, revoke platform access, and verify PRD B4 server-enforced
          authorization policies.
        </p>
      </div>

      {/* Institutional Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Verified Institutional Users</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading institutional directory...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">User & Institutional Email</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Authorized Club Memberships</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {users.map((u) => (
                <tr key={u.userId} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{u.name}</div>
                    <div className="text-xs font-mono text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">
                    {formatRoleLabel(u.systemRole)}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {u.systemRole === 'SL_SUPER_ADMIN'
                      ? 'Global Student Life Oversight'
                      : u.systemRole === 'SL_ADMIN'
                        ? `Scoped Admin (${u.assignedAdminClubIds?.length ?? 0} clubs)`
                        : u.memberships.length > 0
                          ? u.memberships
                              .map((m) => `${m.clubName} (${m.role}${m.status !== 'Active' ? ` · ${m.status}` : ''})`)
                              .join(' · ')
                          : 'No active memberships'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={u.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.userId !== session?.user.userId && (
                      <button
                        type="button"
                        onClick={() => void handleToggleRevoke(u.userId)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                          u.status === 'Active'
                            ? 'text-red-700 border-red-200 hover:bg-red-50'
                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {u.status === 'Active' ? (
                          <>
                            <ShieldOff className="w-3.5 h-3.5" />
                            <span>Revoke Access</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Restore Access</span>
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Interactive Scope Isolation Test */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Server Scope & Tenant Isolation Verification (US-002)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Test your active session against any club workspace to verify server-enforced scope
              (e.g., Scoped SL Admin Marcus Sterling cannot access Psychology Club).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={testClubId}
              onChange={(e) => setTestClubId(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
            >
              {clubs.map((c) => (
                <option key={c.clubId} value={c.clubId}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleRunIsolationCheck()}
              className="px-3.5 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
            >
              Verify Access
            </button>
          </div>
        </div>
        {isolationResult && (
          <div
            className={`p-3 rounded-md border text-xs font-mono-tabular ${
              isolationResult.allowed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            HTTP {isolationResult.httpStatusSimulated} · {isolationResult.message}
          </div>
        )}
      </div>

      {/* PRD B4 Role-Based Permissions Matrix */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            PRD Section B4: Role-Based Permissions Baseline Matrix
          </h2>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
              <th className="py-2.5 px-4">Capability</th>
              <th className="py-2.5 px-3">SL Super Admin</th>
              <th className="py-2.5 px-3">SL Admin</th>
              <th className="py-2.5 px-3">Club Lead</th>
              <th className="py-2.5 px-3">Editor</th>
              <th className="py-2.5 px-3">Contributor</th>
              <th className="py-2.5 px-3">Viewer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {matrix.map((row) => (
              <tr key={row.capability} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-4 font-medium text-slate-900">{row.capability}</td>
                <td className="py-2.5 px-3 text-slate-700">{row.slSuperAdmin}</td>
                <td className="py-2.5 px-3 text-slate-700">{row.slAdmin}</td>
                <td className="py-2.5 px-3 text-slate-700">{row.clubLead}</td>
                <td className="py-2.5 px-3 text-slate-700">{row.editor}</td>
                <td className="py-2.5 px-3 text-slate-700">{row.contributor}</td>
                <td className="py-2.5 px-3 text-slate-700">{row.viewer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
