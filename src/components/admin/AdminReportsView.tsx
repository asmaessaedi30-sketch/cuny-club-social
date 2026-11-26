import { useState } from 'react';
import { CheckCircle2, Download, FileText, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { exportExecutiveDigestPdf } from '../../utils/resourcePdfExport';
import { StatusText } from '../StatusText';
import type { AdminOverviewData } from './AdminDashboard';

interface AdminReportsViewProps {
  data: AdminOverviewData;
}

export function AdminReportsView({ data }: AdminReportsViewProps) {
  const { session } = useAuth();
  const [exportStatus, setExportStatus] = useState('');

  const totalAttempts = data.posts.flatMap((p) => p.publishAttempts);
  const successfulAttempts = totalAttempts.filter((a) => a.outcome === 'Success').length;
  const publishedPostsCount = data.posts.filter((p) => p.status === 'Published').length;
  const failedPostsCount = data.posts.filter((p) => p.status === 'Failed').length;
  const successRate =
    totalAttempts.length > 0 ? Math.round((successfulAttempts / totalAttempts.length) * 100) : 0;

  const pilotKpis = [
    {
      kpi: 'Clubs onboarded',
      target: '2–3 approved clubs',
      observed: `${data.summary.participatingClubs} directory workspaces; approved pilot cohort not verified`,
      met: false,
    },
    {
      kpi: 'Authorized club leaders',
      target: 'At least 1 approved lead per club',
      observed: `${data.summary.activeClubLeaders} active authorized leaders`,
      met: data.summary.activeClubLeaders >= data.summary.participatingClubs,
    },
    {
      kpi: 'Successful test publications',
      target: '>= 95% valid attempts',
      observed: `${totalAttempts.length} logged attempts; real provider publication not verified`,
      met: false,
    },
    {
      kpi: 'Unauthorized cross-club access',
      target: 'Zero access-control violations',
      observed: 'Independent server authorization testing required',
      met: false,
    },
    {
      kpi: 'Account request traceability',
      target: '100% requests recorded with decision history',
      observed: `${data.accountRequests.length} tracked requests; coverage review required`,
      met: false,
    },
    {
      kpi: 'Publishing audit coverage',
      target: '100% completed attempts logged',
      observed: `${data.auditLogs.length} audit events; attempt reconciliation required`,
      met: false,
    },
  ];

  const handleExportAuditCsv = () => {
    const header = 'EventID,Timestamp,Actor,Role,Category,Action,Target,Details\n';
    const rows = data.auditLogs
      .map((l) =>
        [
          l.eventId,
          l.timestamp,
          l.actorName,
          l.actorRole,
          l.category,
          l.action,
          l.target,
          l.details,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuny-sps-club-social-hub-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('Audit log CSV exported.');
  };

  const handleExportExecutivePdf = () => {
    const filename = exportExecutiveDigestPdf({
      summary: data.summary,
      budgetLedgers: data.budgetLedgers ?? [],
      resourceSubmissions: data.resourceSubmissions ?? [],
      engagementFunnel: data.engagementFunnel,
      totalPosts: data.posts.length,
      publishedPosts: publishedPostsCount,
      failedPosts: failedPostsCount,
      generatedByName: session?.user.name ?? 'Office of Student Life',
    });
    setExportStatus(`Executive PDF digest downloaded (${filename}).`);
  };

  const funnel = data.engagementFunnel;
  const funnelSteps = funnel
    ? [
        { label: 'Social Reach', value: funnel.socialReach },
        { label: 'Post Engagements', value: funnel.socialEngagements },
        { label: 'Event RSVPs', value: funnel.eventRsvps },
        { label: 'Verified Check-Ins', value: funnel.verifiedCheckIns },
        { label: 'Join Requests', value: funnel.joinRequestsSubmitted },
        { label: 'Approved Members', value: funnel.newMembersApproved },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Pilot Readiness Reports & University Handover Metrics
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Live evaluation against PRD Section B11 Product Success Metrics, campus funnel conversion,
            and Student Activity Fee budget ledgers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportExecutivePdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Executive PDF Digest</span>
          </button>
          <button
            type="button"
            onClick={handleExportAuditCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {exportStatus && (
        <div className="px-4 py-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {exportStatus}
        </div>
      )}

      {/* Campus Engagement Funnel */}
      {funnel && (
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#004B87]" />
                <span>Campus-Wide Engagement Funnel (Social Reach → Approved Club Join)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated cross-club conversion from published social impressions to verified attendance and roster growth.
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-600">
              RSVP → Attendance:{' '}
              <strong className="text-slate-900">
                {funnel.eventRsvps > 0
                  ? Math.round((funnel.verifiedCheckIns / funnel.eventRsvps) * 100)
                  : 0}
                %
              </strong>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {funnelSteps.map((step, idx) => (
              <div
                key={step.label}
                className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-md space-y-1"
              >
                <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                  <span>{step.label}</span>
                  <span className="font-mono text-slate-400">0{idx + 1}</span>
                </div>
                <div className="text-xl font-bold font-mono-tabular text-slate-900">
                  {step.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Section B11: Pilot KPI Evaluation Matrix
          </h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">KPI</th>
              <th className="py-3 px-4">Proposed Pilot Target</th>
              <th className="py-3 px-4">Observed Platform State</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {pilotKpis.map((item) => (
              <tr key={item.kpi} className="hover:bg-slate-50/70">
                <td className="py-3 px-4 font-semibold text-slate-900">{item.kpi}</td>
                <td className="py-3 px-4 text-slate-600">{item.target}</td>
                <td className="py-3 px-4 font-mono-tabular text-slate-800">{item.observed}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{item.met ? 'Recorded Target Met' : 'Verification Required'}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resource & Financial Packet Summary */}
      {data.resourceSubmissions && data.resourceSubmissions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Event Proposals & Financial Reimbursement Packets
            </h2>
            <span className="text-xs font-mono-tabular text-slate-500">
              {data.resourceSubmissions.length} tracked submission(s)
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4">Packet ID</th>
                <th className="py-2.5 px-4">Club</th>
                <th className="py-2.5 px-4">Type & Title</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4">Advisor Co-Sign</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {data.resourceSubmissions.slice(0, 10).map((sub) => (
                <tr key={sub.submissionId} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-mono-tabular font-medium text-slate-800">
                    {sub.submissionId}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">{sub.clubShortCode}</td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-slate-900">{sub.title}</div>
                    <div className="text-[11px] text-slate-500">{sub.type}</div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-800">
                    {typeof sub.amountUsd === 'number' ? `$${sub.amountUsd.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2.5 px-4">
                    {sub.advisorSignOff ? (
                      <StatusText status="Co-Signed" />
                    ) : sub.requiresAdvisorSignOff ? (
                      <span className="text-amber-700 font-medium">Pending Advisor</span>
                    ) : (
                      <span className="text-slate-400">Not Required</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusText status={sub.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

