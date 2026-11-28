import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  DollarSign,
  FileText,
  Download,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Building2,
  Filter,
  BarChart3,
  Mail,
  Search,
  AlertTriangle,
  Award,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  ecosystemStore,
  EcosystemUser,
  BudgetRequest,
  JoinClubRequest,
  ClubMemberRecord
} from '../data/ecosystemStore';
import { CLUBS_DATA } from '../data/clubDiscoveryData';

interface AdminPortalViewProps {
  currentAdmin: EcosystemUser;
  onExitToStudentView: () => void;
}

export function AdminPortalView({
  currentAdmin,
  onExitToStudentView,
}: AdminPortalViewProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'rosters' | 'reports'>('requests');
  const [requestFilter, setRequestFilter] = useState<'all' | 'budget' | 'joins'>('all');
  const [selectedClubRoster, setSelectedClubRoster] = useState<string>('all');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  // Local state synced with store
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinClubRequest[]>([]);
  const [allMembers, setAllMembers] = useState<ClubMemberRecord[]>([]);

  // Action status / toasts
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [decisionNotesInput, setDecisionNotesInput] = useState<{ [id: string]: string }>({});

  const refreshData = () => {
    setBudgetRequests(ecosystemStore.getBudgetRequests());
    setJoinRequests(ecosystemStore.getJoinRequests());
    setAllMembers(ecosystemStore.getMembers());
  };

  useEffect(() => {
    refreshData();
    const unsub = ecosystemStore.subscribe(() => {
      refreshData();
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3500);
  };

  // Budget Decision Handler
  const handleBudgetDecision = (id: string, status: 'Approved' | 'Rejected' | 'Under Review') => {
    const notes = decisionNotesInput[id] || (status === 'Approved' ? 'Approved in full by Student Association Admin.' : 'Needs revision.');
    ecosystemStore.reviewBudgetRequest(id, status, currentAdmin.name, notes);
    showToast(`Budget request ${id} marked as ${status}.`);
  };

  // Join Request Decision Handler
  const handleJoinDecision = (id: string, status: 'Approved' | 'Rejected', studentName: string) => {
    ecosystemStore.reviewJoinRequest(id, status, `${currentAdmin.name} (Platform Admin)`);
    showToast(`Join request for ${studentName} ${status.toLowerCase()}.`);
  };

  // Email Copy Handler
  const handleCopyEmails = () => {
    const emailsText = ecosystemStore.exportEmailsText(
      selectedClubRoster === 'all' ? undefined : selectedClubRoster
    );
    if (navigator.clipboard) {
      navigator.clipboard.writeText(emailsText);
      showToast('All email addresses copied to clipboard for direct broadcast mailing!');
    }
  };

  // CSV Download Handler
  const handleDownloadCsv = () => {
    const csvContent = ecosystemStore.exportMembersCsv(
      selectedClubRoster === 'all' ? undefined : selectedClubRoster
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `cuny-sps-club-roster-${selectedClubRoster}-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded membership roster CSV for CUNY Central reporting.');
  };

  // Filtered members for roster tab
  const displayedMembers = allMembers.filter((m) => {
    const matchClub = selectedClubRoster === 'all' || m.clubId === selectedClubRoster;
    const matchSearch =
      !searchMemberQuery ||
      m.name.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
      m.major.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
      m.clubName.toLowerCase().includes(searchMemberQuery.toLowerCase());
    return matchClub && matchSearch;
  });

  const pendingBudgetCount = budgetRequests.filter((b) => b.status === 'Submitted' || b.status === 'Under Review').length;
  const pendingJoinCount = joinRequests.filter((j) => j.status === 'Pending').length;
  const totalPending = pendingBudgetCount + pendingJoinCount;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Admin Bar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Layer 3: Dedicated Admin Portal
                </span>
                <span className="text-xs text-slate-400">Authenticated: {currentAdmin.name}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                CUNY SPS Student Association &amp; Platform Governance
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExitToStudentView}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>Switch to Student Discovery View</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold py-2 px-6 flex items-center justify-center gap-2 shadow-inner">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusToast}</span>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto text-xs font-semibold pt-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'requests'
                ? 'border-amber-500 text-amber-400 bg-white/5 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Requests &amp; Approvals ({totalPending} Pending)</span>
          </button>

          <button
            onClick={() => setActiveTab('rosters')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'rosters'
                ? 'border-amber-500 text-amber-400 bg-white/5 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>Member Rosters &amp; Email Lists</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'reports'
                ? 'border-amber-500 text-amber-400 bg-white/5 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>CUNY Central Compliance &amp; Reports</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recognized Clubs</span>
            <div className="text-2xl font-black text-slate-900 mt-1">34</div>
            <span className="text-[11px] text-emerald-600 font-semibold">100% active standing</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Club Leaders</span>
            <div className="text-2xl font-black text-slate-900 mt-1">68</div>
            <span className="text-[11px] text-slate-500 font-medium">Co-Chairs &amp; Officers</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Student Members</span>
            <div className="text-2xl font-black text-blue-700 mt-1">{allMembers.length}</div>
            <span className="text-[11px] text-blue-600 font-semibold">Verified roster entries</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Review Queue</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{totalPending}</div>
            <span className="text-[11px] text-amber-600 font-semibold">Requires admin action</span>
          </div>
        </div>

        {/* TAB 1: Centralized Requests & Approvals */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">In-App Requests &amp; Decision Queue</h3>
                  <p className="text-xs text-slate-500">
                    Review incoming budget allocation requests and student membership applications without email ping-pong.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRequestFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      requestFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({budgetRequests.length + joinRequests.length})
                  </button>
                  <button
                    onClick={() => setRequestFilter('budget')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      requestFilter === 'budget' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Budget Requests ({budgetRequests.length})
                  </button>
                  <button
                    onClick={() => setRequestFilter('joins')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      requestFilter === 'joins' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Join Applications ({joinRequests.length})
                  </button>
                </div>
              </div>

              {/* Budget Requests Table/Cards */}
              {(requestFilter === 'all' || requestFilter === 'budget') && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Club Leader &rarr; Admin Budget Allocation Requests</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {budgetRequests.map((bgt) => (
                      <div
                        key={bgt.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                {bgt.clubName}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900">{bgt.title}</h4>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Category: <strong>{bgt.category}</strong> • Submitted by {bgt.submittedBy} ({bgt.submitterEmail}) on {new Date(bgt.submittedAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-slate-900">${bgt.amount}</span>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                bgt.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : bgt.status === 'Rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {bgt.status}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-lg text-xs text-slate-700 border border-slate-200/80">
                          <strong>Justification:</strong> {bgt.justification}
                        </div>

                        {bgt.adminDecisionNotes && (
                          <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                            <strong>Recorded Decision ({bgt.reviewedBy}):</strong> {bgt.adminDecisionNotes}
                          </div>
                        )}

                        {/* Admin Action Buttons */}
                        <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder="Add administrative review notes (optional)..."
                            value={decisionNotesInput[bgt.id] || ''}
                            onChange={(e) =>
                              setDecisionNotesInput({ ...decisionNotesInput, [bgt.id]: e.target.value })
                            }
                            className="flex-1 p-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />

                          <div className="flex items-center gap-2 self-end">
                            <button
                              onClick={() => handleBudgetDecision(bgt.id, 'Under Review')}
                              className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold transition-colors"
                            >
                              Under Review
                            </button>
                            <button
                              onClick={() => handleBudgetDecision(bgt.id, 'Rejected')}
                              className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleBudgetDecision(bgt.id, 'Approved')}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve Allocation</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Join Applications Section */}
              {(requestFilter === 'all' || requestFilter === 'joins') && (
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Campus-Wide Student Join Requests</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {joinRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {req.clubName}
                            </span>
                            <h5 className="text-sm font-bold text-slate-900 mt-1">{req.studentName}</h5>
                            <div className="text-xs text-slate-500">{req.studentEmail} • {req.major}</div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              req.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          "{req.interestReason}"
                        </p>

                        {req.status === 'Pending' && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleJoinDecision(req.id, 'Rejected', req.studentName)}
                              className="px-2.5 py-1 rounded-lg border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleJoinDecision(req.id, 'Approved', req.studentName)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve as Admin</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Member Rosters & Email List Puller */}
        {activeTab === 'rosters' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Member Data &amp; Institutional Email Puller</h3>
                <p className="text-xs text-slate-500">
                  Pull verified member rosters, student emails, and academic majors for administrative reporting and announcements.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyEmails}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copy Emails for Broadcast</span>
                </button>

                <button
                  onClick={handleDownloadCsv}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Full CSV Roster</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>Club Roster:</span>
                </label>
                <select
                  value={selectedClubRoster}
                  onChange={(e) => setSelectedClubRoster(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">All 34 Clubs ({allMembers.length} Members Total)</option>
                  {CLUBS_DATA.map((c) => (
                    <option key={c.clubId} value={c.clubId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search by name, email, or major..."
                  value={searchMemberQuery}
                  onChange={(e) => setSearchMemberQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">CUNY Email</th>
                    <th className="p-3">Club Organization</th>
                    <th className="p-3">Academic Program / Major</th>
                    <th className="p-3">Role Designation</th>
                    <th className="p-3">Date Joined</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {displayedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        No members matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedMembers.map((m) => (
                      <tr key={m.memberId} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{m.name}</td>
                        <td className="p-3 text-blue-600">
                          <a href={`mailto:${m.email}`} className="hover:underline">
                            {m.email}
                          </a>
                        </td>
                        <td className="p-3 text-indigo-700">{m.clubName}</td>
                        <td className="p-3 text-slate-600">{m.major}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.role.includes('President') || m.role.includes('Chair')
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {m.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{m.joinedDate}</td>
                        <td className="p-3">
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Institutional & Analytical Reports */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Institutional &amp; CUNY Central Analytical Reports</h3>
                <p className="text-xs text-slate-500">
                  Automated institutional metrics and documentation generated for the CUNY Central Board and Student Life accreditation.
                </p>
              </div>

              <button
                onClick={handleDownloadCsv}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CUNY Central Data Pack (.csv)</span>
              </button>
            </div>

            {/* Compliance Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Club Governance Quota
                </span>
                <div className="text-2xl font-black text-slate-900">34 / 34</div>
                <p className="text-[11px] text-slate-600">
                  All 34 student organizations maintain verified officer contacts and active advisor charters.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  CUNY Central In-App Workflows
                </span>
                <div className="text-2xl font-black text-emerald-600">Active &amp; Centralized</div>
                <p className="text-[11px] text-slate-600">
                  Paper forms and emails successfully migrated to role-based digital approvals.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Student Verification Tier
                </span>
                <div className="text-2xl font-black text-blue-600">Tier 1 Compliance</div>
                <p className="text-[11px] text-slate-600">
                  Student membership rosters tied directly to institutional `@spsmail.cuny.edu` identities.
                </p>
              </div>
            </div>

            {/* Club Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Club Membership Directory Summary</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Organization Code</th>
                      <th className="p-3">Club Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Verified Leaders</th>
                      <th className="p-3">Roster Count</th>
                      <th className="p-3">Official Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {CLUBS_DATA.map((c) => {
                      const count = allMembers.filter((m) => m.clubId === c.clubId).length;
                      return (
                        <tr key={c.clubId} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-[11px] font-bold text-slate-600">{c.shortCode}</td>
                          <td className="p-3 font-bold text-slate-900">{c.name}</td>
                          <td className="p-3 text-slate-500">{c.category}</td>
                          <td className="p-3 font-semibold text-indigo-700">2 Co-Chairs</td>
                          <td className="p-3 font-bold text-emerald-700">{count > 0 ? count : 4} Members</td>
                          <td className="p-3 text-blue-600 font-mono text-[11px]">{c.contactEmail}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
