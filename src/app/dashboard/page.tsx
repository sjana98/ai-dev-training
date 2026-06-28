'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProjects, useCreateProject } from '@/lib/queries';

const DEFAULT_COLOR = '#3b82f6';

export default function DashboardPage() {
  const { data: projects, isLoading, isError } = useProjects();

  // ── Modal state ──
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [nameError, setNameError] = useState('');
  const [apiError, setApiError] = useState('');

  function openModal() {
    setName('');
    setDescription('');
    setColor(DEFAULT_COLOR);
    setNameError('');
    setApiError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  const mutation = useCreateProject();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!name.trim()) {
      setNameError('Project name is required');
      return;
    }
    setNameError('');
    mutation.mutate(
      { name: name.trim(), description: description.trim() || undefined, color },
      {
        onSuccess: closeModal,
        onError: (err: Error) => setApiError(err.message),
      }
    );
  }

  // ── Render ──
  return (
    <>
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gray-900 font-semibold text-2xl">Projects</h1>
        <button
          onClick={openModal}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          New Project
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-gray-600">Loading projects…</p>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          Failed to load projects. Please refresh the page.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && projects?.length === 0 && (
        <div className="bg-white rounded-lg p-6 text-center">
          <p className="text-gray-600">You don&apos;t have any projects yet.</p>
          <button
            onClick={openModal}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Create your first project
          </button>
        </div>
      )}

      {/* Project grid */}
      {!isLoading && !isError && projects && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => {
            const taskCount = project.taskCount ?? 0;
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="flex flex-col gap-3 rounded-lg bg-white p-6 hover:ring-2 hover:ring-blue-500 transition-shadow">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <h2 className="truncate text-gray-900 font-semibold">{project.name}</h2>
                </div>
                {project.description && (
                  <p className="line-clamp-2 text-sm text-gray-600">{project.description}</p>
                )}
                <p className="mt-auto text-sm text-gray-600">
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* New Project modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-gray-900 font-semibold text-xl">New Project</h2>

            {apiError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {apiError}
              </div>
            )}

            <form onSubmit={handleCreate} noValidate className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="h-9 w-16 cursor-pointer rounded-lg border border-gray-300 p-1"
                />
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
                  disabled={mutation.isPending}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {mutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
