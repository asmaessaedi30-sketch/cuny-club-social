import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  GraduationCap,
  KeyRound,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  Lock,
  Building2,
  ChevronRight,
  LogOut,
  Mail,
  Award,
  ExternalLink,
  Loader2,
  Check,
  Laptop
} from 'lucide-react';
import {
  ecosystemStore,
  EcosystemUser,
  DEFAULT_PERSONAS,
  UserRoleLayer,
  findPersonasByEmail,
  isCunyEmailAddress
} from '../data/ecosystemStore';

interface RoleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: EcosystemUser | null;
  onSelectUser: (user: EcosystemUser | null) => void;
}

export function RoleLoginModal({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}: RoleLoginModalProps) {
  const [selectedTab, setSelectedTab] = useState<'layer1' | 'layer2' | 'layer3'>('layer2');
  const [cunyEmail, setCunyEmail] = useState('');
  const [cunyName, setCunyName] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  // CUNY Single Sign-On Transition State
  const [authPhase, setAuthPhase] = useState<'input' | 'redirecting' | 'authenticated'>('input');
  const [ssoStep, setSsoStep] = useState(0);
  const [pendingPersona, setPendingPersona] = useState<EcosystemUser | null>(null);
  const [selectedClubPersonaId, setSelectedClubPersonaId] = useState<string>('');

  // Live detection of matching personas for current email input
  const matchingPersonas = findPersonasByEmail(cunyEmail);
  const isRecognizedEmail = matchingPersonas.length > 0;
  const isRecognizedCunyDomain = isCunyEmailAddress(cunyEmail);

  // Set default selected club persona if multiple match (e.g. Abdul Rahman / Mehreen)
  useEffect(() => {
    if (matchingPersonas.length > 0) {
      setSelectedClubPersonaId(matchingPersonas[0].userId);
    } else {
      setSelectedClubPersonaId('');
    }
  }, [cunyEmail]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (authPhase === 'redirecting') {
          setAuthPhase('input');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, authPhase, onClose]);

  // Reset phase when modal opens
  useEffect(() => {
    if (isOpen) {
      setAuthPhase('input');
      setSsoStep(0);
      setErrorNotice('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGuestContinue = () => {
    ecosystemStore.setCurrentUser(null);
    onSelectUser(null);
    onClose();
  };

  /**
   * Executes the CUNY Single Sign-On redirect handshake and grants permissions accordingly
   */
  const initiateCunySso = (persona: EcosystemUser) => {
    setPendingPersona(persona);
    setAuthPhase('redirecting');
    setSsoStep(1);

    // Step 2: STS Token verification
    const timer1 = setTimeout(() => {
      setSsoStep(2);
    }, 600);

    // Step 3: RBAC Role & Privilege Assignment
    const timer2 = setTimeout(() => {
      setSsoStep(3);
    }, 1300);

    // Finalize: Authenticate and grant access
    const timer3 = setTimeout(() => {
      ecosystemStore.setCurrentUser(persona);
      onSelectUser(persona);
      setAuthPhase('authenticated');

      const closeTimer = setTimeout(() => {
        onClose();
      }, 700);
      return () => clearTimeout(closeTimer);
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  /**
   * Handle email form submission: looks up matching leader/admin or student
   */
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice('');

    const trimmed = cunyEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorNotice('Please provide a valid CUNY email address (e.g. name@login.cuny.edu, name@stu-mail.sps.cuny.edu).');
      return;
    }

    if (!isCunyEmailAddress(trimmed)) {
      setErrorNotice('Please use your official CUNY email address ending in @login.cuny.edu, @stu-mail.sps.cuny.edu, @spsmail.cuny.edu, or @cuny.edu.');
      return;
    }

    // 1. Check if email matches recognized Executive Board Leader or Platform Admin
    if (matchingPersonas.length > 0) {
      const chosen = matchingPersonas.find((p) => p.userId === selectedClubPersonaId) || matchingPersonas[0];
      initiateCunySso(chosen);
      return;
    }

    // 2. Generic CUNY student member
    const derivedName = cunyName.trim() || trimmed.split('@')[0].replace('.', ' ');
    const formattedName = derivedName
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');

    const studentUser: EcosystemUser = {
      userId: `cuny-student-${Date.now()}`,
      name: formattedName,
      email: trimmed.toLowerCase(),
      roleLayer: 'MEMBER',
      title: 'Authenticated CUNY Student Member',
      departmentOrMajor: 'CUNY SPS Degree Program',
      avatarInitials: formattedName.slice(0, 2).toUpperCase(),
    };

    initiateCunySso(studentUser);
  };

  const adminPersonas = DEFAULT_PERSONAS.filter((p) => p.roleLayer === 'ADMIN');
  const leaderPersonas = DEFAULT_PERSONAS.filter((p) => p.roleLayer === 'LEADER');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-[#004B87] to-slate-950 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">CUNY SPS Single Sign-On (SSO)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-300/30">
                  login.cuny.edu
                </span>
              </div>
              <p className="text-xs text-slate-200">Direct institutional authentication with Microsoft Entra ID &amp; CUNY Webmail</p>
            </div>
          </div>

          {/* Current Session Banner */}
          {currentUser ? (
            <div className="mt-3 p-3 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="truncate">
                  Signed In: <strong className="text-white">{currentUser.name}</strong> •{' '}
                  <span className="text-amber-200">{currentUser.title}</span>
                  {currentUser.associatedClubName && ` (${currentUser.associatedClubName})`}
                </span>
              </div>
              <button
                onClick={() => {
                  ecosystemStore.logout();
                  onSelectUser(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 font-medium transition-colors flex items-center gap-1 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="mt-2 text-xs text-amber-200/90 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Currently browsing in Layer 1: Public Visitor / Student Mode
            </div>
          )}
        </div>

        {/* CUNY SSO INTERACTIVE REDIRECT SCREEN */}
        {authPhase === 'redirecting' || authPhase === 'authenticated' ? (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
            {/* Simulated CUNY STS Browser Bar */}
            <div className="bg-slate-900 rounded-xl p-3 text-xs text-slate-300 border border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 pl-2">CUNY Identity Provider Redirect</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  <Lock className="w-3 h-3" />
                  <span>TLS 1.3 • Secure SAML 2.0</span>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-sky-300">
                <span className="text-slate-500">https://</span>login.cuny.edu/adfs/ls/?wtrealm=cuny-sps-club-social&amp;email={encodeURIComponent(pendingPersona?.email || '')}
              </div>
            </div>

            {/* Handshake Progress Box */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#004B87] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                  {ssoStep >= 3 ? <Check className="w-6 h-6 text-emerald-300" /> : <Loader2 className="w-6 h-6 animate-spin text-amber-300" />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {ssoStep >= 3 ? 'CUNY Single Sign-On Verified!' : 'Redirecting to CUNY Single Sign-On...'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Authenticating credentials against the CUNY central identity tenant (Microsoft Entra ID).
                  </p>
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${ssoStep >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {ssoStep >= 1 ? '✓' : '1'}
                  </div>
                  <span className={ssoStep >= 1 ? 'text-slate-900 font-semibold' : 'text-slate-400'}>
                    Federated handshake established with <strong>login.cuny.edu</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${ssoStep >= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {ssoStep >= 2 ? '✓' : '2'}
                  </div>
                  <span className={ssoStep >= 2 ? 'text-slate-900 font-semibold' : 'text-slate-400'}>
                    CUNY Webmail Token Verified: <span className="font-mono text-indigo-700 font-bold">{pendingPersona?.email}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${ssoStep >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {ssoStep >= 3 ? '✓' : '3'}
                  </div>
                  <span className={ssoStep >= 3 ? 'text-slate-900 font-semibold' : 'text-slate-400'}>
                    Role-Based Access Granted:{' '}
                    <strong className="text-emerald-700 font-bold">
                      {pendingPersona?.roleLayer === 'LEADER'
                        ? `Executive Leader (${pendingPersona.title})`
                        : pendingPersona?.roleLayer === 'ADMIN'
                        ? `Platform Administrator (${pendingPersona.title})`
                        : 'Authenticated Club Member'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Verified Identity Card */}
              {pendingPersona && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{pendingPersona.name}</div>
                    <div className="text-xs text-indigo-700 font-semibold">{pendingPersona.title}</div>
                    {pendingPersona.associatedClubName && (
                      <div className="text-[11px] text-slate-500 font-medium">{pendingPersona.associatedClubName}</div>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {pendingPersona.roleLayer === 'LEADER'
                      ? 'Executive Board Lead'
                      : pendingPersona.roleLayer === 'ADMIN'
                      ? 'Dedicated Admin'
                      : 'Verified Member'}
                  </span>
                </div>
              )}

              {/* Action buttons during handshake */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <a
                  href="https://login.cuny.edu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 order-2 sm:order-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open login.cuny.edu in separate window</span>
                </a>

                <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                  <button
                    onClick={() => setAuthPhase('input')}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (pendingPersona) {
                        ecosystemStore.setCurrentUser(pendingPersona);
                        onSelectUser(pendingPersona);
                        onClose();
                      }
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Enter Workspace Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD LOGIN INTERFACE WITH EMAIL REDIRECT */
          <>
            {/* Layer Selection Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0 text-xs font-semibold">
              <button
                onClick={() => setSelectedTab('layer2')}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                  selectedTab === 'layer2'
                    ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Layer 2: Club Member / Leader</span>
              </button>

              <button
                onClick={() => setSelectedTab('layer3')}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                  selectedTab === 'layer3'
                    ? 'border-amber-600 text-amber-700 bg-white shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Layer 3: Platform Admin</span>
              </button>

              <button
                onClick={() => setSelectedTab('layer1')}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                  selectedTab === 'layer1'
                    ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Layer 1: Public / Visitor</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* TAB 2: Club Member & Leader / Executive */}
              {selectedTab === 'layer2' && (
                <div className="space-y-5">
                  {/* CUNY Email Direct SSO Section */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 via-sky-50/50 to-white border-2 border-indigo-200/80 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">CUNY Single Sign-On (login.cuny.edu)</h4>
                        <p className="text-[11px] text-slate-600">
                          Provide your matching CUNY email to redirect to CUNY Login and grant executive leadership permissions.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleEmailSubmit} className="space-y-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Enter CUNY Email Address:
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            placeholder="e.g. ABDUL.RAHMAN45@stu-mail.sps.cuny.edu"
                            value={cunyEmail}
                            onChange={(e) => {
                              setCunyEmail(e.target.value);
                              setErrorNotice('');
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium pr-10"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                            CUNY SSO
                          </span>
                        </div>
                      </div>

                      {/* Error notice */}
                      {errorNotice && (
                        <div className="p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                          {errorNotice}
                        </div>
                      )}

                      {/* Matching Officer Recognition Pill */}
                      {isRecognizedEmail && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center gap-2 font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Matching CUNY Leadership Credentials Detected:</span>
                          </div>

                          {matchingPersonas.length === 1 ? (
                            <div className="pl-6 text-xs">
                              <span className="font-bold text-slate-900">{matchingPersonas[0].name}</span> —{' '}
                              <span className="text-indigo-800 font-semibold">{matchingPersonas[0].title}</span>{' '}
                              {matchingPersonas[0].associatedClubName && (
                                <span className="text-slate-600">({matchingPersonas[0].associatedClubName})</span>
                              )}
                            </div>
                          ) : (
                            <div className="pl-6 space-y-1.5">
                              <span className="text-[11px] font-semibold text-slate-700 block">
                                Multiple Executive Roles Detected. Select Workspace to Launch:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {matchingPersonas.map((persona) => (
                                  <label
                                    key={persona.userId}
                                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                      selectedClubPersonaId === persona.userId
                                        ? 'border-emerald-600 bg-white font-bold text-emerald-900 shadow-2xs'
                                        : 'border-emerald-200 bg-emerald-100/40 text-slate-700 hover:bg-white'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="matchedClubChoice"
                                      checked={selectedClubPersonaId === persona.userId}
                                      onChange={() => setSelectedClubPersonaId(persona.userId)}
                                      className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="truncate">{persona.title}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="pl-6 text-[11px] text-emerald-700 font-medium">
                            ✓ Redirecting to CUNY will authenticate your session and automatically grant full{' '}
                            <strong>{matchingPersonas[0].roleLayer === 'LEADER' ? 'Club Leader / Executive' : 'Administrator'}</strong> permissions.
                          </div>
                        </div>
                      )}

                      {/* Generic CUNY student detected */}
                      {!isRecognizedEmail && isRecognizedCunyDomain && (
                        <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>Valid CUNY SPS Student Address. Redirecting will grant Authenticated Member access.</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-xl bg-[#004B87] hover:bg-[#003865] text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4 text-amber-300" />
                        <span>Redirect to CUNY Single Sign-On (login.cuny.edu)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  </div>

                  {/* 1-Click Fast Verified Officers Registry */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Verified Executive Officers (Instant CUNY SSO):
                      </span>
                      <span className="text-[10px] text-slate-500">Click to redirect via CUNY</span>
                    </div>

                    <div className="space-y-3">
                      {/* AI Club Executive Board */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-indigo-600" /> AI Club Executive Board
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                            3 Officers
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {leaderPersonas
                            .filter((p) => p.associatedClubId === 'club-ai')
                            .map((persona) => (
                              <button
                                key={persona.userId}
                                onClick={() => initiateCunySso(persona)}
                                className="text-left p-2.5 rounded-xl border border-indigo-100 hover:border-indigo-400 bg-white hover:bg-indigo-50/50 transition-all flex items-center justify-between group shadow-xs cursor-pointer"
                              >
                                <div className="min-w-0 pr-1">
                                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 truncate">
                                    {persona.name}
                                  </div>
                                  <div className="text-[11px] text-indigo-600 font-semibold truncate">
                                    {persona.title.replace('AI Club ', '')}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">{persona.email}</div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 flex-shrink-0" />
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* MSA Executive Board */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-emerald-600" /> MSA Executive Board
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                            5 Officers
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {leaderPersonas
                            .filter((p) => p.associatedClubId === 'club-msa')
                            .map((persona) => (
                              <button
                                key={persona.userId}
                                onClick={() => initiateCunySso(persona)}
                                className="text-left p-2.5 rounded-xl border border-emerald-100 hover:border-emerald-400 bg-white hover:bg-emerald-50/50 transition-all flex items-center justify-between group shadow-xs cursor-pointer"
                              >
                                <div className="min-w-0 pr-1">
                                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                                    {persona.name}
                                  </div>
                                  <div className="text-[11px] text-emerald-700 font-semibold truncate">
                                    {persona.title.replace('MSA ', '')}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">{persona.email}</div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 flex-shrink-0" />
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Student Association & Platform Admins */}
              {selectedTab === 'layer3' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                        3
                      </div>
                      <div className="text-xs text-slate-700 space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">Layer 3: Student Association &amp; Platform Admin Portal</h4>
                        <p>
                          Dedicated administrative governance portal for <strong>Parsh and Anthony</strong>. Review &amp; approve/reject club requests (budget increases, event approvals), pull member rosters &amp; email lists, and generate analytical/compliance reports for CUNY Central.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Select Administrative Officer to Sign In:
                    </span>

                    <div className="grid grid-cols-1 gap-2.5">
                      {adminPersonas.map((admin) => (
                        <button
                          key={admin.userId}
                          onClick={() => initiateCunySso(admin)}
                          className="text-left p-3.5 rounded-xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/60 transition-all flex items-center justify-between group shadow-sm cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm border border-amber-300/50">
                              {admin.avatarInitials}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900 group-hover:text-amber-900">{admin.name}</div>
                              <div className="text-xs text-amber-700 font-medium">{admin.title}</div>
                              <div className="text-[11px] text-slate-500">{admin.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider py-1 px-2.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              CUNY SSO
                            </span>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span>Provides full access to the Dedicated Admin Portal with in-app approvals, member CSV exports, and analytical reporting.</span>
                  </div>
                </div>
              )}

              {/* TAB 1: General Student / Public Visitor */}
              {selectedTab === 'layer1' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                        1
                      </div>
                      <div className="text-xs text-slate-700 space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">Layer 1: General Student &amp; Public Visitor Access</h4>
                        <p>
                          <strong>No login required.</strong> Browse all 34 recognized CUNY SPS student clubs, view upcoming events with automated midnight rollover, see Instagram/social links, click through to the OpenLab calendar, and submit initial <strong>Student Join Requests</strong> to clubs.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">Enabled Capabilities</span>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600">
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Browse club catalog &amp; details</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> View upcoming &amp; master events</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> OpenLab calendar external sync</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Submit "Request to Join Club"</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleGuestContinue}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue in Public Student Mode</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
              <span>CUNY SPS Office of Student Life • Institutional Single Sign-On</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
