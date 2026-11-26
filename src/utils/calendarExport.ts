import type { ClubEvent } from '../types';

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsDateTimeLocal(dateStr: string, timeStr: string, addHours = 0): string {
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  let hh = 12;
  let mm = 0;
  const match = (timeStr || '12:00').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (match) {
    hh = parseInt(match[1], 10);
    mm = parseInt(match[2], 10);
    const meridiem = match[3] ? match[3].toUpperCase() : null;
    if (meridiem === 'PM' && hh < 12) hh += 12;
    if (meridiem === 'AM' && hh === 12) hh = 0;
  }
  const base = new Date(
    Date.UTC(
      Number.isFinite(y) ? y : 2026,
      Number.isFinite(m) ? m - 1 : 10,
      Number.isFinite(d) ? d : 15,
      (Number.isFinite(hh) ? hh : 12) + addHours,
      Number.isFinite(mm) ? mm : 0,
      0
    )
  );
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getUTCFullYear()}${pad(base.getUTCMonth() + 1)}${pad(base.getUTCDate())}T${pad(base.getUTCHours())}${pad(base.getUTCMinutes())}00`;
}

function formatIcsStampUtc(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function buildVEventLines(ev: ClubEvent): string[] {
  const dtStart = formatIcsDateTimeLocal(ev.date, ev.time, 0);
  const dtEnd = formatIcsDateTimeLocal(ev.date, ev.time, 1);
  const summaryPrefix = ev.clubShortCode ? `[${ev.clubShortCode}] ` : '';
  const summary = escapeIcsText(`${summaryPrefix}${ev.title}`);
  const location = escapeIcsText(ev.location || 'CUNY SPS Virtual Commons');
  const descriptionParts = [
    ev.description || '',
    ev.clubName ? `Organization: ${ev.clubName}` : '',
    ev.checkInCode ? `Event Check-In Code: ${ev.checkInCode}` : '',
  ].filter(Boolean);
  const description = escapeIcsText(descriptionParts.join('\n\n'));

  const lines = [
    'BEGIN:VEVENT',
    `UID:${ev.eventId}@clubhub.sps.cuny.edu`,
    `DTSTAMP:${formatIcsStampUtc()}`,
    `DTSTART;TZID=America/New_York:${dtStart}`,
    `DTEND;TZID=America/New_York:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
  ];

  if (ev.recurrence === 'Weekly') {
    lines.push(`RRULE:FREQ=WEEKLY;COUNT=${ev.recurrenceCount ?? 4}`);
  } else if (ev.recurrence === 'Biweekly') {
    lines.push(`RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=${ev.recurrenceCount ?? 4}`);
  }

  lines.push('END:VEVENT');
  return lines;
}

export function buildEventIcsContent(ev: ClubEvent): string {
  return buildCalendarIcsContent([ev], ev.clubName ? `${ev.clubName} Events` : 'CUNY SPS Club Event');
}

export function buildCalendarIcsContent(
  events: ClubEvent[],
  calendarName = 'CUNY SPS Club Social Hub Calendar'
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CUNY SPS//Club Social Hub//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:America/New_York',
  ];

  for (const ev of events) {
    lines.push(...buildVEventLines(ev));
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

function triggerIcsDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadEventIcs(ev: ClubEvent): void {
  const slug = ev.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
  const content = buildEventIcsContent(ev);
  triggerIcsDownload(content, `${slug || ev.eventId}.ics`);
}

export function downloadCalendarIcs(
  events: ClubEvent[],
  filename = 'cuny-sps-club-events.ics',
  calendarName = 'CUNY SPS Club Social Hub Calendar'
): void {
  const content = buildCalendarIcsContent(events, calendarName);
  triggerIcsDownload(content, filename);
}

export function buildGoogleCalendarUrl(ev: ClubEvent): string {
  const start = formatIcsDateTimeLocal(ev.date, ev.time, 0);
  const end = formatIcsDateTimeLocal(ev.date, ev.time, 1);
  const titlePrefix = ev.clubShortCode ? `[${ev.clubShortCode}] ` : '';
  const details = [
    ev.description || '',
    ev.clubName ? `Hosted by ${ev.clubName}` : '',
    ev.checkInCode ? `Check-In Code: ${ev.checkInCode}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${titlePrefix}${ev.title}`,
    dates: `${start}/${end}`,
    ctz: 'America/New_York',
    location: ev.location || 'CUNY SPS Virtual Commons',
    details,
  });

  if (ev.recurrence === 'Weekly') {
    params.set('recur', `RRULE:FREQ=WEEKLY;COUNT=${ev.recurrenceCount ?? 4}`);
  } else if (ev.recurrence === 'Biweekly') {
    params.set('recur', `RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=${ev.recurrenceCount ?? 4}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
