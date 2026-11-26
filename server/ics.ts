import type { ClubEvent } from '../src/types.ts';

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsDateTimeLocal(dateStr: string, timeStr: string, addHours = 0): string {
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  const [hh, mm] = (timeStr || '12:00').split(':').map((n) => Number(n));
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

export function buildIcsFeed(
  events: ClubEvent[],
  calendarName = 'CUNY SPS Club Social Hub Campus Calendar'
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CUNY SPS//Club Social Hub Live Subscription Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:America/New_York',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const ev of events) {
    const dtStart = formatIcsDateTimeLocal(ev.date, ev.time, 0);
    const dtEnd = formatIcsDateTimeLocal(ev.date, ev.time, 1);
    const summaryPrefix = ev.clubShortCode ? `[${ev.clubShortCode}] ` : '';
    const summary = escapeIcsText(`${summaryPrefix}${ev.title}`);
    const location = escapeIcsText(ev.location || 'CUNY SPS Virtual Commons');
    const descriptionParts = [
      ev.description || '',
      ev.clubName ? `Organization: ${ev.clubName}` : '',
      ev.coSponsorClubCodes?.length
        ? `Co-Sponsored With: ${ev.coSponsorClubCodes.join(', ')}`
        : '',
      ev.checkInCode ? `Event Check-In Code: ${ev.checkInCode}` : '',
    ].filter(Boolean);
    const description = escapeIcsText(descriptionParts.join('\n\n'));

    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.eventId}@clubhub.sps.cuny.edu`,
      `DTSTAMP:${formatIcsStampUtc()}`,
      `DTSTART;TZID=America/New_York:${dtStart}`,
      `DTEND;TZID=America/New_York:${dtEnd}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`
    );

    if (ev.recurrence === 'Weekly') {
      lines.push(`RRULE:FREQ=WEEKLY;COUNT=${ev.recurrenceCount ?? 4}`);
    } else if (ev.recurrence === 'Biweekly') {
      lines.push(`RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=${ev.recurrenceCount ?? 4}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
