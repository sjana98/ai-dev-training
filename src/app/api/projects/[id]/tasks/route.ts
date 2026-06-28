import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, tasks } from '@/db/schema';
import { withAuth } from '@/lib/with-auth';

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

const filterSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  status: z.enum(STATUSES).default('TODO'),
});

type RouteContext = { params: Promise<{ id: string }> };

async function verifyProjectOwnership(projectId: string, userId: string) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .limit(1);
  return project ?? null;
}

export const GET = withAuth(async (request, context: RouteContext, authUser) => {
  const { id } = await context.params;

  const project = await verifyProjectOwnership(id, authUser.id);
  if (!project) {
    return Response.json(
      { error: { message: 'Project not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const parsed = filterSchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    priority: url.searchParams.get('priority') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: { message: 'Invalid filter parameters', code: 'VALIDATION_ERROR', details: parsed.error.issues } },
      { status: 400 }
    );
  }

  const { status, priority } = parsed.data;

  const taskList = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, id),
        status ? eq(tasks.status, status) : undefined,
        priority ? eq(tasks.priority, priority) : undefined,
      )
    );

  return Response.json({ data: { tasks: taskList } });
});

export const POST = withAuth(async (request, context: RouteContext, authUser) => {
  const { id } = await context.params;

  const project = await verifyProjectOwnership(id, authUser.id);
  if (!project) {
    return Response.json(
      { error: { message: 'Project not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  let body: z.infer<typeof createTaskSchema>;
  try {
    body = createTaskSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: error.issues } },
        { status: 400 }
      );
    }
    return Response.json(
      { error: { message: 'Invalid request body', code: 'INVALID_REQUEST' } },
      { status: 400 }
    );
  }

  const [task] = await db
    .insert(tasks)
    .values({ ...body, projectId: id })
    .returning();

  return Response.json({ data: { task } }, { status: 201 });
});
