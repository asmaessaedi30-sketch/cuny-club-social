import type { DiscoveryEvent } from '../data/clubDiscoveryData';
import { campusDate, shiftCalendarDate } from './calendarDates';

export const CUNY_SPS_CALENDAR_LINKS = {
  openlabStudentLife: 'https://openlab.sps.cuny.edu/groups/cuny-sps-student-life/events/',
  openlabCampus: 'https://openlab.sps.cuny.edu/events/',
  openlabCalendar: 'https://openlab.sps.cuny.edu/groups/cuny-sps-student-life/events/',
  officialNewsEvents: 'https://sps.cuny.edu/news-events/events',
  academicCalendar: 'https://sps.cuny.edu/academics/academic-calendar',
  eventSubmissionForm: 'https://forms.office.com/pages/responsepage.aspx?id=s_BgbwZfCU6XFZiduozH2OUWoTTGNHdIl-sDDEQRP3xUNDgwSTVMSkVKRVMwS0s1WTlSQkQ1M0E0NC4u',
  studentWebmailCalendar: 'https://outlook.office.com/calendar/',
};

export const CUSTOM_EVENTS_STORAGE_KEY = 'cuny_sps_custom_club_events';

function escapeIcs(value: string): string {
  return (value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function parseEventTime(dateStr: string, timeStr: string, addHours = 0): { y: number; m: number; d: number; hh: number; mm: number } {
  const [y, m, d] = dateStr.split('-').map((n) => Number(n) || 0);
  let hh = 18;
  let mm = 0;
  const match = (timeStr || '6:00 PM').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (match) {
    hh = parseInt(match[1], 10);
    mm = parseInt(match[2], 10);
    const meridiem = match[3] ? match[3].toUpperCase() : null;
    if (meridiem === 'PM' && hh < 12) hh += 12;
    if (meridiem === 'AM' && hh === 12) hh = 0;
  }
  return { y, m: m - 1, d, hh: hh + addHours, mm };
}

function formatIcsDateTimeLocal(dateStr: string, timeStr: string, addHours = 0): string {
  const { y, m, d, hh, mm } = parseEventTime(dateStr, timeStr, addHours);
  const base = new Date(Date.UTC(y, m, d, hh, mm, 0));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getUTCFullYear()}${pad(base.getUTCMonth() + 1)}${pad(base.getUTCDate())}T${pad(base.getUTCHours())}${pad(base.getUTCMinutes())}00`;
}

function formatIcsStampUtc(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Builds an RFC-5545 iCalendar VEVENT block for a club event.
 */
export function buildVEventBlock(ev: DiscoveryEvent): string {
  const dtStart = formatIcsDateTimeLocal(ev.date, ev.time, 0);
  const dtEnd = formatIcsDateTimeLocal(ev.date, ev.time, 1);
  const summary = escapeIcs(`[${ev.clubName}] ${ev.title}`);
  const location = escapeIcs(ev.location || 'Virtual / Zoom');
  const description = escapeIcs(
    `${ev.description}\n\nOrganization: ${ev.clubName}\nMeeting Format: ${ev.format}\nDirect URL: ${ev.url || CUNY_SPS_CALENDAR_LINKS.openlabStudentLife}`
  );

  return [
    'BEGIN:VEVENT',
    `UID:${ev.eventId}@cunysps-clubhub`,
    `DTSTAMP:${formatIcsStampUtc()}`,
    `DTSTART;TZID=America/New_York:${dtStart}`,
    `DTEND;TZID=America/New_York:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    ev.url ? `URL:${ev.url}` : '',
    'END:VEVENT'
  ].filter(Boolean).join('\r\n');
}

/**
 * Builds a complete .ics calendar string containing one or multiple events.
 */
export function buildFullCalendarIcs(events: DiscoveryEvent[], calendarTitle = 'CUNY SPS Club Events'): string {
  const vEvents = events.map(buildVEventBlock).join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CUNY SPS//Club Social Hub Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarTitle)}`,
    'X-WR-TIMEZONE:America/New_York',
    vEvents,
    'END:VCALENDAR',
    ''
  ].join('\r\n');
}

/**
 * Triggers an immediate browser download of an .ics file.
 */
export function triggerIcsDownload(icsContent: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single event as an .ics file (compatible with Apple Calendar, Outlook, Google).
 */
export function downloadSingleEventIcs(ev: DiscoveryEvent): void {
  const slug = ev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32);
  const content = buildFullCalendarIcs([ev], `${ev.clubName} - ${ev.title}`);
  triggerIcsDownload(content, `${slug || ev.eventId}.ics`);
}

