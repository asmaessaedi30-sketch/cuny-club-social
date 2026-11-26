export const CAMPUS_TIME_ZONE = 'America/New_York';

export function campusDate(instant = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instant);
}

/** Resolve a New York wall time without depending on the server/browser timezone.
 * Reject nonexistent and ambiguous DST times instead of silently shifting them.
 */
export function campusTimeMs(date: string, time: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(`${date.trim()}T${time.trim()}`);
  if (!match) return NaN;
  const [, y, m, d, h, min, sec = '00'] = match;
  const wall = Date.UTC(+y, +m - 1, +d, +h, +min, +sec);
  if (new Date(wall).toISOString().slice(0, 19) !== `${y}-${m}-${d}T${h}:${min}:${sec}`) return NaN;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const partsAt = (ms: number) => Object.fromEntries(formatter.formatToParts(ms).map(p => [p.type, p.value]));
  const offsets = new Set<number>();
  for (const delta of [-36, 0, 36]) {
    const sample = wall + delta * 3600000;
    const p = partsAt(sample);
    offsets.add(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - sample);
  }
  const matches = [...offsets].map(offset => wall - offset).filter(candidate => {
    const p = partsAt(candidate);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` === `${y}-${m}-${d}T${h}:${min}:${sec}`;
  });
  return matches.length === 1 ? matches[0] : NaN;
}

export function shiftCalendarDate(date: string, amount: number, unit: 'day' | 'month'): string {
  const value = new Date(`${date}T12:00:00Z`);
  if (unit === 'month') {
    const day = value.getUTCDate();
    value.setUTCDate(1);
    value.setUTCMonth(value.getUTCMonth() + amount);
    const last = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
    value.setUTCDate(Math.min(day, last));
  } else value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
