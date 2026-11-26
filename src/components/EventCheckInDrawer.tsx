import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  QrCode,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ClubEvent } from '../types';

interface CheckInRosterItem {
  userId: string;
  name: string;
  email: string;
  rsvped: boolean;
  checkedIn: boolean;
}

interface CheckInPayload {
  eventId: string;
  checkInCode: string;
  checkedInCount: number;
  guestWalkInCount: number;
  syncedAnalyticsRecordId: string | null;
  roster: CheckInRosterItem[];
}

interface EventCheckInDrawerProps {
  event: ClubEvent;
  canManage: boolean;
  onClose: () => void;
  onCheckedIn: () => Promise<void>;
}

/** Deterministic SVG matrix representing the event's check-in QR payload */
function DeterministicQrMatrix({ value }: { value: string }) {
  const size = 15;
  const cells = useMemo(() => {
    let seed = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      seed ^= value.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }

    const isFinder = (r: number, c: number, top: number, left: number) => {
      const dr = r - top;
      const dc = c - left;
      if (dr < 0 || dr >= 5 || dc < 0 || dc >= 5) return null;
      const isBorder = dr === 0 || dr === 4 || dc === 0 || dc === 4;
      const isCenter = dr === 2 && dc === 2;
      return isBorder || isCenter;
    };

    const grid: boolean[][] = [];
    for (let r = 0; r < size; r += 1) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c += 1) {
        const f1 = isFinder(r, c, 0, 0);
        const f2 = isFinder(r, c, 0, size - 5);
        const f3 = isFinder(r, c, size - 5, 0);
        if (f1 !== null) row.push(f1);
        else if (f2 !== null) row.push(f2);
        else if (f3 !== null) row.push(f3);
        else {
          seed ^= (r * 31 + c * 17) & 0xff;
          seed = Math.imul(seed, 16777619);
          row.push((Math.abs(seed) % 10) < 5);
        }
      }
      grid.push(row);
    }
    return grid;
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-28 h-28 bg-white p-2 border border-slate-300 rounded-md shrink-0"
      role="img"
      aria-label={`Event check-in QR matrix for ${value}`}
    >
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0F172A" />
          ) : null
        )
      )}
    </svg>
  );
}

