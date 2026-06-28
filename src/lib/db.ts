import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

type DrizzleDb = ReturnType<typeof drizzle>;

let _db: DrizzleDb | undefined;

function getInstance(): DrizzleDb {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');
    _db = drizzle(neon(url));
  }
  return _db;
}

// Proxy defers neon() initialization to the first actual DB call.
// This prevents the build from crashing when DATABASE_URL is not available
// at module evaluation time (e.g. during Next.js static page collection).
export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    const inst = getInstance();
    const val = Reflect.get(inst, prop, inst);
    return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(inst) : val;
  },
});
