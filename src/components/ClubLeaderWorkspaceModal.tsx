import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  X,
  Plus,
  DollarSign,
  Handshake,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  Mail,
  Award,
  Sparkles,
  ExternalLink,
  Database,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import {
  ecosystemStore,
  EcosystemUser,
  ClubMemberRecord,
  JoinClubRequest,
  BudgetRequest,
  CollaborationRequest
} from '../data/ecosystemStore';
import { CLUBS_DATA } from '../data/clubDiscoveryData';

interface ClubLeaderWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: EcosystemUser;
  onAddEventClick?: () => void;
}

export function ClubLeaderWorkspaceModal({
  isOpen,
  onClose,
  currentUser,
  onAddEventClick,
}: ClubLeaderWorkspaceModalProps) {
  const isLeader = currentUser.roleLayer === 'LEADER' || currentUser.roleLayer === 'ADMIN';
  const defaultClubId = currentUser.associatedClubId || 'club-ai';

  const [activeClubId, setActiveClubId] = useState<string>(defaultClubId);
  const [activeTab, setActiveTab] = useState<'roster' | 'join-requests' | 'budget' | 'collaborations'>('roster');

  // Local state subscribed to ecosystemStore
  const [members, setMembers] = useState<ClubMemberRecord[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinClubRequest[]>([]);
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [collabRequests, setCollabRequests] = useState<CollaborationRequest[]>([]);

  // Form states for new requests
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetTitle, setBudgetTitle] = useState('');
  const [budgetAmount, setBudgetAmount] = useState(350);
  const [budgetCategory, setBudgetCategory] = useState<BudgetRequest['category']>('Software & Compute Licenses');
  const [budgetJustification, setBudgetJustification] = useState('');
  const [budgetDate, setBudgetDate] = useState('');

  const [showCollabForm, setShowCollabForm] = useState(false);
  const [targetClubId, setTargetClubId] = useState('club-book');
  const [collabTitle, setCollabTitle] = useState('');
  const [collabDate, setCollabDate] = useState('');
  const [collabFormat, setCollabFormat] = useState<'Virtual (Zoom)' | 'In-Person (Manhattan Campus)' | 'Hybrid'>('Virtual (Zoom)');
  const [collabPitch, setCollabPitch] = useState('');
  const [collabAttendees, setCollabAttendees] = useState(35);

  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const refreshData = () => {
    setMembers(ecosystemStore.getMembers(activeClubId));
    setJoinRequests(ecosystemStore.getJoinRequests(activeClubId));
    setBudgetRequests(ecosystemStore.getBudgetRequests(activeClubId));
    setCollabRequests(ecosystemStore.getCollaborationRequests(activeClubId));
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = ecosystemStore.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [activeClubId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentClub = CLUBS_DATA.find((c) => c.clubId === activeClubId) || CLUBS_DATA[0];

  const handleApproveJoin = (id: string, studentName: string) => {
    ecosystemStore.reviewJoinRequest(id, 'Approved', currentUser.name);
    setActionSuccessNotice(`Approved ${studentName} for official club membership.`);
    setTimeout(() => setActionSuccessNotice(null), 3000);
  };

  const handleRejectJoin = (id: string, studentName: string) => {
    ecosystemStore.reviewJoinRequest(id, 'Rejected', currentUser.name);
    setActionSuccessNotice(`Declined join application for ${studentName}.`);
    setTimeout(() => setActionSuccessNotice(null), 3000);
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetTitle.trim() || !budgetJustification.trim()) return;

    ecosystemStore.submitBudgetRequest({
      clubId: currentClub.clubId,
      clubName: currentClub.name,
      submittedBy: currentUser.name,
      submitterEmail: currentUser.email,
      title: budgetTitle.trim(),
      amount: Number(budgetAmount),
      category: budgetCategory,
      justification: budgetJustification.trim(),
      intendedEventDate: budgetDate || undefined,
    });

    setShowBudgetForm(false);
    setBudgetTitle('');
    setBudgetJustification('');
    setActionSuccessNotice('Budget increase request submitted to Student Association Admins for review.');
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const handleCollabSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabTitle.trim() || !collabPitch.trim()) return;

    const targetClubObj = CLUBS_DATA.find((c) => c.clubId === targetClubId);
    if (!targetClubObj) return;

    ecosystemStore.submitCollaborationRequest({
      initiatingClubId: currentClub.clubId,
      initiatingClubName: currentClub.name,
      targetClubId: targetClubObj.clubId,
      targetClubName: targetClubObj.name,
      submittedBy: currentUser.name,
      submitterEmail: currentUser.email,
      eventTitle: collabTitle.trim(),
      proposedDate: collabDate || new Date().toISOString().split('T')[0],
      proposedFormat: collabFormat,
      pitchDescription: collabPitch.trim(),
      expectedAttendees: Number(collabAttendees),
    });

    setShowCollabForm(false);
    setCollabTitle('');
    setCollabPitch('');
    setActionSuccessNotice(`Cross-club collaboration invitation dispatched to ${targetClubObj.name}.`);
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const pendingJoinCount = joinRequests.filter((r) => r.status === 'Pending').length;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex-shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close workspace"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8 sm:pr-0">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Layer 2: {isLeader ? 'Club Executive Workspace' : 'Authenticated Member Portal'}
                </span>
                {ecosystemStore.isCloudSyncActive() ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <Database className="w-3 h-3 text-emerald-400 animate-pulse" /> Supabase Realtime
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                    <Database className="w-3 h-3 text-amber-400" /> Offline / Local Storage
                  </span>
                )}
                <span className="text-xs text-slate-400">User: {currentUser.name} ({currentUser.title})</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>{currentClub.name}</span>
              </h2>
            </div>

            {/* Top Navigation & Club Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Return to Student Discovery View"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-indigo-300" />
                <span>Back to Student View</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  ecosystemStore.logout();
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Sign out of leader session"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>

              <div className="flex items-center gap-1.5 pl-1">
                <label className="text-xs text-slate-300 font-semibold hidden md:inline">Club:</label>
                <select
                  value={activeClubId}
                  onChange={(e) => setActiveClubId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white border border-white/20 text-xs font-medium focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                >
                  {CLUBS_DATA.map((c) => (
                    <option key={c.clubId} value={c.clubId} className="text-slate-900 bg-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Notice */}
        {actionSuccessNotice && (
          <div className="p-3 bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 px-6 animate-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0 text-xs font-semibold px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('roster')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Member Directory ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('join-requests')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 relative ${
              activeTab === 'join-requests'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Review Join Requests</span>
            {pendingJoinCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingJoinCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'budget'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Budget Requests ({budgetRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('collaborations')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'collaborations'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Handshake className="w-4 h-4 text-purple-600" />
            <span>Cross-Club Collabs ({collabRequests.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Member Directory */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Official Club Member Roster</h4>
                  <p className="text-xs text-slate-500">Verified CUNY SPS students and faculty advisor for {currentClub.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {onAddEventClick && isLeader && (
                    <button
                      onClick={() => {
                        onClose();
                        onAddEventClick();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Club Event</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {members.map((member) => (
                  <div
                    key={member.memberId}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-xs">
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{member.name}</span>
                          {member.role.includes('President') || member.role.includes('Chair') ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Executive
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">{member.role}</div>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <a
                        href={`mailto:${member.email}`}
                        className="text-indigo-600 hover:underline flex items-center gap-1 justify-end font-medium"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Review Join Requests */}
          {activeTab === 'join-requests' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200">
                <h4 className="text-base font-bold text-slate-900">Student &rarr; Club Membership Applications</h4>
                <p className="text-xs text-slate-500">
                  Review and accept/reject new member requests submitted by prospective CUNY SPS students.
                </p>
              </div>

              {joinRequests.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
                  <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold">No join requests pending for {currentClub.name}.</p>
                  <p className="text-[11px] text-slate-400 mt-1">When students click "Request to Join Club" on the discovery page, they will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{req.studentName}</div>
                          <div className="text-xs text-indigo-600 font-medium">{req.studentEmail} • {req.major}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              req.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(req.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 italic border border-slate-100">
                        "{req.interestReason}"
                      </div>

                      {req.reviewedBy && (
                        <div className="text-[11px] text-slate-500">
                          Reviewed by {req.reviewedBy} on {new Date(req.reviewedAt!).toLocaleDateString()}
                        </div>
                      )}

                      {/* Action buttons for pending requests */}
                      {req.status === 'Pending' && isLeader && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRejectJoin(req.id, req.studentName)}
                            className="px-3 py-1.5 rounded-lg border border-red-300 hover:bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                          <button
                            onClick={() => handleApproveJoin(req.id, req.studentName)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve &amp; Add to Roster</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Budget Requests */}
          {activeTab === 'budget' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Club Leader &rarr; Student Association Budget Requests</h4>
                  <p className="text-xs text-slate-500">Submit formal budget allocation requests directly to Parsh and Anthony.</p>
                </div>
                {isLeader && (
                  <button
                    onClick={() => setShowBudgetForm(!showBudgetForm)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showBudgetForm ? 'Cancel Request' : 'New Budget Request'}</span>
                  </button>
                )}
              </div>

              {/* In-app Budget Form */}
              {showBudgetForm && (
                <form onSubmit={handleBudgetSubmit} className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-900">Submit Formal Allocation Request</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Request Title:</label>
                      <input
                        type="text"
                        placeholder="e.g. AI Workshop Compute Credits"
                        value={budgetTitle}
                        onChange={(e) => setBudgetTitle(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount Requested ($ USD):</label>
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(Number(e.target.value))}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Expense Category:</label>
                      <select
                        value={budgetCategory}
                        onChange={(e) => setBudgetCategory(e.target.value as any)}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                      >
                        <option value="Software & Compute Licenses">Software & Compute Licenses</option>
                        <option value="Event Supplies & Refreshments">Event Supplies & Refreshments</option>
                        <option value="Guest Speaker Honorarium">Guest Speaker Honorarium</option>
                        <option value="Marketing & Merchandise">Marketing & Merchandise</option>
                        <option value="Conference & Competition Travel">Conference & Competition Travel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Event / Implementation Date:</label>
                      <input
                        type="date"
                        value={budgetDate}
                        onChange={(e) => setBudgetDate(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Educational Justification &amp; Cost Breakdown:</label>
                    <textarea
                      rows={2}
                      placeholder="Explain how this allocation directly benefits CUNY SPS students and aligns with student life policies..."
                      value={budgetJustification}
                      onChange={(e) => setBudgetJustification(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Request to Student Association Admins</span>
                  </button>
                </form>
              )}

              {/* Existing Budget Requests List */}
              <div className="space-y-3">
                {budgetRequests.map((bgt) => (
                  <div
                    key={bgt.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{bgt.title}</div>
                        <div className="text-xs text-slate-500">Category: {bgt.category} • Submitted by {bgt.submittedBy}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">${bgt.amount}</span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
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

                    <p className="text-xs text-slate-600">{bgt.justification}</p>

                    {bgt.adminDecisionNotes && (
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                        <strong>Admin Feedback ({bgt.reviewedBy}):</strong> {bgt.adminDecisionNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Cross-Club Collaborations */}
          {activeTab === 'collaborations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Cross-Club Event Collaborations</h4>
                  <p className="text-xs text-slate-500">Invite other CUNY SPS clubs to co-host workshops, panels, and community activities.</p>
                </div>
                {isLeader && (
                  <button
                    onClick={() => setShowCollabForm(!showCollabForm)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showCollabForm ? 'Cancel Invitation' : 'Invite Another Club'}</span>
                  </button>
                )}
              </div>

              {/* Collab Invitation Form */}
              {showCollabForm && (
                <form onSubmit={handleCollabSubmit} className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900">Co-Host Collaboration Proposal</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Club to Invite:</label>
                      <select
                        value={targetClubId}
                        onChange={(e) => setTargetClubId(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                      >
                        {CLUBS_DATA.filter((c) => c.clubId !== currentClub.clubId).map((c) => (
                          <option key={c.clubId} value={c.clubId}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Proposed Event Title:</label>
                      <input
                        type="text"
                        placeholder="e.g. Joint AI & Literature Speculative Fiction Panel"
                        value={collabTitle}
                        onChange={(e) => setCollabTitle(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Proposed Date:</label>
                      <input
                        type="date"
                        value={collabDate}
                        onChange={(e) => setCollabDate(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Format:</label>
                      <select
                        value={collabFormat}
                        onChange={(e) => setCollabFormat(e.target.value as any)}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                      >
                        <option value="Virtual (Zoom)">Virtual (Zoom)</option>
                        <option value="In-Person (Manhattan Campus)">In-Person (Manhattan Campus)</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Expected Attendees:</label>
                      <input
                        type="number"
                        min={5}
                        max={500}
                        value={collabAttendees}
                        onChange={(e) => setCollabAttendees(Number(e.target.value))}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Co-Hosting Pitch &amp; Role Sharing:</label>
                    <textarea
                      rows={2}
                      placeholder="Outline why this joint session is exciting for both student communities and how roles will be divided..."
                      value={collabPitch}
                      onChange={(e) => setCollabPitch(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Collaboration Invitation</span>
                  </button>
                </form>
              )}

              {/* Collab List */}
              <div className="space-y-3">
                {collabRequests.map((collab) => (
                  <div
                    key={collab.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{collab.eventTitle}</div>
                        <div className="text-xs text-purple-700 font-medium">
                          {collab.initiatingClubName} &harr; {collab.targetClubName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            collab.status === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : collab.status === 'Declined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {collab.status}
                        </span>
                        <span className="text-[10px] text-slate-400">Date: {collab.proposedDate}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600">{collab.pitchDescription}</p>

                    {collab.responseNotes && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                        <strong>Response Notes ({collab.respondedBy}):</strong> {collab.responseNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>Active Role: <strong className="text-slate-800">{currentUser.title}</strong></span>
            <button
              type="button"
              onClick={() => {
                ecosystemStore.logout();
                onClose();
              }}
              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Student Discovery View</span>
          </button>
        </div>
      </div>
    </div>
  );
}
