import { notificationText } from '../../utils/workspacePresentation';
import { integrationStatus } from '../../utils/integrationStatus';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Download,
  FileEdit,
  FileText,
  Pencil,
  PenSquare,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { formatRoleLabel, useAuth } from '../../context/AuthContext';
import type {
  BudgetIncreaseRequest,
  Club,
  ClubCharterRenewalSummary,
  ClubEvent,
  NotificationItem,
  OfficerTransitionChecklist,
  PlatformMetric,
  Post,
  ResourceSubmission,
  RoleName,
  SocialAccount,
  WhatsAppAlertMessage,
  WhatsAppGroupLink,
} from '../../types';
import { exportCharterRenewalPdf } from '../../utils/resourcePdfExport';
import { ClubLogoMark } from '../BrandMarks';
import { StatusText } from '../StatusText';
import { ClubMessagingCenter } from './ClubMessagingCenter';
import { ClubProfileEditor } from './ClubProfileEditor';
import { ClubWhatsAppPanel } from './ClubWhatsAppPanel';

interface ClubOverviewProps {
  club: Club;
  effectiveRole: RoleName | null;
  socialAccounts: SocialAccount[];
  posts: Post[];
  events?: ClubEvent[];
  analytics: PlatformMetric[];
  notifications: NotificationItem[];
  whatsappGroups?: WhatsAppGroupLink[];
  whatsappMessages?: WhatsAppAlertMessage[];
  budgetIncreaseRequests?: BudgetIncreaseRequest[];
  onNavigate: (tab: string) => void;
  onEditPost: (post: Post) => void;
  onRefresh?: () => Promise<void>;
}

