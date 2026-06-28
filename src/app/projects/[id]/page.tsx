'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import type { Task } from '@/lib/api';
import { useProject, useTasks, useCreateTask, useUpdateTask } from '@/lib/queries';

// ─── Badge config ─────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  HIGH:   'bg-red-50 text-red-600 ring-1 ring-red-200',
  MEDIUM: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
  LOW:    'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
};

const STATUS_STYLES: Record<Task['status'], string> = {
  TODO:        'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  DONE:        'bg-emerald-50 text-emerald-600',
};

const STATUS_LABELS: Record<Task['status'], string> = {
  TODO:        'To do',
  IN_PROGRESS: 'In progress',
  DONE:        'Done',
};

const STATUS_NEXT: Record<Task['status'], Task['status']> = {
  TODO:        'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE:        'TODO',
};

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { timeZone: 'UTC', dateStyle: 'medium' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading: projectLoading, isError: projectError, error } = useProject(id);

  const [statusFilter, setStatusFilter]     = useState<Task['status'] | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | ''>('');
  const filters = {
    status:   statusFilter   || undefined,
    priority: priorityFilter || undefined,
  };

  const { data: tasks, isLoading: tasksLoading } = useTasks(id, filters);
  const createTask = useCreateTask(id);
  const updateTask = useUpdateTask(id);

  const [showModal,   setShowModal]   = useState(false);
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [dueDate,     setDueDate]     = useState('');
  const [priority,    setPriority]    = useState<Task['priority']>('MEDIUM');
  const [titleError,  setTitleError]  = useState('');
  const [apiError,    setApiError]    = useState('');

  function openModal() {
    setTitle(''); setDescription(''); setDueDate('');
    setPriority('MEDIUM'); setTitleError(''); setApiError('');
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!title.trim()) { setTitleError('Title is required'); return; }
    setTitleError('');
    createTask.mutate(
      { title: title.trim(), description: description.trim() || undefined, dueDate: dueDate ? new Date(dueDate).toISOString() : undefined, priority },
      { onSuccess: closeModal, onError: (err: Error) => setApiError(err.message) }
    );
  }

  function handleToggleStatus(task: Task) {
    updateTask.mutate({ id: task.id, status: STATUS_NEXT[task.status] });
  }

  // ── Loading / error ──
  if (projectLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-28 rounded-lg bg-white/70 animate-pulse" />
        <div className="h-20 rounded-xl bg-white/70 ring-1 ring-black/5 animate-pulse" />
      </div>
    );
  }

  if (projectError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
        <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        {notFound ? 'Project not found.' : 'Failed to load project. Please refresh.'}
      </div>
    );
  }

  if (!project) return null;

  const filtersActive = !!(statusFilter || priorityFilter);
  const doneCount  = tasks?.filter(t => t.status === 'DONE').length ?? 0;
  const totalCount = tasks?.length ?? 0;

  return (
    <>
      {/* ── Breadcrumb ── */}
      <div className="mb-4 flex items-center gap-1 text-xs">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">Projects</Link>
        <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-600 font-medium truncate max-w-xs">{project.name}</span>
      </div>

      {/* ── Project header ── */}
      <div className="mb-5 overflow-hidden rounded-xl bg-white ring-1 ring-black/5 shadow-sm">
        <div className="h-1 w-full" style={{ backgroundColor: project.color }} />
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="mt-0.5 h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-sm"
              style={{ backgroundColor: `${project.color}20`, color: project.color }}
            >
              ◈
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight">{project.name}</h1>
              {project.description && (
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{project.description}</p>
              )}
            </div>
          </div>

          {totalCount > 0 && (
            <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 ring-1 ring-gray-100">
              <div className="h-1 w-12 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(doneCount / totalCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-400">{doneCount}/{totalCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as Task['status'] | '')}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
        </select>

        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as Task['priority'] | '')}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {filtersActive && (
          <button
            onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}

        <button
          onClick={openModal}
          className="ml-auto flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New task
        </button>
      </div>

      {/* ── Task list ── */}
      {tasksLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/70 ring-1 ring-black/5 animate-pulse" />
          ))}
        </div>
      )}

      {!tasksLoading && tasks?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white/60 py-10 text-center">
          <div className="mb-2 h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center">
            <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500">
            {filtersActive ? 'No tasks match these filters' : 'No tasks yet'}
          </p>
        </div>
      )}

      {!tasksLoading && tasks && tasks.length > 0 && (
        <div className="flex flex-col gap-2">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`flex items-start gap-3 rounded-xl bg-white px-4 py-3 ring-1 transition-all ${
                task.status === 'DONE'
                  ? 'ring-black/5 opacity-60'
                  : 'ring-black/5 hover:ring-gray-200 hover:shadow-sm'
              }`}
            >
              {/* Status toggle */}
              <button
                onClick={() => handleToggleStatus(task)}
                disabled={updateTask.isPending}
                title={`Mark as ${STATUS_LABELS[STATUS_NEXT[task.status]]}`}
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-all disabled:opacity-50 ${
                  task.status === 'DONE'
                    ? 'border-emerald-500 bg-emerald-500'
                    : task.status === 'IN_PROGRESS'
                    ? 'border-blue-400 hover:border-blue-500'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                {task.status === 'DONE' && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                )}
              </button>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-sm font-medium ${task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {task.title}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>

                {task.description && (
                  <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{task.description}</p>
                )}

                {task.dueDate && (
                  <div className="mt-1 flex items-center gap-1">
                    <svg className="h-2.5 w-2.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-400">Due {formatDate(task.dueDate)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New Task modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">New task</h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4">
              {apiError && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {apiError}
                </div>
              )}

              <form onSubmit={handleCreateTask} noValidate className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {titleError && <p className="mt-1 text-xs text-red-600">{titleError}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Description <span className="text-xs font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Add more details…"
                    className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Due date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-900 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Priority</label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as Task['priority'])}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-900 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTask.isPending}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createTask.isPending ? 'Creating…' : 'Create task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
