import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  RotateCcw,
  Rss,
  Search,
  Send,
  Star,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ClubBlogPost, ClubEvent, ClubJoinRequest, PublicClubSummary } from '../types';
import { buildGoogleCalendarUrl, downloadEventIcs } from '../utils/calendarExport';
import { ClubLogoMark, HubLogoMark, StudentLifeLogo } from './BrandMarks';
import { StatusText } from './StatusText';
import { BlogMarkdownBody } from './club/ClubBlogView';

interface PublicCampusDirectoryProps {
  mode: 'public' | 'portal';
  onRefreshParent?: () => Promise<void>;
  onRequestLogin?: () => void;
}

interface PublicCampusResponse {
  clubs: PublicClubSummary[];
  publicEvents: ClubEvent[];
  publicBlogPosts?: ClubBlogPost[];
  blogCategories?: string[];
  blogTags?: string[];
}

const PUBLIC_REQUESTS_STORAGE_KEY = 'cuny_sps_public_join_requests_v1';

export function PublicCampusDirectory({
  mode,
  onRefreshParent,
  onRequestLogin,
}: PublicCampusDirectoryProps) {
  const { session, apiFetch } = useAuth();
  const [clubs, setClubs] = useState<PublicClubSummary[]>([]);
  const [publicEvents, setPublicEvents] = useState<ClubEvent[]>([]);
  const [publicBlogPosts, setPublicBlogPosts] = useState<ClubBlogPost[]>([]);
  const [serverBlogCategories, setServerBlogCategories] = useState<string[]>([]);
  const [serverBlogTags, setServerBlogTags] = useState<string[]>([]);
  const [activeBlogPostId, setActiveBlogPostId] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<ClubJoinRequest[]>([]);
  const [publicSubmittedRequests, setPublicSubmittedRequests] = useState<ClubJoinRequest[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.sessionStorage.getItem(PUBLIC_REQUESTS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ClubJoinRequest[]) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Browse & Activity Filters
  const [viewSection, setViewSection] = useState<'all' | 'events' | 'clubs' | 'blog'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [clubFilter, setClubFilter] = useState('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState('ALL');
  const [blogTagFilter, setBlogTagFilter] = useState('ALL');

  // Focused Join Request Application State (works for both unauthenticated non-members and signed-in non-members)
  const [requestingClubId, setRequestingClubId] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantMajor, setApplicantMajor] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [interestInput, setInterestInput] = useState('General Member & Event Volunteer');
  const [submitting, setSubmitting] = useState(false);
  const [feedCopied, setFeedCopied] = useState(false);

  const joinPanelRef = useRef<HTMLDivElement | null>(null);
  const eventsSectionRef = useRef<HTMLElement | null>(null);

  const persistPublicRequest = useCallback((jr: ClubJoinRequest) => {
    setPublicSubmittedRequests((prev) => {
      const next = [jr, ...prev.filter((item) => item.joinRequestId !== jr.joinRequestId)];
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(PUBLIC_REQUESTS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota restrictions
        }
      }
      return next;
    });
  }, []);

  const loadDirectoryData = useCallback(async () => {
    setError('');
    try {
      const pubRes = await fetch('/api/public/campus');
      if (!pubRes.ok) {
        throw new Error('Unable to load public CUNY SPS events and club directory.');
      }
      const pubData = (await pubRes.json()) as PublicCampusResponse;
      setClubs(pubData.clubs ?? []);
      setPublicEvents(pubData.publicEvents ?? []);
      setPublicBlogPosts(pubData.publicBlogPosts ?? []);
      setServerBlogCategories(pubData.blogCategories ?? []);
      setServerBlogTags(pubData.blogTags ?? []);

      if (mode === 'portal' && session) {
        const jrData = await apiFetch<{ joinRequests: ClubJoinRequest[] }>('/api/join-requests');
        setJoinRequests(jrData.joinRequests ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load campus directory.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, mode, session]);

  useEffect(() => {
    void loadDirectoryData();
  }, [loadDirectoryData]);

  const categories = useMemo(
    () => Array.from(new Set(clubs.map((c) => c.category).filter(Boolean))).sort(),
    [clubs]
  );

  const eventTypes = useMemo(
    () =>
      Array.from(
        new Set(publicEvents.map((ev) => ev.eventType || 'Campus Event').filter(Boolean))
      ).sort(),
    [publicEvents]
  );

  const activeMembershipClubIds = useMemo(
    () =>
      new Set(
        (session?.memberships ?? [])
          .filter((m) => m.status === 'Active')
          .map((m) => m.clubId)
      ),
    [session?.memberships]
  );

  const combinedMyRequests = useMemo(() => {
    if (mode === 'portal' && session) {
      return joinRequests.filter((jr) => jr.userId === session.user.userId);
    }
    return publicSubmittedRequests;
  }, [joinRequests, mode, publicSubmittedRequests, session]);

  const myRequestsByClubId = useMemo(() => {
    const map = new Map<string, ClubJoinRequest>();
    for (const jr of combinedMyRequests) {
      if (!map.has(jr.clubId)) {
        map.set(jr.clubId, jr);
      }
    }
    return map;
  }, [combinedMyRequests]);

  const clubsById = useMemo(() => new Map(clubs.map((c) => [c.clubId, c])), [clubs]);

  const filteredClubs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clubs.filter((c) => {
      if (clubFilter !== 'ALL' && c.clubId !== clubFilter) return false;
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.shortCode.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.facultyAdvisor.toLowerCase().includes(q)
      );
    });
  }, [clubs, clubFilter, categoryFilter, searchQuery]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publicEvents.filter((ev) => {
      const hostClub = clubsById.get(ev.clubId);
      if (clubFilter !== 'ALL' && ev.clubId !== clubFilter && !ev.coSponsorClubIds?.includes(clubFilter)) {
        return false;
      }
      if (categoryFilter !== 'ALL' && hostClub && hostClub.category !== categoryFilter) {
        return false;
      }
      const evType = ev.eventType || 'Campus Event';
      if (eventTypeFilter !== 'ALL' && evType !== eventTypeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q) ||
        (ev.clubName ?? '').toLowerCase().includes(q) ||
        (ev.clubShortCode ?? '').toLowerCase().includes(q) ||
        evType.toLowerCase().includes(q)
      );
    });
  }, [publicEvents, clubsById, clubFilter, categoryFilter, eventTypeFilter, searchQuery]);

  const availableBlogCategories = useMemo(() => {
    const priority = ['News', 'Event Recap', 'Member Spotlight'];
    const fromPosts = publicBlogPosts.map((bp) => bp.category).filter(Boolean);
    const all = Array.from(new Set([...serverBlogCategories, ...fromPosts]));
    return [
      ...priority.filter((cat) => all.includes(cat)),
      ...all.filter((cat) => !priority.includes(cat)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [serverBlogCategories, publicBlogPosts]);

  const availableBlogTags = useMemo(() => {
    const fromPosts = publicBlogPosts.flatMap((bp) => bp.tags ?? []).filter(Boolean);
    return Array.from(new Set([...serverBlogTags, ...fromPosts])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [serverBlogTags, publicBlogPosts]);

  const filteredBlogPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publicBlogPosts.filter((bp) => {
      const hostClub = clubsById.get(bp.clubId);
      if (clubFilter !== 'ALL' && bp.clubId !== clubFilter) return false;
      if (categoryFilter !== 'ALL' && hostClub && hostClub.category !== categoryFilter) {
        return false;
      }
      if (blogCategoryFilter !== 'ALL' && bp.category !== blogCategoryFilter) {
        return false;
      }
      if (
        blogTagFilter !== 'ALL' &&
        !bp.tags.some((t) => t.toLowerCase() === blogTagFilter.toLowerCase())
      ) {
        return false;
      }
      if (!q) return true;
      return (
        bp.title.toLowerCase().includes(q) ||
        (bp.subtitle ?? '').toLowerCase().includes(q) ||
        bp.excerpt.toLowerCase().includes(q) ||
        bp.category.toLowerCase().includes(q) ||
        bp.clubName.toLowerCase().includes(q) ||
        bp.clubShortCode.toLowerCase().includes(q) ||
        bp.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [
    publicBlogPosts,
    clubsById,
    clubFilter,
    categoryFilter,
    blogCategoryFilter,
    blogTagFilter,
    searchQuery,
  ]);

  const activePublicBlogPost = useMemo(
    () =>
      activeBlogPostId
        ? publicBlogPosts.find((bp) => bp.blogPostId === activeBlogPostId) ?? null
        : null,
    [publicBlogPosts, activeBlogPostId]
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    categoryFilter !== 'ALL' ||
    clubFilter !== 'ALL' ||
    eventTypeFilter !== 'ALL' ||
    blogCategoryFilter !== 'ALL' ||
    blogTagFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setClubFilter('ALL');
    setEventTypeFilter('ALL');
    setBlogCategoryFilter('ALL');
    setBlogTagFilter('ALL');
  };

  const openJoinApplication = (clubId: string) => {
    setError('');
    setFeedback('');
    setRequestingClubId(clubId);
    setTimeout(() => {
      joinPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 40);
  };

  const handleSubmitJoinRequest = async (e: React.FormEvent, club: PublicClubSummary) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      let created: ClubJoinRequest;
      if (session) {
        const res = await apiFetch<{ joinRequest: ClubJoinRequest }>(
          `/api/clubs/${club.clubId}/join-requests`,
          {
            method: 'POST',
            body: JSON.stringify({
              reason: reasonInput.trim(),
              preferredInterest: interestInput.trim(),
            }),
          }
        );
        created = res.joinRequest;
      } else {
        const res = await fetch(`/api/public/clubs/${club.clubId}/join-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: applicantName.trim(),
            studentEmail: applicantEmail.trim(),
            departmentOrMajor: applicantMajor.trim() || 'CUNY SPS Student',
            preferredInterest: interestInput.trim(),
            reason: reasonInput.trim(),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          joinRequest?: ClubJoinRequest;
          error?: string;
        };
        if (!res.ok || !data.joinRequest) {
          throw new Error(data.error || 'Unable to submit Request to Join application.');
        }
        created = data.joinRequest;
        persistPublicRequest(created);
      }

      setRequestingClubId(null);
      setReasonInput('');
      setFeedback(
        `Request to Join submitted for ${club.name} (${club.shortCode}) — Application ID ${created.joinRequestId}. Club Leaders and Student Life will review your request and notify you.`
      );
      await loadDirectoryData();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit Request to Join.');
    } finally {
      setSubmitting(false);
    }
  };

  const requestingClub = requestingClubId ? clubsById.get(requestingClubId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Public Portal Hero & Search Toolbar */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <HubLogoMark variant="open-c" surface="ink" size="md" />
              <StudentLifeLogo className="h-10 w-auto" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#004B87] shrink-0" />
                <span>Approved Campus Club Events &amp; Membership Directory</span>
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Browse officially approved CUNY SPS student club events and activities, export
                dates to your calendar, and submit a Request to Join application for any club.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-600">
              <span>{publicEvents.length} approved events</span>
              <span aria-hidden="true">·</span>
              <span>{clubs.length} active clubs</span>
            </div>
            {clubs.length > 0 && (
              <button
                type="button"
                onClick={() => openJoinApplication(clubFilter !== 'ALL' ? clubFilter : clubs[0].clubId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request to Join a Club</span>
              </button>
            )}
            {mode === 'public' && !session && onRequestLogin && (
              <button
                type="button"
                onClick={onRequestLogin}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Member Sign-In</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Section Controls */}
        <div className="pt-3 border-t border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md w-fit">
            {(
              [
                { id: 'all', label: 'All Campus' },
                { id: 'events', label: `Approved Events (${filteredEvents.length})` },
                { id: 'blog', label: `Club Blog (${filteredBlogPosts.length})` },
                { id: 'clubs', label: `Student Clubs (${filteredClubs.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setViewSection(tab.id);
                  setActiveBlogPostId(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewSection === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 xl:justify-end">
            <div className="relative flex-1 min-w-[210px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search approved events, clubs, locations..."
                aria-label="Search approved club events and organizations"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>

            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              aria-label="Filter by specific club"
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
            >
              <option value="ALL">All Clubs ({clubs.length})</option>
              {clubs.map((c) => (
                <option key={c.clubId} value={c.clubId}>
                  {c.name} ({c.shortCode})
                </option>
              ))}
            </select>

            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              aria-label="Filter by activity type"
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
            >
              <option value="ALL">All Activity Types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter clubs by category"
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}
      {feedback && (
        <div className="p-3.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
          {feedback}
        </div>
      )}

      {/* Focused Request to Join Application Panel (accessible from any event or club CTA) */}
      {requestingClub && (
        <div
          ref={joinPanelRef}
          className="bg-white border border-[#004B87] rounded-lg overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-slate-200 bg-sky-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ClubLogoMark
                clubId={requestingClub.clubId}
                clubShortCode={requestingClub.shortCode}
                clubName={requestingClub.name}
                logoUrl={requestingClub.logoUrl}
                accentColor={requestingClub.accentColor}
                size="sm"
              />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900">
                  Request to Join Application · {requestingClub.name} ({requestingClub.shortCode})
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {session
                    ? `Applying as verified CUNY member ${session.user.name} (${session.user.email}).`
                    : 'Non-member CUNY SPS students can submit a membership request directly to Club Leaders.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRequestingClubId(null)}
              aria-label="Close join request form"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:text-slate-900 rounded-md self-end sm:self-center whitespace-nowrap cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>

          <form
            onSubmit={(e) => void handleSubmitJoinRequest(e, requestingClub)}
            className="p-5 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Target Student Club
                </label>
                <select
                  value={requestingClub.clubId}
                  onChange={(e) => setRequestingClubId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                >
                  {clubs.map((c) => (
                    <option key={c.clubId} value={c.clubId}>
                      {c.name} ({c.shortCode})
                    </option>
                  ))}
                </select>
              </div>

              {!session && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="e.g., Jordan Alvarez"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      CUNY Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      placeholder="name@spsmail.cuny.edu"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Academic Program / Major
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantMajor}
                      onChange={(e) => setApplicantMajor(e.target.value)}
                      placeholder="e.g., B.S. Information Systems"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Preferred Involvement / Interest Area
                </label>
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Why would you like to join {requestingClub.name}?
              </label>
              <textarea
                rows={2}
                required
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Share your interest in club events, workshops, or student leadership..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-500">
                Faculty Advisor: {requestingClub.facultyAdvisor} ·{' '}
                {requestingClub.activeMemberCount} current members
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRequestingClubId(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting Application...' : 'Submit Request to Join'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* User's Submitted Join Requests Status Tracker (works for both signed-in and public non-member students) */}
      {combinedMyRequests.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {session ? 'My Club Join Requests' : 'Submitted Request to Join Applications'}
            </h2>
            <span className="text-xs font-mono-tabular text-slate-500">
              {combinedMyRequests.length} application{combinedMyRequests.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {combinedMyRequests.map((jr) => (
              <div
                key={jr.joinRequestId}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900">
                    {jr.clubName}{' '}
                    <span className="font-mono text-slate-500">({jr.clubShortCode})</span>
                    {!session && (
                      <span className="text-slate-500 font-normal">
                        {' '}
                        · {jr.studentName} ({jr.studentEmail})
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600">{jr.reason}</div>
                  {jr.reviewNote && (
                    <div className="text-[11px] text-slate-500">
                      Reviewer note ({jr.reviewedByName}): {jr.reviewNote}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusText status={jr.status} />
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {new Date(jr.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Approved Club Events & Activities Section */}
      {(viewSection === 'all' || viewSection === 'events') && (
        <section
          ref={eventsSectionRef}
          aria-label="Approved Club Events and Activities"
          className="bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#004B87] shrink-0" />
              <h2 className="text-sm font-bold text-slate-900">
                Approved Club Events &amp; Campus Activities
              </h2>
              <span className="text-xs font-mono-tabular text-slate-500">
                ({filteredEvents.length} approved)
              </span>
            </div>

            {(() => {
              const feedUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/campus.ics`;
              return (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <Rss className="w-3.5 h-3.5 text-[#004B87]" />
                    <span>Live .ics Feed:</span>
                  </span>
                  <code className="font-mono text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded max-w-[230px] truncate">
                    {feedUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(feedUrl);
                      setFeedCopied(true);
                      setTimeout(() => setFeedCopied(false), 2500);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#004B87] bg-white border border-slate-300 hover:border-[#004B87] rounded-md whitespace-nowrap cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{feedCopied ? 'Feed URL Copied' : 'Copy Feed URL'}</span>
                  </button>
                  <a
                    href="/api/public/campus.ics"
                    download="cuny-sps-campus.ics"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
                  >
                    <Download className="w-3 h-3" />
                    <span>All .ics</span>
                  </a>
                </div>
              );
            })()}
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              <div className="h-24 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-24 bg-slate-100 rounded-md animate-pulse" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-slate-500">
                No approved club events match your current search or filter criteria.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Show All Approved Events</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredEvents.map((ev) => {
                const isMember = activeMembershipClubIds.has(ev.clubId);
                const existingRequest = myRequestsByClubId.get(ev.clubId);
                const isPending = existingRequest?.status === 'Pending';

                return (
                  <div
                    key={ev.eventId}
                    className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-24 shrink-0 border border-slate-200 rounded-md bg-slate-50 px-2.5 py-2 text-center">
                        <div className="text-xs font-mono-tabular font-bold text-slate-900">
                          {ev.date}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{ev.time}</span>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <ClubLogoMark
                            clubId={ev.clubId}
                            clubShortCode={ev.clubShortCode}
                            clubName={ev.clubName}
                            logoUrl={ev.clubLogoUrl}
                            accentColor={ev.clubAccentColor}
                            size="xs"
                          />
                          <span className="font-semibold text-[#004B87]">
                            {ev.clubShortCode} · {ev.clubName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{ev.eventType ?? 'Campus Event'}</span>
                          <span aria-hidden="true">·</span>
                          <StatusText status={ev.approvalStatus ?? 'Approved'} />
                          {ev.recurrence && ev.recurrence !== 'None' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#004B87] font-medium">
                                {ev.recurrence} Series
                              </span>
                            </>
                          )}
                          {ev.coSponsorClubCodes && ev.coSponsorClubCodes.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono font-semibold text-[#004B87]">
                                Co-Sponsored w/ {ev.coSponsorClubCodes.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">{ev.title}</h3>
                        <p className="text-xs text-slate-600">{ev.description}</p>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{ev.location}</span>
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono-tabular text-slate-700">
                            <Users className="w-3.5 h-3.5 text-[#004B87] shrink-0" />
                            <span>{ev.rsvpCount ?? 0} RSVPs</span>
                            {typeof ev.inPersonCapacity === 'number' && (
                              <span className="text-slate-500">
                                · {ev.inPersonConfirmedCount ?? 0}/{ev.inPersonCapacity} room cap
                              </span>
                            )}
                          </span>
                          {typeof ev.avgFeedbackRating === 'number' && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1 font-mono-tabular text-amber-700 font-semibold">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>{ev.avgFeedbackRating.toFixed(1)}/5</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => downloadEventIcs(ev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.ics</span>
                      </button>
                      <a
                        href={buildGoogleCalendarUrl(ev)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-slate-300 hover:border-[#004B87] rounded-md whitespace-nowrap"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Google Calendar</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {isMember ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Member</span>
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Join Pending</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openJoinApplication(ev.clubId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Request to Join {ev.clubShortCode}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Published Club Blog Stories */}
      {(viewSection === 'all' || viewSection === 'blog') && publicBlogPosts.length > 0 && (
        <section aria-label="Published Club Blog Stories" className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#004B87]" />
                <h2 className="text-sm font-bold text-slate-900">
                  Club Blog Stories &amp; Event Recaps
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {(blogCategoryFilter !== 'ALL' || blogTagFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBlogCategoryFilter('ALL');
                      setBlogTagFilter('ALL');
                    }}
                    className="text-xs font-medium text-[#004B87] hover:underline cursor-pointer"
                  >
                    Clear blog filters
                  </button>
                )}
                <span className="text-xs font-mono-tabular text-slate-500">
                  {filteredBlogPosts.length} published article
                  {filteredBlogPosts.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {!activePublicBlogPost && availableBlogCategories.length > 0 && (
              <div className="pt-2.5 border-t border-slate-100 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500 mr-1">Labels:</span>
                  <button
                    type="button"
                    onClick={() => setBlogCategoryFilter('ALL')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      blogCategoryFilter === 'ALL'
                        ? 'bg-[#004B87] text-white border-[#004B87]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-[#004B87]'
                    }`}
                  >
                    All Topics ({publicBlogPosts.length})
                  </button>
                  {availableBlogCategories.map((cat) => {
                    const count = publicBlogPosts.filter((bp) => bp.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setBlogCategoryFilter(cat)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          blogCategoryFilter === cat
                            ? 'bg-[#004B87] text-white border-[#004B87]'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-[#004B87]'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>

                {availableBlogTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500 mr-1">Tags:</span>
                    <button
                      type="button"
                      onClick={() => setBlogTagFilter('ALL')}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        blogTagFilter === 'ALL'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      All Tags
                    </button>
                    {availableBlogTags.map((tag) => {
                      const isActive = blogTagFilter.toLowerCase() === tag.toLowerCase();
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setBlogTagFilter(isActive ? 'ALL' : tag)}
                          className={`px-2 py-0.5 text-[11px] font-mono font-medium rounded border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-[#004B87] text-white border-[#004B87]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#004B87]'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {activePublicBlogPost ? (
            <article className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveBlogPostId(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#004B87] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Club Blog Stories</span>
                </button>
                {!activeMembershipClubIds.has(activePublicBlogPost.clubId) && (
                  <button
                    type="button"
                    onClick={() => openJoinApplication(activePublicBlogPost.clubId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Request to Join {activePublicBlogPost.clubShortCode}</span>
                  </button>
                )}
              </div>

              {activePublicBlogPost.coverImageUrl && (
                <div className="w-full max-h-[300px] overflow-hidden bg-slate-100 border-b border-slate-200">
                  <img
                    src={activePublicBlogPost.coverImageUrl}
                    alt={activePublicBlogPost.coverImageAlt || activePublicBlogPost.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 max-w-4xl mx-auto space-y-5">
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <ClubLogoMark
                      clubId={activePublicBlogPost.clubId}
                      clubShortCode={activePublicBlogPost.clubShortCode}
                      clubName={activePublicBlogPost.clubName}
                      logoUrl={activePublicBlogPost.clubLogoUrl}
                      accentColor={activePublicBlogPost.clubAccentColor}
                      size="xs"
                    />
                    <span className="font-semibold text-[#004B87]">
                      {activePublicBlogPost.clubShortCode} · {activePublicBlogPost.clubName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBlogCategoryFilter(activePublicBlogPost.category);
                        setActiveBlogPostId(null);
                      }}
                      className="font-semibold text-[#004B87] hover:underline cursor-pointer"
                    >
                      {activePublicBlogPost.category}
                    </button>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {activePublicBlogPost.readingTimeMinutes} min read
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {activePublicBlogPost.title}
                  </h3>
                  {activePublicBlogPost.subtitle && (
                    <p className="text-sm text-slate-600">{activePublicBlogPost.subtitle}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      By {activePublicBlogPost.authorName} ({activePublicBlogPost.authorRoleLabel}) ·{' '}
                      {new Date(
                        activePublicBlogPost.publishedAt ?? activePublicBlogPost.updatedAt
                      ).toLocaleDateString()}
                    </span>
                    {activePublicBlogPost.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 font-mono">
                        {activePublicBlogPost.tags.map((tag, idx) => (
                          <React.Fragment key={tag}>
                            {idx > 0 && <span aria-hidden="true">·</span>}
                            <button
                              type="button"
                              onClick={() => {
                                setBlogTagFilter(tag);
                                setActiveBlogPostId(null);
                              }}
                              className="hover:text-[#004B87] hover:underline cursor-pointer"
                            >
                              #{tag}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <BlogMarkdownBody content={activePublicBlogPost.bodyMarkdown} />
              </div>
            </article>
          ) : filteredBlogPosts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
              <p className="text-xs text-slate-500">
                No published club blog stories match your selected category or topic tag filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBlogCategoryFilter('ALL');
                  setBlogTagFilter('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Show All Club Blog Stories</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBlogPosts.map((bp) => (
                <article
                  key={bp.blogPostId}
                  className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <ClubLogoMark
                        clubId={bp.clubId}
                        clubShortCode={bp.clubShortCode}
                        clubName={bp.clubName}
                        logoUrl={bp.clubLogoUrl}
                        accentColor={bp.clubAccentColor}
                        size="xs"
                      />
                      <span className="font-semibold text-[#004B87] truncate">
                        {bp.clubShortCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => setBlogCategoryFilter(bp.category)}
                        className="font-medium text-slate-700 hover:text-[#004B87] hover:underline cursor-pointer"
                      >
                        {bp.category}
                      </button>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{bp.readingTimeMinutes} min</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveBlogPostId(bp.blogPostId)}
                      className="block text-left text-sm font-bold text-slate-900 hover:text-[#004B87] leading-snug cursor-pointer"
                    >
                      {bp.title}
                    </button>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {bp.excerpt}
                    </p>
                    {bp.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500 pt-0.5">
                        {bp.tags.slice(0, 3).map((tag, idx) => (
                          <React.Fragment key={tag}>
                            {idx > 0 && <span aria-hidden="true">·</span>}
                            <button
                              type="button"
                              onClick={() => setBlogTagFilter(tag)}
                              className="hover:text-[#004B87] hover:underline cursor-pointer"
                            >
                              #{tag}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-slate-500 truncate">
                      By {bp.authorName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveBlogPostId(bp.blogPostId)}
                      className="font-semibold text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                    >
                      Read Story →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Active Student Organizations Catalog (Direct Club Request to Join) */}
      {(viewSection === 'all' || viewSection === 'clubs') && (
        <section aria-label="Recognized Student Clubs and Organizations" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#004B87]" />
              <h2 className="text-sm font-bold text-slate-900">
                Recognized Student Clubs &amp; Membership Applications
              </h2>
            </div>
            <span className="text-xs font-mono-tabular text-slate-500">
              {filteredClubs.length} of {clubs.length} clubs shown
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-44 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-44 bg-slate-200 rounded-lg animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClubs.length === 0 ? (
                <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-500">
                  No active CUNY SPS clubs match your search criteria.
                </div>
              ) : (
                filteredClubs.map((club) => {
                  const isMember = activeMembershipClubIds.has(club.clubId);
                  const existingRequest = myRequestsByClubId.get(club.clubId);
                  const isPending = existingRequest?.status === 'Pending';

                  return (
                    <article
                      key={club.clubId}
                      className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <ClubLogoMark
                              clubId={club.clubId}
                              clubShortCode={club.shortCode}
                              clubName={club.name}
                              logoUrl={club.logoUrl}
                              accentColor={club.accentColor}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="text-[11px] font-mono font-semibold text-[#004B87]">
                                {club.shortCode} · {club.category}
                              </div>
                              <h3 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
                                {club.name}
                              </h3>
                              {club.tagline && (
                                <p className="text-xs font-medium text-slate-700 mt-0.5">{club.tagline}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-mono-tabular text-slate-500 whitespace-nowrap">
                            {club.activeMemberCount} members
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{club.description}</p>

                        {(club.meetingSchedule || club.contactEmail || club.websiteUrl) && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {club.meetingSchedule && <span>Meetings: {club.meetingSchedule}</span>}
                            {club.meetingSchedule && (club.contactEmail || club.websiteUrl) && (
                              <span aria-hidden="true">·</span>
                            )}
                            {club.contactEmail && (
                              <a
                                href={`mailto:${club.contactEmail}`}
                                className="text-[#004B87] hover:underline font-mono"
                              >
                                {club.contactEmail}
                              </a>
                            )}
                            {club.contactEmail && club.websiteUrl && (
                              <span aria-hidden="true">·</span>
                            )}
                            {club.websiteUrl && (
                              <a
                                href={club.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#004B87] hover:underline truncate max-w-[220px]"
                              >
                                Club Website
                              </a>
                            )}
                          </div>
                        )}

                        <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            Faculty Advisor:{' '}
                            <strong className="font-medium text-slate-800">{club.facultyAdvisor}</strong>
                          </span>
                          {club.presidentName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                President:{' '}
                                <strong className="font-medium text-slate-800">{club.presidentName}</strong>
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          {club.upcomingPublicEventsCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setClubFilter(club.clubId);
                                setViewSection('events');
                                setTimeout(() => {
                                  eventsSectionRef.current?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'nearest',
                                  });
                                }, 40);
                              }}
                              className="font-mono-tabular font-semibold text-[#004B87] hover:underline cursor-pointer"
                            >
                              {club.upcomingPublicEventsCount} approved event
                              {club.upcomingPublicEventsCount === 1 ? '' : 's'} →
                            </button>
                          ) : (
                            <span className="font-mono-tabular text-slate-500">
                              0 upcoming events
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Membership / Join Request Action */}
                      <div className="pt-3 border-t border-slate-100">
                        {isMember ? (
                          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
                            <span className="inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Active Member of {club.shortCode}</span>
                            </span>
                            <span className="text-[11px] text-slate-500">Workspace Enabled</span>
                          </div>
                        ) : isPending && existingRequest ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-700 font-medium">
                              Join Request Pending Club Lead Review
                            </span>
                            <span className="font-mono-tabular text-[11px] text-slate-500">
                              {new Date(existingRequest.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            {existingRequest ? (
                              <div className="text-[11px] text-slate-500">
                                Previous decision: <StatusText status={existingRequest.status} />
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                Open to all verified CUNY SPS students
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openJoinApplication(club.clubId)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Request to Join</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