/**
 * Downloads all upcoming campus events into a single master calendar file.
 */
export function downloadAllEventsIcs(events: DiscoveryEvent[]): void {
  const content = buildFullCalendarIcs(events, 'CUNY SPS Campus Club Calendar');
  triggerIcsDownload(content, 'cuny-sps-club-calendar.ics');
}

/**
 * Generates an Outlook Web Calendar (CUNY Student Webmail / Microsoft 365) deeplink.
 */
export function getOutlookCalendarUrl(ev: DiscoveryEvent): string {
  const { y, m, d, hh, mm } = parseEventTime(ev.date, ev.time, 0);
  const start = new Date(Date.UTC(y, m, d, hh, mm, 0));
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatIso = (dt: Date) =>
    `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:00Z`;

  const details = `${ev.description}\n\nHosted by: ${ev.clubName}\nFormat: ${ev.format}\nDirect Link: ${ev.url || CUNY_SPS_CALENDAR_LINKS.openlabStudentLife}`;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: `[${ev.clubName}] ${ev.title}`,
    startdt: formatIso(start),
    enddt: formatIso(end),
    body: details,
    location: ev.location || 'Virtual (Zoom)',
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates a Google Calendar Web event compose URL.
 */
export function getGoogleCalendarUrl(ev: DiscoveryEvent): string {
  const { y, m, d, hh, mm } = parseEventTime(ev.date, ev.time, 0);
  // Estimate UTC time (EST is UTC-5 in winter, EDT UTC-4 in summer)
  const utcHh = (hh + 5) % 24;
  const pad = (n: number) => String(n).padStart(2, '0');
  const dClean = ev.date.replace(/-/g, '');
  const startCode = `${dClean}T${pad(utcHh)}${pad(mm)}00Z`;
  const endCode = `${dClean}T${pad((utcHh + 1) % 24)}${pad(mm)}00Z`;
  const details = `${ev.description}\n\nOrganization: ${ev.clubName}\nMeeting Format: ${ev.format}\nOfficial Event Link: ${ev.url || CUNY_SPS_CALENDAR_LINKS.openlabStudentLife}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `[${ev.clubName}] ${ev.title}`
  )}&dates=${startCode}/${endCode}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
    ev.location || 'Zoom (Virtual)'
  )}`;
}

/**
 * Determines whether an event has passed 11:59 PM in New York time.
 * If ev.date < currentCampusDate, the event is strictly in the past.
 */
export function isEventUpcoming(ev: DiscoveryEvent, currentCampusDate: string): boolean {
  return ev.date >= currentCampusDate;
}

/**
 * Returns dynamic status badges for events.
 */
export function getEventDateBadge(ev: DiscoveryEvent, currentCampusDate: string): {
  label: string;
  badgeStyle: string;
  isUpcoming: boolean;
} {
  const tomorrowStr = shiftCalendarDate(currentCampusDate, 1, 'day');

  if (ev.date === currentCampusDate) {
    return {
      label: 'Today',
      badgeStyle: 'bg-emerald-500 text-white animate-pulse',
      isUpcoming: true,
    };
  }
  if (ev.date === tomorrowStr) {
    return {
      label: 'Tomorrow',
      badgeStyle: 'bg-amber-400 text-slate-950 font-black',
      isUpcoming: true,
    };
  }
  if (ev.date > currentCampusDate) {
    return {
      label: 'Upcoming',
      badgeStyle: 'bg-slate-800 text-[#C4F500]',
      isUpcoming: true,
    };
  }
  return {
    label: 'Passed (11:59 PM)',
    badgeStyle: 'bg-slate-200 text-slate-600',
    isUpcoming: false,
  };
}

/**
 * Loads custom user-submitted events from local storage.
 */
export function loadCustomEvents(): DiscoveryEvent[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves a new event to local storage so it immediately persists and joins the school calendar.
 */
export function saveCustomEvent(newEvent: DiscoveryEvent): DiscoveryEvent[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [newEvent];
  try {
    const existing = loadCustomEvents().filter((e) => e.eventId !== newEvent.eventId);
    const updated = [newEvent, ...existing];
    localStorage.setItem(CUSTOM_EVENTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [newEvent];
  }
}
