import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  List,
  Mail,
  MapPin,
  Plus,
  QrCode,
  Repeat,
  Rss,
  Search,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Club, ClubEvent, ClubEventType, EventRecurrence, PublicClubSummary } from '../types';
import {
  buildGoogleCalendarUrl,
  downloadCalendarIcs,
  downloadEventIcs,
} from '../utils/calendarExport';
import { EventCheckInDrawer } from './EventCheckInDrawer';
import { StatusText } from './StatusText';

interface ClubEventCalendarProps {
  events: ClubEvent[];
  clubs: Club[];
  activeClubId: string | null;
  onRefresh: () => Promise<void>;
  onDraftPostForEvent?: (event: ClubEvent) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function ClubEventCalendar({
  events,
  clubs,
  activeClubId,
  onRefresh,
  onDraftPostForEvent,
}: ClubEventCalendarProps) {
  const { apiFetch, session } = useAuth();

  const todayIso = useMemo(() => getTodayIso(), []);
  const initialDate = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []);

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentYear, setCurrentYear] = useState(initialDate.year);
  const [currentMonth, setCurrentMonth] = useState(initialDate.month); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [clubFilter, setClubFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'All' | ClubEventType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Post Event inline form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const postableClubs = useMemo(
    () =>
      clubs.filter((c) => {
        if (session?.effectiveAdminRole) return true;
        return session?.memberships.some(
          (m) => m.clubId === c.clubId && m.status === 'Active' && m.role !== 'VIEWER'
        );
      }),
    [clubs, session]
  );

  const deletableClubIds = useMemo(
    () =>
      new Set(
        clubs
          .filter((c) => {
            if (session?.effectiveAdminRole) return true;
            return session?.memberships.some(
              (m) =>
                m.clubId === c.clubId &&
                m.status === 'Active' &&
                (m.role === 'CLUB_LEAD' || m.role === 'EDITOR')
            );
          })
          .map((c) => c.clubId)
      ),
    [clubs, session]
  );

  const defaultClubId =
    (activeClubId && postableClubs.some((c) => c.clubId === activeClubId)
      ? activeClubId
      : postableClubs[0]?.clubId) ?? '';

  const [targetClubId, setTargetClubId] = useState(defaultClubId);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<ClubEventType>('Club Meeting');
  const [date, setDate] = useState('2026-11-28');
  const [time, setTime] = useState('18:30');
  const [location, setLocation] = useState('Zoom / CUNY SPS Virtual Commons');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<EventRecurrence>('None');
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [isPublic, setIsPublic] = useState(true);
  const [inPersonCapacityInput, setInPersonCapacityInput] = useState('35');
  const [coSponsorIds, setCoSponsorIds] = useState<string[]>([]);
  const [publicClubs, setPublicClubs] = useState<PublicClubSummary[]>([]);
  const [rsvpModesByEvent, setRsvpModesByEvent] = useState<Record<string, 'In-Person' | 'Virtual'>>({});
  const [feedCopied, setFeedCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rsvpingId, setRsvpingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [checkInEventId, setCheckInEventId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (defaultClubId && !postableClubs.some((c) => c.clubId === targetClubId)) {
      setTargetClubId(defaultClubId);
    }
  }, [defaultClubId, postableClubs, targetClubId]);

  useEffect(() => {
    fetch('/api/public/campus')
      .then((r) => (r.ok ? r.json() : { clubs: [] }))
      .then((data: { clubs?: PublicClubSummary[] }) => setPublicClubs(data.clubs ?? []))
      .catch(() => {
        /* optional co-sponsor lookup */
      });
  }, []);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...events]
      .filter((ev) => {
        if (clubFilter !== 'ALL' && ev.clubId !== clubFilter) return false;
        const resolvedType = ev.eventType ?? 'Campus Event';
        if (typeFilter !== 'All' && resolvedType !== typeFilter) return false;
        if (!q) return true;
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.location.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          (ev.clubName ?? '').toLowerCase().includes(q) ||
          (ev.clubShortCode ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  }, [events, clubFilter, typeFilter, searchQuery]);

  // Monthly grid computation
  const currentMonthPrefix = `${currentYear}-${pad2(currentMonth + 1)}`;

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0..6
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

    const cells: {
      key: string;
      dayNum: number | null;
      dateStr: string | null;
      dayEvents: ClubEvent[];
    }[] = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - firstDayOfWeek + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push({ key: `blank-${i}`, dayNum: null, dateStr: null, dayEvents: [] });
      } else {
        const dateStr = `${currentYear}-${pad2(currentMonth + 1)}-${pad2(dayNum)}`;
        const dayEvents = filteredEvents.filter((ev) => ev.date === dateStr);
        cells.push({ key: dateStr, dayNum, dateStr, dayEvents });
      }
    }
    return cells;
  }, [currentYear, currentMonth, filteredEvents]);

  const monthEventsCount = useMemo(
    () => filteredEvents.filter((ev) => ev.date.startsWith(currentMonthPrefix)).length,
    [filteredEvents, currentMonthPrefix]
  );

  // Month quick-jump summary for months that have scheduled events
  const activeMonthsWithEvents = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of filteredEvents) {
      const ym = ev.date.slice(0, 7);
      counts.set(ym, (counts.get(ym) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, count]) => {
        const [y, m] = ym.split('-').map(Number);
        return {
          ym,
          year: y,
          monthIdx: m - 1,
          label: `${MONTH_NAMES[m - 1]?.slice(0, 3) ?? m} ${y}`,
          count,
        };
      });
  }, [filteredEvents]);

  const selectedDayEvents = useMemo(
    () => filteredEvents.filter((ev) => ev.date === selectedDate),
    [filteredEvents, selectedDate]
  );

  const selectedEvent = useMemo(() => {
    if (selectedEventId) {
      const found = filteredEvents.find((ev) => ev.eventId === selectedEventId);
      if (found) return found;
    }
    return selectedDayEvents[0] ?? null;
  }, [filteredEvents, selectedEventId, selectedDayEvents]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    setCurrentYear(initialDate.year);
    setCurrentMonth(initialDate.month);
    setSelectedDate(todayIso);
    setSelectedEventId(null);
  };

  const handleToggleRsvp = async (ev: ClubEvent) => {
    setRsvpingId(ev.eventId);
    setError('');
    setFeedback('');
    const currentGoing = Boolean(ev.userHasRsvped || ev.userOnWaitlist);
    const chosenMode =
      rsvpModesByEvent[ev.eventId] ??
      ev.userRsvpMode ??
      (ev.inPersonCapacity ? 'In-Person' : 'Virtual');
    try {
      const res = await apiFetch<{
        event: ClubEvent;
        waitlisted?: boolean;
        promotedUserName?: string;
      }>(`/api/clubs/${ev.clubId}/events/${ev.eventId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ attending: !currentGoing, mode: chosenMode }),
      });
      setFeedback(
        !currentGoing
          ? res.waitlisted
            ? `Added to In-Person waitlist for "${ev.title}".`
            : `Confirmed ${chosenMode} RSVP for "${ev.title}".`
          : res.promotedUserName
            ? `Cancelled RSVP for "${ev.title}". Automatically promoted ${res.promotedUserName} from waitlist.`
            : `Cancelled RSVP for "${ev.title}".`
      );
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update RSVP status.');
    } finally {
      setRsvpingId(null);
    }
  };

  const handleDeleteEvent = async (ev: ClubEvent) => {
    setDeletingId(ev.eventId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${ev.clubId}/events/${ev.eventId}`, {
        method: 'DELETE',
      });
      setFeedback(`Removed "${ev.title}" from the event calendar.`);
      if (selectedEventId === ev.eventId) setSelectedEventId(null);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove event.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const clubToUse = targetClubId || defaultClubId;
    if (!clubToUse) {
      setError('Select an authorized student club to post this event.');
      return;
    }
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      const parsedCap = Number(inPersonCapacityInput);
      const res = await apiFetch<{ event: ClubEvent; createdCount?: number }>(
        `/api/clubs/${clubToUse}/events`,
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            eventType,
            date,
            time,
            location,
            description,
            recurrence,
            recurrenceCount: recurrence === 'None' ? 1 : recurrenceCount,
            isPublic,
            inPersonCapacity: Number.isFinite(parsedCap) && parsedCap > 0 ? parsedCap : undefined,
            coSponsorClubIds: coSponsorIds.filter((id) => id !== clubToUse),
          }),
        }
      );
      setTitle('');
      setDescription('');
      setRecurrence('None');
      setCoSponsorIds([]);
      setShowCreateForm(false);
      setFeedback(
        res.createdCount && res.createdCount > 1
          ? `Added recurring series "${res.event.title}" (${res.createdCount} ${recurrence.toLowerCase()} occurrences) to the event calendar.`
          : `Added "${res.event.title}" to the club event calendar.`
      );
      // Focus the calendar month & day of the newly added event
      const [y, m] = res.event.date.split('-').map(Number);
      if (Number.isFinite(y) && Number.isFinite(m)) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
      setSelectedDate(res.event.date);
      setSelectedEventId(res.event.eventId);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to schedule event.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpectedAttendance = filteredEvents.reduce(
    (sum, ev) => sum + (ev.rsvpCount ?? ev.rsvpUserIds?.length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header & View Mode Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#004B87] shrink-0" />
              <span>Club Event Calendar</span>
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-mono-tabular">
              {filteredEvents.length} upcoming meeting{filteredEvents.length === 1 ? '' : 's'} &amp;
              campus event{filteredEvents.length === 1 ? '' : 's'} · {totalExpectedAttendance}{' '}
              total RSVPs across authorized clubs
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* List vs Calendar Switch */}
            <div
              role="group"
              aria-label="Event view mode"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-md"
            >
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                aria-pressed={viewMode === 'calendar'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>

            {filteredEvents.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  downloadCalendarIcs(filteredEvents);
                  setFeedback(
                    `Downloaded .ics calendar feed with ${filteredEvents.length} scheduled event(s).`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#004B87]" />
                <span>Export Calendar (.ics)</span>
              </button>
            )}

            {postableClubs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowCreateForm((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showCreateForm ? 'Close Form' : 'Schedule Event'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="pt-3 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {clubs.length > 1 && (
              <select
                value={clubFilter}
                onChange={(e) => setClubFilter(e.target.value)}
                aria-label="Filter events by club"
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
              >
                <option value="ALL">All Authorized Clubs ({clubs.length})</option>
                {clubs.map((c) => (
                  <option key={c.clubId} value={c.clubId}>
                    {c.name} ({c.shortCode})
                  </option>
                ))}
              </select>
            )}

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'All' | ClubEventType)}
              aria-label="Filter by event category"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
            >
              <option value="All">All Event Categories</option>
              <option value="Club Meeting">Club Meeting</option>
              <option value="Campus Event">Campus Event</option>
              <option value="Workshop">Workshop</option>
              <option value="Networking">Networking</option>
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, clubs, or rooms..."
              aria-label="Search club event calendar"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
            />
          </div>
        </div>

        {/* Live iCalendar Subscription URL Bar */}
        {(() => {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const scopedFeedPath =
            clubFilter !== 'ALL' ? `/api/clubs/${clubFilter}/calendar.ics` : '/api/public/campus.ics';
          const feedUrl = `${origin}${scopedFeedPath}`;
          return (
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Rss className="w-3.5 h-3.5 text-[#004B87] shrink-0" />
                <span className="font-medium text-slate-700 whitespace-nowrap">
                  Subscribe (.ics Live Feed):
                </span>
                <code className="font-mono text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded truncate">
                  {feedUrl}
                </code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
              </div>
            </div>
          );
        })()}
      </div>

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

      {/* Inline Event Scheduling Form */}
      {showCreateForm && postableClubs.length > 0 && (
        <form
          onSubmit={handleCreateEvent}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="text-xs font-semibold text-slate-900">
            Schedule Upcoming Meeting or Campus Event
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Student Organization
              </label>
              <select
                value={targetClubId || defaultClubId}
                onChange={(e) => setTargetClubId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              >
                {postableClubs.map((c) => (
                  <option key={c.clubId} value={c.clubId}>
                    {c.name} ({c.shortCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as ClubEventType)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="Club Meeting">Club Meeting</option>
                <option value="Campus Event">Campus Event</option>
                <option value="Workshop">Workshop</option>
                <option value="Networking">Networking</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Event / Meeting Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., End-of-Semester Showcase"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Location / Virtual Room
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Meeting Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as EventRecurrence)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="None">Single Event (No Repeat)</option>
                <option value="Weekly">Weekly Recurring Series</option>
                <option value="Biweekly">Biweekly Recurring Series</option>
              </select>
            </div>
            {recurrence !== 'None' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Occurrences (2–8)
                </label>
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={recurrenceCount}
                  onChange={(e) =>
                    setRecurrenceCount(Math.min(8, Math.max(2, Number(e.target.value) || 2)))
                  }
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                In-Person Room Cap (Optional)
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={inPersonCapacityInput}
                onChange={(e) => setInPersonCapacityInput(e.target.value)}
                placeholder="e.g., 35"
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="accent-[#004B87]"
                />
                <span>List on Public Campus Directory</span>
              </label>
            </div>
            {publicClubs.filter((c) => c.clubId !== (targetClubId || defaultClubId)).length > 0 && (
              <div className="md:col-span-3 p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-800">
                  Co-Sponsor Collaborating Clubs (Optional)
                </div>
                <div className="flex flex-wrap gap-3">
                  {publicClubs
                    .filter((c) => c.clubId !== (targetClubId || defaultClubId))
                    .map((partner) => (
                      <label
                        key={partner.clubId}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={coSponsorIds.includes(partner.clubId)}
                          onChange={(e) =>
                            setCoSponsorIds((prev) =>
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
                    ))}
                </div>
              </div>
            )}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Event Details & Agenda
              </label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share agenda, guest speakers, or RSVP notes..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
            >
              {submitting ? 'Scheduling...' : 'Publish to Event Calendar'}
            </button>
          </div>
        </form>
      )}

      {/* Calendar View (Monthly Grid) */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          <section
            aria-label="Monthly Event Calendar Grid"
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
          >
            {/* Month Navigation Bar */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-900">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h2>
                <span className="text-xs font-mono-tabular text-slate-500">
                  {monthEventsCount} event{monthEventsCount === 1 ? '' : 's'} this month
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeMonthsWithEvents.map((m) => (
                  <button
                    key={m.ym}
                    type="button"
                    onClick={() => {
                      setCurrentYear(m.year);
                      setCurrentMonth(m.monthIdx);
                    }}
                    className={`px-2.5 py-1 text-xs font-mono-tabular rounded border transition-colors whitespace-nowrap cursor-pointer ${
                      currentMonthPrefix === m.ym
                        ? 'bg-sky-50 border-[#004B87] text-[#004B87] font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.label} ({m.count})
                  </button>
                ))}

                <div className="flex items-center gap-1 pl-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                    className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-300 bg-white rounded-md cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleJumpToday}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-300 bg-white rounded-md whitespace-nowrap cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-300 bg-white rounded-md cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 px-3 border-r border-slate-200 last:border-r-0 text-center sm:text-left"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Monthly Grid Cells */}
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, idx) => {
                const isLastCol = idx % 7 === 6;
                if (!cell.dateStr || cell.dayNum === null) {
                  return (
                    <div
                      key={cell.key}
                      className={`min-h-[116px] p-2 border-b border-slate-200 bg-slate-50/50 ${
                        isLastCol ? '' : 'border-r'
                      }`}
                    />
                  );
                }

                const isToday = cell.dateStr === todayIso;
                const isSelected = cell.dateStr === selectedDate;

                return (
                  <div
                    key={cell.key}
                    onClick={() => {
                      setSelectedDate(cell.dateStr!);
                      setSelectedEventId(cell.dayEvents[0]?.eventId ?? null);
                    }}
                    className={`min-h-[116px] p-2 border-b border-slate-200 flex flex-col gap-1.5 cursor-pointer transition-colors ${
                      isLastCol ? '' : 'border-r'
                    } ${
                      isSelected
                        ? 'bg-sky-50/60'
                        : 'bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-mono-tabular font-semibold ${
                          isToday
                            ? 'text-[#004B87] underline underline-offset-4'
                            : 'text-slate-700'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-medium text-[#004B87]">Today</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {cell.dayEvents.map((ev) => {
                        const clubMeta = clubs.find((c) => c.clubId === ev.clubId);
                        const code = ev.clubShortCode || clubMeta?.shortCode || '';
                        const isPicked = selectedEvent?.eventId === ev.eventId;
                        const rsvpCount = ev.rsvpCount ?? ev.rsvpUserIds?.length ?? 0;
                        return (
                          <button
                            key={ev.eventId}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(cell.dateStr!);
                              setSelectedEventId(ev.eventId);
                            }}
                            className={`w-full text-left p-1.5 rounded border text-[11px] leading-snug transition-colors cursor-pointer ${
                              isPicked
                                ? 'bg-[#004B87] border-[#004B87] text-white'
                                : 'bg-sky-50/80 border-sky-200 text-slate-900 hover:border-[#004B87]'
                            }`}
                          >
                            <div className="font-semibold truncate">{ev.title}</div>
                            <div
                              className={`text-[10px] font-mono-tabular truncate mt-0.5 ${
                                isPicked ? 'text-sky-100' : 'text-slate-600'
                              }`}
                            >
                              {ev.time} · {code} · {rsvpCount} RSVP
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Selected Day / Event Inspector */}
          <section
            aria-label="Selected Date Event Details"
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
              <div className="text-xs font-semibold text-slate-900 font-mono-tabular">
                Schedule for {selectedDate} ({selectedDayEvents.length} event
                {selectedDayEvents.length === 1 ? '' : 's'})
              </div>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
              >
                Switch to Full List View
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No club meetings or campus events scheduled for {selectedDate}. Select another date in the grid above or schedule a new event.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {selectedDayEvents.map((ev) => {
                  const clubMeta = clubs.find((c) => c.clubId === ev.clubId);
                  const clubLabel = ev.clubName || clubMeta?.name || ev.clubId;
                  const clubCode = ev.clubShortCode || clubMeta?.shortCode || '';
                  const category = ev.eventType ?? 'Campus Event';
                  const rsvpCount = ev.rsvpCount ?? ev.rsvpUserIds?.length ?? 0;
                  const isGoing = Boolean(ev.userHasRsvped);
                  const canDelete = deletableClubIds.has(ev.clubId);

                  return (
                    <div key={ev.eventId}>
                      <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-semibold text-[#004B87]">
                              {clubCode ? `${clubCode} · ${clubLabel}` : clubLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-slate-700">{category}</span>
                            {ev.recurrence && ev.recurrence !== 'None' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 text-[#004B87] font-medium">
                                  <Repeat className="w-3 h-3" />
                                  <span>{ev.recurrence}</span>
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular text-slate-700">
                              {ev.date} at {ev.time}
                            </span>
                            {ev.coSponsorClubCodes && ev.coSponsorClubCodes.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono font-semibold text-[#004B87]">
                                  Co-Sponsored w/ {ev.coSponsorClubCodes.join(', ')}
                                </span>
                              </>
                            )}
                            {ev.userOnWaitlist && (
                              <>
                                <span aria-hidden="true">·</span>
                                <StatusText status="Waitlisted" />
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
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1 text-slate-700 font-mono-tabular">
                              <Users className="w-3.5 h-3.5 text-[#004B87] shrink-0" />
                              <strong>{rsvpCount}</strong> expected attending
                              {typeof ev.inPersonCapacity === 'number' && (
                                <span className="text-slate-500">
                                  · {ev.inPersonConfirmedCount ?? 0}/{ev.inPersonCapacity} room
                                </span>
                              )}
                              {(ev.waitlistCount ?? 0) > 0 && (
                                <span className="text-amber-700 font-semibold">
                                  · {ev.waitlistCount} waitlisted
                                </span>
                              )}
                              {(ev.checkedInCount ?? 0) > 0 && (
                                <span className="text-emerald-700 font-semibold">
                                  · {ev.checkedInCount} checked in
                                </span>
                              )}
                            </span>
                            {typeof ev.avgFeedbackRating === 'number' && (
                              <>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1 font-mono-tabular text-amber-700 font-semibold">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  <span>
                                    {ev.avgFeedbackRating.toFixed(1)} ({ev.feedbackCount ?? 0})
                                  </span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          {!isGoing && !ev.userOnWaitlist && typeof ev.inPersonCapacity === 'number' && (
                            <select
                              aria-label={`RSVP attendance mode for ${ev.title}`}
                              value={
                                rsvpModesByEvent[ev.eventId] ??
                                (ev.inPersonCapacity ? 'In-Person' : 'Virtual')
                              }
                              onChange={(e) =>
                                setRsvpModesByEvent((prev) => ({
                                  ...prev,
                                  [ev.eventId]: e.target.value as 'In-Person' | 'Virtual',
                                }))
                              }
                              className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                            >
                              <option value="In-Person">In-Person Seat</option>
                              <option value="Virtual">Virtual (Zoom)</option>
                            </select>
                          )}

                          <button
                            type="button"
                            disabled={rsvpingId === ev.eventId}
                            onClick={() => void handleToggleRsvp(ev)}
                            aria-pressed={isGoing || Boolean(ev.userOnWaitlist)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                              ev.userOnWaitlist
                                ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100/70'
                                : isGoing
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70'
                                  : 'bg-white border-[#004B87] text-[#004B87] hover:bg-sky-50'
                            }`}
                          >
                            {ev.userOnWaitlist ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>
                                  {rsvpingId === ev.eventId ? 'Updating...' : 'Waitlisted · Leave'}
                                </span>
                              </>
                            ) : isGoing ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>
                                  {rsvpingId === ev.eventId
                                    ? 'Updating...'
                                    : `Attending (${ev.userRsvpMode ?? 'Confirmed'}) · Cancel`}
                                </span>
                              </>
                            ) : (
                              <>
                                <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                                <span>{rsvpingId === ev.eventId ? 'Saving...' : 'RSVP'}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCheckInEventId((prev) =>
                                prev === ev.eventId ? null : ev.eventId
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer ${
                              checkInEventId === ev.eventId
                                ? 'bg-[#004B87] text-white border-[#004B87]'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>
                              Check-In{(ev.checkedInCount ?? 0) > 0 ? ` (${ev.checkedInCount})` : ''}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadEventIcs(ev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <CalendarPlus className="w-3.5 h-3.5 text-[#004B87]" />
                            <span>.ics</span>
                          </button>

                          <a
                            href={buildGoogleCalendarUrl(ev)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0"
                          >
                            <span>Google Cal</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>

                          {onDraftPostForEvent && (
                            <button
                              type="button"
                              onClick={() => onDraftPostForEvent(ev)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                            >
                              <span>Draft Social Post</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              disabled={deletingId === ev.eventId}
                              onClick={() => void handleDeleteEvent(ev)}
                              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{deletingId === ev.eventId ? 'Removing...' : 'Remove'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {checkInEventId === ev.eventId && (
                        <EventCheckInDrawer
                          event={ev}
                          canManage={canDelete}
                          onClose={() => setCheckInEventId(null)}
                          onCheckedIn={onRefresh}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <section
          aria-label="Aggregated Club Events List"
          className="bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No upcoming club meetings or campus events match the current filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredEvents.map((ev) => {
                const clubMeta = clubs.find((c) => c.clubId === ev.clubId);
                const clubLabel = ev.clubName || clubMeta?.name || ev.clubId;
                const clubCode = ev.clubShortCode || clubMeta?.shortCode || '';
                const category = ev.eventType ?? 'Campus Event';
                const canDelete = deletableClubIds.has(ev.clubId);
                const rsvpCount = ev.rsvpCount ?? ev.rsvpUserIds?.length ?? 0;
                const isGoing = Boolean(ev.userHasRsvped);

                return (
                  <div key={ev.eventId}>
                    <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70">
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
                            <span className="font-semibold text-[#004B87]">
                              {clubCode ? `${clubCode} · ${clubLabel}` : clubLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-slate-700">{category}</span>
                            {ev.recurrence && ev.recurrence !== 'None' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 text-[#004B87] font-medium">
                                  <Repeat className="w-3 h-3" />
                                  <span>{ev.recurrence}</span>
                                </span>
                              </>
                            )}
                            {ev.postedByName && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Posted by {ev.postedByName}</span>
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
                            {ev.userOnWaitlist && (
                              <>
                                <span aria-hidden="true">·</span>
                                <StatusText status="Waitlisted" />
                              </>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900">{ev.title}</h3>
                          <p className="text-xs text-slate-600">{ev.description}</p>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-0.5">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{ev.location}</span>
                            </span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1.5 text-slate-700 font-mono-tabular">
                              <Users className="w-3.5 h-3.5 text-[#004B87] shrink-0" />
                              <span className="font-semibold text-slate-900">
                                {rsvpCount}
                              </span>
                              <span>expected attending</span>
                              {typeof ev.inPersonCapacity === 'number' && (
                                <span className="text-slate-500">
                                  · {ev.inPersonConfirmedCount ?? 0}/{ev.inPersonCapacity} room
                                </span>
                              )}
                              {(ev.waitlistCount ?? 0) > 0 && (
                                <span className="font-semibold text-amber-700">
                                  · {ev.waitlistCount} waitlisted
                                </span>
                              )}
                              {(ev.checkedInCount ?? 0) > 0 && (
                                <span className="font-semibold text-emerald-700">
                                  · {ev.checkedInCount} checked in
                                </span>
                              )}
                            </span>
                            {typeof ev.avgFeedbackRating === 'number' && (
                              <>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1 font-mono-tabular text-amber-700 font-semibold">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  <span>
                                    {ev.avgFeedbackRating.toFixed(1)} ({ev.feedbackCount ?? 0})
                                  </span>
                                </span>
                              </>
                            )}
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {(ev.reminderSentCount ?? 0) > 0
                                  ? `24h reminder records (${ev.reminderSentCount})`
                                  : '24h reminder scheduled'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end md:self-center">
                        {!isGoing && !ev.userOnWaitlist && typeof ev.inPersonCapacity === 'number' && (
                          <select
                            aria-label={`RSVP attendance mode for ${ev.title}`}
                            value={
                              rsvpModesByEvent[ev.eventId] ??
                              (ev.inPersonCapacity ? 'In-Person' : 'Virtual')
                            }
                            onChange={(e) =>
                              setRsvpModesByEvent((prev) => ({
                                ...prev,
                                [ev.eventId]: e.target.value as 'In-Person' | 'Virtual',
                              }))
                            }
                            className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                          >
                            <option value="In-Person">In-Person Seat</option>
                            <option value="Virtual">Virtual (Zoom)</option>
                          </select>
                        )}

                        <button
                          type="button"
                          disabled={rsvpingId === ev.eventId}
                          onClick={() => void handleToggleRsvp(ev)}
                          aria-pressed={isGoing || Boolean(ev.userOnWaitlist)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                            ev.userOnWaitlist
                              ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100/70'
                              : isGoing
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70'
                                : 'bg-white border-[#004B87] text-[#004B87] hover:bg-sky-50'
                          }`}
                        >
                          {ev.userOnWaitlist ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>
                                {rsvpingId === ev.eventId ? 'Updating...' : 'Waitlisted · Leave'}
                              </span>
                            </>
                          ) : isGoing ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>
                                {rsvpingId === ev.eventId
                                  ? 'Updating...'
                                  : `Attending (${ev.userRsvpMode ?? 'Confirmed'}) · Cancel`}
                              </span>
                            </>
                          ) : (
                            <>
                              <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>{rsvpingId === ev.eventId ? 'Saving...' : 'RSVP'}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setCheckInEventId((prev) =>
                              prev === ev.eventId ? null : ev.eventId
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer ${
                            checkInEventId === ev.eventId
                              ? 'bg-[#004B87] text-white border-[#004B87]'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>
                            Check-In{(ev.checkedInCount ?? 0) > 0 ? ` (${ev.checkedInCount})` : ''}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadEventIcs(ev)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-[#004B87]" />
                          <span>.ics</span>
                        </button>

                        <a
                          href={buildGoogleCalendarUrl(ev)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0"
                        >
                          <span>Google Cal</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>

                        {onDraftPostForEvent && (
                          <button
                            type="button"
                            onClick={() => onDraftPostForEvent(ev)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                          >
                            <span>Draft Social Post</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            disabled={deletingId === ev.eventId}
                            onClick={() => void handleDeleteEvent(ev)}
                            aria-label={`Remove ${ev.title}`}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{deletingId === ev.eventId ? 'Removing...' : 'Remove'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {checkInEventId === ev.eventId && (
                      <EventCheckInDrawer
                        event={ev}
                        canManage={canDelete}
                        onClose={() => setCheckInEventId(null)}
                        onCheckedIn={onRefresh}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