export function ClubOverview({
  club,
  effectiveRole,
  socialAccounts,
  posts,
  events = [],
  analytics,
  notifications,
  whatsappGroups = [],
  whatsappMessages = [],
  budgetIncreaseRequests = [],
  onNavigate,
  onEditPost,
  onRefresh,
}: ClubOverviewProps) {
  const { apiFetch, session } = useAuth();
  const [submissions, setSubmissions] = useState<ResourceSubmission[]>([]);
  const [transition, setTransition] = useState<OfficerTransitionChecklist | null>(null);
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [extrasError, setExtrasError] = useState('');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Increased funding request form state
  const [showFundingForm, setShowFundingForm] = useState(false);
  const [fundingAmount, setFundingAmount] = useState('2000');
  const [fundingTitle, setFundingTitle] = useState('');
  const [fundingBreakdown, setFundingBreakdown] = useState('');
  const [fundingReason, setFundingReason] = useState('');
  const [fundingAttendance, setFundingAttendance] = useState('');
  const [fundingEventDate, setFundingEventDate] = useState('');
  const [submittingFunding, setSubmittingFunding] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  const scheduledPosts = posts.filter((p) => p.status === 'Scheduled');
  const draftPosts = posts.filter((p) => p.status === 'Draft' || p.status === 'In Review');
  const recentPublished = posts.filter((p) => p.status === 'Published' || p.status === 'Failed');

  const canCreate = effectiveRole !== 'VIEWER';
  const canEditProfile =
    effectiveRole === 'CLUB_LEAD' ||
    effectiveRole === 'SL_ADMIN' ||
    effectiveRole === 'SL_SUPER_ADMIN' ||
    Boolean(session?.effectiveAdminRole);
  const canRequestFunding =
    effectiveRole === 'CLUB_LEAD' || Boolean(session?.effectiveAdminRole);

  const loadGovernanceExtras = useCallback(async () => {
    setExtrasLoading(true);
    setExtrasError('');
    try {
      const [subsRes, transRes] = await Promise.all([
        apiFetch<{ submissions: ResourceSubmission[] }>('/api/resource-submissions'),
        apiFetch<{ transition: OfficerTransitionChecklist }>(`/api/clubs/${club.clubId}/transition`),
      ]);
      setSubmissions(subsRes.submissions.filter((s) => s.clubId === club.clubId));
      setTransition(transRes.transition);
    } catch {
      setExtrasError('Advisor items could not be loaded.');
    } finally {
      setExtrasLoading(false);
    }
  }, [apiFetch, club.clubId]);

  useEffect(() => {
    void loadGovernanceExtras();
  }, [loadGovernanceExtras]);

  const handleMarkRead = async (id: string) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    if (onRefresh) await onRefresh();
    else onNavigate('overview');
  };

  const isAdvisorOrAdmin =
    Boolean(session?.effectiveAdminRole) ||
    effectiveRole === 'VIEWER' ||
    club.facultyAdvisor.toLowerCase().includes((session?.user.name ?? '').toLowerCase());

  const pendingAdvisorProposals = submissions.filter(
    (s) => s.requiresAdvisorSignOff && !s.advisorSignOff
  );
  const pendingTransitionSignOff = Boolean(
    transition && transition.requiresAdvisorSignOff && !transition.advisorSignOff
  );

  const handleAdvisorCoSignProposal = async (submissionId: string) => {
    setActionBusyId(submissionId);
    setActionError('');
    setStatusMessage('');
    try {
      await apiFetch(`/api/clubs/${club.clubId}/resource-submissions/${submissionId}/advisor-signoff`, {
        method: 'POST',
        body: JSON.stringify({ note: `Co-signed by ${session?.user.name ?? 'Faculty Advisor'}` }),
      });
      setStatusMessage(`Co-signed proposal ${submissionId} as Faculty Advisor.`);
      await loadGovernanceExtras();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to co-sign proposal.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleAdvisorCoSignTransition = async () => {
    setActionBusyId('transition');
    setActionError('');
    setStatusMessage('');
    try {
      await apiFetch(`/api/clubs/${club.clubId}/transition/advisor-signoff`, {
        method: 'POST',
        body: JSON.stringify({ note: `Transition verified by ${session?.user.name ?? 'Faculty Advisor'}` }),
      });
      setStatusMessage(`Co-signed semester officer transition checklist for ${club.shortCode}.`);
      await loadGovernanceExtras();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to co-sign officer transition.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleExportCharterRenewal = async (format: 'pdf' | 'csv') => {
    setActionBusyId(`charter-${format}`);
    setActionError('');
    setStatusMessage('');
    try {
      const dossier = await apiFetch<ClubCharterRenewalSummary>(
        `/api/clubs/${club.clubId}/charter-renewal`
      );
      if (format === 'pdf') {
        const filename = exportCharterRenewalPdf(dossier);
        setStatusMessage(`Downloaded Annual Charter Renewal PDF (${filename}).`);
      } else {
        const csvLines = [
          'Section,Metric,Value',
          `Identity,Organization,"${dossier.clubName} (${dossier.clubShortCode})"`,
          `Identity,Faculty Advisor,"${dossier.facultyAdvisor}"`,
          `Membership,Active Members,${dossier.activeMembersCount}`,
          `Membership,Alumni Members,${dossier.alumniMembersCount}`,
          ...dossier.officers.map(
            (o) => `Officer,"${o.officerTitle}","${o.name} (${o.email})"`
          ),
          `Events,Hosted Events,${dossier.eventsHostedCount}`,
          `Events,Total Attendance,${dossier.totalSemesterAttendance}`,
          `Events,RSVP Conversion Rate,${dossier.avgAttendanceRatePct}%`,
          `Events,Avg Satisfaction,${dossier.avgEventSatisfaction ?? 'N/A'}`,
          `Budget,Allocated Cap ($),${dossier.budgetSummary.allocatedUsd.toFixed(2)}`,
          `Budget,Encumbered ($),${dossier.budgetSummary.encumberedUsd.toFixed(2)}`,
          `Budget,Reimbursed ($),${dossier.budgetSummary.reimbursedUsd.toFixed(2)}`,
          `Budget,Remaining ($),${dossier.budgetSummary.remainingUsd.toFixed(2)}`,
          `Compliance,Audit Coverage Rate,${dossier.auditComplianceRatePct}%`,
        ].join('\n');
        const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cuny-sps-${dossier.clubShortCode.toLowerCase()}-charter-renewal.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setStatusMessage(`Downloaded Annual Charter Renewal CSV summary.`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to generate charter renewal dossier.');
    } finally {
      setActionBusyId(null);
    }
  };

  const budget = club.budgetSummary;
  const budgetUsedPct =
    budget && budget.allocatedUsd > 0
      ? Math.min(100, Math.round(((budget.encumberedUsd + budget.reimbursedUsd) / budget.allocatedUsd) * 100))
      : 0;

  const parsedRequestedAmount = Number(fundingAmount);
  const currentCapUsd = budget?.allocatedUsd ?? club.semesterBudgetAllocatedUsd ?? 500;
  const proposedNewCapUsd =
    Number.isFinite(parsedRequestedAmount) && parsedRequestedAmount > 0
      ? currentCapUsd + parsedRequestedAmount
      : currentCapUsd;

  const handleSubmitFundingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setStatusMessage('');
    if (!Number.isFinite(parsedRequestedAmount) || parsedRequestedAmount <= 0) {
      setActionError('Enter a valid positive dollar amount for the funding increase.');
      return;
    }
    if (!fundingTitle.trim() || !fundingReason.trim()) {
      setActionError('Provide both the event/initiative title and reason for increased funding.');
      return;
    }
    setSubmittingFunding(true);
    try {
      const res = await apiFetch<{ request: BudgetIncreaseRequest }>(
        `/api/clubs/${club.clubId}/budget-increase-requests`,
        {
          method: 'POST',
          body: JSON.stringify({
            requestedAdditionalUsd: parsedRequestedAmount,
            eventOrInitiativeTitle: fundingTitle.trim(),
            fundingBreakdown: fundingBreakdown.trim(),
            reason: fundingReason.trim(),
            expectedAttendance: fundingAttendance ? Number(fundingAttendance) : undefined,
            eventDate: fundingEventDate || undefined,
          }),
        }
      );
      setShowFundingForm(false);
      setFundingTitle('');
      setFundingBreakdown('');
      setFundingReason('');
      setFundingAttendance('');
      setFundingEventDate('');
      setStatusMessage(
        `Submitted funding increase request ${res.request.requestId} (+$${res.request.requestedAdditionalUsd.toFixed(2)}) to Student Life Admin for review.`
      );
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to submit funding increase request.');
    } finally {
      setSubmittingFunding(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <ClubLogoMark
            clubId={club.clubId}
            clubShortCode={club.shortCode}
            clubName={club.name}
            logoUrl={club.logoUrl}
            accentColor={club.accentColor}
            size="lg"
          />
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500">
              {club.shortCode} · {club.category} · Your Role: {formatRoleLabel(effectiveRole)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{club.name}</h1>
            {club.tagline && (
              <p className="text-xs font-medium text-[#004B87]">{club.tagline}</p>
            )}
            <p className="text-sm text-slate-600 max-w-2xl">{club.description}</p>
            {(club.meetingSchedule || club.contactEmail || club.websiteUrl) && (
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs text-slate-500">
                {club.meetingSchedule && <span>Meetings: {club.meetingSchedule}</span>}
                {club.meetingSchedule && (club.contactEmail || club.websiteUrl) && (
                  <span aria-hidden="true">·</span>
                )}
                {club.contactEmail && (
                  <a
                    href={`mailto:${club.contactEmail}`}
                    className="text-[#004B87] hover:underline font-mono text-[11px]"
                  >
                    {club.contactEmail}
                  </a>
                )}
                {club.contactEmail && club.websiteUrl && <span aria-hidden="true">·</span>}
                {club.websiteUrl && (
                  <a
                    href={club.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#004B87] hover:underline truncate max-w-xs"
                  >
                    {club.websiteUrl}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('club-blog')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#004B87]" />
            <span>Club Blog</span>
          </button>
          {canEditProfile && (
            <button
              type="button"
              onClick={() => setShowProfileEditor((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 rounded-md whitespace-nowrap cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{showProfileEditor ? 'Close Profile Editor' : 'Edit Profile & Picture'}</span>
            </button>
          )}
          <button
            type="button"
            disabled={actionBusyId === 'charter-pdf'}
            onClick={() => void handleExportCharterRenewal('pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#004B87]" />
            <span>Charter Renewal PDF</span>
          </button>
          <button
            type="button"
            disabled={actionBusyId === 'charter-csv'}
            onClick={() => void handleExportCharterRenewal('csv')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => onNavigate('create-post')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
            >
              <PenSquare className="w-4 h-4" />
              <span>Create Post</span>
            </button>
          )}
        </div>
      </div>

      {showProfileEditor && canEditProfile && (
        <ClubProfileEditor
          club={club}
          mode="club"
          canEdit
          onSaved={async (updatedClub) => {
            setShowProfileEditor(false);
            setStatusMessage(
              `Saved profile picture and details for ${updatedClub.name} (${updatedClub.shortCode}).`
            );
            if (onRefresh) await onRefresh();
          }}
          onCancel={() => setShowProfileEditor(false)}
        />
      )}

      {actionError && (
        <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {actionError}
        </div>
      )}
      {statusMessage && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {statusMessage}
        </div>
      )}

      {/* Upcoming Scheduled, Drafts, Publishing Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="bg-white border border-slate-200 rounded-lg flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-slate-400" />
              <span>Upcoming Scheduled Posts</span>
            </h2>
            <span className="text-xs font-mono-tabular text-slate-500">{scheduledPosts.length}</span>
          </div>
          <div className="divide-y divide-slate-200 flex-1">
            {scheduledPosts.length === 0 ? (
              <div className="p-5 text-xs text-slate-500">No upcoming scheduled posts.</div>
            ) : (
              scheduledPosts.slice(0, 3).map((post) => (
                <button
                  key={post.postId}
                  type="button"
                  onClick={() => onEditPost(post)}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="text-sm font-medium text-slate-900 truncate">{post.title}</div>
                  <div className="text-xs font-mono-tabular text-slate-500 mt-1">
                    {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }) : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-slate-400" />
              <span>Drafts & Peer Review Queue</span>
            </h2>
            <span className="text-xs font-mono-tabular text-slate-500">{draftPosts.length}</span>
          </div>
          <div className="divide-y divide-slate-200 flex-1">
            {draftPosts.length === 0 ? (
              <div className="p-5 text-xs text-slate-500">No pending drafts.</div>
            ) : (
              draftPosts.slice(0, 3).map((post) => (
                <button
                  key={post.postId}
                  type="button"
                  onClick={() => onEditPost(post)}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{post.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Author: {post.authorName} · {post.aiAssisted ? 'AI-assisted draft' : 'Manual draft'}
                    </div>
                  </div>
                  <StatusText status={post.status} />
                </button>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-slate-400" />
              <span>Recorded Publishing Activity</span>
            </h2>
            <span className="text-xs font-mono-tabular text-slate-500">{recentPublished.length}</span>
          </div>
          <div className="divide-y divide-slate-200 flex-1">
            {recentPublished.length === 0 ? (
              <div className="p-5 text-xs text-slate-500">No publishing history recorded yet.</div>
            ) : (
              recentPublished.slice(0, 3).map((post) => (
                <button
                  key={post.postId}
                  type="button"
                  onClick={() => onEditPost(post)}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{post.title}</div>
                    <div className="text-xs font-mono-tabular text-slate-500 mt-0.5">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusText status={post.status} />
                </button>
              ))
            )}
          </div>
        </section>
      </div>
      <p className="text-xs text-slate-500">Showing up to 3 items per list. <button type="button" onClick={() => onNavigate('calendar')} className="text-[#004B87] underline">View all in Content Calendar</button>. Recorded statuses may include simulation.</p>

      <section aria-label="Workspace shortcuts" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['upcoming-events', 'Upcoming events', `${events.length} event records`], ['messaging-center', 'Messaging Center', 'Broadcasts and replies'], ['whatsapp', 'WhatsApp Group', `${whatsappGroups.length} linked groups · share links`], ['club-resources', 'Club Resources', 'Forms and submissions']].map(([tab, label, detail]) => (
          <button key={tab} type="button" onClick={() => onNavigate(tab)} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-sky-400 focus-visible:outline-2 focus-visible:outline-sky-700">
            <span className="block text-sm font-semibold text-[#004B87]">{label} →</span>
            <span className="mt-1 block text-xs text-slate-500">{detail}</span>
          </button>
        ))}
      </section>

      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">Budget & advisor items · expand details</summary>
        <div className="mt-4">
      {/* Semester Budget Ledger & Faculty Advisor Co-Sign Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {budget && (
          <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#004B87]" />
                  <span>Semester Budget Ledger (Student Activity Fee)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard $500.00 starting cap vs. encumbered proposals &amp; reimbursements
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canRequestFunding && (
                  <button
                    type="button"
                    onClick={() => setShowFundingForm((prev) => !prev)}
                    className="px-2.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {showFundingForm ? 'Close Request Form' : 'Request Increased Funding'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate('club-resources')}
                  className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Submit Proposal / Voucher
                </button>
              </div>
            </div>

            {showFundingForm && (
              <form
                onSubmit={handleSubmitFundingRequest}
                className="p-4 bg-slate-50/80 border border-slate-200 rounded-md space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-900">
                    Request Supplemental Student Life Funding
                  </div>
                  <div className="text-[11px] font-mono-tabular text-[#004B87] font-semibold">
                    ${currentCapUsd.toFixed(2)} current → ${proposedNewCapUsd.toFixed(2)} proposed
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Event or Initiative Title
                    </label>
                    <input
                      type="text"
                      required
                      value={fundingTitle}
                      onChange={(e) => setFundingTitle(e.target.value)}
                      placeholder="e.g., Spring AI Gala & Keynote"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#004B87]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Additional Funding Needed ($)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      step="10"
                      value={fundingAmount}
                      onChange={(e) => setFundingAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded focus:outline-none focus:border-[#004B87]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Itemized Expense Breakdown
                    </label>
                    <input
                      type="text"
                      value={fundingBreakdown}
                      onChange={(e) => setFundingBreakdown(e.target.value)}
                      placeholder="e.g., Catering ($1,150) · Speaker Fees & Honoraria ($850)"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#004B87]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Target Event Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={fundingEventDate}
                      onChange={(e) => setFundingEventDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded focus:outline-none focus:border-[#004B87]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Expected Attendance (Optional)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={fundingAttendance}
                      onChange={(e) => setFundingAttendance(e.target.value)}
                      placeholder="e.g., 120"
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded focus:outline-none focus:border-[#004B87]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Reason &amp; Student Impact Justification
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={fundingReason}
                    onChange={(e) => setFundingReason(e.target.value)}
                    placeholder="Explain why additional funding beyond the $500 baseline is required and how it benefits CUNY SPS students..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#004B87]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFundingForm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFunding}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded whitespace-nowrap cursor-pointer"
                  >
                    {submittingFunding ? 'Submitting...' : 'Submit to Student Life'}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-tabular">
              <div>
                <div className="text-[11px] text-slate-500">Allocated Cap</div>
                <div className="text-base font-bold text-slate-900">${budget.allocatedUsd.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Encumbered</div>
                <div className="text-base font-bold text-amber-700">${budget.encumberedUsd.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Reimbursed</div>
                <div className="text-base font-bold text-slate-800">${budget.reimbursedUsd.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Remaining</div>
                <div
                  className={`text-base font-bold ${
                    budget.remainingUsd < 100 ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  ${budget.remainingUsd.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Budget Commitment Utilization</span>
                <span className="font-mono-tabular font-semibold text-slate-700">{budgetUsedPct}%</span>
              </div>
              <div className="h-2 bg-slate-100 border border-slate-200 rounded overflow-hidden">
                <div
                  className={`h-full ${budgetUsedPct >= 85 ? 'bg-amber-600' : 'bg-[#004B87]'}`}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
            </div>

            {budgetIncreaseRequests.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  Increased Funding Requests ({budgetIncreaseRequests.length})
                </div>
                <div className="space-y-2">
                  {budgetIncreaseRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {req.eventOrInitiativeTitle}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-500">
                            {req.requestId} · +${req.requestedAdditionalUsd.toFixed(2)} requested (
                            ${req.currentAllocatedUsd.toFixed(0)} → ${req.proposedTotalUsd.toFixed(0)})
                          </div>
                        </div>
                        <StatusText status={req.status} />
                      </div>
                      <div className="text-[11px] text-slate-700">
                        <span className="font-medium text-slate-800">Breakdown:</span>{' '}
                        {req.fundingBreakdown}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{req.reason}</p>
                      {req.decisionNotes && (
                        <div className="pt-1 text-[11px] text-slate-700 border-t border-slate-200/80">
                          <span className="font-semibold">{req.reviewedByName ?? 'Student Life'}:</span>{' '}
                          {req.decisionNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section
          className={`${
            budget ? 'lg:col-span-6' : 'lg:col-span-12'
          } bg-white border border-slate-200 rounded-lg p-5 space-y-3`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#004B87]" />
                <span>Faculty Advisor Portal & Co-Sign Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Advisor: <span className="font-medium text-slate-800">{club.facultyAdvisor}</span> · High-budget ($250+) or off-campus packets & transitions
              </p>
            </div>
          </div>
          {extrasLoading ? (
            <p role="status" className="text-xs text-slate-500">Loading advisor items…</p>
          ) : extrasError ? (
            <div role="alert" className="text-xs text-red-700">{extrasError} <button type="button" onClick={() => void loadGovernanceExtras()} className="underline">Retry advisor items</button></div>
          ) : pendingAdvisorProposals.length === 0 && !pendingTransitionSignOff ? (
            <div className="py-3 flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>All advisor co-sign items for {club.shortCode} are currently complete.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingAdvisorProposals.map((sub) => (
                <div
                  key={sub.submissionId}
                  className="p-3 bg-amber-50/70 border border-amber-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {sub.submissionId}: {sub.title}
                    </div>
                    <div className="text-slate-600 mt-0.5 font-mono-tabular">
                      ${(sub.amountUsd ?? 0).toFixed(2)}
                      {sub.offCampusVenue ? ' · Off-Campus Venue' : ''} · Submitted by {sub.submittedByName}
                    </div>
                  </div>
                  {isAdvisorOrAdmin ? (
                    <button
                      type="button"
                      disabled={actionBusyId === sub.submissionId}
                      onClick={() => void handleAdvisorCoSignProposal(sub.submissionId)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded whitespace-nowrap cursor-pointer"
                    >
                      {actionBusyId === sub.submissionId ? 'Co-Signing...' : 'Co-Sign Proposal'}
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-800 whitespace-nowrap">
                      Awaiting Faculty Advisor
                    </span>
                  )}
                </div>
              ))}

              {pendingTransitionSignOff && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">
                      Officer Handover Co-Sign ({transition?.fromSemester} → {transition?.toSemester})
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      Semester leadership transition readiness endorsement required.
                    </div>
                  </div>
                  {isAdvisorOrAdmin ? (
                    <button
                      type="button"
                      disabled={actionBusyId === 'transition'}
                      onClick={() => void handleAdvisorCoSignTransition()}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded whitespace-nowrap cursor-pointer"
                    >
                      {actionBusyId === 'transition' ? 'Co-Signing...' : 'Co-Sign Transition'}
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-800 whitespace-nowrap">
                      Awaiting Faculty Advisor
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

        </div>
      </details>

      {/* Connected Accounts & Engagement Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Social Account Status</h2>
            <button
              type="button"
              onClick={() => onNavigate('social-accounts')}
              className="text-xs font-medium text-[#004B87] hover:underline cursor-pointer"
            >
              Manage accounts
            </button>
          </div>
          {socialAccounts.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No social media accounts connected yet. Club Leads can submit an account request.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {socialAccounts.map((acc) => (
                <div key={acc.accountId} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{acc.handle}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {acc.platform} · Custodian: {acc.custodian.staffName}
                    </div>
                  </div>
                  <StatusText status={integrationStatus(acc).label} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Recorded Engagement Summaries
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-medium text-[#004B87] hover:underline cursor-pointer"
            >
              Full analytics
            </button>
          </div>
          <p className="px-5 pt-3 text-xs text-amber-800">Demo records · provider data and freshness are unverified.</p>
          {analytics.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Analytics appear here once an official platform integration is active.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {analytics.map((m) => (
                <div key={m.metricId} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {m.platform} ({m.handle})
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{m.reportingPeriod}</div>
                  </div>
                  <div className="flex items-center gap-3 text-right font-mono-tabular">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{m.reach.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-500">Reach</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{m.engagementCount}</div>
                      <div className="text-[11px] text-slate-500">Engagements</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Relevant Notifications */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            <span>Relevant Workspace Notifications</span>
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline cursor-pointer"
          >
            <span>Open Content Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {notifications.length === 0 ? (
          <div className="p-5 text-xs text-slate-500">No workspace notifications.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {notifications.slice(0, 4).map((n) => (
              <div key={n.notificationId} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="text-xs">
                  <span className="font-semibold text-slate-900">{n.title}</span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="text-slate-600">{notificationText(n.message)}</span>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => void handleMarkRead(n.notificationId)}
                    className="text-xs text-[#004B87] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

