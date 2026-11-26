import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  FolderDown,
  Palette,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  BudgetSplitAllocation,
  Club,
  ClubBudgetSummary,
  ClubResource,
  ClubResourceCategory,
  PublicClubSummary,
  ResourceSubmission,
  ResourceSubmissionStatus,
} from '../types';
import {
  AI_CLUB_LOGO_URL,
  HUB_BRAND_PALETTE,
  HUB_LOCKUP_DARK_SVG_URL,
  HUB_LOCKUP_LIGHT_SVG_URL,
  HUB_LOGO_SHEET_URL,
  HUB_MARK_SVG_URL,
  MSA_CLUB_LOGO_URL,
  STUDENT_LIFE_LOGO_URL,
} from '../utils/brandAssets';
import {
  ClubLogoMark,
  HubLogoLockup,
  HubLogoMark,
  StudentLifeLogo,
} from './BrandMarks';
import { StatusText } from './StatusText';
import {
  exportEventProposalPdf,
  exportReimbursementPdf,
  exportResourceTemplateAsPdf,
  type EventProposalPdfInput,
  type ReimbursementLineItem,
} from '../utils/resourcePdfExport';

interface ClubResourcesViewProps {
  clubs?: Club[];
  activeClubId?: string | null;
}

const CATEGORY_ORDER: ClubResourceCategory[] = [
  'Branding Assets',
  'Event Proposal Templates',
  'Financial Reimbursement Forms',
];

const STORAGE_KEY = 'cuny_sps_hub_user_id';

function isPdfExportableCategory(category: ClubResourceCategory): boolean {
  return (
    category === 'Event Proposal Templates' ||
    category === 'Financial Reimbursement Forms'
  );
}

