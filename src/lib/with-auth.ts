import { errors } from 'jose';
import { verifyToken } from '@/lib/jwt';

export type AuthUser = { id: string; email: string };

export function withAuth<TContext>(
  handler: (request: Request, context: TContext, user: AuthUser) => Promise<Response>
) {
  return async (request: Request, context: TContext): Promise<Response> => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { error: { message: 'Missing authorization header', code: 'MISSING_TOKEN' } },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    try {
      const user = await verifyToken(token);
      return handler(request, context, user);
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        return Response.json(
          { error: { message: 'Token has expired', code: 'TOKEN_EXPIRED' } },
          { status: 401 }
        );
      }
      return Response.json(
        { error: { message: 'Invalid token', code: 'INVALID_TOKEN' } },
        { status: 401 }
      );
    }
  };
}
