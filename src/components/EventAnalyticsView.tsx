import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  Edit3,
  Filter,
  Plus,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  Club,
  ClubEventType,
  EventAnalyticsPayload,
  EventAttendanceRecord,
  EventFormat,
  RoleName,
} from '../types';

interface EventAnalyticsViewProps {
  clubs: Club[];
  activeClubId: string | null;
  effectiveRole?: RoleName | null;
  onRefreshParent?: () => Promise<void>;
}

const EVENT_CATEGORIES: ('All' | ClubEventType)[] = [
  'All',
  'Club Meeting',
  'Workshop',
  'Campus Event',
  'Networking',
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  return `${MONTHS_SHORT[monthIdx] ?? parts[1]} ${day}`;
}

function formatMonthKey(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length < 2) return isoDate;
  const monthIdx = Number(parts[1]) - 1;
  return `${MONTHS_SHORT[monthIdx] ?? parts[1]} ${parts[0]}`;
}

export function EventAnalyticsView({
  clubs,
  activeClubId,
  onRefreshParent,
}: EventAnalyticsViewProps) {
  const { session, apiFetch } = useAuth();
  const gradientId = useId().replace(/:/g, '');

  const [selectedClubId, setSelectedClubId] = useState<string>(
    activeClubId || clubs[0]?.clubId || ''
  );
  const [payload, setPayload] = useState<EventAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [semesterFilter, setSemesterFilter] = useState<string>('Fall 2026');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ClubEventType>('All');
  const [chartMode, setChartMode] = useState<'timeline' | 'monthly'>('timeline');
  const [showRsvpSeries, setShowRsvpSeries] = useState(true);
  const [showCapacityLine, setShowCapacityLine] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Log new event attendance state
  const [showLogForm, setShowLogForm] = useState(false);
  const [logTitle, setLogTitle] = useState('');
  const [logDate, setLogDate] = useState('2026-11-13');
  const [logSemester, setLogSemester] = useState('Fall 2026');
  const [logCategory, setLogCategory] = useState<ClubEventType>('Workshop');
  const [logFormat, setLogFormat] = useState<EventFormat>('Virtual');
  const [logRegistered, setLogRegistered] = useState('50');
  const [logAttended, setLogAttended] = useState('42');
  const [logCapacity, setLogCapacity] = useState('65');
  const [logNotes, setLogNotes] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);

  // Inline edit attendance headcount state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editRegistered, setEditRegistered] = useState('');
  const [editAttended, setEditAttended] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (activeClubId && clubs.some((c) => c.clubId === activeClubId)) {
      setSelectedClubId(activeClubId);
    } else if (!selectedClubId && clubs.length > 0) {
      setSelectedClubId(clubs[0].clubId);
    }
  }, [activeClubId, clubs, selectedClubId]);

  const loadAnalytics = useCallback(async () => {
    if (!selectedClubId) {
      setPayload(null);
      setLoading(false);
      return;
    }
    setError('');
    try {
      const res = await apiFetch<EventAnalyticsPayload>(
        `/api/clubs/${selectedClubId}/event-analytics`
      );
      setPayload(res);
      setActiveIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load event attendance analytics.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedClubId]);

  useEffect(() => {
    setLoading(true);
    void loadAnalytics();
  }, [loadAnalytics]);

  const canRecordAttendance = Boolean(
    session?.effectiveAdminRole ||
      session?.memberships.some(
        (m) =>
          m.clubId === selectedClubId &&
          m.status === 'Active' &&
          (m.role === 'CLUB_LEAD' || m.role === 'EDITOR')
      )
  );

  const availableSemesters = useMemo(() => {
    const sems = new Set<string>(['Fall 2026', 'Spring 2026']);
    for (const r of payload?.records ?? []) {
      sems.add(r.semester);
    }
    return [...sems];
  }, [payload?.records]);

  useEffect(() => {
    if (!payload) return;
    const hasCurrent = payload.records.some((r) => r.semester === semesterFilter);
    if (!hasCurrent && semesterFilter !== 'All' && payload.records.length > 0) {
      setSemesterFilter(payload.records[payload.records.length - 1].semester);
    }
  }, [payload, semesterFilter]);

  const filteredRecords = useMemo(() => {
    return (payload?.records ?? []).filter((r) => {
      if (semesterFilter !== 'All' && r.semester !== semesterFilter) return false;
      if (categoryFilter !== 'All' && r.eventType !== categoryFilter) return false;
      return true;
    });
  }, [payload?.records, semesterFilter, categoryFilter]);

  // Compute monthly aggregations
  const monthlySeries = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        label: string;
        eventsCount: number;
        totalRegistered: number;
        totalAttended: number;
        totalCapacity: number;
      }
    >();

    for (const r of filteredRecords) {
      const ym = r.date.slice(0, 7);
      const existing = map.get(ym);
      if (existing) {
        existing.eventsCount += 1;
        existing.totalRegistered += r.registeredCount;
        existing.totalAttended += r.attendedCount;
        existing.totalCapacity += r.capacity;
      } else {
        map.set(ym, {
          monthKey: ym,
          label: formatMonthKey(r.date),
          eventsCount: 1,
          totalRegistered: r.registeredCount,
          totalAttended: r.attendedCount,
          totalCapacity: r.capacity,
        });
      }
    }

    return [...map.values()]
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((m) => ({
        ...m,
        avgAttended: Math.round(m.totalAttended / m.eventsCount),
        avgRegistered: Math.round(m.totalRegistered / m.eventsCount),
        showUpRate:
          m.totalRegistered > 0 ? Math.round((m.totalAttended / m.totalRegistered) * 1000) / 10 : 0,
      }));
  }, [filteredRecords]);

  // Summary metrics
  const summary = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        totalAttended: 0,
        totalRegistered: 0,
        avgAttended: 0,
        showUpRate: 0,
        avgFillRate: 0,
        trendDeltaPct: 0,
        peakEvent: null as EventAttendanceRecord | null,
      };
    }

    const totalAttended = filteredRecords.reduce((sum, r) => sum + r.attendedCount, 0);
    const totalRegistered = filteredRecords.reduce((sum, r) => sum + r.registeredCount, 0);
    const totalCapacity = filteredRecords.reduce((sum, r) => sum + r.capacity, 0);
    const avgAttended = Math.round((totalAttended / filteredRecords.length) * 10) / 10;
    const showUpRate =
      totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 1000) / 10 : 0;
    const avgFillRate =
      totalCapacity > 0 ? Math.round((totalAttended / totalCapacity) * 1000) / 10 : 0;

    let trendDeltaPct = 0;
    if (filteredRecords.length >= 2) {
      const mid = Math.floor(filteredRecords.length / 2);
      const early = filteredRecords.slice(0, mid);
      const late = filteredRecords.slice(mid);
      const earlyAvg = early.reduce((s, r) => s + r.attendedCount, 0) / early.length;
      const lateAvg = late.reduce((s, r) => s + r.attendedCount, 0) / late.length;
      if (earlyAvg > 0) {
        trendDeltaPct = Math.round(((lateAvg - earlyAvg) / earlyAvg) * 1000) / 10;
      }
    }

    const peakEvent = filteredRecords.reduce((best, curr) =>
      curr.attendedCount > best.attendedCount ? curr : best
    );

    return {
      totalAttended,
      totalRegistered,
      avgAttended,
      showUpRate,
      avgFillRate,
      trendDeltaPct,
      peakEvent,
    };
  }, [filteredRecords]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const types: ClubEventType[] = ['Workshop', 'Campus Event', 'Networking', 'Club Meeting'];
    const baseRecords = (payload?.records ?? []).filter(
      (r) => semesterFilter === 'All' || r.semester === semesterFilter
    );
    return types
      .map((t) => {
        const subset = baseRecords.filter((r) => r.eventType === t);
        if (subset.length === 0) return null;
        const att = subset.reduce((s, r) => s + r.attendedCount, 0);
        const reg = subset.reduce((s, r) => s + r.registeredCount, 0);
        return {
          eventType: t,
          count: subset.length,
          totalAttended: att,
          avgAttended: Math.round((att / subset.length) * 10) / 10,
          showUpRate: reg > 0 ? Math.round((att / reg) * 100) : 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.avgAttended - a.avgAttended);
  }, [payload?.records, semesterFilter]);

  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubId) return;
    setSubmittingLog(true);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ record: EventAttendanceRecord }>(
        `/api/clubs/${selectedClubId}/event-analytics`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: logTitle,
            date: logDate,
            semester: logSemester,
            eventType: logCategory,
            format: logFormat,
            registeredCount: Number(logRegistered),
            attendedCount: Number(logAttended),
            capacity: Number(logCapacity),
            notes: logNotes,
          }),
        }
      );
      setLogTitle('');
      setLogNotes('');
      setShowLogForm(false);
      setFeedback(`Logged attendance for "${res.record.title}" (${res.record.attendedCount} attendees).`);
      setSemesterFilter(res.record.semester);
      await loadAnalytics();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log event attendance.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleStartEdit = (rec: EventAttendanceRecord) => {
    setEditingRecordId(rec.recordId);
    setEditRegistered(String(rec.registeredCount));
    setEditAttended(String(rec.attendedCount));
    setEditCapacity(String(rec.capacity));
    setError('');
    setFeedback('');
  };

  const handleSaveEdit = async (rec: EventAttendanceRecord) => {
    setSavingEdit(true);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${rec.clubId}/event-analytics/${rec.recordId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          registeredCount: Number(editRegistered),
          attendedCount: Number(editAttended),
          capacity: Number(editCapacity),
        }),
      });
      setEditingRecordId(null);
      setFeedback(`Updated attendance figures for "${rec.title}".`);
      await loadAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update attendance record.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Date',
      'Semester',
      'Event Title',
      'Category',
      'Format',
      'Registered RSVPs',
      'Actual Attended',
      'Capacity',
      'Show-Up Rate (%)',
      'Recorded By',
    ];
    const rows = filteredRecords.map((r) => {
      const showUp =
        r.registeredCount > 0 ? Math.round((r.attendedCount / r.registeredCount) * 1000) / 10 : 0;
      const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
      return [
        r.date,
        r.semester,
        r.title,
        r.eventType,
        r.format,
        r.registeredCount,
        r.attendedCount,
        r.capacity,
        showUp,
        r.recordedByName,
      ]
        .map(escape)
        .join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const code = payload?.clubShortCode?.toLowerCase() ?? 'club';
    link.download = `${code}-event-attendance-${semesterFilter.replace(/\s+/g, '-').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Timeline SVG geometry
  const timelineChart = useMemo(() => {
    const W = 880;
    const H = 264;
    const padL = 46;
    const padR = 24;
    const padT = 22;
    const padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxValRaw = filteredRecords.reduce((max, r) => {
      const capVal = showCapacityLine ? r.capacity : 0;
      const rsvpVal = showRsvpSeries ? r.registeredCount : 0;
      return Math.max(max, r.attendedCount, rsvpVal, capVal);
    }, 10);
    const yMax = Math.ceil((maxValRaw * 1.15) / 10) * 10;

    const count = filteredRecords.length;
    const points = filteredRecords.map((r, idx) => {
      const x =
        count === 1 ? padL + plotW / 2 : padL + (idx / Math.max(count - 1, 1)) * plotW;
      const yAtt = padT + plotH - (r.attendedCount / yMax) * plotH;
      const yReg = padT + plotH - (r.registeredCount / yMax) * plotH;
      const yCap = padT + plotH - (r.capacity / yMax) * plotH;
      return { record: r, x, yAtt, yReg, yCap };
    });

    const attPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yAtt.toFixed(1)}`)
      .join(' ');
    const regPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yReg.toFixed(1)}`)
      .join(' ');
    const capPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yCap.toFixed(1)}`)
      .join(' ');
    const areaPath =
      points.length > 1
        ? `${attPath} L ${points[points.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
        : '';

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      value: Math.round(yMax * frac),
      y: padT + plotH - frac * plotH,
    }));

    return { W, H, padL, padR, padT, padB, plotW, plotH, yMax, points, attPath, regPath, capPath, areaPath, yTicks };
  }, [filteredRecords, showCapacityLine, showRsvpSeries]);

  // Monthly Bar Chart SVG geometry
  const monthlyChart = useMemo(() => {
    const W = 880;
    const H = 264;
    const padL = 46;
    const padR = 24;
    const padT = 22;
    const padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxValRaw = monthlySeries.reduce(
      (max, m) => Math.max(max, m.totalAttended, showRsvpSeries ? m.totalRegistered : 0),
      10
    );
    const yMax = Math.ceil((maxValRaw * 1.15) / 20) * 20;
    const groupW = plotW / Math.max(monthlySeries.length, 1);
    const barW = Math.min(34, Math.max(16, groupW * 0.24));

    const groups = monthlySeries.map((m, idx) => {
      const cx = padL + groupW * idx + groupW / 2;
      const attH = (m.totalAttended / yMax) * plotH;
      const regH = (m.totalRegistered / yMax) * plotH;
      return {
        month: m,
        cx,
        attX: showRsvpSeries ? cx + 3 : cx - barW / 2,
        attY: padT + plotH - attH,
        attH,
        regX: cx - barW - 3,
        regY: padT + plotH - regH,
        regH,
        barW,
      };
    });

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      value: Math.round(yMax * frac),
      y: padT + plotH - frac * plotH,
    }));

    return { W, H, padL, padR, padT, padB, plotW, plotH, yMax, groups, yTicks };
  }, [monthlySeries, showRsvpSeries]);

  const inspectedTimelinePoint =
    chartMode === 'timeline' && filteredRecords.length > 0
      ? filteredRecords[
          activeIndex !== null && activeIndex < filteredRecords.length
            ? activeIndex
            : filteredRecords.length - 1
        ]
      : null;

  const inspectedMonth =
    chartMode === 'monthly' && monthlySeries.length > 0
      ? monthlySeries[
          activeIndex !== null && activeIndex < monthlySeries.length
            ? activeIndex
            : monthlySeries.length - 1
        ]
      : null;

  const maxCategoryAvg = Math.max(...categoryBreakdown.map((c) => c.avgAttended), 1);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Event Attendance Analytics</h1>
            <p className="text-xs text-slate-600 mt-1">
              Academic semester attendance trends, RSVP conversion rates, and upcoming turnout projections
              {payload ? ` for ${payload.clubName} (${payload.clubShortCode})` : ''}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {clubs.length > 1 && (
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                aria-label="Select student club for event analytics"
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
              >
                {clubs.map((c) => (
                  <option key={c.clubId} value={c.clubId}>
                    {c.name} ({c.shortCode})
                  </option>
                ))}
              </select>
            )}

            <select
              value={semesterFilter}
              onChange={(e) => {
                setSemesterFilter(e.target.value);
                setActiveIndex(null);
              }}
              aria-label="Filter by academic semester"
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
            >
              {availableSemesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
              <option value="All">All Semesters</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {canRecordAttendance && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setFeedback('');
                  setShowLogForm((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showLogForm ? 'Close Log Form' : 'Log Event Attendance'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
            {EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat);
                  setActiveIndex(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'All' ? 'All Event Types' : cat}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-mono-tabular">
            {filteredRecords.length} session{filteredRecords.length === 1 ? '' : 's'} analyzed
          </div>
        </div>
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

      {/* Inline Log Event Attendance Form */}
      {showLogForm && canRecordAttendance && (
        <form
          onSubmit={handleLogAttendance}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900">
            Record Completed Event Attendance
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Event Title
              </label>
              <input
                type="text"
                required
                value={logTitle}
                onChange={(e) => setLogTitle(e.target.value)}
                placeholder="e.g., Applied AI Governance Workshop"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Semester</label>
              <input
                type="text"
                required
                value={logSemester}
                onChange={(e) => setLogSemester(e.target.value)}
                placeholder="Fall 2026"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Category</label>
              <select
                value={logCategory}
                onChange={(e) => setLogCategory(e.target.value as ClubEventType)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="Club Meeting">Club Meeting</option>
                <option value="Workshop">Workshop</option>
                <option value="Campus Event">Campus Event</option>
                <option value="Networking">Networking</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Format</label>
              <select
                value={logFormat}
                onChange={(e) => setLogFormat(e.target.value as EventFormat)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="Virtual">Virtual</option>
                <option value="Hybrid">Hybrid</option>
                <option value="In-Person">In-Person</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Registered RSVPs
              </label>
              <input
                type="number"
                min={0}
                required
                value={logRegistered}
                onChange={(e) => setLogRegistered(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Actual Attended
              </label>
              <input
                type="number"
                min={0}
                required
                value={logAttended}
                onChange={(e) => setLogAttended(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Capacity
              </label>
              <input
                type="number"
                min={1}
                required
                value={logCapacity}
                onChange={(e) => setLogCapacity(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Attendance Notes (Optional)
              </label>
              <input
                type="text"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="e.g., High conversion after 24-hour reminder email."
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingLog}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
            >
              {submittingLog ? 'Saving Record...' : 'Save Attendance Record'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
            <div className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
            <div className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
            <div className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
          </div>
          <div className="h-80 bg-white border border-slate-200 rounded-lg animate-pulse" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-800">
            No event attendance records match {semesterFilter === 'All' ? 'any semester' : semesterFilter}
            {categoryFilter !== 'All' ? ` (${categoryFilter})` : ''}.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Record session headcounts after club meetings or campus workshops to visualize turnout velocity and RSVP show-up conversion across the semester.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            {(categoryFilter !== 'All' || semesterFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('All');
                  setSemesterFilter('All');
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
              >
                Reset Filters
              </button>
            )}
            {canRecordAttendance && (
              <button
                type="button"
                onClick={() => setShowLogForm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log First Event Attendance</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* KPI Summary Grid (Single Elevation Flat Hairline Surfaces) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Total Verified Attendance</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono-tabular text-slate-900">
                  {summary.totalAttended.toLocaleString()}
                </span>
                <span
                  className={`text-xs font-mono-tabular font-medium ${
                    summary.trendDeltaPct >= 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {summary.trendDeltaPct >= 0 ? `+${summary.trendDeltaPct}%` : `${summary.trendDeltaPct}%`} mid-term pace
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono-tabular">
                {summary.totalRegistered.toLocaleString()} total RSVPs across {filteredRecords.length} events
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Average Attendance / Event</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono-tabular text-slate-900">
                  {summary.avgAttended}
                </span>
                <span className="text-xs font-mono-tabular text-slate-600">
                  {summary.avgFillRate}% avg capacity fill
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Verified check-ins per session
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">RSVP-to-Attendance Rate</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono-tabular text-[#004B87]">
                  {summary.showUpRate}%
                </span>
                <span className="text-xs font-mono-tabular text-slate-600">
                  {summary.totalAttended}/{summary.totalRegistered} attended
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Confirmed registrants who checked in
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Peak Semester Event</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono-tabular text-slate-900">
                  {summary.peakEvent?.attendedCount ?? 0}
                </span>
                <span className="text-xs font-mono-tabular text-slate-600">
                  {summary.peakEvent ? formatShortDate(summary.peakEvent.date) : ''}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1 truncate" title={summary.peakEvent?.title}>
                {summary.peakEvent?.title ?? '—'}
              </div>
            </div>
          </div>

          {/* Primary Focal Anchor: Semester Attendance Trend Chart */}
          <section
            aria-label="Semester Attendance Trend Visualization"
            className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#004B87] shrink-0" />
                  <span>
                    {chartMode === 'timeline'
                      ? 'Chronological Event Attendance Trend'
                      : 'Monthly Attendance & RSVP Volume'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hover or select any data point below to inspect exact session check-ins and RSVP conversion.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showRsvpSeries}
                    onChange={(e) => setShowRsvpSeries(e.target.checked)}
                    className="accent-[#0284C7] rounded"
                  />
                  <span>Show RSVPs</span>
                </label>

                {chartMode === 'timeline' && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showCapacityLine}
                      onChange={(e) => setShowCapacityLine(e.target.checked)}
                      className="accent-slate-500 rounded"
                    />
                    <span>Show Capacity</span>
                  </label>
                )}

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                  <button
                    type="button"
                    onClick={() => {
                      setChartMode('timeline');
                      setActiveIndex(null);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      chartMode === 'timeline'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per-Event Trend
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChartMode('monthly');
                      setActiveIndex(null);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      chartMode === 'monthly'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monthly Rollup
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Inspection Readout Strip (Unboxed Typography) */}
            <div className="py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              {chartMode === 'timeline' && inspectedTimelinePoint ? (
                <>
                  <div className="min-w-0 flex flex-wrap items-center gap-2">
                    <span className="font-mono-tabular font-semibold text-slate-700">
                      {inspectedTimelinePoint.date}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-900 truncate">
                      {inspectedTimelinePoint.title}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-600">
                      {inspectedTimelinePoint.eventType} ({inspectedTimelinePoint.format})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 font-mono-tabular shrink-0">
                    <span className="text-[#004B87] font-semibold">
                      Attended: {inspectedTimelinePoint.attendedCount}
                    </span>
                    <span className="text-sky-700">
                      RSVPs: {inspectedTimelinePoint.registeredCount}
                    </span>
                    <span className="text-slate-600">
                      Conversion:{' '}
                      {inspectedTimelinePoint.registeredCount > 0
                        ? Math.round(
                            (inspectedTimelinePoint.attendedCount /
                              inspectedTimelinePoint.registeredCount) *
                              1000
                          ) / 10
                        : 0}
                      %
                    </span>
                  </div>
                </>
              ) : chartMode === 'monthly' && inspectedMonth ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{inspectedMonth.label}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-600 font-mono-tabular">
                      {inspectedMonth.eventsCount} event{inspectedMonth.eventsCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 font-mono-tabular shrink-0">
                    <span className="text-[#004B87] font-semibold">
                      Total Attended: {inspectedMonth.totalAttended} (avg {inspectedMonth.avgAttended}/event)
                    </span>
                    <span className="text-sky-700">
                      Total RSVPs: {inspectedMonth.totalRegistered}
                    </span>
                    <span className="text-slate-600">
                      Show-Up: {inspectedMonth.showUpRate}%
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Responsive SVG Visualization */}
            <div className="w-full overflow-x-auto">
              {chartMode === 'timeline' ? (
                <svg
                  viewBox={`0 0 ${timelineChart.W} ${timelineChart.H}`}
                  className="w-full min-w-[600px] h-auto select-none"
                  role="img"
                  aria-label="Event attendance line and area trend chart over semester"
                >
                  <defs>
                    <linearGradient id={`att-fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#004B87" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#004B87" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Y Gridlines & Labels */}
                  {timelineChart.yTicks.map((tick) => (
                    <g key={tick.value}>
                      <line
                        x1={timelineChart.padL}
                        y1={tick.y}
                        x2={timelineChart.W - timelineChart.padR}
                        y2={tick.y}
                        stroke="#E2E8F0"
                        strokeDasharray={tick.value === 0 ? undefined : '4 4'}
                        strokeWidth={1}
                      />
                      <text
                        x={timelineChart.padL - 8}
                        y={tick.y + 4}
                        textAnchor="end"
                        fontSize={11}
                        fill="#64748B"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {tick.value}
                      </text>
                    </g>
                  ))}

                  {/* Area under Actual Attendance */}
                  {timelineChart.areaPath && (
                    <path d={timelineChart.areaPath} fill={`url(#att-fill-${gradientId})`} />
                  )}

                  {/* Optional Capacity Benchmark Line */}
                  {showCapacityLine && timelineChart.points.length > 1 && (
                    <path
                      d={timelineChart.capPath}
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth={1.5}
                      strokeDasharray="3 4"
                    />
                  )}

                  {/* Optional Registered RSVPs Dashed Line */}
                  {showRsvpSeries && timelineChart.points.length > 1 && (
                    <path
                      d={timelineChart.regPath}
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                  )}

                  {/* Actual Attendance Primary Solid Line */}
                  {timelineChart.points.length > 1 && (
                    <path
                      d={timelineChart.attPath}
                      fill="none"
                      stroke="#004B87"
                      strokeWidth={2.75}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Data Nodes & X-Axis Labels */}
                  {timelineChart.points.map((pt, idx) => {
                    const isSelected =
                      activeIndex === idx ||
                      (activeIndex === null && idx === timelineChart.points.length - 1);
                    return (
                      <g
                        key={pt.record.recordId}
                        className="cursor-pointer"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => setActiveIndex(idx)}
                      >
                        {/* Vertical guide on active node */}
                        {isSelected && (
                          <line
                            x1={pt.x}
                            y1={timelineChart.padT}
                            x2={pt.x}
                            y2={timelineChart.padT + timelineChart.plotH}
                            stroke="#CBD5E1"
                            strokeWidth={1}
                          />
                        )}

                        {/* Registered node */}
                        {showRsvpSeries && (
                          <circle
                            cx={pt.x}
                            cy={pt.yReg}
                            r={isSelected ? 4.5 : 3.5}
                            fill="#FFFFFF"
                            stroke="#0284C7"
                            strokeWidth={2}
                          />
                        )}

                        {/* Attendance node */}
                        <circle
                          cx={pt.x}
                          cy={pt.yAtt}
                          r={isSelected ? 6 : 4.5}
                          fill={isSelected ? '#004B87' : '#FFFFFF'}
                          stroke="#004B87"
                          strokeWidth={2.5}
                        />

                        {/* Value label above attendance point */}
                        <text
                          x={pt.x}
                          y={pt.yAtt - 10}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={isSelected ? 700 : 500}
                          fill={isSelected ? '#0F172A' : '#475569'}
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {pt.record.attendedCount}
                        </text>

                        {/* Date label along X axis */}
                        <text
                          x={pt.x}
                          y={timelineChart.H - 12}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={isSelected ? 700 : 400}
                          fill={isSelected ? '#004B87' : '#64748B'}
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {formatShortDate(pt.record.date)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <svg
                  viewBox={`0 0 ${monthlyChart.W} ${monthlyChart.H}`}
                  className="w-full min-w-[600px] h-auto select-none"
                  role="img"
                  aria-label="Monthly attendance vs RSVPs bar chart over semester"
                >
                  {monthlyChart.yTicks.map((tick) => (
                    <g key={tick.value}>
                      <line
                        x1={monthlyChart.padL}
                        y1={tick.y}
                        x2={monthlyChart.W - monthlyChart.padR}
                        y2={tick.y}
                        stroke="#E2E8F0"
                        strokeDasharray={tick.value === 0 ? undefined : '4 4'}
                        strokeWidth={1}
                      />
                      <text
                        x={monthlyChart.padL - 8}
                        y={tick.y + 4}
                        textAnchor="end"
                        fontSize={11}
                        fill="#64748B"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {tick.value}
                      </text>
                    </g>
                  ))}

                  {monthlyChart.groups.map((g, idx) => {
                    const isSelected =
                      activeIndex === idx ||
                      (activeIndex === null && idx === monthlyChart.groups.length - 1);
                    return (
                      <g
                        key={g.month.monthKey}
                        className="cursor-pointer"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => setActiveIndex(idx)}
                      >
                        {showRsvpSeries && (
                          <g>
                            <rect
                              x={g.regX}
                              y={g.regY}
                              width={g.barW}
                              height={Math.max(2, g.regH)}
                              rx={3}
                              fill={isSelected ? '#7DD3FC' : '#BAE6FD'}
                            />
                            <text
                              x={g.regX + g.barW / 2}
                              y={g.regY - 6}
                              textAnchor="middle"
                              fontSize={10}
                              fill="#0369A1"
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              {g.month.totalRegistered}
                            </text>
                          </g>
                        )}

                        <rect
                          x={g.attX}
                          y={g.attY}
                          width={g.barW}
                          height={Math.max(2, g.attH)}
                          rx={3}
                          fill={isSelected ? '#003865' : '#004B87'}
                        />
                        <text
                          x={g.attX + g.barW / 2}
                          y={g.attY - 6}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={600}
                          fill="#0F172A"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {g.month.totalAttended}
                        </text>

                        <text
                          x={g.cx}
                          y={monthlyChart.H - 12}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={isSelected ? 700 : 500}
                          fill={isSelected ? '#004B87' : '#475569'}
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {g.month.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-1 bg-[#004B87] rounded-full inline-block" />
                <span>Actual Attendance (Checked In)</span>
              </span>
              {showRsvpSeries && (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#0284C7] inline-block" />
                  <span>Registered RSVPs</span>
                </span>
              )}
              {showCapacityLine && chartMode === 'timeline' && (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-0.5 border-t-2 border-dotted border-slate-400 inline-block" />
                  <span>Room / Virtual Capacity</span>
                </span>
              )}
            </div>
          </section>

          {/* Secondary Row: Category Breakdown & Live Upcoming RSVP Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Attendance by Event Format & Category
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Average turnout and RSVP show-up conversion across event types ({semesterFilter}).
                </p>
              </div>

              <div className="space-y-4">
                {categoryBreakdown.map((cat) => {
                  const widthPct = Math.max(8, Math.round((cat.avgAttended / maxCategoryAvg) * 100));
                  return (
                    <div key={cat.eventType} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">
                          {cat.eventType}{' '}
                          <span className="text-slate-400 font-mono-tabular">
                            ({cat.count} session{cat.count === 1 ? '' : 's'})
                          </span>
                        </span>
                        <span className="font-mono-tabular text-slate-700">
                          <strong className="text-slate-900">{cat.avgAttended}</strong> avg ·{' '}
                          {cat.showUpRate}% show-up
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#004B87] rounded-full transition-all duration-200"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#004B87]" />
                  <span>Upcoming Events RSVP Pipeline</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live member RSVPs compared against your {summary.avgAttended}-attendee semester average.
                </p>
              </div>

              {!payload?.upcomingProjections.length ? (
                <div className="py-6 text-xs text-slate-500">
                  No upcoming events scheduled for this club yet. Post a meeting or campus event to track live RSVP momentum.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {payload.upcomingProjections.map((up) => {
                    const pacePct =
                      summary.avgAttended > 0
                        ? Math.min(100, Math.round((up.rsvpCount / summary.avgAttended) * 100))
                        : 0;
                    return (
                      <div key={up.eventId} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {up.title}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono-tabular">
                              {up.date} · {up.time} · {up.eventType}
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1.5 text-xs font-mono-tabular font-semibold text-[#004B87] whitespace-nowrap shrink-0">
                            <Users className="w-3.5 h-3.5" />
                            <span>{up.rsvpCount} RSVPs</span>
                            {(up.waitlistCount ?? 0) > 0 && (
                              <span className="text-amber-700">
                                · {up.waitlistCount} waitlisted
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0284C7] rounded-full"
                            style={{ width: `${Math.max(4, pacePct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Unified Club Engagement Funnel (Reach -> RSVP -> Check-In -> Club Join) */}
          {payload?.engagementFunnel && (() => {
            const funnel = payload.engagementFunnel;
            const stages = [
              { label: 'Social Reach', value: funnel.socialReach, sub: 'Platform impressions & viewers' },
              { label: 'Post Engagements', value: funnel.socialEngagements, sub: 'Clicks, shares & saves' },
              { label: 'Event RSVPs', value: funnel.eventRsvps, sub: 'Confirmed seats' },
              { label: 'Verified Check-Ins', value: funnel.verifiedCheckIns, sub: 'QR & walk-in attendance' },
              { label: 'Join Requests', value: funnel.joinRequestsSubmitted, sub: 'Directory applications' },
              { label: 'Approved Members', value: funnel.newMembersApproved, sub: 'Roster conversions' },
            ];
            const maxVal = Math.max(...stages.map((s) => s.value), 1);
            const rsvpToCheckIn =
              funnel.eventRsvps > 0
                ? Math.round((funnel.verifiedCheckIns / funnel.eventRsvps) * 100)
                : 0;
            const joinConv =
              funnel.joinRequestsSubmitted > 0
                ? Math.round((funnel.newMembersApproved / funnel.joinRequestsSubmitted) * 100)
                : 0;

            return (
              <section
                aria-label="Unified Club Engagement Funnel"
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#004B87]" />
                      <span>Unified Club Engagement Funnel (Reach → RSVP → Check-In → Join)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Correlates social distribution, event registration conversion, verified attendance, and student onboarding.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono-tabular text-slate-600 shrink-0">
                    <span>Attendance Conv: <strong className="text-[#004B87]">{rsvpToCheckIn}%</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Join Approval: <strong className="text-emerald-700">{joinConv}%</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {stages.map((stage) => {
                    const barPct = Math.max(8, Math.round((stage.value / maxVal) * 100));
                    return (
                      <div
                        key={stage.label}
                        className="p-3 bg-slate-50/70 border border-slate-200 rounded-md flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="text-[11px] font-medium text-slate-600">{stage.label}</div>
                          <div className="text-lg font-bold font-mono-tabular text-slate-900 mt-0.5">
                            {stage.value.toLocaleString()}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#004B87] rounded-full"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500">{stage.sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* High-Density Semester Attendance Ledger Table */}
          <section
            aria-label="Event Attendance Ledger"
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-slate-900">
                Semester Event Attendance Ledger
              </h2>
              <span className="text-xs text-slate-500 font-mono-tabular">
                {filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Event & Format</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-right">RSVPs</th>
                    <th className="py-2.5 px-4 text-right">Attended</th>
                    <th className="py-2.5 px-4 text-right">Capacity</th>
                    <th className="py-2.5 px-4 text-right">Show-Up %</th>
                    <th className="py-2.5 px-4 text-right">Pulse</th>
                    {canRecordAttendance && <th className="py-2.5 px-4 text-right">Adjust</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredRecords.map((rec) => {
                    const isEditing = editingRecordId === rec.recordId;
                    const showUp =
                      rec.registeredCount > 0
                        ? Math.round((rec.attendedCount / rec.registeredCount) * 1000) / 10
                        : 0;
                    const fillPct =
                      rec.capacity > 0 ? Math.round((rec.attendedCount / rec.capacity) * 100) : 0;
                    const coSponsorLabels = (rec.coSponsorClubIds ?? [])
                      .map((cid) => clubs.find((c) => c.clubId === cid)?.shortCode ?? cid)
                      .filter(Boolean);

                    return (
                      <tr key={rec.recordId} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {rec.title}
                            {coSponsorLabels.length > 0 && (
                              <span className="ml-2 text-[11px] font-mono text-[#004B87]">
                                · Co-Sponsored: {coSponsorLabels.join(', ')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {rec.semester} · {rec.format}
                            {rec.notes ? ` · ${rec.notes}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                          {rec.eventType}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-700">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={editRegistered}
                              onChange={(e) => setEditRegistered(e.target.value)}
                              aria-label={`Edit RSVPs for ${rec.title}`}
                              className="w-16 px-2 py-1 text-right text-xs font-mono-tabular bg-white border border-slate-300 rounded"
                            />
                          ) : (
                            rec.registeredCount
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-slate-900">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={editAttended}
                              onChange={(e) => setEditAttended(e.target.value)}
                              aria-label={`Edit attended count for ${rec.title}`}
                              className="w-16 px-2 py-1 text-right text-xs font-mono-tabular bg-white border border-slate-300 rounded"
                            />
                          ) : (
                            rec.attendedCount
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-600">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              value={editCapacity}
                              onChange={(e) => setEditCapacity(e.target.value)}
                              aria-label={`Edit capacity for ${rec.title}`}
                              className="w-16 px-2 py-1 text-right text-xs font-mono-tabular bg-white border border-slate-300 rounded"
                            />
                          ) : (
                            `${rec.capacity} (${fillPct}%)`
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-[#004B87]">
                          {showUp}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-amber-700 whitespace-nowrap">
                          {typeof rec.avgFeedbackRating === 'number' ? (
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{rec.avgFeedbackRating.toFixed(1)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {canRecordAttendance && (
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={savingEdit}
                                  onClick={() => void handleSaveEdit(rec)}
                                  className="text-xs font-medium text-[#004B87] hover:underline cursor-pointer disabled:opacity-50"
                                >
                                  {savingEdit ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingRecordId(null)}
                                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(rec)}
                                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-[#004B87] cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
