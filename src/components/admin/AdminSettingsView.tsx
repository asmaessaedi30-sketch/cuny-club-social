import { useState } from 'react';
import { CheckSquare, RotateCcw, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminSettingsViewProps {
  onRefresh: () => Promise<void>;
}

export function AdminSettingsView({ onRefresh }: AdminSettingsViewProps) {
  const { apiFetch, session } = useAuth();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handoverChecklist = [
    '01. Final BRD, PRD, User Stories, and Traceability Matrix delivered',
    '02. Architecture diagrams, database schema, and API contract documented',
    '03. Role-based access-control matrix and tenant isolation verified',
    '04. Secrets-management and social token vault isolation documented',
    '05. Audit logging and incident response procedures operational',
    '06. Student Life administrator training and handover acceptance ready',
  ];

  const handleResetDemo = async () => {
    setBusy(true);
    setMessage('');
    try {
      await apiFetch('/api/admin/reset-demo', { method: 'POST' });
      setMessage('Pilot demonstration dataset restored to initial baseline.');
      await onRefresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to reset pilot data.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Platform Governance & University Handover Settings
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Institutional product ownership configuration and Section C12 handover readiness.
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs text-slate-800 bg-slate-100 border border-slate-200 rounded-md">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="w-4 h-4 text-[#004B87]" />
            <h2 className="text-sm font-semibold text-slate-900">
              Institutional Governance Controls
            </h2>
          </div>
          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="font-medium text-slate-900">Institutional Product Owner</span>
              <span>CUNY SPS Management</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="font-medium text-slate-900">Primary Business Administrator</span>
              <span>CUNY SPS Office of Student Life</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="font-medium text-slate-900">Routine Content Pre-Approval</span>
              <span className="font-medium text-emerald-700">Disabled (Authorized Clubs Publish Independently)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="font-medium text-slate-900">AI Auto-Publishing</span>
              <span className="font-medium text-red-700">Prohibited (Human Review Required)</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-slate-900">Authentication Policy</span>
              <span>Verified CUNY Institutional Identity</span>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CheckSquare className="w-4 h-4 text-[#004B87]" />
            <h2 className="text-sm font-semibold text-slate-900">
              Section C12: University Handover Readiness
            </h2>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700">
            {handoverChecklist.map((item) => (
              <li key={item} className="py-1.5 border-b border-slate-100 last:border-b-0">
                {item}
              </li>
            ))}
          </ul>
          {session?.effectiveAdminRole === 'SL_SUPER_ADMIN' && (
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Restore seeded pilot clubs, requests, and posts for stakeholder walkthroughs.
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleResetDemo()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{busy ? 'Resetting...' : 'Reset Pilot Data'}</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
