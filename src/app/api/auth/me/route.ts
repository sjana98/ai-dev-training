import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { withAuth } from '@/lib/with-auth';

export const GET = withAuth(async (_request, _context, authUser) => {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!user) {
    return Response.json(
      { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
      { status: 404 }
    );
  }

  return Response.json({ data: user });
});
