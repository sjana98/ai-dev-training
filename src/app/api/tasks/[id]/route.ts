import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, tasks } from '@/db/schema';
import { withAuth } from '@/lib/with-auth';

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(STATUSES).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (request, context: RouteContext, authUser) => {
  const { id } = await context.params;

  let body: z.infer<typeof updateTaskSchema>;
  try {
    const raw = await request.json();
    body = updateTaskSchema.parse(raw);
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

  if (Object.keys(body).length === 0) {
    return Response.json(
      { error: { message: 'Request body must include at least one field', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  // Single-query ownership check: only update tasks whose project is owned by this user.
  const ownerProjectIds = db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, authUser.id));

  const [task] = await db
    .update(tasks)
    .set(body)
    .where(and(eq(tasks.id, id), inArray(tasks.projectId, ownerProjectIds)))
    .returning();

  if (!task) {
    return Response.json(
      { error: { message: 'Task not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  return Response.json({ data: { task } });
});
