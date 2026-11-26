import { DataLoadState } from './DataLoadState';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Link2,
  ListChecks,
  Plus,
  Search,
  Share2,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  Club,
  ClubProjectTask,
  ClubTaskAssigneeOption,
  ClubTaskCategory,
  RoleName,
  TaskPriority,
  TaskStatus,
} from '../types';

interface ClubProjectTasksProps {
  clubs: Club[];
  activeClubId: string | null;
  effectiveRole?: RoleName | null;
  onRefreshParent?: () => Promise<void>;
}

interface LinkedEventOption {
  eventId: string;
  title: string;
  date: string;
}

interface LinkedPostOption {
  postId: string;
  title: string;
  status: string;
}

interface TasksApiResponse {
  clubId: string;
  clubName: string;
  clubShortCode: string;
  tasks: ClubProjectTask[];
  assignees: ClubTaskAssigneeOption[];
  events?: LinkedEventOption[];
  posts?: LinkedPostOption[];
}

const CATEGORIES: ClubTaskCategory[] = [
  'Event Operations',
  'Communications',
  'Governance & Finance',
  'Membership Outreach',
];

const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];
const STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Blocked', 'Completed'];
const PROGRESS_STEPS = [0, 25, 50, 75, 100];

function getStatusDisplay(status: TaskStatus) {
  switch (status) {
    case 'Completed':
      return { icon: CheckCircle2, textClass: 'text-emerald-700', barClass: 'bg-emerald-600' };
    case 'Blocked':
      return { icon: AlertCircle, textClass: 'text-red-700', barClass: 'bg-red-600' };
    case 'In Progress':
      return { icon: Clock, textClass: 'text-[#004B87]', barClass: 'bg-[#004B87]' };
    default:
      return { icon: Circle, textClass: 'text-slate-600', barClass: 'bg-slate-400' };
  }
}

function getPriorityTextClass(priority: TaskPriority) {
  if (priority === 'High') return 'text-red-700 font-semibold';
  if (priority === 'Medium') return 'text-amber-700 font-medium';
  return 'text-slate-600';
}

