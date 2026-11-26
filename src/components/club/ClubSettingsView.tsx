import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Club, ClubCharterRenewalSummary, RoleName } from '../../types';
import { exportCharterRenewalPdf } from '../../utils/resourcePdfExport';
import { OfficerHandoverPanel } from '../OfficerHandoverPanel';
import { ClubProfileEditor } from './ClubProfileEditor';

interface ClubSettingsViewProps {
  club: Club;
  effectiveRole: RoleName | null;
  onRefresh: () => Promise<void>;
}

export function ClubSettingsView({ club, effectiveRole, onRefresh }: ClubSettingsViewProps) {
  const { apiFetch } = useAuth();
  const [charterBusy, setCharterBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const canEdit =
    effectiveRole === 'SL_SUPER_ADMIN' ||
    effectiveRole === 'SL_ADMIN' ||
    effectiveRole === 'CLUB_LEAD';

  const handleExportCharter = async (format: 'pdf' | 'csv') => {
    setCharterBusy(true);
    setNotice('');
    setError('');
    try {
      const dossier = await apiFetch<ClubCharterRenewalSummary>(
        `/api/clubs/${club.clubId}/charter-renewal`
      );
      if (format === 'pdf') {
        const filename = exportCharterRenewalPdf(dossier);
        setNotice(`Generated Student Life Annual Charter Renewal PDF (${filename}).`);
      } else {
        const csvLines = [
          'Category,Field,Value',
          `Club,Name,"${dossier.clubName} (${dossier.clubShortCode})"`,
          `Club,Faculty Advisor,"${dossier.facultyAdvisor}"`,
          `Roster,Active Members,${dossier.activeMembersCount}`,
          `Roster,Alumni Archived,${dossier.alumniMembersCount}`,
          `Events,Total Hosted,${dossier.eventsHostedCount}`,
          `Events,Semester Attendance,${dossier.totalSemesterAttendance}`,
          `Budget,Allocated Cap,$${dossier.budgetSummary.allocatedUsd.toFixed(2)}`,
          `Budget,Encumbered,$${dossier.budgetSummary.encumberedUsd.toFixed(2)}`,
          `Budget,Reimbursed,$${dossier.budgetSummary.reimbursedUsd.toFixed(2)}`,
          `Budget,Remaining Balance,$${dossier.budgetSummary.remainingUsd.toFixed(2)}`,
        ].join('\n');
        const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cuny-sps-${dossier.clubShortCode.toLowerCase()}-charter-renewal.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setNotice('Downloaded Annual Charter Renewal CSV summary.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate charter renewal packet.');
    } finally {
      setCharterBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Club Workspace Settings</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Edit your club profile picture, accent color, public campus metadata, semester officer
          transitions, and charter renewal packets.
        </p>
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

      <div className="max-w-4xl">
        <ClubProfileEditor
          club={club}
          mode="club"
          canEdit={canEdit}
          onSaved={async (updatedClub) => {
            setNotice(`Updated club profile & branding for ${updatedClub.name} (${updatedClub.shortCode}).`);
            await onRefresh();
          }}
        />
      </div>

      <section className="bg-white border border-slate-200 rounded-lg p-6 max-w-4xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Student Life Annual Charter Renewal Packet
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Generates a single end-of-year dossier combining verified roster headcount, active officer
            titles, semester event attendance totals, Student Activity Fee ledger, and audit compliance.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={charterBusy}
            onClick={() => void handleExportCharter('pdf')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Renewal PDF</span>
          </button>
          <button
            type="button"
            disabled={charterBusy}
            onClick={() => void handleExportCharter('csv')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </section>

      <OfficerHandoverPanel clubId={club.clubId} onRefreshParent={onRefresh} />
    </div>
  );
}


