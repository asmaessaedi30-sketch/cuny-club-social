import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ExternalLink,
  Download,
  Filter,
  Users,
  CheckCircle2,
  CalendarCheck,
  CalendarPlus,
  Share2,
  Sparkles
} from 'lucide-react';
import { DiscoveryEvent, CLUBS_DATA } from '../data/clubDiscoveryData';
import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadSingleEventIcs,
  downloadAllEventsIcs,
  CUNY_SPS_CALENDAR_LINKS
} from '../utils/schoolCalendarSync';
import { campusDate } from '../utils/calendarDates';

interface DedicatedCalendarViewProps {
  events: DiscoveryEvent[];
  currentCampusDate: string;
  onSelectClub?: (clubId: string) => void;
}

export function DedicatedCalendarView({
  events,
  currentCampusDate,
  onSelectClub,
}: DedicatedCalendarViewProps) {
  // Navigation state (Month / Year)
  const [viewDate, setViewDate] = useState(() => {
    const today = new Date(currentCampusDate + 'T12:00:00');
    return isNaN(today.getTime()) ? new Date() : today;
  });

  const [selectedClubFilter, setSelectedClubFilter] = useState<string>('all');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>('all');
  const [selectedDateString, setSelectedDateString] = useState<string>(currentCampusDate);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // Month navigation
  const prevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date(currentCampusDate + 'T12:00:00');
    setViewDate(today);
    setSelectedDateString(currentCampusDate);
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchClub = selectedClubFilter === 'all' || e.clubId === selectedClubFilter;
      const matchFormat =
        selectedFormatFilter === 'all' ||
        (selectedFormatFilter === 'virtual' && e.format.toLowerCase().includes('virtual')) ||
        (selectedFormatFilter === 'in-person' && !e.format.toLowerCase().includes('virtual'));
      return matchClub && matchFormat;
    });
  }, [events, selectedClubFilter, selectedFormatFilter]);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, DiscoveryEvent[]> = {};
    filteredEvents.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  // Calendar Grid Calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: Array<{ dayNumber: number; dateString: string; isCurrentMonth: boolean }> = [];

    // Blank cells before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ dayNumber: 0, dateString: '', isCurrentMonth: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const formattedDay = String(d).padStart(2, '0');
      const dateString = `${year}-${formattedMonth}-${formattedDay}`;
      days.push({ dayNumber: d, dateString, isCurrentMonth: true });
    }

    return days;
  }, [year, month, firstDayOfMonth, daysInMonth]);

  // Selected Day's Events
  const selectedDayEvents = eventsByDate[selectedDateString] || [];

  const handleShareEvent = (event: DiscoveryEvent) => {
    const text = `${event.title} (${event.clubName}) - ${event.date} at ${event.time} | ${event.location}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedEventId(event.eventId);
      setTimeout(() => setCopiedEventId(null), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
              Interactive Master Calendar
            </span>
            <span className="text-xs text-slate-400">Live Campus Time: {currentCampusDate}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <span>{monthName} {year}</span>
          </h3>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Navigation */}
          <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/15">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={jumpToToday}
              className="px-3 py-1 text-xs font-semibold rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* OpenLab Calendar Link */}
          <a
            href={CUNY_SPS_CALENDAR_LINKS.openlabCalendar}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>OpenLab Calendar</span>
          </a>

          {/* Export All ICS */}
          <button
            onClick={() => downloadAllEventsIcs(filteredEvents)}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All .ics</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Filters:</span>
          </div>

          {/* Club Filter */}
          <select
            value={selectedClubFilter}
            onChange={(e) => setSelectedClubFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Student Clubs ({events.length} events)</option>
            {CLUBS_DATA.map((c) => (
              <option key={c.clubId} value={c.clubId}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Format Filter */}
          <select
            value={selectedFormatFilter}
            onChange={(e) => setSelectedFormatFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Formats</option>
            <option value="virtual">Virtual Only (Zoom)</option>
            <option value="in-person">In-Person Only</option>
          </select>
        </div>

        <div className="text-slate-500 font-medium">
          Showing <strong>{filteredEvents.length}</strong> events across {monthName}
        </div>
      </div>

      {/* Main Grid & Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Calendar Grid (7 Cols) */}
        <div className="lg:col-span-8 p-4 sm:p-6">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="min-h-[72px] sm:min-h-[96px] rounded-xl bg-slate-50/50 border border-dashed border-slate-100 p-1.5 opacity-40"
                  />
                );
              }

              const isToday = cell.dateString === currentCampusDate;
              const isSelected = cell.dateString === selectedDateString;
              const dayEvents = eventsByDate[cell.dateString] || [];
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={cell.dateString}
                  onClick={() => setSelectedDateString(cell.dateString)}
                  className={`min-h-[72px] sm:min-h-[96px] rounded-xl p-1.5 sm:p-2 border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                      : isToday
                      ? 'border-amber-400 bg-amber-50/40'
                      : hasEvents
                      ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      : 'border-slate-100 bg-white/70 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday
                          ? 'bg-amber-500 text-slate-950'
                          : isSelected
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasEvents && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Tiny Event Pills on cell */}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.eventId}
                        className="text-[10px] truncate px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-800 font-medium"
                        title={`${ev.time} - ${ev.title} (${ev.clubName})`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-slate-500 font-semibold px-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Drawer (Right Col) */}
        <div className="lg:col-span-4 p-4 sm:p-6 bg-slate-50/60 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Day Details</span>
              <h4 className="text-base font-bold text-slate-900">
                {selectedDateString ? (
                  new Date(selectedDateString + 'T12:00:00').toLocaleDateString('default', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                ) : (
                  'Select a Date'
                )}
              </h4>
            </div>
            {selectedDateString === currentCampusDate && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Today
              </span>
            )}
          </div>

          {/* Event Cards for Selected Day */}
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-10 px-4 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-400 stroke-[1.5]" />
                <p className="text-xs font-medium">No events scheduled for this day.</p>
                <p className="text-[11px] text-slate-400">Click on any date marked with an event badge to inspect its itinerary.</p>
              </div>
            ) : (
              selectedDayEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {ev.clubName}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ev.time}
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-slate-900 leading-snug">{ev.title}</h5>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {ev.description}
                  </p>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                    <a
                      href={getGoogleCalendarUrl(ev)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px] transition-colors"
                    >
                      Google Cal
                    </a>

                    <a
                      href={getOutlookCalendarUrl(ev)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
                    >
                      Outlook
                    </a>

                    <button
                      onClick={() => downloadSingleEventIcs(ev)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors flex items-center gap-1"
                      title="Download .ics file"
                    >
                      <Download className="w-3 h-3" />
                      <span>ICS</span>
                    </button>

                    <button
                      onClick={() => handleShareEvent(ev)}
                      className="ml-auto p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Copy event details"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    {copiedEventId === ev.eventId && (
                      <span className="text-[10px] text-emerald-600 font-semibold">Copied!</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
