'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import type { Task } from '@/lib/api';
import { useProject, useTasks, useCreateTask, useUpdateTask } from '@/lib/queries';

// ─── Badge config ─────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  HIGH: 'bg-red-100 text-red-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800',
};

const STATUS_STYLES: Record<Task['status'], string> = {
  TODO: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  DONE: 'bg-green-100 text-green-800',
};

const STATUS_LABELS: Record<Task['status'], string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

const STATUS_NEXT: Record<Task['status'], Task['status']> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'TODO',
};

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    dateStyle: 'medium',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();

  // ── Project ──
  const { data: project, isLoading: projectLoading, isError: projectError, error } = useProject(id);

  // ── Filters ──
  const [statusFilter, setStatusFilter] = useState<Task['status'] | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | ''>('');
  const filters = {
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  };

  // ── Tasks ──
  const { data: tasks, isLoading: tasksLoading } = useTasks(id, filters);
  const createTask = useCreateTask(id);
  const updateTask = useUpdateTask(id);

  // ── New task modal state ──
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [titleError, setTitleError] = useState('');
  const [apiError, setApiError] = useState('');

  function openModal() {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('MEDIUM');
    setTitleError('');
    setApiError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');
    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        priority,
      },
      {
        onSuccess: closeModal,
        onError: (err: Error) => setApiError(err.message),
      }
    );
  }

  function handleToggleStatus(task: Task) {
    updateTask.mutate({ id: task.id, status: STATUS_NEXT[task.status] });
  }

  // ── Project loading / error ──
  if (projectLoading) {
    return <p className="text-gray-600">Loading project…</p>;
  }

  if (projectError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        {notFound ? 'Project not found.' : 'Failed to load project. Please refresh.'}
      </div>
    );
  }

  if (!project) return null;

  const filtersActive = !!(statusFilter || priorityFilter);

  return (
    <>
      {/* Back navigation */}
      <div className="mb-4">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← All projects
        </Link>
      </div>

      {/* Project header */}
      <div className="mb-6 bg-white rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="h-4 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
        </div>
        {project.description && (
          <p className="mt-1 text-gray-600">{project.description}</p>
        )}
      </div>

      {/* Task toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as Task['status'] | '')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
        </select>

        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as Task['priority'] | '')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {filtersActive && (
          <button
            onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}

        <button
          onClick={openModal}
          className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Task
        </button>
      </div>

      {/* Task list */}
      {tasksLoading && (
        <p className="text-sm text-gray-600">Loading tasks…</p>
      )}

      {!tasksLoading && tasks?.length === 0 && (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-400">
          {filtersActive
            ? 'No tasks match the current filters.'
            : 'No tasks yet. Create your first task.'}
        </div>
      )}

      {!tasksLoading && tasks && tasks.length > 0 && (
        <div className="flex flex-col gap-3">
          {tasks.map(task => (
            <div key={task.id} className="flex items-start gap-4 rounded-lg bg-white p-4">
              {/* Status toggle */}
              <button
                onClick={() => handleToggleStatus(task)}
                disabled={updateTask.isPending}
                title={`Mark as ${STATUS_LABELS[STATUS_NEXT[task.status]]}`}
                className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-colors disabled:opacity-50 ${
                  task.status === 'DONE'
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 hover:border-blue-500'
                }`}
              />

              {/* Task body */}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`font-medium ${
                      task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>

                {task.description && (
                  <p className="mb-1 text-sm text-gray-600">{task.description}</p>
                )}

                {task.dueDate && (
                  <p className="text-xs text-gray-400">Due {formatDate(task.dueDate)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Task modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">New Task</h2>

            {apiError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {apiError}
              </div>
            )}

            <form onSubmit={handleCreateTask} noValidate className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {titleError && <p className="mt-1 text-sm text-red-600">{titleError}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Due date <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Task['priority'])}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTask.isPending}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createTask.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
