'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProjects, useCreateProject } from '@/lib/queries';

const DEFAULT_COLOR = '#3b82f6';

const COLOR_PRESETS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
];

export default function DashboardPage() {
  const { data: projects, isLoading, isError } = useProjects();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [nameError, setNameError] = useState('');
  const [apiError, setApiError] = useState('');

  const mutation = useCreateProject();

  function openModal() {
    setName(''); setDescription(''); setColor(DEFAULT_COLOR);
    setNameError(''); setApiError('');
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!name.trim()) { setNameError('Project name is required'); return; }
    setNameError('');
    mutation.mutate(
      { name: name.trim(), description: description.trim() || undefined, color },
      { onSuccess: closeModal, onError: (err: Error) => setApiError(err.message) }
    );
  }

  const projectCount = projects?.length ?? 0;

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">Projects</h1>
          {!isLoading && !isError && (
            <p className="text-xs text-gray-400 mt-0.5">
              {projectCount === 0 ? 'No projects yet' : `${projectCount} ${projectCount === 1 ? 'project' : 'projects'}`}
            </p>
          )}
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New project
        </button>
      </div>

      {/* ── Loading skeletons ── */}
      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white/70 ring-1 ring-black/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Failed to load projects. Please refresh.
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !isError && projects?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white/60 py-12 px-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No projects yet</p>
          <p className="text-xs text-gray-400 mb-5">Create your first project to start organizing tasks.</p>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create project
          </button>
        </div>
      )}

      {/* ── Project grid ── */}
      {!isLoading && !isError && projects && projects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => {
            const taskCount = project.taskCount ?? 0;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-black/5 hover:ring-blue-400 hover:shadow-md transition-all duration-150"
              >
                {/* Color bar */}
                <div className="h-1 w-full shrink-0" style={{ backgroundColor: project.color }} />

                <div className="flex flex-col gap-2 p-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <h2 className="truncate text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </h2>
                    </div>
                    <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-blue-400 transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {project.description && (
                    <p className="line-clamp-2 text-xs text-gray-400 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center gap-1 pt-2 border-t border-gray-50">
                    <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-xs text-gray-400">
                      {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── New Project modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">New project</h2>
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

              <form onSubmit={handleCreate} noValidate className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Website redesign"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Description <span className="text-xs font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    placeholder="What is this project about?"
                    className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">Color</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className="h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                        style={{
                          backgroundColor: c,
                          outline: color === c ? `2px solid ${c}` : undefined,
                          outlineOffset: color === c ? '2px' : undefined,
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded-full border border-gray-200 p-0.5"
                      title="Custom color"
                    />
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
                    disabled={mutation.isPending}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {mutation.isPending ? 'Creating…' : 'Create project'}
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
