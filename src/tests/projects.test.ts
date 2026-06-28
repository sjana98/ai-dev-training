import { POST as register } from '@/app/api/auth/register/route';
import { GET as getProjects, POST as createProject } from '@/app/api/projects/route';
import { GET as getProject, PATCH as updateProject, DELETE as deleteProject } from '@/app/api/projects/[id]/route';
import { db } from '@/lib/db';
import { projects, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const USER_A_EMAIL = 'projects-user-a@taskco.test';
const USER_B_EMAIL = 'projects-user-b@taskco.test';
const TEST_PASSWORD = 'password123';

function makeRegisterRequest(email: string, name: string): Request {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password: TEST_PASSWORD }),
  });
}

function makeCollectionRequest(method: string, token: string, body?: unknown): Request {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return new Request('http://localhost/api/projects', {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeItemRequest(method: string, token: string, body?: unknown): Request {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return new Request('http://localhost/api/projects/[id]', {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function itemContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function cleanup() {
  // Projects must be deleted before users — ownerId FK has no cascade
  for (const email of [USER_A_EMAIL, USER_B_EMAIL]) {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (user) await db.delete(projects).where(eq(projects.ownerId, user.id));
  }
  await db.delete(users).where(eq(users.email, USER_A_EMAIL));
  await db.delete(users).where(eq(users.email, USER_B_EMAIL));
}

// ─── Project ownership isolation ─────────────────────────────────────────────

describe('Project ownership isolation', () => {
  let tokenA: string;
  let tokenB: string;
  let projectAId: string;

  beforeEach(async () => {
    await cleanup();

    const resA = await register(makeRegisterRequest(USER_A_EMAIL, 'User A'));
    tokenA = (await resA.json()).data.token;

    const resB = await register(makeRegisterRequest(USER_B_EMAIL, 'User B'));
    tokenB = (await resB.json()).data.token;

    const resProject = await createProject(
      makeCollectionRequest('POST', tokenA, { name: 'User A Project' }),
      {}
    );
    projectAId = (await resProject.json()).data.project.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  it("GET /projects returns an empty array for User B — User A's project is not included", async () => {
    const res = await getProjects(makeCollectionRequest('GET', tokenB), {});
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.projects).toEqual([]);
  });

  it("GET /projects/:id returns 404 when User B requests User A's project", async () => {
    const res = await getProject(makeItemRequest('GET', tokenB), itemContext(projectAId));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it("PATCH /projects/:id returns 404 when User B attempts to update User A's project", async () => {
    const res = await updateProject(
      makeItemRequest('PATCH', tokenB, { name: 'Hijacked' }),
      itemContext(projectAId)
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it("DELETE /projects/:id returns 404 when User B attempts to delete User A's project", async () => {
    const res = await deleteProject(makeItemRequest('DELETE', tokenB), itemContext(projectAId));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it("User A's project is unmodified after all of User B's failed attempts", async () => {
    await getProject(makeItemRequest('GET', tokenB), itemContext(projectAId));
    await updateProject(makeItemRequest('PATCH', tokenB, { name: 'Hijacked' }), itemContext(projectAId));
    await deleteProject(makeItemRequest('DELETE', tokenB), itemContext(projectAId));

    const res = await getProject(makeItemRequest('GET', tokenA), itemContext(projectAId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.project.id).toBe(projectAId);
    expect(body.data.project.name).toBe('User A Project');
  });
});
