import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as getMe } from '@/app/api/auth/me/route';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { getJwtSecret } from '@/lib/jwt';

const TEST_EMAIL = 'auth-test@taskco.test';
const TEST_PASSWORD = 'password123';
const TEST_NAME = 'Auth Tester';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Request('http://localhost/api/auth/me', { method: 'GET', headers });
}

async function makeExpiredToken(): Promise<string> {
  return new SignJWT({ sub: 'expired-user-id', email: TEST_EMAIL })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('-1s')
    .sign(getJwtSecret());
}

async function cleanupTestUser() {
  await db.delete(users).where(eq(users.email, TEST_EMAIL));
}

beforeEach(async () => {
  await cleanupTestUser();
});

afterAll(async () => {
  await cleanupTestUser();
});

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates a user and returns token + user (no passwordHash)', async () => {
    const res = await register(makeRequest({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe(TEST_EMAIL);
    expect(body.data.user.name).toBe(TEST_NAME);
    expect(body.data.user.passwordHash).toBeUndefined();
    expect(body.data.user.id).toBeDefined();
    expect(body.data.user.createdAt).toBeDefined();
  });

  it('returns 400 when email is invalid', async () => {
    const res = await register(makeRequest({ email: 'not-an-email', password: TEST_PASSWORD, name: TEST_NAME }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password is shorter than 8 chars', async () => {
    const res = await register(makeRequest({ email: TEST_EMAIL, password: 'short', name: TEST_NAME }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when name is empty', async () => {
    const res = await register(makeRequest({ email: TEST_EMAIL, password: TEST_PASSWORD, name: '' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await register(makeRequest({ email: TEST_EMAIL }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 on duplicate email', async () => {
    await register(makeRequest({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME }));

    const res = await register(makeRequest({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('EMAIL_CONFLICT');
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register(makeRequest({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME }));
  });

  it('returns token + user on valid credentials', async () => {
    const res = await login(makeRequest({ email: TEST_EMAIL, password: TEST_PASSWORD }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe(TEST_EMAIL);
    expect(body.data.user.passwordHash).toBeUndefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await login(makeRequest({ email: TEST_EMAIL, password: 'wrongpassword' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
    expect(body.error.message).toBe('Invalid email or password');
  });

  it('returns 401 on non-existent email', async () => {
    const res = await login(makeRequest({ email: 'nobody@taskco.test', password: TEST_PASSWORD }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 400 on invalid email format', async () => {
    const res = await login(makeRequest({ email: 'not-valid', password: TEST_PASSWORD }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password field is missing', async () => {
    const res = await login(makeRequest({ email: TEST_EMAIL }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let validToken: string;

  beforeEach(async () => {
    const res = await register(makeRequest({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME }));
    const body = await res.json();
    validToken = body.data.token;
  });

  it('returns the authenticated user profile for a valid token', async () => {
    const res = await getMe(makeGetRequest(validToken), {});
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBeDefined();
    expect(body.data.email).toBe(TEST_EMAIL);
    expect(body.data.name).toBe(TEST_NAME);
    expect(body.data.createdAt).toBeDefined();
    expect(body.data.passwordHash).toBeUndefined();
  });

  it('returns 401 with MISSING_TOKEN when authorization header is absent', async () => {
    const res = await getMe(makeGetRequest(), {});
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('MISSING_TOKEN');
  });

  it('returns 401 with TOKEN_EXPIRED for an expired token', async () => {
    const expiredToken = await makeExpiredToken();
    const res = await getMe(makeGetRequest(expiredToken), {});
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('returns 401 with INVALID_TOKEN for a malformed token', async () => {
    const res = await getMe(makeGetRequest('this.is.malformed'), {});
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });
});
