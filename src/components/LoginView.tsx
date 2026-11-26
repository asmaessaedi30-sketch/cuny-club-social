import React, { useEffect, useState } from 'react';
import { ArrowRight, Building2, KeyRound, Lock, ShieldCheck, Users } from 'lucide-react';
import { formatRoleLabel, type PersonaListItem, useAuth } from '../context/AuthContext';
import {
  ClubLogoMark,
  HubLogoLockup,
  HubLogoMark,
  StudentLifeLogo,
} from './BrandMarks';
import { PublicCampusDirectory } from './PublicCampusDirectory';

export function LoginView() {
  const { loginAs } = useAuth();
  const [activeView, setActiveView] = useState<'login' | 'directory'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'public' || window.location.hash === '#public') {
        return 'directory';
      }
    }
    return 'login';
  });
  const [personas, setPersonas] = useState<PersonaListItem[]>([]);
  const [emailInput, setEmailInput] = useState('aisha.rahman@spsmail.cuny.edu');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/personas')
      .then((r) => r.json())
      .then((data: { personas: PersonaListItem[] }) => {
        setPersonas(data.personas ?? []);
      })
      .catch(() => {
        setError('Unable to load institutional identity directory.');
      });
  }, []);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginAs({ email: emailInput.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSignIn = async (userId: string) => {
    setError('');
    setSubmitting(true);
    try {
      await loginAs({ userId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <HubLogoLockup
            theme="light"
            size="md"
            showSubtitle
            subtitle="CUNY SPS · Office of Student Life"
          />
          <div className="h-8 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />
          <StudentLifeLogo className="h-9 w-auto hidden sm:block" />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
          <button
            type="button"
            onClick={() => setActiveView('login')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Demo Sign-In
          </button>
          <button
            type="button"
            onClick={() => setActiveView('directory')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'directory'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Public Events &amp; Join Clubs
          </button>
        </div>

        <div className="text-xs font-medium text-[#004B87] whitespace-nowrap shrink-0">
          Demonstration — institutional SSO not connected
        </div>
      </header>

      {activeView === 'directory' ? (
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
          <PublicCampusDirectory
            mode="public"
            onRequestLogin={() => setActiveView('login')}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="bg-[#0B0B0F] border border-slate-900 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                <HubLogoLockup
                  theme="dark"
                  size="md"
                  showSubtitle
                  subtitle="A CUNY SPS AI Club Engineering Pilot"
                />
                <HubLogoMark variant="orbit" surface="bare-light" size="sm" />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <StudentLifeLogo className="h-11 w-auto" />
                <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
                <div className="flex items-center gap-2.5">
                  <ClubLogoMark
                    clubId="club-ai"
                    clubShortCode="AI-CLUB"
                    clubName="Artificial Intelligence Club"
                    size="md"
                  />
                  <div>
                    <div className="text-[11px] font-semibold text-slate-900">
                      Artificial Intelligence Club
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Pilot Build Partner
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs font-semibold tracking-wide text-[#004B87]">
                CUNY School of Professional Studies
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                Centralized social media governance and publishing for student clubs
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Explore example workspaces for student officers, faculty advisors, and
                Student Life administrators. This demonstration uses synthetic identities and is not ready for
                real student records or official social publishing.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveView('directory')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 rounded-md whitespace-nowrap cursor-pointer transition-colors"
                >
                  <span>Browse Approved Club Events &amp; Request to Join</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleManualLogin}
              className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
            >
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-900">
                  Demo Workspace Access
                </h2>
                <p className="text-xs text-slate-500">
                  Explore with a listed demo <span className="font-mono">@sps.cuny.edu</span> or{' '}
                  <span className="font-mono">@spsmail.cuny.edu</span> address.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="cuny-email" className="block text-xs font-medium text-slate-700">
                  CUNY Institutional Email
                </label>
                <input
                  id="cuny-email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@spsmail.cuny.edu"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B87]/20 focus:border-[#004B87]"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-60 rounded-md transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{submitting ? 'Opening Demo...' : 'Enter Demo Workspace'}</span>
              </button>

              {personas.length > 0 && (() => {
                const adminPersona = personas.find((p) => p.user.systemRole === 'SL_SUPER_ADMIN')
                  ?? personas.find((p) => p.user.systemRole === 'SL_ADMIN');
                const leadPersona = personas.find((p) =>
                  p.memberships.some((m) => m.role === 'CLUB_LEAD' && m.status === 'Active')
                );
                return (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500">
                      Quick Demo Portal Launch
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {adminPersona && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void handleQuickSignIn(adminPersona.user.userId)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Student Life Admin Console</span>
                        </button>
                      )}
                      {leadPersona && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void handleQuickSignIn(leadPersona.user.userId)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#004B87] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>Club Officer Workspace</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Demo role restrictions — institutional security review outstanding</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Do not enter passwords or real social account credentials</span>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Demo Persona Directory
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a synthetic persona to explore permissions. This does not verify your identity.
                </p>
              </div>
              <span className="text-xs font-mono-tabular text-slate-500">
                {personas.length} demo personas
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
              {personas.map(({ user, memberships }) => {
                const primaryRole =
                  user.systemRole !== 'STANDARD_USER'
                    ? formatRoleLabel(user.systemRole)
                    : memberships[0]
                      ? formatRoleLabel(memberships[0].role)
                      : 'Candidate / Unassigned';
                const clubSummary =
                  user.systemRole === 'SL_SUPER_ADMIN'
                    ? 'All participating clubs'
                    : user.systemRole === 'SL_ADMIN'
                      ? `Scoped administrator: ${user.assignedAdminClubIds?.length ?? 0} assigned clubs`
                      : memberships.length > 0
                        ? memberships.map((m) => `${m.clubShortCode} (${m.role})`).join(' · ')
                        : 'No active club workspace';

                return (
                  <div
                    key={user.userId}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="text-xs font-medium text-[#004B87]">{primaryRole}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span className="font-mono">{user.email}</span>
                        <span aria-hidden="true">·</span>
                        <span>{user.departmentOrMajor}</span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        {user.systemRole !== 'STANDARD_USER' ? (
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{clubSummary}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={submitting || user.status !== 'Active'}
                      onClick={() => void handleQuickSignIn(user.userId)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:border-[#004B87] hover:text-[#004B87] disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{user.status === 'Active' ? 'Enter Portal' : 'Access Revoked'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

