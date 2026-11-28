import React, { useState } from 'react';
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
  Award
} from 'lucide-react';
import {
  ecosystemStore,
  EcosystemUser,
  DEFAULT_PERSONAS,
  UserRoleLayer
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
  const [selectedTab, setSelectedTab] = useState<'layer1' | 'layer2' | 'layer3'>('layer1');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  if (!isOpen) return null;

  const handleGuestContinue = () => {
    ecosystemStore.setCurrentUser(null);
    onSelectUser(null);
    onClose();
  };

  const handleSelectPersona = (persona: EcosystemUser) => {
    ecosystemStore.setCurrentUser(persona);
    onSelectUser(persona);
    onClose();
  };

  const handleCustomCunyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setErrorNotice('Please provide a valid CUNY email address.');
      return;
    }
    const derivedName = customName.trim() || customEmail.split('@')[0].replace('.', ' ');
    const user: EcosystemUser = {
      userId: `user-${Date.now()}`,
      name: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
      email: customEmail.trim().toLowerCase(),
      roleLayer: 'MEMBER',
      title: 'Authenticated CUNY Student / Member',
      departmentOrMajor: 'CUNY SPS Degree Program',
      avatarInitials: derivedName.slice(0, 2).toUpperCase(),
    };
    ecosystemStore.setCurrentUser(user);
    onSelectUser(user);
    onClose();
  };

  const adminPersonas = DEFAULT_PERSONAS.filter((p) => p.roleLayer === 'ADMIN');
  const leaderPersonas = DEFAULT_PERSONAS.filter((p) => p.roleLayer === 'LEADER');
  const memberPersonas = DEFAULT_PERSONAS.filter((p) => p.roleLayer === 'MEMBER');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">CUNY SPS Access &amp; Authentication</h2>
              <p className="text-xs text-slate-300">Choose your institutional role or explore as a public visitor</p>
            </div>
          </div>

          {/* Current Session Banner */}
          {currentUser ? (
            <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Currently Signed In: <strong className="text-white">{currentUser.name}</strong> ({currentUser.title})</span>
              </div>
              <button
                onClick={() => {
                  ecosystemStore.logout();
                  onSelectUser(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 font-medium transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="mt-3 text-xs text-amber-300/90 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Currently browsing in Layer 1: General Student / Public Visitor mode
            </div>
          )}
        </div>

        {/* Layer Selection Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0 text-xs font-semibold">
          <button
            onClick={() => setSelectedTab('layer1')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
              selectedTab === 'layer1'
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Layer 1: Public / Student</span>
          </button>

          <button
            onClick={() => setSelectedTab('layer2')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
              selectedTab === 'layer2'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Layer 2: Club Member / Lead</span>
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
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
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
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Continue in Public Student Mode</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Club Member & Leader / Executive */}
          {selectedTab === 'layer2' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    2
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">Layer 2: Authenticated Club Members &amp; Leaders</h4>
                    <p>
                      Sign in with your CUNY email (`@spsmail.cuny.edu`). <strong>Club Members</strong> can access club member directories, participate in discussions, and view club calendars. <strong>Club Leaders / Executives</strong> have elevated permissions to add events, review join requests, and submit budget or cross-club collaboration requests.
                    </p>
                  </div>
                </div>
              </div>

              {/* 1-Click Fast Demo Personas for Quick Review */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Quick-Select Club Personas:
                </span>

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
                            onClick={() => handleSelectPersona(persona)}
                            className="text-left p-2.5 rounded-xl border border-indigo-100 hover:border-indigo-400 bg-white hover:bg-indigo-50/50 transition-all flex items-center justify-between group shadow-xs"
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
                            onClick={() => handleSelectPersona(persona)}
                            className="text-left p-2.5 rounded-xl border border-emerald-100 hover:border-emerald-400 bg-white hover:bg-emerald-50/50 transition-all flex items-center justify-between group shadow-xs"
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

                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Authenticated Club Members
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {memberPersonas.map((persona) => (
                      <button
                        key={persona.userId}
                        onClick={() => handleSelectPersona(persona)}
                        className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{persona.name}</div>
                          <div className="text-[10px] text-slate-500">{persona.title} • {persona.departmentOrMajor}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom CUNY Email Login Form */}
              <form onSubmit={handleCustomCunyLogin} className="pt-2 border-t border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Or Sign In with CUNY Email:</span>
                {errorNotice && <div className="text-xs text-red-600 font-medium">{errorNotice}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Jordan Smith)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder="student@spsmail.cuny.edu"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Sign In with CUNY SPS Identity
                </button>
              </form>
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
                      Dedicated administrative governance portal for <strong>Parsh, Anthony, Vanessa</strong>, and Student Life Leadership. Review &amp; approve/reject club requests (budget increases, event approvals), pull member rosters &amp; email lists, and generate analytical/compliance reports for CUNY Central.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Select Administrative Officer:
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  {adminPersonas.map((admin) => (
                    <button
                      key={admin.userId}
                      onClick={() => handleSelectPersona(admin)}
                      className="text-left p-3.5 rounded-xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/60 transition-all flex items-center justify-between group shadow-sm"
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
                          Dedicated Admin
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
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span>CUNY SPS Office of Student Life • Institutional Portal</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
