import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campusDate, campusTimeMs, shiftCalendarDate } from '../src/utils/calendarDates.ts';

test('New York event instants are independent of process timezone', () => {
  for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
    const original = process.env.TZ;
    try {
      process.env.TZ = zone;
      assert.equal(new Date(campusTimeMs('2026-11-19', '18:30')).toISOString(), '2026-11-19T23:30:00.000Z');
      assert.equal(new Date(campusTimeMs('2026-07-01', '18:30')).toISOString(), '2026-07-01T22:30:00.000Z');
      assert.equal(campusDate(new Date('2026-11-17T02:00:00Z')), '2026-11-16');
    } finally {
      if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
    }
  }
});
test('invalid, missing and ambiguous wall times are rejected', () => {
  for (const [date, time] of [['2026-03-08', '02:30'], ['2026-11-01', '01:30'], ['2026-02-30', '12:00'], ['2026-11-19', '25:00'], ['', '']]) {
    assert.ok(Number.isNaN(campusTimeMs(date, time)));
  }
});
test('calendar navigation handles month ends, leap years and year boundaries', () => {
  assert.equal(shiftCalendarDate('2026-01-31', 1, 'month'), '2026-02-28');
  assert.equal(shiftCalendarDate('2028-01-31', 1, 'month'), '2028-02-29');
  assert.equal(shiftCalendarDate('2026-12-31', 1, 'day'), '2027-01-01');
  assert.equal(shiftCalendarDate('2026-01-01', -7, 'day'), '2025-12-25');
});