export function ClubProjectTasks({
  clubs,
  activeClubId,
  onRefreshParent,
}: ClubProjectTasksProps) {
  const { session, apiFetch } = useAuth();

  const [selectedClubId, setSelectedClubId] = useState<string>(
    activeClubId || clubs[0]?.clubId || ''
  );
  const [tasks, setTasks] = useState<ClubProjectTask[]>([]);
  const [assignees, setAssignees] = useState<ClubTaskAssigneeOption[]>([]);
  const [events, setEvents] = useState<LinkedEventOption[]>([]);
  const [posts, setPosts] = useState<LinkedPostOption[]>([]);
  const [clubLabel, setClubLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | TaskStatus>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ClubTaskCategory>('All');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create form & Event Prep Checklist
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPrepGenerator, setShowPrepGenerator] = useState(false);
  const [prepEventId, setPrepEventId] = useState('');
  const [generatingPrep, setGeneratingPrep] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<ClubTaskCategory>('Event Operations');
  const [newPriority, setNewPriority] = useState<TaskPriority>('High');
  const [newStatus, setNewStatus] = useState<TaskStatus>('To Do');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-11-24');
  const [newLinkedEventId, setNewLinkedEventId] = useState('');
  const [newLinkedPostId, setNewLinkedPostId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (activeClubId && clubs.some((c) => c.clubId === activeClubId)) {
      setSelectedClubId(activeClubId);
    } else if (!selectedClubId && clubs.length > 0) {
      setSelectedClubId(clubs[0].clubId);
    }
  }, [activeClubId, clubs, selectedClubId]);

  const loadTasks = useCallback(async () => {
    if (!selectedClubId) {
      setTasks([]);
      setAssignees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiFetch<TasksApiResponse>(`/api/clubs/${selectedClubId}/tasks`);
      setTasks(res.tasks);
      setAssignees(res.assignees);
      setEvents(res.events ?? []);
      setPosts(res.posts ?? []);
      setClubLabel(`${res.clubName} (${res.clubShortCode})`);
      setNewAssigneeId((prev) =>
        prev && res.assignees.some((a) => a.userId === prev)
          ? prev
          : res.assignees[0]?.userId ?? ''
      );
      setPrepEventId((prev) =>
        prev && (res.events ?? []).some((ev) => ev.eventId === prev)
          ? prev
          : (res.events?.[0]?.eventId ?? '')
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load club project tasks.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedClubId]);

  useEffect(() => {
    setLoading(true);
    void loadTasks();
  }, [loadTasks]);

  const isClubLeader = Boolean(
    session?.effectiveAdminRole ||
      session?.memberships.some(
        (m) =>
          m.clubId === selectedClubId &&
          m.status === 'Active' &&
          (m.role === 'CLUB_LEAD' || m.role === 'EDITOR')
      )
  );

  const summary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const blocked = tasks.filter((t) => t.status === 'Blocked').length;
    const open = total - completed;
    const avgProgress =
      total > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progressPct, 0) / total) : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, blocked, open, avgProgress, completionRate };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === 'Open' && t.status === 'Completed') return false;
      if (statusFilter !== 'All' && statusFilter !== 'Open' && t.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (assigneeFilter === 'ME' && t.assigneeUserId !== session?.user.userId) return false;
      if (assigneeFilter !== 'ALL' && assigneeFilter !== 'ME' && t.assigneeUserId !== assigneeFilter) {
        return false;
      }
      if (eventFilter === 'LINKED' && !t.linkedEventId && !t.linkedPostId) return false;
      if (eventFilter !== 'ALL' && eventFilter !== 'LINKED' && t.linkedEventId !== eventFilter) {
        return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assigneeName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.linkedEventTitle ?? '').toLowerCase().includes(q) ||
        (t.linkedPostTitle ?? '').toLowerCase().includes(q)
      );
    });
  }, [
    tasks,
    statusFilter,
    categoryFilter,
    assigneeFilter,
    eventFilter,
    searchQuery,
    session?.user.userId,
  ]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubId) return;
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ task: ClubProjectTask }>(
        `/api/clubs/${selectedClubId}/tasks`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: newTitle,
            description: newDescription,
            category: newCategory,
            priority: newPriority,
            status: newStatus,
            assigneeUserId: newAssigneeId,
            dueDate: newDueDate,
            linkedEventId: newLinkedEventId || undefined,
            linkedPostId: newLinkedPostId || undefined,
          }),
        }
      );
      setNewTitle('');
      setNewDescription('');
      setNewLinkedEventId('');
      setNewLinkedPostId('');
      setShowCreateForm(false);
      setFeedback(`Assigned "${res.task.title}" to ${res.task.assigneeName}.`);
      await loadTasks();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to assign project task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateEventPrepChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubId || !prepEventId) return;
    const ev = events.find((item) => item.eventId === prepEventId);
    const defaultAssignee = newAssigneeId || assignees[0]?.userId;
    if (!ev || !defaultAssignee) return;

    setGeneratingPrep(true);
    setError('');
    setFeedback('');
    try {
      const checklistTemplates = [
        {
          title: `Venue & Zoom Room Confirmed — ${ev.title}`,
          description: `Verify room booking / Zoom link accessibility captions and A/V setup ahead of ${ev.date}.`,
          category: 'Event Operations' as ClubTaskCategory,
          priority: 'High' as TaskPriority,
        },
        {
          title: `Promotional Flyer & Alt-Text Approved — ${ev.title}`,
          description: `Prepare WCAG alt-text, CamelCase #CUNYSPS hashtags, and schedule promotional campaign.`,
          category: 'Communications' as ClubTaskCategory,
          priority: 'Medium' as TaskPriority,
        },
        {
          title: `24h Member Email Reminder Verified — ${ev.title}`,
          description: `Confirm RSVP roster and 24-hour automated email reminder queue for ${ev.date}.`,
          category: 'Membership Outreach' as ClubTaskCategory,
          priority: 'Medium' as TaskPriority,
        },
      ];

      await Promise.all(
        checklistTemplates.map((tpl) =>
          apiFetch(`/api/clubs/${selectedClubId}/tasks`, {
            method: 'POST',
            body: JSON.stringify({
              ...tpl,
              status: 'To Do',
              assigneeUserId: defaultAssignee,
              dueDate: ev.date,
              linkedEventId: ev.eventId,
            }),
          })
        )
      );
      setShowPrepGenerator(false);
      setEventFilter(ev.eventId);
      setFeedback(`Generated 3 event prep checklist tasks linked to "${ev.title}".`);
      await loadTasks();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate event prep checklist.');
    } finally {
      setGeneratingPrep(false);
    }
  };

  const handleUpdateTask = async (
    task: ClubProjectTask,
    patch: Partial<{
      status: TaskStatus;
      progressPct: number;
      assigneeUserId: string;
    }>,
    successMessage: string
  ) => {
    setBusyTaskId(task.taskId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${task.clubId}/tasks/${task.taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setFeedback(successMessage);
      await loadTasks();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleDeleteTask = async (task: ClubProjectTask) => {
    setBusyTaskId(task.taskId);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${task.clubId}/tasks/${task.taskId}`, {
        method: 'DELETE',
      });
      setFeedback(`Removed action item "${task.title}".`);
      await loadTasks();
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete task.');
    } finally {
      setBusyTaskId(null);
    }
  };

  if (loading || loadError) return <DataLoadState label="project tasks" loading={loading} error={loadError} onRetry={() => void loadTasks()} />;

  return (
    <div className="space-y-6">
      {/* Header & Operations Progress Overview */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-[#004B87] shrink-0" />
              <span>Club Project Tasks</span>
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Assign action items to club officers and members, monitor deliverables, and track completion progress
              {clubLabel ? ` for ${clubLabel}` : ''}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {clubs.length > 1 && (
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                aria-label="Select student club for project tasks"
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
              >
                {clubs.map((c) => (
                  <option key={c.clubId} value={c.clubId}>
                    {c.name} ({c.shortCode})
                  </option>
                ))}
              </select>
            )}

            {isClubLeader && events.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setFeedback('');
                  setShowPrepGenerator((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Event Prep Checklist</span>
              </button>
            )}

            {isClubLeader && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setFeedback('');
                  setShowCreateForm((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showCreateForm ? 'Close Task Form' : 'Assign Action Item'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Strip & Weighted Completion Progress Bar */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                Overall Operations Progress
              </span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {summary.avgProgress}% avg progress · {summary.completed}/{summary.total} completed
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#004B87] rounded-full transition-all duration-200"
                style={{ width: `${summary.avgProgress}%` }}
              />
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4 lg:border-l lg:border-slate-200 lg:pl-5">
            <div>
              <div className="text-[11px] text-slate-500">Total Tasks</div>
              <div className="text-lg font-bold font-mono-tabular text-slate-900">
                {summary.total}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">In Progress</div>
              <div className="text-lg font-bold font-mono-tabular text-[#004B87]">
                {summary.inProgress}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Completed</div>
              <div className="text-lg font-bold font-mono-tabular text-emerald-700">
                {summary.completed}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({summary.completionRate}%)
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Blocked</div>
              <div
                className={`text-lg font-bold font-mono-tabular ${
                  summary.blocked > 0 ? 'text-red-700' : 'text-slate-800'
                }`}
              >
                {summary.blocked}
              </div>
            </div>
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

      {/* Event Prep Checklist Generator */}
      {showPrepGenerator && isClubLeader && events.length > 0 && (
        <form
          onSubmit={handleGenerateEventPrepChecklist}
          className="bg-white border border-[#004B87] rounded-lg p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3"
        >
          <div className="flex-1 space-y-1">
            <div className="text-xs font-semibold text-slate-900">
              Generate Standard Event Prep Checklist
            </div>
            <p className="text-[11px] text-slate-500">
              Creates 3 linked prep deliverables (Venue/Zoom confirmed, Flyer Alt-Text approved, 24h Reminder verified) for the selected upcoming event.
            </p>
            <select
              value={prepEventId}
              onChange={(e) => setPrepEventId(e.target.value)}
              aria-label="Target event for prep checklist"
              className="w-full sm:max-w-md mt-1.5 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
            >
              {events.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {ev.date} · {ev.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPrepGenerator(false)}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generatingPrep || !prepEventId}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
            >
              {generatingPrep ? 'Generating...' : 'Add 3 Prep Tasks'}
            </button>
          </div>
        </form>
      )}

      {/* Assign Action Item Inline Form */}
      {showCreateForm && isClubLeader && (
        <form
          onSubmit={handleCreateTask}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900">
            Assign New Club Action Item
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Action Item Headline
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Confirm guest speaker Zoom rehearsal and accessibility captions"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Assign To Club Member
              </label>
              <select
                required
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              >
                {assignees.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.name} ({a.roleLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Workstream Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ClubTaskCategory)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Priority Level
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Link to Upcoming Event (Optional)
              </label>
              <select
                value={newLinkedEventId}
                onChange={(e) => setNewLinkedEventId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="">No linked event</option>
                {events.map((ev) => (
                  <option key={ev.eventId} value={ev.eventId}>
                    {ev.date} · {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Link to Social Campaign Post (Optional)
              </label>
              <select
                value={newLinkedPostId}
                onChange={(e) => setNewLinkedPostId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="">No linked campaign post</option>
                {posts.map((p) => (
                  <option key={p.postId} value={p.postId}>
                    [{p.status}] {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Deliverable Notes & Expectations
              </label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Outline expected handoff files, Student Life compliance steps, or review timeline..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newAssigneeId}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
            >
              {submitting ? 'Assigning Task...' : 'Assign Action Item'}
            </button>
          </div>
        </form>
      )}

      {/* Task Board & Filter Toolbar */}
      <section
        aria-label="Club Project Tasks Board"
        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(['All', 'Open', 'To Do', 'In Progress', 'Blocked', 'Completed'] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks or assignees..."
                aria-label="Search club project tasks"
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'All' | ClubTaskCategory)}
              aria-label="Filter tasks by category"
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700"
            >
              <option value="All">All Workstreams</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filter tasks by assignee"
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700"
            >
              <option value="ALL">All Assignees</option>
              <option value="ME">Assigned to Me</option>
              {assignees.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              aria-label="Filter tasks by linked event or campaign"
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700"
            >
              <option value="ALL">All Events &amp; Posts</option>
              <option value="LINKED">Linked to Event or Post</option>
              {events.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  Event: {ev.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-800">
              No project tasks match the current filters.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Assign deliverables to club officers or clear active status and workstream filters to inspect all club tasks.
            </p>
            <div className="flex items-center justify-center gap-3">
              {(statusFilter !== 'All' ||
                categoryFilter !== 'All' ||
                assigneeFilter !== 'ALL' ||
                searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('All');
                    setCategoryFilter('All');
                    setAssigneeFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              {isClubLeader && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Action Item</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredTasks.map((task) => {
              const statusMeta = getStatusDisplay(task.status);
              const StatusIcon = statusMeta.icon;
              const isMyTask = task.assigneeUserId === session?.user.userId;
              const canEditProgress = isClubLeader || isMyTask;
              const isBusy = busyTaskId === task.taskId;
              const isCompleted = task.status === 'Completed';

              return (
                <div
                  key={task.taskId}
                  className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70"
                >
                  {/* Left: Completion Toggle + Task Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={!canEditProgress || isBusy}
                      onClick={() =>
                        void handleUpdateTask(
                          task,
                          isCompleted
                            ? { status: 'In Progress', progressPct: 50 }
                            : { status: 'Completed', progressPct: 100 },
                          isCompleted
                            ? `Reopened "${task.title}" to In Progress.`
                            : `Marked "${task.title}" as Completed.`
                        )
                      }
                      aria-label={
                        isCompleted
                          ? `Reopen ${task.title}`
                          : `Mark ${task.title} complete`
                      }
                      className={`mt-0.5 shrink-0 ${
                        canEditProgress ? 'cursor-pointer hover:opacity-80' : 'opacity-60 cursor-default'
                      }`}
                    >
                      <StatusIcon className={`w-4 h-4 ${statusMeta.textClass}`} />
                    </button>

                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className={`inline-flex items-center gap-1 font-medium ${statusMeta.textClass}`}>
                          <span>{task.status}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className={getPriorityTextClass(task.priority)}>
                          {task.priority} Priority
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular text-slate-700">
                          Due {task.dueDate}
                        </span>
                      </div>

                      <h3
                        className={`text-sm font-semibold ${
                          isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-600">{task.description}</p>

                      <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <UserCheck className="w-3.5 h-3.5 text-[#004B87] shrink-0" />
                          <span>
                            Assigned to <strong className="font-semibold">{task.assigneeName}</strong>{' '}
                            ({task.assigneeRoleLabel})
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span>Delegated by {task.assignedByName}</span>
                        {task.linkedEventTitle && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1 font-medium text-[#004B87]">
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span>Event: {task.linkedEventTitle}</span>
                            </span>
                          </>
                        )}
                        {task.linkedPostTitle && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                              <Share2 className="w-3 h-3 shrink-0" />
                              <span>Campaign: {task.linkedPostTitle}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Progress Meter & Operational Controls */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 lg:pl-4">
                    <div className="w-32 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                        <span className="text-slate-500">Progress</span>
                        <span className="font-semibold text-slate-900">{task.progressPct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${statusMeta.barClass}`}
                          style={{ width: `${task.progressPct}%` }}
                        />
                      </div>
                    </div>

                    {canEditProgress && (
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Status for ${task.title}`}
                          disabled={isBusy}
                          value={task.status}
                          onChange={(e) => {
                            const nextStatus = e.target.value as TaskStatus;
                            void handleUpdateTask(
                              task,
                              { status: nextStatus },
                              `Updated "${task.title}" status to ${nextStatus}.`
                            );
                          }}
                          className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-md text-slate-800 cursor-pointer"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label={`Completion percentage for ${task.title}`}
                          disabled={isBusy}
                          value={
                            PROGRESS_STEPS.includes(task.progressPct) ? task.progressPct : ''
                          }
                          onChange={(e) => {
                            const pct = Number(e.target.value);
                            if (Number.isFinite(pct)) {
                              void handleUpdateTask(
                                task,
                                { progressPct: pct },
                                `Updated "${task.title}" progress to ${pct}%.`
                              );
                            }
                          }}
                          className="px-2 py-1 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md text-slate-800 cursor-pointer"
                        >
                          {!PROGRESS_STEPS.includes(task.progressPct) && (
                            <option value="">{task.progressPct}%</option>
                          )}
                          {PROGRESS_STEPS.map((step) => (
                            <option key={step} value={step}>
                              {step}%
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isClubLeader && assignees.length > 0 && (
                      <select
                        aria-label={`Reassign ${task.title}`}
                        disabled={isBusy}
                        value={task.assigneeUserId}
                        onChange={(e) => {
                          const targetUser = assignees.find((a) => a.userId === e.target.value);
                          void handleUpdateTask(
                            task,
                            { assigneeUserId: e.target.value },
                            `Reassigned "${task.title}" to ${targetUser?.name ?? 'member'}.`
                          );
                        }}
                        className="max-w-[140px] px-2 py-1 text-xs bg-white border border-slate-300 rounded-md text-slate-700 cursor-pointer"
                      >
                        {assignees.map((a) => (
                          <option key={a.userId} value={a.userId}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {isClubLeader && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDeleteTask(task)}
                        aria-label={`Delete ${task.title}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
