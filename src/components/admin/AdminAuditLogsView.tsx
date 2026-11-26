import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { AuditLog } from '../../types';

interface AdminAuditLogsViewProps {
  logs: AuditLog[];
}

export function AdminAuditLogsView({ logs }: AdminAuditLogsViewProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', 'Authentication', 'Governance', 'Membership', 'Publishing', 'Integration', 'AI'];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (category !== 'All' && log.category !== category) return false;
      if (!q) return true;
      return (
        log.eventId.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    });
  }, [logs, query, category]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Administrative & Security Audit Logs</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Immutable log of institutional authentication, leader authorizations, account decisions,
          publishing attempts, and access-control blocks (BR-018, US-022).
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by event ID, actor, action, or target..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                category === cat
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Event ID</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Actor & Role</th>
              <th className="py-3 px-4">Category / Action</th>
              <th className="py-3 px-4">Target & Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No audit records match the active filter.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.eventId} className="hover:bg-slate-50/70 align-top">
                  <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-700 whitespace-nowrap">
                    {log.eventId}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{log.actorName}</div>
                    <div className="font-mono text-[11px] text-slate-500">{log.actorRole}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-slate-900">{log.action}</div>
                    <div className="text-slate-500">{log.category}</div>
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <div className="font-medium text-slate-800">{log.target}</div>
                    <div className="text-slate-500 mt-0.5">{log.details}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
