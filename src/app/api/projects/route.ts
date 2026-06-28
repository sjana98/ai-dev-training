import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { withAuth } from '@/lib/with-auth';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
});

export const GET = withAuth(async (_request, _context, authUser) => {
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, authUser.id));

  return Response.json({ data: { projects: userProjects } });
});

export const POST = withAuth(async (request, _context, authUser) => {
  let body: z.infer<typeof createProjectSchema>;

  try {
    body = createProjectSchema.parse(await request.json());
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

  const [project] = await db
    .insert(projects)
    .values({ ...body, ownerId: authUser.id })
    .returning();

  return Response.json({ data: { project } }, { status: 201 });
});
