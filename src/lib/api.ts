// ─── Types ───────────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  createdAt: string;
  taskCount?: number;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  projectId: string;
  createdAt: string;
};

export type TaskFilters = {
  status?: Task['status'];
  priority?: Task['priority'];
};

export type CreateProjectInput = {
  name: string;
  description?: string;
  color: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  dueDate?: string | null;
  priority?: Task['priority'];
  status?: Task['status'];
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  dueDate?: string | null;
  priority?: Task['priority'];
  status?: Task['status'];
};

// ─── Error class ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  window.location.replace('/login');
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string>) },
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, 'Unauthorized');
  }

  const body = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, body.error?.message ?? 'Request failed');
  }

  return body.data as T;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const data = await apiFetch<{ projects: Project[] }>('/api/projects');
  return data.projects;
}

export async function getProject(id: string): Promise<Project> {
  const data = await apiFetch<{ project: Project }>(`/api/projects/${id}`);
  return data.project;
}

export async function getTasks(
  projectId: string,
  filters: TaskFilters = {}
): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  const qs = params.toString();
  const data = await apiFetch<{ tasks: Task[] }>(
    `/api/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`
  );
  return data.tasks;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const data = await apiFetch<{ project: Project }>('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.project;
}

export async function createTask(
  projectId: string,
  input: CreateTaskInput
): Promise<Task> {
  const data = await apiFetch<{ task: Task }>(`/api/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.task;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const data = await apiFetch<{ task: Task }>(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.task;
}