export function EventCheckInDrawer({
  event,
  canManage,
  onClose,
  onCheckedIn,
}: EventCheckInDrawerProps) {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<CheckInPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [walkInInput, setWalkInInput] = useState('0');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pulseRating, setPulseRating] = useState<number>(5);
  const [pulseRelevant, setPulseRelevant] = useState<boolean>(true);
  const [pulseTakeaway, setPulseTakeaway] = useState('');
  const [submittingPulse, setSubmittingPulse] = useState(false);

  const loadCheckIn = useCallback(async () => {
    setError('');
    try {
      const res = await apiFetch<CheckInPayload>(
        `/api/clubs/${event.clubId}/events/${event.eventId}/checkin`
      );
      setData(res);
      setWalkInInput(String(res.guestWalkInCount ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load event check-in roster.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, event.clubId, event.eventId]);

  useEffect(() => {
    void loadCheckIn();
  }, [loadCheckIn]);

  const handleSelfCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyKey('self');
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${event.clubId}/events/${event.eventId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ code: codeInput.trim() }),
      });
      setCodeInput('');
      setFeedback('Checked in! Attendance count synced to Event Analytics.');
      await loadCheckIn();
      await onCheckedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid event check-in code.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleRosterMember = async (member: CheckInRosterItem) => {
    setBusyKey(member.userId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${event.clubId}/events/${event.eventId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ userId: member.userId, checkedIn: !member.checkedIn }),
      });
      setFeedback(
        !member.checkedIn
          ? `Checked in ${member.name} and updated Event Analytics.`
          : `Unchecked ${member.name} and updated Event Analytics.`
      );
      await loadCheckIn();
      await onCheckedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update member check-in.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveWalkIns = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyKey('walkin');
    setError('');
    setFeedback('');
    try {
      const count = Math.max(0, Number(walkInInput) || 0);
      await apiFetch(`/api/clubs/${event.clubId}/events/${event.eventId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ guestWalkInCount: count }),
      });
      setFeedback(`Updated walk-in count to ${count} and synced Event Analytics.`);
      await loadCheckIn();
      await onCheckedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update walk-in headcount.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleSubmitFeedbackPulse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPulse(true);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${event.clubId}/events/${event.eventId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: pulseRating,
          relevantToGoals: pulseRelevant,
          takeaway: pulseTakeaway.trim() || undefined,
        }),
      });
      setPulseTakeaway('');
      setFeedback('Submitted post-event feedback pulse. Event satisfaction score updated.');
      await loadCheckIn();
      await onCheckedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit post-event feedback.');
    } finally {
      setSubmittingPulse(false);
    }
  };

  const displayCode = data?.checkInCode || event.checkInCode || 'SPS101';

  return (
    <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <DeterministicQrMatrix value={`${event.eventId}:${displayCode}`} />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-[#004B87]">
                <QrCode className="w-3.5 h-3.5" />
                <span>Live Event Check-In</span>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-mono font-bold text-slate-900">Code: {displayCode}</span>
              {data?.syncedAnalyticsRecordId && (
                <>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Synced to Event Analytics</span>
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Scan QR or enter event code at the room/Zoom session. Verified check-ins automatically
              convert RSVPs into actual attendance records in Event Analytics.
            </p>
            <div className="text-xs font-mono-tabular text-slate-700 flex flex-wrap items-center gap-3">
              <span>
                Verified Check-Ins: <strong>{data?.checkedInCount ?? event.checkedInCount ?? 0}</strong>{' '}
                (RSVPs: {event.rsvpCount ?? event.rsvpUserIds?.length ?? 0})
              </span>
              {typeof event.avgFeedbackRating === 'number' && (
                <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>
                    {event.avgFeedbackRating.toFixed(1)}/5 ({event.feedbackCount ?? 0} ratings)
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close check-in drawer"
          className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-300 rounded-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div role="alert" className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {feedback && (
        <div className="p-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {feedback}
        </div>
      )}

      {/* Self Check-In by Event Code */}
      <form onSubmit={handleSelfCheckIn} className="flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder={`Enter code (e.g. ${displayCode})`}
          aria-label="Event check-in code"
          className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
        />
        <button
          type="submit"
          disabled={busyKey === 'self' || !codeInput.trim()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{busyKey === 'self' ? 'Verifying...' : 'Check In with Code'}</span>
        </button>
        {canManage && (
          <button
            type="button"
            disabled={busyKey === 'self'}
            onClick={() => setCodeInput(displayCode)}
            className="px-2.5 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            Fill Event Code
          </button>
        )}
      </form>

      {/* Leader Attendee Roster Check-In & Walk-In Sync */}
      {canManage && !loading && data && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#004B87]" />
              <span>Attendee &amp; Member Roster Check-In ({data.roster.length})</span>
            </div>

            <form onSubmit={handleSaveWalkIns} className="flex items-center gap-2">
              <label htmlFor={`walkin-${event.eventId}`} className="text-[11px] text-slate-600">
                Walk-in Guests:
              </label>
              <input
                id={`walkin-${event.eventId}`}
                type="number"
                min={0}
                max={500}
                value={walkInInput}
                onChange={(e) => setWalkInInput(e.target.value)}
                className="w-16 px-2 py-1 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
              />
              <button
                type="submit"
                disabled={busyKey === 'walkin'}
                className="px-2.5 py-1 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 rounded-md cursor-pointer"
              >
                Save &amp; Sync
              </button>
            </form>
          </div>

          <div className="divide-y divide-slate-200 max-h-56 overflow-y-auto">
            {data.roster.map((member) => (
              <div
                key={member.userId}
                className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{member.name}</div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    {member.email} · {member.rsvped ? 'RSVP Confirmed' : 'Club Member'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyKey === member.userId}
                  onClick={() => void handleToggleRosterMember(member)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                    member.checkedIn
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-[#004B87] hover:text-[#004B87]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{member.checkedIn ? 'Checked In' : 'Check In'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Question Post-Event Feedback Pulse */}
      <form
        onSubmit={handleSubmitFeedbackPulse}
        className="bg-white border border-slate-200 rounded-md p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-900">
            Post-Event Feedback Pulse (3 Questions)
          </div>
          {event.userSubmittedFeedback && (
            <span className="text-[11px] font-medium text-emerald-700">
              Response recorded (you can update anytime)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <div className="text-[11px] font-medium text-slate-700 mb-1">
              1. Overall Session Rating
            </div>
            <div className="flex items-center gap-1" role="group" aria-label="Event star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setPulseRating(star)}
                  aria-label={`Rate ${star} out of 5`}
                  className={`p-1.5 rounded border cursor-pointer transition-colors ${
                    star <= pulseRating
                      ? 'bg-amber-50 border-amber-300 text-amber-600'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${star <= pulseRating ? 'fill-amber-500' : ''}`} />
                </button>
              ))}
              <span className="ml-1.5 text-xs font-mono-tabular font-semibold text-slate-700">
                {pulseRating}/5
              </span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-700 mb-1">
              2. Relevant to CUNY SPS goals?
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPulseRelevant(true)}
                className={`px-3 py-1 text-xs font-medium rounded border cursor-pointer ${
                  pulseRelevant
                    ? 'bg-[#004B87] text-white border-[#004B87]'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setPulseRelevant(false)}
                className={`px-3 py-1 text-xs font-medium rounded border cursor-pointer ${
                  !pulseRelevant
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Needs Improvement
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              3. Key takeaway or suggestion
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pulseTakeaway}
                onChange={(e) => setPulseTakeaway(e.target.value)}
                placeholder="1-line session takeaway..."
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
              <button
                type="submit"
                disabled={submittingPulse}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
              >
                {submittingPulse ? 'Saving...' : 'Submit Pulse'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
