import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { withAuth } from '@/lib/with-auth';

export const GET = withAuth(
  async (_request, context: { params: Promise<{ id: string }> }, authUser) => {
    const { id } = await context.params;

    // TODO: replace with left join + count(tasks.id) once the Task table exists
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, authUser.id)))
      .limit(1);

    if (!project) {
      return Response.json(
        { error: { message: 'Project not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return Response.json({ data: { project: { ...project, taskCount: 0 } } });
  }
);

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});

export const PATCH = withAuth(
  async (request, context: { params: Promise<{ id: string }> }, authUser) => {
    const { id } = await context.params;

    let body: z.infer<typeof updateProjectSchema>;

    try {
      body = updateProjectSchema.parse(await request.json());
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
        { error: { message: 'No fields to update', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(projects)
      .set(body)
      .where(and(eq(projects.id, id), eq(projects.ownerId, authUser.id)))
      .returning();

    if (!updated) {
      return Response.json(
        { error: { message: 'Project not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return Response.json({ data: { project: updated } });
  }
);

export const DELETE = withAuth(
  async (_request, context: { params: Promise<{ id: string }> }, authUser) => {
    const { id } = await context.params;

    const [deleted] = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, authUser.id)))
      .returning({ id: projects.id });

    if (!deleted) {
      return Response.json(
        { error: { message: 'Project not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return Response.json({ data: { deleted: true } });
  }
);
