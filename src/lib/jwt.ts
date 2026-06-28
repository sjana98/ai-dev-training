import { SignJWT, jwtVerify, errors } from 'jose';

export type TokenClaims = { id: string; email: string };

const TOKEN_EXPIRY = '15m';

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: { sub: string; email: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<TokenClaims> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new errors.JWTInvalid('Malformed token claims');
    }
    return { id: payload.sub, email: payload.email };
  } catch (error) {
    // Re-throw jose errors so callers can distinguish expired vs invalid
    if (error instanceof errors.JWTExpired || error instanceof errors.JWTInvalid) throw error;
    throw new errors.JWTInvalid('Token verification failed');
  }
}
