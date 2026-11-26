import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isEventUpcoming,
  getEventDateBadge,
  buildFullCalendarIcs,
  getOutlookCalendarUrl,
  getGoogleCalendarUrl,
  CUNY_SPS_CALENDAR_LINKS
} from '../src/utils/schoolCalendarSync.ts';
import type { DiscoveryEvent } from '../src/data/clubDiscoveryData.ts';

const mockEvent: DiscoveryEvent = {
  eventId: 'evt-test-ai-meeting',
  clubId: 'club-ai',
  clubName: 'Artificial Intelligence Club',
  title: 'AI Prompt Engineering Workshop',
  description: 'Hands-on walk-through of prompt optimization and agent orchestration for CUNY SPS students.',
  date: '2026-11-25',
  time: '7:30 PM',
  format: 'Virtual',
  location: 'Zoom (Virtual)',
  url: 'https://openlab.sps.cuny.edu/events/event/ai-club-meeting-4/'
};

test('11:59 PM Rollover: Events roll off automatically when date advances past 11:59 PM', () => {
  // On November 25, 2026: Event on 2026-11-25 is upcoming
  assert.equal(isEventUpcoming(mockEvent, '2026-11-25'), true, 'Event must be upcoming on the day of the event');

  // When time passes 11:59 PM into midnight (November 26, 2026): Event on 2026-11-25 has passed
  assert.equal(isEventUpcoming(mockEvent, '2026-11-26'), false, 'Event must roll off once time passes 11:59 PM');

  // Earlier events have already rolled off
  const pastEvent: DiscoveryEvent = { ...mockEvent, date: '2026-11-24' };
  assert.equal(isEventUpcoming(pastEvent, '2026-11-25'), false, 'Past event must be marked as not upcoming');

  // Future events remain upcoming
  const futureEvent: DiscoveryEvent = { ...mockEvent, date: '2026-12-01' };
  assert.equal(isEventUpcoming(futureEvent, '2026-11-25'), true, 'December event must remain upcoming');
});

test('Dynamic date badges reflect Today, Tomorrow, and Passed states', () => {
  const todayBadge = getEventDateBadge(mockEvent, '2026-11-25');
  assert.equal(todayBadge.label, 'Today');
  assert.equal(todayBadge.isUpcoming, true);

  const tomorrowEvent: DiscoveryEvent = { ...mockEvent, date: '2026-11-26' };
  const tomorrowBadge = getEventDateBadge(tomorrowEvent, '2026-11-25');
  assert.equal(tomorrowBadge.label, 'Tomorrow');
  assert.equal(tomorrowBadge.isUpcoming, true);

  const pastBadge = getEventDateBadge(mockEvent, '2026-11-26');
  assert.match(pastBadge.label, /Passed/i);
  assert.equal(pastBadge.isUpcoming, false);
});

test('Direct School Calendar Connection: Generates valid RFC-5545 iCalendar feed (.ics)', () => {
  const ics = buildFullCalendarIcs([mockEvent]);
  assert.match(ics, /^BEGIN:VCALENDAR/m, 'Must start with BEGIN:VCALENDAR');
  assert.match(ics, /VERSION:2\.0/m, 'Must specify iCalendar VERSION:2.0');
  assert.match(ics, /X-WR-TIMEZONE:America\/New_York/m, 'Must specify campus timezone America/New_York');
  assert.match(ics, /BEGIN:VEVENT/m, 'Must contain VEVENT block');
  assert.match(ics, /SUMMARY:\[Artificial Intelligence Club\] AI Prompt Engineering Workshop/m, 'Must include club name and title');
  assert.match(ics, /LOCATION:Zoom \(Virtual\)/m, 'Must include location');
  assert.match(ics, /DTSTART;TZID=America\/New_York:20261125T193000/m, 'Must format 7:30 PM start in New York time');
  assert.match(ics, /END:VEVENT/m, 'Must close VEVENT block');
  assert.match(ics, /END:VCALENDAR/m, 'Must close VCALENDAR block');
});

test('Direct School Calendar Connection: Generates CUNY SPS Outlook (@spsmail.cuny.edu) deep link', () => {
  const outlookUrl = getOutlookCalendarUrl(mockEvent);
  assert.match(outlookUrl, /^https:\/\/outlook\.office\.com\/calendar\/0\/deeplink\/compose/);
  assert.match(outlookUrl, /subject=%5BArtificial\+Intelligence\+Club%5D\+AI\+Prompt\+Engineering\+Workshop/);
  assert.match(outlookUrl, /location=Zoom\+%28Virtual%29/);
});

test('Direct School Calendar Connection: Generates Google Calendar Web compose URL', () => {
  const googleUrl = getGoogleCalendarUrl(mockEvent);
  assert.match(googleUrl, /^https:\/\/calendar\.google\.com\/calendar\/render/);
  assert.match(googleUrl, /action=TEMPLATE/);
  assert.match(googleUrl, /Artificial%20Intelligence%20Club/);
});

test('Direct School Calendar Links: Official CUNY SPS OpenLab and Student Life portals', () => {
  assert.match(CUNY_SPS_CALENDAR_LINKS.openlabStudentLife, /openlab\.sps\.cuny\.edu\/groups\/cuny-sps-student-life\/events\//);
  assert.match(CUNY_SPS_CALENDAR_LINKS.officialNewsEvents, /sps\.cuny\.edu\/news-events\/events/);
  assert.match(CUNY_SPS_CALENDAR_LINKS.academicCalendar, /sps\.cuny\.edu\/academics\/academic-calendar/);
});