export function ClubResourcesView({ clubs = [], activeClubId }: ClubResourcesViewProps) {
  const { apiFetch, session } = useAuth();
  const [resources, setResources] = useState<ClubResource[]>([]);
  const [submissions, setSubmissions] = useState<ResourceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ClubResourceCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);
  const [submittingWorkflow, setSubmittingWorkflow] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, { status: ResourceSubmissionStatus; notes: string }>
  >({});
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    resource: ClubResource;
    content: string;
  } | null>(null);

  // Interactive Custom PDF Builder Drawer ('proposal' | 'reimbursement' | null)
  const [pdfBuilderMode, setPdfBuilderMode] = useState<'proposal' | 'reimbursement' | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string>(
    activeClubId || clubs[0]?.clubId || ''
  );

  const [publicClubs, setPublicClubs] = useState<PublicClubSummary[]>([]);
  const [liveBudget, setLiveBudget] = useState<ClubBudgetSummary | null>(null);

  // Proposal form fields
  const [propEventTitle, setPropEventTitle] = useState('Fall Student Innovation & Civic Tech Forum');
  const [propFormat, setPropFormat] = useState<EventProposalPdfInput['eventFormat']>('Hybrid');
  const [propDateTime, setPropDateTime] = useState('2026-12-03 at 18:30 ET');
  const [propAttendance, setPropAttendance] = useState('55');
  const [propMission, setPropMission] = useState(
    'Cross-program student project showcase and peer skill sharing aligned with CUNY SPS experiential learning goals.'
  );
  const [propCaptioning, setPropCaptioning] = useState(
    'Zoom Live Auto-Captions enabled + post-event captioned recording and accessible slide deck.'
  );
  const [propAltText, setPropAltText] = useState(true);
  const [propOffCampusVenue, setPropOffCampusVenue] = useState(false);
  const [propCoSponsorIds, setPropCoSponsorIds] = useState<string[]>([]);
  const [propCost, setPropCost] = useState('$120.00');
  const [propFunding, setPropFunding] = useState<EventProposalPdfInput['fundingSource']>(
    'Student Activity Fee Allocation'
  );
  const [propBreakdown, setPropBreakdown] = useState(
    'Campus print signage ($45.00), light refreshments ($75.00)'
  );

  // Reimbursement form fields
  const [reimbCoSponsorIds, setReimbCoSponsorIds] = useState<string[]>([]);
  const [coSigningId, setCoSigningId] = useState<string | null>(null);
  const [reimbPayeeName, setReimbPayeeName] = useState(session?.user.name ?? '');
  const [reimbEmplidLast4, setReimbEmplidLast4] = useState('4821');
  const [reimbPayeeEmail, setReimbPayeeEmail] = useState(session?.user.email ?? '');
  const [reimbEventDate, setReimbEventDate] = useState('2026-11-19');
  const [reimbProposalId, setReimbProposalId] = useState('EVT-2026-041');
  const [reimbItems, setReimbItems] = useState<ReimbursementLineItem[]>([
    {
      receiptDate: '2026-11-15',
      vendor: 'Campus Print Shop',
      description: 'Event welcome banners & accessibility QR cards',
      category: 'Signage & Print',
      amount: '48.50',
    },
    {
      receiptDate: '2026-11-18',
      vendor: 'Trader Joe’s Manhattan',
      description: 'Pre-approved student workshop light refreshments',
      category: 'Catering & Supplies',
      amount: '64.25',
    },
  ]);

  useEffect(() => {
    if (activeClubId && clubs.some((c) => c.clubId === activeClubId)) {
      setSelectedClubId(activeClubId);
    } else if (!selectedClubId && clubs.length > 0) {
      setSelectedClubId(clubs[0].clubId);
    }
  }, [activeClubId, clubs, selectedClubId]);

  useEffect(() => {
    if (session?.user) {
      setReimbPayeeName((prev) => prev || session.user.name);
      setReimbPayeeEmail((prev) => prev || session.user.email);
    }
  }, [session?.user]);

  const selectedClub = useMemo(
    () => clubs.find((c) => c.clubId === selectedClubId),
    [clubs, selectedClubId]
  );

  const canExportLeaderPdf = Boolean(
    session?.effectiveAdminRole ||
      session?.memberships.some(
        (m) =>
          m.status === 'Active' &&
          (m.role === 'CLUB_LEAD' || m.role === 'EDITOR')
      )
  );

  const loadResources = useCallback(async () => {
    setError('');
    try {
      const [res, subRes, pubRes] = await Promise.all([
        apiFetch<{ resources: ClubResource[] }>('/api/resources'),
        apiFetch<{ submissions: ResourceSubmission[] }>('/api/resource-submissions'),
        fetch('/api/public/campus').then((r) => (r.ok ? r.json() : { clubs: [] })),
      ]);
      setResources(res.resources);
      setSubmissions(subRes.submissions);
      setPublicClubs((pubRes as { clubs?: PublicClubSummary[] }).clubs ?? []);
      if (selectedClubId) {
        apiFetch<{ club: Club }>(`/api/clubs/${selectedClubId}/overview`)
          .then((ov) => setLiveBudget(ov.club.budgetSummary ?? null))
          .catch(() => {
            /* ignore optional overview budget refresh */
          });
      }
      setReviewDrafts((prev) => {
        const next = { ...prev };
        for (const s of subRes.submissions) {
          if (!next[s.submissionId]) {
            next[s.submissionId] = {
              status: s.status,
              notes: s.reviewNotes ?? '',
            };
          }
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load club resources.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedClubId]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  const partnerClubOptions = useMemo(() => {
    const map = new Map<string, { clubId: string; name: string; shortCode: string }>();
    for (const c of publicClubs) {
      if (c.clubId !== selectedClubId) {
        map.set(c.clubId, { clubId: c.clubId, name: c.name, shortCode: c.shortCode });
      }
    }
    for (const c of clubs) {
      if (c.clubId !== selectedClubId && !map.has(c.clubId)) {
        map.set(c.clubId, { clubId: c.clubId, name: c.name, shortCode: c.shortCode });
      }
    }
    return [...map.values()];
  }, [publicClubs, clubs, selectedClubId]);

  const buildEvenBudgetSplits = (coIds: string[]): BudgetSplitAllocation[] | undefined => {
    if (coIds.length === 0 || !selectedClub) return undefined;
    const totalClubs = 1 + coIds.length;
    const basePct = Math.floor(100 / totalClubs);
    const remainder = 100 - basePct * totalClubs;
    const splits: BudgetSplitAllocation[] = [
      {
        clubId: selectedClub.clubId,
        clubShortCode: selectedClub.shortCode,
        sharePct: basePct + remainder,
      },
    ];
    for (const cid of coIds) {
      const partner = partnerClubOptions.find((p) => p.clubId === cid);
      splits.push({
        clubId: cid,
        clubShortCode: partner?.shortCode ?? cid,
        sharePct: basePct,
      });
    }
    return splits;
  };

  const canCoSignSubmission = (clubId: string): boolean => {
    if (session?.effectiveAdminRole) return true;
    const targetClub = clubs.find((c) => c.clubId === clubId);
    if (
      targetClub &&
      session?.user.name &&
      targetClub.facultyAdvisor.toLowerCase() === session.user.name.toLowerCase()
    ) {
      return true;
    }
    return Boolean(
      session?.memberships.some(
        (m) =>
          m.clubId === clubId &&
          m.status === 'Active' &&
          (m.officerTitle ?? '').toLowerCase() === 'faculty advisor'
      )
    );
  };

  const handleDownload = async (resource: ClubResource) => {
    setDownloadingId(resource.resourceId);
    setError('');
    setNotice('');
    try {
      const userId = session?.user.userId ?? localStorage.getItem(STORAGE_KEY) ?? '';
      const response = await fetch(`/api/resources/${resource.resourceId}/download`, {
        headers: userId ? { 'x-cuny-user-id': userId } : {},
      });
      if (!response.ok) {
        const errPayload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errPayload.error || `Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = resource.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setNotice(`Downloaded ${resource.fileName} (${resource.version}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download resource.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportTemplatePdf = async (resource: ClubResource, knownContent?: string) => {
    if (!canExportLeaderPdf) {
      setError('PDF export is reserved for Club Leads, Editors, and Student Life Administrators.');
      return;
    }
    setExportingPdfId(resource.resourceId);
    setError('');
    setNotice('');
    try {
      let content = knownContent;
      if (content === undefined) {
        const res = await apiFetch<{ resource: ClubResource; content: string }>(
          `/api/resources/${resource.resourceId}/preview`
        );
        content = res.content;
      }
      const generatedFile = exportResourceTemplateAsPdf(
        resource,
        content,
        selectedClub,
        session?.user.name,
        session?.user.email
      );
      setNotice(`Exported ${generatedFile} client-side as a formatted PDF document.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate PDF document.');
    } finally {
      setExportingPdfId(null);
    }
  };

  const handleExportCustomProposalPdf = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const fileName = exportEventProposalPdf({
        clubName: selectedClub?.name ?? 'CUNY SPS Student Organization',
        clubShortCode: selectedClub?.shortCode ?? 'CUNY-SPS',
        officerName: session?.user.name ?? 'Club Officer',
        officerTitle: session?.user.title ?? 'Club Leader',
        officerEmail: session?.user.email ?? '',
        facultyAdvisor: selectedClub?.facultyAdvisor ?? '',
        eventTitle: propEventTitle,
        eventFormat: propFormat,
        proposedDateTime: propDateTime,
        expectedAttendance: propAttendance,
        missionAlignment: propMission,
        captioningPlan: propCaptioning,
        altTextPrepared: propAltText,
        estimatedCost: propCost,
        fundingSource: propFunding,
        budgetBreakdown: propBreakdown,
      });
      setPdfBuilderMode(null);
      setNotice(`Generated and downloaded ${fileName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export Event Proposal PDF.');
    }
  };

  const handleExportCustomReimbursementPdf = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const fileName = exportReimbursementPdf({
        clubName: selectedClub?.name ?? 'CUNY SPS Student Organization',
        clubShortCode: selectedClub?.shortCode ?? 'CUNY-SPS',
        payeeName: reimbPayeeName,
        emplidLast4: reimbEmplidLast4,
        payeeEmail: reimbPayeeEmail,
        eventDate: reimbEventDate,
        approvedProposalId: reimbProposalId,
        items: reimbItems,
      });
      setPdfBuilderMode(null);
      setNotice(`Generated and downloaded ${fileName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export Financial Reimbursement PDF.');
    }
  };

  const handleSubmitProposalToStudentLife = async () => {
    if (!selectedClubId) {
      setError('Select a student organization before submitting to the Office of Student Life.');
      return;
    }
    setSubmittingWorkflow(true);
    setError('');
    setNotice('');
    try {
      const parsedCost = Number(propCost.replace(/[^0-9.-]/g, ''));
      const budgetSplits = buildEvenBudgetSplits(propCoSponsorIds);
      const res = await apiFetch<{ submission: ResourceSubmission }>(
        `/api/clubs/${selectedClubId}/resource-submissions`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'Event Proposal',
            title: propEventTitle.trim(),
            summary: `${propFormat} · ${propDateTime} · Est. ${propCost} · ${propMission}`,
            amountUsd: Number.isFinite(parsedCost) && parsedCost >= 0 ? parsedCost : 0,
            eventDate: propDateTime.slice(0, 10),
            coSponsorClubIds: propCoSponsorIds,
            budgetSplits,
            offCampusVenue: propOffCampusVenue,
            payload: {
              eventFormat: propFormat,
              proposedDateTime: propDateTime,
              expectedAttendance: propAttendance,
              fundingSource: propFunding,
              budgetBreakdown: propBreakdown,
              captioningPlan: propCaptioning,
              altTextPrepared: propAltText,
              offCampusVenue: propOffCampusVenue,
            },
          }),
        }
      );
      setPdfBuilderMode(null);
      setPropCoSponsorIds([]);
      setPropOffCampusVenue(false);
      setNotice(
        `Submitted Event Proposal "${res.submission.title}" (${res.submission.submissionId}) to the Office of Student Life.`
      );
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit Event Proposal.');
    } finally {
      setSubmittingWorkflow(false);
    }
  };

  const handleSubmitReimbursementToStudentLife = async () => {
    if (!selectedClubId) {
      setError('Select a student organization before submitting to the Office of Student Life.');
      return;
    }
    setSubmittingWorkflow(true);
    setError('');
    setNotice('');
    try {
      const budgetSplits = buildEvenBudgetSplits(reimbCoSponsorIds);
      const res = await apiFetch<{ submission: ResourceSubmission }>(
        `/api/clubs/${selectedClubId}/resource-submissions`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'Financial Reimbursement',
            title: `${reimbProposalId} — ${reimbPayeeName} Reimbursement`,
            summary: `${reimbItems.length} receipt item(s) for event on ${reimbEventDate} (${reimbPayeeEmail})`,
            amountUsd: Number(reimbursementTotal.toFixed(2)),
            eventDate: reimbEventDate,
            coSponsorClubIds: reimbCoSponsorIds,
            budgetSplits,
            payload: {
              payeeName: reimbPayeeName,
              emplidLast4: reimbEmplidLast4,
              payeeEmail: reimbPayeeEmail,
              approvedProposalId: reimbProposalId,
              items: reimbItems,
            },
          }),
        }
      );
      setPdfBuilderMode(null);
      setReimbCoSponsorIds([]);
      setNotice(
        `Submitted Financial Reimbursement (${res.submission.submissionId}) for $${reimbursementTotal.toFixed(2)} to the Office of Student Life.`
      );
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit Reimbursement Voucher.');
    } finally {
      setSubmittingWorkflow(false);
    }
  };

  const handleAdvisorCoSign = async (sub: ResourceSubmission) => {
    setCoSigningId(sub.submissionId);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch<{ submission: ResourceSubmission }>(
        `/api/clubs/${sub.clubId}/resource-submissions/${sub.submissionId}/advisor-signoff`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );
      setNotice(
        `Faculty Advisor co-signed ${res.submission.submissionId} ("${res.submission.title}").`
      );
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record Faculty Advisor co-sign.');
    } finally {
      setCoSigningId(null);
    }
  };

  const handleAdminReviewSubmission = async (submissionId: string) => {
    const draft = reviewDrafts[submissionId];
    if (!draft) return;
    setSavingReviewId(submissionId);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch<{ submission: ResourceSubmission }>(
        `/api/admin/resource-submissions/${submissionId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: draft.status,
            reviewNotes: draft.notes,
          }),
        }
      );
      setNotice(`Updated ${res.submission.submissionId} status to ${res.submission.status}.`);
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update Student Life review status.');
    } finally {
      setSavingReviewId(null);
    }
  };

  const handlePreview = async (resource: ClubResource) => {
    setError('');
    try {
      const res = await apiFetch<{ resource: ClubResource; content: string }>(
        `/api/resources/${resource.resourceId}/preview`
      );
      setPreviewData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to preview resource.');
    }
  };

  const reimbursementTotal = useMemo(() => {
    return reimbItems.reduce((sum, item) => {
      const val = Number(item.amount.replace(/[^0-9.-]/g, ''));
      return sum + (Number.isFinite(val) && val > 0 ? val : 0);
    }, 0);
  }, [reimbItems]);

  const filteredResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resources.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [resources, categoryFilter, searchQuery]);

  const groupedResources = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: filteredResources.filter((r) => r.category === category),
    })).filter((g) => g.items.length > 0);
  }, [filteredResources]);

  const getCategoryIcon = (category: ClubResourceCategory) => {
    switch (category) {
      case 'Branding Assets':
        return Palette;
      case 'Event Proposal Templates':
        return FileText;
      case 'Financial Reimbursement Forms':
        return Receipt;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <StudentLifeLogo className="h-11 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Club Resources</h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Official CUNY SPS branding assets, event proposal templates, and Student Life financial
              reimbursement forms for student organization leaders.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono-tabular text-slate-500">
          {resources.length} official institutional documents
        </div>
      </div>

      {/* Institutional Note & Leader PDF Packet Actions */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs text-slate-700">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[#004B87] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900">Official Template Governance:</span>{' '}
            All branding lockups, event proposal packets, and reimbursement vouchers are maintained by
            the CUNY SPS Office of Student Life.{' '}
            {canExportLeaderPdf
              ? 'Club leaders can export filled Event Proposals and Reimbursement Forms directly as PDF documents.'
              : 'PDF packet export is enabled for Club Leads, Editors, and Student Life staff.'}
          </div>
        </div>

        {canExportLeaderPdf && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                setPdfBuilderMode((prev) => (prev === 'proposal' ? null : 'proposal'))
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                pdfBuilderMode === 'proposal'
                  ? 'bg-[#004B87] text-white border-[#004B87]'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Fill & Export Event Proposal PDF</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setPdfBuilderMode((prev) => (prev === 'reimbursement' ? null : 'reimbursement'))
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                pdfBuilderMode === 'reimbursement'
                  ? 'bg-[#004B87] text-white border-[#004B87]'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Fill & Export Reimbursement PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Club Semester Budget Ledger Strip */}
      {(liveBudget || selectedClub?.budgetSummary) && (() => {
        const b = liveBudget ?? selectedClub?.budgetSummary!;
        return (
          <section
            aria-label="Club Semester Budget Ledger"
            className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-2 lg:grid-cols-5 gap-3 items-center"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#004B87] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  {b.clubShortCode} Activity Fee Ledger
                </div>
                <div className="text-[11px] text-slate-500">FY 2026–2027 Allocation</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Annual Cap</div>
              <div className="text-sm font-bold font-mono-tabular text-slate-900">
                ${b.allocatedUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Encumbered</div>
              <div className="text-sm font-bold font-mono-tabular text-amber-700">
                ${b.encumberedUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Reimbursed</div>
              <div className="text-sm font-bold font-mono-tabular text-[#004B87]">
                ${b.reimbursedUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Remaining Balance</div>
              <div className="text-sm font-bold font-mono-tabular text-emerald-700">
                ${b.remainingUsd.toFixed(2)}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Custom PDF Form Builder Drawer */}
      {pdfBuilderMode === 'proposal' && canExportLeaderPdf && (
        <form
          onSubmit={handleExportCustomProposalPdf}
          aria-label="Event Proposal PDF Export Form"
          className="bg-white border border-[#004B87] rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Fill & Export Event Proposal Packet (PDF)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates a signed-ready CUNY SPS Office of Student Life Event Proposal PDF locally in your browser.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPdfBuilderMode(null)}
              aria-label="Close proposal PDF builder"
              className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-300 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {clubs.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Student Organization
                </label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {clubs.map((c) => (
                    <option key={c.clubId} value={c.clubId}>
                      {c.name} ({c.shortCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={clubs.length > 0 ? 'md:col-span-2' : 'md:col-span-3'}>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Proposed Event Title
              </label>
              <input
                type="text"
                required
                value={propEventTitle}
                onChange={(e) => setPropEventTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Event Format
              </label>
              <select
                value={propFormat}
                onChange={(e) =>
                  setPropFormat(e.target.value as EventProposalPdfInput['eventFormat'])
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="Virtual (Zoom)">Virtual (Zoom)</option>
                <option value="Hybrid">Hybrid</option>
                <option value="In-Person (119 W 31st St)">In-Person (119 W 31st St)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Proposed Date & Time (ET)
              </label>
              <input
                type="text"
                required
                value={propDateTime}
                onChange={(e) => setPropDateTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Expected Attendance
              </label>
              <input
                type="text"
                required
                value={propAttendance}
                onChange={(e) => setPropAttendance(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Alignment with Club Mission & Student Engagement Goals
              </label>
              <textarea
                rows={2}
                required
                value={propMission}
                onChange={(e) => setPropMission(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Accessibility & Live Captioning Plan
              </label>
              <textarea
                rows={2}
                required
                value={propCaptioning}
                onChange={(e) => setPropCaptioning(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Estimated Total Cost ($)
              </label>
              <input
                type="text"
                value={propCost}
                onChange={(e) => setPropCost(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Funding Source
              </label>
              <select
                value={propFunding}
                onChange={(e) =>
                  setPropFunding(e.target.value as EventProposalPdfInput['fundingSource'])
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="Student Activity Fee Allocation">
                  Student Activity Fee Allocation
                </option>
                <option value="Zero-Cost Event">Zero-Cost Event</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Itemized Budget Breakdown
              </label>
              <input
                type="text"
                value={propBreakdown}
                onChange={(e) => setPropBreakdown(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {partnerClubOptions.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-slate-800">
                  Co-Sponsored Event Partner Clubs (Splits Budget Allocation Evenly)
                </div>
                {propCoSponsorIds.length > 0 && (
                  <span className="text-[11px] font-mono-tabular text-[#004B87]">
                    {buildEvenBudgetSplits(propCoSponsorIds)
                      ?.map((s) => `${s.clubShortCode} ${s.sharePct}%`)
                      .join(' · ')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {partnerClubOptions.map((partner) => {
                  const checked = propCoSponsorIds.includes(partner.clubId);
                  return (
                    <label
                      key={partner.clubId}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setPropCoSponsorIds((prev) =>
                            e.target.checked
                              ? [...prev, partner.clubId]
                              : prev.filter((id) => id !== partner.clubId)
                          )
                        }
                        className="accent-[#004B87]"
                      />
                      <span>
                        {partner.name} ({partner.shortCode})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={propAltText}
                  onChange={(e) => setPropAltText(e.target.checked)}
                  className="accent-[#004B87]"
                />
                <span>Promotional flyer alt-text &amp; CamelCase hashtags prepared</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={propOffCampusVenue}
                  onChange={(e) => setPropOffCampusVenue(e.target.checked)}
                  className="accent-[#004B87]"
                />
                <span>Off-Campus Venue (Requires Faculty Advisor Co-Sign)</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPdfBuilderMode(null)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingWorkflow}
                onClick={() => void handleSubmitProposalToStudentLife()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingWorkflow ? 'Submitting...' : 'Submit to Office of Student Life'}</span>
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Generate Event Proposal PDF</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {pdfBuilderMode === 'reimbursement' && canExportLeaderPdf && (
        <form
          onSubmit={handleExportCustomReimbursementPdf}
          aria-label="Financial Reimbursement PDF Export Form"
          className="bg-white border border-[#004B87] rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Fill & Export Financial Reimbursement Voucher (PDF)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-calculates itemized expenses and formats the FY 2026–2027 Student Life reimbursement voucher as a ready-to-sign PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPdfBuilderMode(null)}
              aria-label="Close reimbursement PDF builder"
              className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-300 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {clubs.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Student Organization
                </label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {clubs.map((c) => (
                    <option key={c.clubId} value={c.clubId}>
                      {c.name} ({c.shortCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Payee Full Name
              </label>
              <input
                type="text"
                required
                value={reimbPayeeName}
                onChange={(e) => setReimbPayeeName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                EMPLID (Last 4 Digits)
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={reimbEmplidLast4}
                onChange={(e) => setReimbEmplidLast4(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                CUNY SPS Email
              </label>
              <input
                type="email"
                required
                value={reimbPayeeEmail}
                onChange={(e) => setReimbPayeeEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Related Event Date
              </label>
              <input
                type="date"
                required
                value={reimbEventDate}
                onChange={(e) => setReimbEventDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Approved Proposal ID
              </label>
              <input
                type="text"
                required
                value={reimbProposalId}
                onChange={(e) => setReimbProposalId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-800">
                Itemized Receipt Line Items
              </div>
              <button
                type="button"
                onClick={() =>
                  setReimbItems((prev) => [
                    ...prev,
                    {
                      receiptDate: reimbEventDate,
                      vendor: '',
                      description: '',
                      category: 'Supplies',
                      amount: '0.00',
                    },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Receipt Line</span>
              </button>
            </div>

            <div className="space-y-2">
              {reimbItems.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <input
                    type="date"
                    value={row.receiptDate}
                    onChange={(e) =>
                      setReimbItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, receiptDate: e.target.value } : r))
                      )
                    }
                    aria-label={`Receipt date row ${idx + 1}`}
                    className="md:col-span-2 px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Vendor"
                    value={row.vendor}
                    onChange={(e) =>
                      setReimbItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, vendor: e.target.value } : r))
                      )
                    }
                    aria-label={`Vendor row ${idx + 1}`}
                    className="md:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Expense description"
                    value={row.description}
                    onChange={(e) =>
                      setReimbItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r))
                      )
                    }
                    aria-label={`Description row ${idx + 1}`}
                    className="md:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={row.category}
                    onChange={(e) =>
                      setReimbItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, category: e.target.value } : r))
                      )
                    }
                    aria-label={`Category row ${idx + 1}`}
                    className="md:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                  <div className="md:col-span-2 flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="0.00"
                      value={row.amount}
                      onChange={(e) =>
                        setReimbItems((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r))
                        )
                      }
                      aria-label={`Amount USD row ${idx + 1}`}
                      className="w-full px-2.5 py-1.5 text-xs text-right font-mono-tabular bg-white border border-slate-300 rounded-md"
                    />
                    {reimbItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setReimbItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        aria-label={`Remove line ${idx + 1}`}
                        className="p-1.5 text-slate-400 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {partnerClubOptions.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-slate-800">
                  Co-Sponsored Voucher Split Across Collaborating Clubs
                </div>
                {reimbCoSponsorIds.length > 0 && (
                  <span className="text-[11px] font-mono-tabular text-[#004B87]">
                    {buildEvenBudgetSplits(reimbCoSponsorIds)
                      ?.map((s) => `${s.clubShortCode} ${s.sharePct}%`)
                      .join(' · ')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {partnerClubOptions.map((partner) => {
                  const checked = reimbCoSponsorIds.includes(partner.clubId);
                  return (
                    <label
                      key={partner.clubId}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setReimbCoSponsorIds((prev) =>
                            e.target.checked
                              ? [...prev, partner.clubId]
                              : prev.filter((id) => id !== partner.clubId)
                          )
                        }
                        className="accent-[#004B87]"
                      />
                      <span>
                        {partner.name} ({partner.shortCode})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="text-xs font-mono-tabular text-slate-700">
              Total Claimed Reimbursement:{' '}
              <strong className="text-sm text-[#004B87]">
                ${reimbursementTotal.toFixed(2)}
              </strong>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPdfBuilderMode(null)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingWorkflow}
                onClick={() => void handleSubmitReimbursementToStudentLife()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingWorkflow ? 'Submitting...' : 'Submit to Office of Student Life'}</span>
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Generate Reimbursement PDF</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
          {(['All', ...CATEGORY_ORDER] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'All' ? 'All Resources' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates or forms..."
            aria-label="Search club resources"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
          />
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

      {/* Preview Modal / Panel */}
      {previewData && (
        <section
          aria-label="Resource Preview"
          className="bg-white border border-[#004B87] rounded-lg overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#004B87]">
                Preview · {previewData.resource.category}
              </div>
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {previewData.resource.title} ({previewData.resource.fileName})
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canExportLeaderPdf &&
                isPdfExportableCategory(previewData.resource.category) && (
                  <button
                    type="button"
                    disabled={exportingPdfId === previewData.resource.resourceId}
                    onClick={() =>
                      void handleExportTemplatePdf(previewData.resource, previewData.content)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-[#004B87]" />
                    <span>Export PDF</span>
                  </button>
                )}
              <button
                type="button"
                onClick={() => void handleDownload(previewData.resource)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                aria-label="Close preview"
                className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-300 bg-white rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-5 bg-slate-50/40">
            {previewData.resource.fileFormat === 'SVG' ? (
              <div className="space-y-3">
                <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center justify-center">
                  <img
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(previewData.content)}`}
                    alt={previewData.resource.title}
                    className="max-h-64 w-auto object-contain"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Vector SVG asset — scales crisply to any print or digital social dimension.
                </p>
              </div>
            ) : previewData.resource.fileFormat === 'HTML' ? (
              <iframe
                title={previewData.resource.title}
                srcDoc={previewData.content}
                sandbox=""
                className="w-full h-96 bg-white border border-slate-200 rounded-md"
              />
            ) : (
              <pre className="p-4 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-800 whitespace-pre-wrap overflow-x-auto max-h-96">
                {previewData.content}
              </pre>
            )}
          </div>
        </section>
      )}

      {/* Categorized Resource Lists */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-36 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-36 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      ) : groupedResources.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
          No resources match the current filter.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedResources.map(({ category, items }) => {
            const Icon = getCategoryIcon(category);
            const supportsPdfExport = isPdfExportableCategory(category);
            return (
              <section
                key={category}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#004B87]" />
                    <h2 className="text-sm font-bold text-slate-900">{category}</h2>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-500">
                    {items.length} file{items.length === 1 ? '' : 's'}
                  </span>
                </div>

                {category === 'Branding Assets' && (
                  <div className="p-5 bg-slate-50/40 border-b border-slate-200 space-y-4">
                    {/* Club Social Hub Brand System v1.0 */}
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Club Social Hub — Brand Logo System (v1.0)
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Open C primary lockup, Three Orbit, and The Stack marks · Archivo &amp; JetBrains Mono
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <a
                            href={HUB_MARK_SVG_URL}
                            download="club-social-hub-mark.svg"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:border-[#004B87] rounded whitespace-nowrap"
                          >
                            <Download className="w-3 h-3" />
                            <span>Mark SVG</span>
                          </a>
                          <a
                            href={HUB_LOCKUP_DARK_SVG_URL}
                            download="club-social-hub-lockup-dark.svg"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:border-[#004B87] rounded whitespace-nowrap"
                          >
                            <Download className="w-3 h-3" />
                            <span>Dark SVG</span>
                          </a>
                          <a
                            href={HUB_LOCKUP_LIGHT_SVG_URL}
                            download="club-social-hub-lockup-light.svg"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:border-[#004B87] rounded whitespace-nowrap"
                          >
                            <Download className="w-3 h-3" />
                            <span>Light SVG</span>
                          </a>
                          <a
                            href={HUB_LOGO_SHEET_URL}
                            download="club-social-hub-logo-sheet.jpg"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-[#0B0B0F] hover:bg-slate-800 rounded whitespace-nowrap"
                          >
                            <Download className="w-3 h-3" />
                            <span>Full Logo Sheet (JPG)</span>
                          </a>
                        </div>
                      </div>

                      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Primary Dark Ink Specimen */}
                        <div className="lg:col-span-5 bg-[#0B0B0F] rounded-md p-4 flex flex-col justify-between gap-4">
                          <div className="text-[10px] font-mono text-slate-400">
                            01 · PRIMARY ON INK #0B0B0F (OPEN C)
                          </div>
                          <HubLogoLockup theme="dark" size="lg" />
                          <div className="flex items-center gap-3 pt-1">
                            <HubLogoMark variant="open-c" surface="ink" size="sm" />
                            <HubLogoMark variant="open-c" surface="signal" size="sm" />
                            <HubLogoMark variant="open-c" surface="paper" size="sm" />
                            <HubLogoMark variant="orbit" surface="ink" size="sm" />
                            <HubLogoMark variant="stack" surface="ink" size="sm" />
                          </div>
                        </div>

                        {/* Inverse Paper Specimen */}
                        <div className="lg:col-span-4 bg-[#F4F4F2] border border-slate-200 rounded-md p-4 flex flex-col justify-between gap-4">
                          <div className="text-[10px] font-mono text-slate-500">
                            02 · INVERSE ON PAPER #F4F4F2
                          </div>
                          <HubLogoLockup theme="light" size="lg" />
                          <div className="flex items-center gap-3 pt-1">
                            <HubLogoMark variant="open-c" surface="bare-dark" size="sm" />
                            <HubLogoMark variant="orbit" surface="bare-dark" size="sm" />
                            <HubLogoMark variant="stack" surface="bare-dark" size="sm" />
                          </div>
                        </div>

                        {/* Official Palette & Logo Sheet Thumbnail */}
                        <div className="lg:col-span-3 space-y-2.5">
                          <div className="text-[10px] font-mono font-semibold text-slate-500">
                            HUB BRAND TOKENS
                          </div>
                          <div className="space-y-1.5">
                            {HUB_BRAND_PALETTE.map((swatch) => (
                              <div key={swatch.hex} className="flex items-center gap-2 text-[11px]">
                                <span
                                  aria-hidden="true"
                                  className="w-4 h-4 rounded border border-slate-300 shrink-0"
                                  style={{ backgroundColor: swatch.hex }}
                                />
                                <span className="font-mono font-semibold text-slate-800">
                                  {swatch.hex}
                                </span>
                                <span className="text-slate-500 truncate">{swatch.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Institutional & Partner Marks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200 rounded-md p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-md shrink-0">
                            <StudentLifeLogo className="h-11 w-auto" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              CUNY SPS Student Life Lockup
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Official horizontal wildcat banner (PNG)
                            </div>
                          </div>
                        </div>
                        <a
                          href={STUDENT_LIFE_LOGO_URL}
                          download="cuny-sps-student-life-logo.png"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-slate-300 hover:border-[#004B87] rounded-md whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PNG</span>
                        </a>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-md p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <ClubLogoMark
                            clubId="club-ai"
                            clubShortCode="AI-CLUB"
                            clubName="Artificial Intelligence Club"
                            size="lg"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              Artificial Intelligence Club Emblem
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Official circular circuit-tree seal (JPG)
                            </div>
                          </div>
                        </div>
                        <a
                          href={AI_CLUB_LOGO_URL}
                          download="cuny-sps-ai-club-emblem.jpg"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-slate-300 hover:border-[#004B87] rounded-md whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>JPG</span>
                        </a>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-md p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <ClubLogoMark
                            clubId="club-msa"
                            clubShortCode="MSA"
                            clubName="Muslim Student Association (MSA)"
                            size="lg"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              Muslim Student Association (MSA) Emblem
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Official Muslim Student Association (MSA) crescent badge (PNG)
                            </div>
                          </div>
                        </div>
                        <a
                          href={MSA_CLUB_LOGO_URL}
                          download="cuny-sps-msa-emblem.png"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-slate-300 hover:border-[#004B87] rounded-md whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PNG</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-slate-200">
                  {items.map((item) => {
                    const FormatIcon = item.fileFormat === 'CSV' ? FileSpreadsheet : FolderDown;
                    const isDownloading = downloadingId === item.resourceId;
                    const isExportingPdf = exportingPdfId === item.resourceId;
                    return (
                      <div
                        key={item.resourceId}
                        className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="p-2 border border-slate-200 rounded-md bg-slate-50 text-[#004B87] shrink-0 mt-0.5">
                            <FormatIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                              <span className="text-[11px] font-mono-tabular text-slate-500">
                                {item.fileFormat} · {item.version}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">{item.description}</p>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="font-mono">{item.fileName}</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.publishedBy}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">Updated {item.updatedAt}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#004B87]">{item.audienceNote}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => void handlePreview(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          {canExportLeaderPdf && supportsPdfExport && (
                            <button
                              type="button"
                              disabled={isExportingPdf}
                              onClick={() => void handleExportTemplatePdf(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>{isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => void handleDownload(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Office of Student Life In-App Submissions & Review Queue */}
      <section
        aria-label="Student Life Proposal and Reimbursement Submissions"
        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#004B87]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Office of Student Life Submissions &amp; Review Tracking
              </h2>
              <p className="text-[11px] text-slate-500">
                In-app workflow tracking for submitted Event Proposals and Financial Reimbursement vouchers.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-tabular text-slate-500">
            {submissions.length} submission{submissions.length === 1 ? '' : 's'}
          </span>
        </div>

        {submissions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No Event Proposals or Financial Reimbursements have been submitted yet. Use the packet
            builders above to submit directly to the Office of Student Life.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {submissions.map((sub) => {
              const draft = reviewDrafts[sub.submissionId] ?? {
                status: sub.status,
                notes: sub.reviewNotes ?? '',
              };
              const isSaving = savingReviewId === sub.submissionId;

              return (
                <div key={sub.submissionId} className="px-5 py-4 space-y-2.5 hover:bg-slate-50/70">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-mono font-semibold text-[#004B87]">
                          {sub.clubShortCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-700">{sub.type}</span>
                        <span aria-hidden="true">·</span>
                        <StatusText status={sub.status} />
                        {typeof sub.amountUsd === 'number' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular font-semibold text-slate-800">
                              ${sub.amountUsd.toFixed(2)}
                            </span>
                          </>
                        )}
                        {sub.offCampusVenue && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-amber-800">Off-Campus Venue</span>
                          </>
                        )}
                        {sub.advisorSignOff ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <StatusText status="Co-Signed" />
                          </>
                        ) : sub.requiresAdvisorSignOff ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <StatusText status="Advisor Co-Sign Required" />
                          </>
                        ) : null}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{sub.title}</h3>
                      <p className="text-xs text-slate-600">{sub.summary}</p>
                      {sub.budgetSplits && sub.budgetSplits.length > 0 && (
                        <div className="text-[11px] font-mono-tabular text-[#004B87]">
                          Co-Sponsored Budget Split:{' '}
                          {sub.budgetSplits.map((s) => `${s.clubShortCode} (${s.sharePct}%)`).join(' · ')}
                        </div>
                      )}
                      {sub.advisorSignOff && (
                        <div className="text-[11px] text-emerald-800 font-mono-tabular">
                          Faculty Advisor Co-Sign: {sub.advisorSignOff.signedByName} on{' '}
                          {new Date(sub.advisorSignOff.signedAt).toLocaleDateString()}
                          {sub.advisorSignOff.note ? ` — ${sub.advisorSignOff.note}` : ''}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 font-mono-tabular">
                        Submitted by {sub.submittedByName} ({sub.submittedByEmail}) on{' '}
                        {new Date(sub.submittedAt).toLocaleString()}
                        {sub.reviewedByName ? ` · Reviewed by ${sub.reviewedByName}` : ''}
                      </div>
                      {sub.reviewNotes && (
                        <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 mt-1">
                          <span className="font-semibold">Student Life Note:</span> {sub.reviewNotes}
                        </div>
                      )}
                    </div>

                    {sub.requiresAdvisorSignOff &&
                      !sub.advisorSignOff &&
                      canCoSignSubmission(sub.clubId) && (
                        <button
                          type="button"
                          disabled={coSigningId === sub.submissionId}
                          onClick={() => void handleAdvisorCoSign(sub)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            {coSigningId === sub.submissionId
                              ? 'Co-Signing...'
                              : 'Co-Sign as Faculty Advisor'}
                          </span>
                        </button>
                      )}
                  </div>

                  {Boolean(session?.effectiveAdminRole) && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                      <select
                        aria-label={`Review status for ${sub.title}`}
                        value={draft.status}
                        onChange={(e) =>
                          setReviewDrafts((prev) => ({
                            ...prev,
                            [sub.submissionId]: {
                              ...draft,
                              status: e.target.value as ResourceSubmissionStatus,
                            },
                          }))
                        }
                        className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md text-slate-800"
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Revisions Requested">Revisions Requested</option>
                      </select>

                      <input
                        type="text"
                        value={draft.notes}
                        onChange={(e) =>
                          setReviewDrafts((prev) => ({
                            ...prev,
                            [sub.submissionId]: {
                              ...draft,
                              notes: e.target.value,
                            },
                          }))
                        }
                        placeholder="Add Student Life review note or budget ID..."
                        aria-label={`Review notes for ${sub.title}`}
                        className="flex-1 min-w-[200px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md"
                      />

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handleAdminReviewSubmission(sub.submissionId)}
                        className="px-3 py-1 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                      >
                        {isSaving ? 'Saving...' : 'Update Review'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
