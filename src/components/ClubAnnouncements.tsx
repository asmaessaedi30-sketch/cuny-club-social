import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Megaphone,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AnnouncementPriority, ClubAnnouncement } from '../types';

interface ClubAnnouncementsProps {
  announcements: ClubAnnouncement[];
  variant?: 'banner' | 'full';
  onRefresh: () => Promise<void>;
  onOpenFullView?: () => void;
}

function getPriorityPresentation(priority: AnnouncementPriority) {
  switch (priority) {
    case 'Critical':
      return {
        label: 'Critical Update',
        textClass: 'text-red-700',
        icon: AlertTriangle,
      };
    case 'Important':
      return {
        label: 'Important Notice',
        textClass: 'text-amber-700',
        icon: Pin,
      };
    default:
      return {
        label: 'Campus Notice',
        textClass: 'text-[#004B87]',
        icon: Megaphone,
      };
  }
}

export function ClubAnnouncements({
  announcements,
  variant = 'full',
  onRefresh,
  onOpenFullView,
}: ClubAnnouncementsProps) {
  const { session, apiFetch } = useAuth();
  const isStudentLife = Boolean(session?.effectiveAdminRole);

  const [filterMode, setFilterMode] = useState<'all' | 'pinned' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposer, setShowComposer] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('Critical');
  const [audience, setAudience] = useState('All Recognized Student Clubs');
  const [expiresAt, setExpiresAt] = useState('');
  const [pinOnPublish, setPinOnPublish] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const pinnedAnnouncements = announcements.filter((a) => a.pinned);

  const visibleAnnouncements =
    variant === 'banner'
      ? pinnedAnnouncements
      : announcements.filter((a) => {
          if (filterMode === 'pinned' && !a.pinned) return false;
          if (filterMode === 'critical' && a.priority !== 'Critical') return false;
          const q = searchQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            a.title.toLowerCase().includes(q) ||
            a.message.toLowerCase().includes(q) ||
            a.audience.toLowerCase().includes(q) ||
            a.postedByName.toLowerCase().includes(q)
          );
        });

  if (variant === 'banner' && pinnedAnnouncements.length === 0 && !isStudentLife) {
    return null;
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      await apiFetch('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title,
          message,
          priority,
          pinned: pinOnPublish,
          audience,
          expiresAt: expiresAt || undefined,
        }),
      });
      setTitle('');
      setMessage('');
      setExpiresAt('');
      setShowComposer(false);
      setFeedback(
        pinOnPublish
          ? 'Announcement published and pinned to the top of all club dashboards.'
          : 'Announcement published to Club Announcements.'
      );
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (item: ClubAnnouncement) => {
    setBusyId(item.announcementId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/announcements/${item.announcementId}`, {
        method: 'PATCH',
        body: JSON.stringify({ pinned: !item.pinned }),
      });
      setFeedback(
        !item.pinned
          ? `Pinned "${item.title}" to the top of all club dashboards.`
          : `Unpinned "${item.title}" from the dashboard top.`
      );
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update pin state.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: ClubAnnouncement) => {
    setBusyId(item.announcementId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/announcements/${item.announcementId}`, {
        method: 'DELETE',
      });
      setFeedback(`Removed announcement "${item.title}".`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete announcement.');
    } finally {
      setBusyId(null);
    }
  };

  const renderComposerForm = () => (
    <form
      onSubmit={handleCreateAnnouncement}
      className="p-5 bg-slate-50/70 border-b border-slate-200 space-y-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold text-slate-900">
          Post Official Office of Student Life Announcement
        </div>
        <span className="text-[11px] text-slate-500">
          Visible across all active CUNY SPS club workspaces
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Announcement Headline
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Spring Charter Renewal & Budget Freeze Notice"
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Priority Level
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
          >
            <option value="Critical">Critical Update</option>
            <option value="Important">Important Notice</option>
            <option value="General">Campus Notice</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Deadline / Effective Date
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Target Audience
          </label>
          <input
            type="text"
            required
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="All Recognized Student Clubs"
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
          />
        </div>

        <div className="md:col-span-2 flex items-end pb-1">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pinOnPublish}
              onChange={(e) => setPinOnPublish(e.target.checked)}
              className="rounded border-slate-300 text-[#004B87] focus:ring-[#004B87]"
            />
            <span>Pin to the top of the dashboard for all clubs</span>
          </label>
        </div>

        <div className="md:col-span-4">
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Update Details & Required Club Action
          </label>
          <textarea
            rows={2}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Provide clear instructions, deadlines, or policy references for student organization leaders..."
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowComposer(false)}
          className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
        >
          {submitting
            ? 'Publishing...'
            : pinOnPublish
              ? 'Publish & Pin Update'
              : 'Publish Announcement'}
        </button>
      </div>
    </form>
  );

  return (
    <section
      aria-label="Club Announcements"
      className="bg-white border border-slate-200 rounded-lg overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#004B87] shrink-0" />
            <h2 className="text-base font-bold text-slate-900">
              {variant === 'banner'
                ? 'Pinned Club Announcements — Office of Student Life'
                : 'Club Announcements & Campus Directives'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
            {pinnedAnnouncements.length} pinned update
            {pinnedAnnouncements.length === 1 ? '' : 's'} · {announcements.length} total official
            directive{announcements.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {variant === 'full' && (
            <>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search announcements..."
                  aria-label="Search club announcements"
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({announcements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('pinned')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filterMode === 'pinned'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pinned ({pinnedAnnouncements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('critical')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filterMode === 'critical'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Critical Only
                </button>
              </div>
            </>
          )}

          {variant === 'banner' && onOpenFullView && (
            <button
              type="button"
              onClick={onOpenFullView}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>All Announcements</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isStudentLife && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setShowComposer((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showComposer ? 'Close Form' : 'Pin Update'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-5 mt-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md"
        >
          {error}
        </div>
      )}

      {feedback && (
        <div className="mx-5 mt-4 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {feedback}
        </div>
      )}

      {showComposer && isStudentLife && renderComposerForm()}

      {visibleAnnouncements.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500">
          {variant === 'banner'
            ? 'No updates are currently pinned to the dashboard top. Use "Pin Update" to broadcast an urgent Student Life notice to all clubs.'
            : 'No Student Life announcements match the active filter.'}
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {visibleAnnouncements.map((item) => {
            const p = getPriorityPresentation(item.priority);
            const PriorityIcon = p.icon;
            const isBusy = busyId === item.announcementId;
            return (
              <div
                key={item.announcementId}
                className="px-5 py-4 flex flex-col lg:flex-row lg:items-start justify-between gap-4 hover:bg-slate-50/70"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${p.textClass}`}>
                      <PriorityIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{p.label}</span>
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-medium text-slate-700">
                      {item.pinned ? 'Pinned for All Clubs' : 'Archived Notice'}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-500">{item.audience}</span>
                    {item.expiresAt && (
                      <>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono-tabular text-slate-600">
                          <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Deadline {item.expiresAt}</span>
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">{item.message}</p>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span>
                      Posted by {item.postedByName} ({item.postedByTitle})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      Updated {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {isStudentLife && (
                  <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleTogglePin(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {item.pinned ? (
                        <>
                          <PinOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>{isBusy ? 'Updating...' : 'Unpin'}</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5 text-[#004B87]" />
                          <span>{isBusy ? 'Updating...' : 'Pin to Top'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleDelete(item)}
                      aria-label={`Delete ${item.title}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-700 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
