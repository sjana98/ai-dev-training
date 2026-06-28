# Taskco — Build Specification

> **Status:** 🚧 In progress — living document. Filled in only from explicit answers. Nothing assumed.
> **Audience:** Written for Claude Code to read and build the project exactly as specified.
> **Last updated:** Task UI (list, filters, create, status toggle), dashboard project card links

---

## 0. How to read this document

- Each requirement comes directly from the project owner, captured step by step.
- Sections marked **_⏳ Pending_** have not been answered yet.
- **⚠️ Blocking** items must be resolved before the related build step can begin.
- The **Decision Log** and **Open Questions** at the bottom track what is locked vs. still open.

---

## 1. Project Overview — ✅ Locked

- **What Taskco is:** A self-managed **todo application**.
- **Model:** Multiple users register; **each user only sees and manages their own private todos** (no sharing/teams). ✅
- **Platform:** Web app (Next.js, local-only for now).
- **Core data entities:**
  - `users` — authentication (fields ⏳ to be confirmed by owner — Open Q B).
  - `refresh_tokens` (or equivalent) — to support refresh-token rotation/revocation (see §9).
  - `projects` — user-owned projects. ✅ Schema locked and built (see §15).
  - `tasks` — per-project tasks. **Fields ⏳ pending a later step.**
  - `todos` — user tasks. **Fields ⏳ pending a later step.**

## 2. Tech Stack — ✅ Locked

- **Framework:** Next.js, full-stack, **App Router**, Next.js-recommended structure.
- **Language:** **TypeScript**.
- **Database:** Neon DB (serverless Postgres).
- **DB access / ORM:** **Drizzle ORM** (no raw SQL). Use **drizzle-kit** for schema definition & migrations.
- **Schema validation:** Zod.
- **Password hashing:** bcrypt.
- **Auth:** JWT **access + refresh tokens** (see §9).
- **Testing:** Jest, against a **real Neon** database (dedicated test branch — §11).
- **HTTP client:** Axios.
- **Styling:** Tailwind CSS.
- **Package manager:** npm.
- **Formatting:** Prettier.

## 3. Project Structure & Conventions — ✅ Locked

- Single full-stack Next.js app, App Router, **`src/` directory**, structured per Next.js recommendations.
- **Naming:** React conventions — **PascalCase** components, **camelCase** functions; applied consistently.

## 4. API Response Conventions — ✅ Locked

- Every response sets the **appropriate HTTP status code** (status on the response only — never repeated in the body).
- **Success:** `{ data: ... }`.
- **Error (structured / "clean"):** `{ error: { message: string, code: string, details?: ... } }`.
  - For **Zod validation failures**, return HTTP **400** with field-level issues in `error.details`.

## 5. Development Workflow — ✅ Locked

Bottom-up: 1) **DB schema**, 2) **Auth layer (+tests)**, 3) **API endpoints (+tests)**, 4) **Frontend**.

- **Write test cases at every step.**

## 6. Working Agreement (process rules) — ✅ Locked

- **Always** enumerate possible edge cases where the implementation might fail.
- If any requirement is unclear, **do not write code** — ask questions until fully clear.
- **Make no assumptions.**

## 7. Project Setup & Version Control (Step 2) — ✅ Locked

### 7.1 Scaffolding

- Create a **new Next.js project** (App Router) honoring all Step 1 decisions: TypeScript, `src/`, Tailwind, ESLint, Prettier, npm.

### 7.2 Environment & Configuration

- DB connection string supplied via **`DATABASE_URL`**, read from a **`.env`** file.
- Provide a **`.env.example`** with all required vars: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL_TEST` (test branch). _Final token var names depend on Open Q D._

### 7.3 Version Control (Git)

- Run **`git init`**.
- Create a **`.gitignore`** covering the standard Next.js set **plus** the explicitly requested entries:
  ```
  # dependencies
  node_modules
  # next.js
  .next/
  out/
  # build
  build
  dist
  # env — keep .env.example TRACKED
  .env
  .env.local
  .env.*.local
  .env.test
  # logs / debug
  *.log
  npm-debug.log*
  # testing
  coverage/
  # misc / OS
  .DS_Store
  *.pem
  # typescript
  *.tsbuildinfo
  next-env.d.ts
  ```

  - **Important:** `.env` is ignored but **`.env.example` must remain tracked** — do not use a broad `.env*` rule that would exclude the example file.
- Run **`git add .`**.
- **Before committing**, run **`git status`** and verify **`.env` and `node_modules` are NOT tracked**.

## 8. Database Health Check Endpoint (Step 2) — ✅ Locked

- **Route:** `GET /api/health` — reports whether the DB connection succeeded or failed.
- **Success:** HTTP **200**, body `{ data: { status: "ok", database: "connected" } }`.
- **Failure:** HTTP **503**, body `{ error: { message: "Database connection failed", code: "DB_UNAVAILABLE" } }`.
- Connectivity check runs **through Drizzle** (no raw SQL), e.g. a trivial `SELECT 1`.

## 9. Authentication & Security — ⚠️ Partial

- **Scope:** Email + password only. No email verification, password reset, or roles.
- **Endpoints:** sign-up, login, **token refresh** (e.g. `POST /api/auth/refresh`). (Logout = invalidate refresh token / client discards tokens.)
- **Security rules (✅ Locked):**
  - **Never** store the raw/plaintext password.
  - **Always** hash with **bcrypt** before storing.
  - **Never** return the password (hashed or plaintext) in **any** response.
- **Token model (✅ decided):** short-lived **access token** + long-lived **refresh token**. When the access token expires, the client uses the refresh token to obtain a new access token automatically (keeping the user logged in). Frontend uses an **Axios interceptor** to auto-refresh on `401`.
- **Token details (⏳ to confirm — Open Q D):** access/refresh **expiry durations**, **storage** (httpOnly cookie vs `Authorization: Bearer` for access; httpOnly cookie recommended for refresh), and whether refresh tokens are **persisted (hashed) & revocable** in a `refresh_tokens` table.
- **`users` table fields:** ⏳ owner to confirm (Open Q B).

## 13. JWT Auth Middleware — ✅ Locked

- **Pattern:** `withAuth` higher-order function (`src/lib/with-auth.ts`). Wraps a Next.js route handler and injects the verified user as a third argument. Not request augmentation — the native Web `Request` type cannot be extended with `.user`.
- **Token source:** `Authorization: Bearer <token>` header only.
- **Verification:** `jwtVerify` (jose, HS256) using `getJwtSecret()` from `src/lib/jwt.ts`, which reads `JWT_SECRET` from env.
  - ⚠️ **Env var name discrepancy:** `src/lib/jwt.ts` reads `JWT_SECRET`, but `§7.2` and `.env.example` specify `JWT_ACCESS_SECRET`. These must be reconciled before the refresh token endpoint is built.
- **`AuthUser` shape:** `{ id: string; email: string }` — claims from the token only; no DB query in middleware.
- **401 error codes:**

  | Condition | `code` |
  |---|---|
  | Missing or malformed `Authorization` header | `MISSING_TOKEN` |
  | Bad signature, wrong algorithm, structural failure | `INVALID_TOKEN` |
  | Token past its `exp` claim | `TOKEN_EXPIRED` |

- **File:** `src/lib/with-auth.ts`. `verifyToken` lives in `src/lib/jwt.ts` alongside `signToken`.

## 14. GET /api/auth/me — ✅ Locked

- **Auth:** Required (`withAuth`).
- **Behaviour:** Queries the DB for the authenticated user by `id` from the JWT `sub` claim. Returns the full profile row.
- **Response (200):** `{ data: { id, email, name, createdAt } }`. `passwordHash` is excluded structurally — the Drizzle `select()` names only those four columns.
- **404:** `USER_NOT_FOUND` — returned if the user was deleted after the token was issued (valid token, no matching row).
- **Why a DB query:** `name` and `createdAt` are not in the JWT payload; they must be fetched.

## 15. Project Model — ✅ Locked

### 15.1 Schema (`src/db/schema.ts`)

| Field | Type | Constraints |
|---|---|---|
| `id` | `text` | PK, `randomUUID()` default |
| `name` | `text` | `notNull` |
| `description` | `text` | nullable (optional) |
| `color` | `text` | `notNull`, default `#3b82f6` |
| `ownerId` | `text` | `notNull`, FK → `users.id` (no cascade — see §15.2) |
| `createdAt` | `timestamp` | `defaultNow()`, `notNull` |

### 15.2 Relations

- `usersRelations`: `users` has `many(projects)`.
- `projectsRelations`: `projects` has `one(users)` owner; `tasks` many-relation stubbed as a comment, wired when `Task` table is added.
- **`ownerId` FK has no `ON DELETE CASCADE`** — projects must be deleted before their owner user, or an explicit cascade added later.

### 15.3 Task cascade (future)

When the `tasks` table is added, its `projectId` FK **must** include `{ onDelete: 'cascade' }` so that deleting a project automatically removes its tasks at the database level. No application code change will be needed in the delete handler.

## 16. Project Endpoints — ✅ Locked

All endpoints require authentication via `withAuth`. All queries include `ownerId = authUser.id`. Ownership violations return **404** (not 403) to avoid leaking the existence of another user's resource.

| Method | Route | Status | Notes |
|---|---|---|---|
| `POST` | `/api/projects` | 201 | `ownerId` set from JWT; never accepted from body |
| `GET` | `/api/projects` | 200 | Returns `{ data: { projects: [...] } }` filtered by `ownerId` |
| `GET` | `/api/projects/:id` | 200 | Returns `{ data: { project: { ...fields, taskCount: 0 } } }` — `taskCount` is a stub (0) until `tasks` table exists |
| `PATCH` | `/api/projects/:id` | 200 | Partial update; all body fields optional; empty body → 400 |
| `DELETE` | `/api/projects/:id` | 200 | Returns `{ data: { deleted: true } }`; tasks cascade at DB level |

**Validation (POST / PATCH body):**
- `name`: `string`, min 1 (required on POST, optional on PATCH)
- `description`: `string`, optional
- `color`: `string`, optional (DB default `#3b82f6` applies when omitted on POST)

**Single-query ownership pattern (PATCH / DELETE / GET :id):**
Both `id` and `ownerId` are in the `WHERE` clause of the same query. If the row doesn't exist or belongs to another user, the query returns nothing and a 404 is returned. No separate ownership fetch, no race condition.

## 17. Tests — ✅ Locked

### 17.1 `src/tests/auth.test.ts` (extended)

Added `GET /api/auth/me` describe block (4 tests):

| Test | Expected |
|---|---|
| Valid token | 200 + `{ id, email, name, createdAt }`, no `passwordHash` |
| Missing Authorization header | 401, `MISSING_TOKEN` |
| Expired token | 401, `TOKEN_EXPIRED` |
| Malformed token string | 401, `INVALID_TOKEN` |

### 17.2 `src/tests/projects.test.ts` (new)

Ownership isolation suite. `beforeEach` creates fresh User A, User B, and a project owned by User A. `afterAll` + `beforeEach` clean up (projects deleted before users due to FK constraint).

| Test | Assertion |
|---|---|
| User B: `GET /projects` | Empty array — User A's project not visible |
| User B: `GET /projects/:id` | 404, `NOT_FOUND` |
| User B: `PATCH /projects/:id` | 404, `NOT_FOUND` |
| User B: `DELETE /projects/:id` | 404, `NOT_FOUND` |
| After all of User B's attempts | User A can still fetch the project unchanged |

## 18. Task Model — ✅ Locked

### 18.1 Schema (`src/db/schema.ts`)

| Field | Type | Constraints |
|---|---|---|
| `id` | `text` | PK, `randomUUID()` default |
| `title` | `text` | `notNull` |
| `description` | `text` | nullable |
| `dueDate` | `timestamp` | nullable |
| `priority` | `text` | `notNull`, default `MEDIUM` — values: `HIGH \| MEDIUM \| LOW` |
| `status` | `text` | `notNull`, default `TODO` — values: `TODO \| IN_PROGRESS \| DONE` |
| `projectId` | `text` | `notNull`, FK → `projects.id` **`ON DELETE CASCADE`** |
| `createdAt` | `timestamp` | `defaultNow()`, `notNull` |

`priority` and `status` are stored as plain `text` columns; valid values are enforced at the API layer via Zod enums, not at the DB level.

### 18.2 Relations

- `projectsRelations` updated: `tasks: many(tasks)` added.
- `tasksRelations`: `tasks` has `one(projects)` owner via `projectId`.
- **`ON DELETE CASCADE`** on `tasks.projectId` — deleting a project removes all its tasks at the DB level. No application-level change required in the project delete handler.

### 18.3 Migration

Migration `0003_wandering_psylocke.sql` creates both `projects` and `tasks` tables (projects had no prior migration; both were added together). Applied via `npm run db:migrate`.

---

## 19. Task Endpoints — ✅ Locked

All task endpoints require authentication via `withAuth`. Ownership is always enforced — tasks are only accessible through their parent project, which must be owned by the authenticated user.

| Method | Route | Status | Notes |
|---|---|---|---|
| `GET` | `/api/projects/:id/tasks` | 200 | Returns `{ data: { tasks: [...] } }` filtered by `projectId`; supports `?status=` and `?priority=` query params |
| `POST` | `/api/projects/:id/tasks` | 201 | `projectId` from URL; returns `{ data: { task } }` |
| `PATCH` | `/api/tasks/:id` | 200 | Partial update; returns `{ data: { task } }`; ownership via subquery |

**File locations:**
- `src/app/api/projects/[id]/tasks/route.ts` — GET + POST
- `src/app/api/tasks/[id]/route.ts` — PATCH

### 19.1 GET /api/projects/:id/tasks

- Verifies project ownership before listing tasks (`ownerId = authUser.id`).
- Filter params parsed from URL search params, validated with Zod.
- Invalid filter values → 400 `VALIDATION_ERROR`.
- `status` and `priority` filters are additive (both applied if both provided).

### 19.2 POST /api/projects/:id/tasks

- Verifies project ownership before inserting.
- `projectId` is taken from the URL param — never from the request body.
- Zod schema: `title` (required), `description?`, `dueDate?` (coerced to `Date`), `priority?` (default `MEDIUM`), `status?` (default `TODO`).

### 19.3 PATCH /api/tasks/:id

- Partial update — any subset of fields.
- Empty body → 400 `VALIDATION_ERROR`.
- **Single-query ownership:** `WHERE tasks.id = $1 AND tasks.project_id IN (SELECT id FROM projects WHERE owner_id = $2)`. No separate ownership fetch, no race condition.
- 404 if task not found or belongs to another user's project.

---

## 20. Frontend Architecture — ✅ Locked

### 20.1 Stack

| Concern | Choice |
|---|---|
| Data fetching / caching | **TanStack Query v5** (`useQuery`, `useMutation`) |
| HTTP client | Native **`fetch`** (wrapped in `apiFetch`) |
| Token storage | **`localStorage`** key `"token"` |
| Auth header | `Authorization: Bearer <token>` on every authenticated request |

> **Note:** §2 listed Axios as the HTTP client. TanStack Query + native `fetch` was adopted instead for the frontend. Axios is no longer used.

### 20.2 QueryClient setup (`src/components/Providers.tsx`)

- `'use client'` component wrapping the entire app (placed in `layout.tsx`).
- `QueryClient` created with `useState(() => new QueryClient())` to prevent sharing state across server renders.
- No custom `staleTime` — defaults to 0 (background re-fetch on window focus).

### 20.3 API client (`src/lib/api.ts`)

Single module that owns all network concerns:

- **`ApiError`** — custom error class carrying `status: number`. Callers check `error instanceof ApiError && error.status === 404` instead of magic strings.
- **`apiFetch<T>(path, options)`** — base fetch wrapper:
  - Auto-merges `Authorization: Bearer <token>` header from `localStorage`.
  - **401** → calls `handleUnauthorized()`: clears token, does `window.location.replace('/login')`, then throws `ApiError(401)`.
  - Other non-OK → throws `ApiError(status, body.error.message)`.
  - Returns `body.data as T` on success.
- **Typed API functions** (each unwraps `body.data.*` so callers receive plain types):
  - `getProjects()` → `Promise<Project[]>`
  - `getProject(id)` → `Promise<Project>`
  - `getTasks(projectId, filters?)` → `Promise<Task[]>` — builds `?status=&priority=` query string
  - `createProject(input)` → `Promise<Project>`
  - `createTask(projectId, input)` → `Promise<Task>`
  - `updateTask(id, input)` → `Promise<Task>`

### 20.4 Query hooks (`src/lib/queries.ts`)

| Hook | Query key | Invalidated by |
|---|---|---|
| `useProjects()` | `['projects']` | `useCreateProject` success |
| `useProject(id)` | `['projects', id]` | `useCreateProject` success (prefix match) |
| `useTasks(projectId, filters)` | `['tasks', projectId, filters]` | `useCreateTask` / `useUpdateTask` success |
| `useCreateProject()` | — | invalidates `['projects']` |
| `useCreateTask(projectId)` | — | invalidates `['tasks', projectId]` |
| `useUpdateTask(projectId)` | — | invalidates `['tasks', projectId]` |

**Key rules:**
- `invalidateQueries({ queryKey: ['projects'] })` uses prefix matching — also invalidates `['projects', id]` entries.
- The filter object in `useTasks` query key triggers automatic re-fetch when filters change (TanStack Query v5 uses stable deep-equality hashing).
- Hook-level `onSuccess` handles cache invalidation. Per-call `.mutate(input, { onSuccess, onError })` callbacks handle UI state (close modal, show error) — both fire in order.

### 20.5 Exported types (`src/lib/api.ts`)

| Type | Fields |
|---|---|
| `Project` | `id, name, description, color, ownerId, createdAt, taskCount?` |
| `Task` | `id, title, description, dueDate, priority, status, projectId, createdAt` |
| `TaskFilters` | `status?, priority?` |
| `CreateProjectInput` | `name, description?, color` |
| `CreateTaskInput` | `title, description?, dueDate?, priority?, status?` |
| `UpdateTaskInput` | all fields optional |

---

## 21. Pages — ✅ Locked (current state)

All pages are `'use client'` components. No server-side data fetching.

### 21.1 Home page (`src/app/page.tsx`)

Redirect-only. On mount:
- Token in `localStorage` → `router.replace('/dashboard')`
- No token → `router.replace('/login')`

Renders `null` while redirecting.

### 21.2 Register page (`src/app/register/page.tsx`)

**Route:** `/register`

- Fields: `name`, `email`, `password`.
- Client validation before API call: name required, email format, password min 8 chars.
- On success: `localStorage.setItem('token', body.data.token)` → redirect to `/dashboard`.
- API error displayed as a red banner above the form.
- Link to `/login`.

### 21.3 Login page (`src/app/login/page.tsx`)

**Route:** `/login`

- Fields: `email`, `password`.
- Client validation: email format, password required.
- On success: `localStorage.setItem('token', body.data.token)` → redirect to `/dashboard`.
- API error displayed as a red banner.
- Link to `/register`.

> Login and register use raw `fetch` directly (not `apiFetch`) — these endpoints require no auth header, and the one-shot form pattern doesn't benefit from TanStack Query.

### 21.4 Dashboard page (`src/app/dashboard/page.tsx`)

**Route:** `/dashboard`

- Fetches project list via `useProjects()`.
- Three states: loading, error, empty ("You don't have any projects yet").
- Project grid (2 columns on small, 3 on large): color dot, name, truncated description, task count (`taskCount ?? 0`).
- **New Project** button opens a modal.
- Modal fields: name (required), description (optional), color picker (default `#3b82f6`).
- Submits via `useCreateProject()` → on success invalidates `['projects']` and closes modal.
- Project cards are `<Link href="/projects/:id">` — clicking navigates to the project detail page. Blue ring on hover.

### 21.5 Project detail page (`src/app/projects/[id]/page.tsx`)

**Route:** `/projects/:id`

- Fetches project via `useProject(id)` — displays color dot, name, description.
- `← All projects` link back to `/dashboard`.
- Error handling: `ApiError.status === 404` → "Project not found", other → "Failed to load project".

#### Task toolbar

- **Status filter** — `<select>` with options: All statuses / To do / In progress / Done. Maps to `status` query param.
- **Priority filter** — `<select>` with options: All priorities / High / Medium / Low. Maps to `priority` query param.
- Filters are **additive** — both applied simultaneously if both set.
- **Clear filters** button — only visible when at least one filter is active; resets both to empty.
- **New Task** button — opens the create task modal (right-aligned via `ml-auto`).
- Changing any filter updates the `['tasks', projectId, filters]` query key → TanStack Query re-fetches automatically. No client-side filtering.

#### Task list

Fetched via `useTasks(id, { status, priority })`. Three states: loading, empty (separate message for "no tasks" vs "no matches"), and list.

Each task card contains:

| Element | Detail |
|---|---|
| **Status toggle** | Filled green circle = DONE; empty circle = TODO/IN_PROGRESS. Click cycles: `TODO → IN_PROGRESS → DONE → TODO`. Disabled while any update is in-flight. |
| **Title** | Strikethrough + gray text when `status === 'DONE'` |
| **Priority badge** | `HIGH` → `bg-red-100 text-red-800`; `MEDIUM` → `bg-yellow-100 text-yellow-800`; `LOW` → `bg-green-100 text-green-800` |
| **Status badge** | `TODO` → `bg-gray-100 text-gray-800`; `IN_PROGRESS` → `bg-blue-100 text-blue-800`; `DONE` → `bg-green-100 text-green-800` |
| **Description** | Shown below title if present |
| **Due date** | Shown in `medium` locale format if set; parsed with `timeZone: 'UTC'` to match the stored date regardless of local timezone |

Status toggle fires `useUpdateTask(id).mutate({ id: task.id, status: nextStatus })` → on success invalidates `['tasks', projectId]`.

#### New Task modal

Fields: title (required), description (optional), due date (`<input type="date">`, optional), priority select (Low / Medium / High, default Medium).

- `dueDate` from the date input (`YYYY-MM-DD`) is converted to an ISO string via `new Date(value).toISOString()` before sending to the API.
- Submits via `useCreateTask(id)` → on success invalidates `['tasks', projectId]` and closes modal.
- API error shown as red banner; title validation error shown inline.

---

## 22. NavBar — ✅ Locked

**File:** `src/components/NavBar.tsx` (client component, used in `layout.tsx`)

- Left: "TaskCo" logo link to `/`.
- Right: auth button — logic:

| Condition | Button shown |
|---|---|
| Current path is `/login` or `/register` | Nothing (no button) |
| Path is anything else, no token in `localStorage` | **Log in** (blue, links to `/login`) |
| Token present in `localStorage` | **Log out** (outlined; clears token, redirects to `/login`) |

- Auth state read via `useEffect` after mount to avoid hydration mismatch.
- Current path read via `usePathname()` from `next/navigation`.

---

## 10. Features & Functionality

**_⏳ Pending — later step (will define `todos` fields)._**

## 11. Non-Functional Requirements — ✅ Locked

- **Testing data:** Tests run against a **real Neon** database, on a **dedicated Neon test branch** (recommended & adopted) with its own connection string (`DATABASE_URL_TEST` / `.env.test`), so tests stay isolated and resettable.
- **API tests:** API endpoint test cases are **included** (alongside schema/auth tests).
- **Deployment:** None — **runs locally only**.
- **Env vars:** `DATABASE_URL`, `DATABASE_URL_TEST`, JWT secrets (names pending Open Q D).

## 12. Coding Standards — ✅ Locked

- Naming: see §3.
- **ESLint** (Next.js default) + **Prettier** for formatting.
- Commit conventions: none specified (free-form) unless added later.

---

## Decision Log

| #   | Topic             | Decision                                                                                          | Status                     |
| --- | ----------------- | ------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | Framework         | Next.js full-stack, App Router, `src/`, Next.js structure                                         | ✅                         |
| 2   | Language          | TypeScript                                                                                        | ✅                         |
| 3   | Database          | Neon DB (serverless Postgres)                                                                     | ✅                         |
| 4   | ORM               | Drizzle ORM + drizzle-kit (no raw SQL)                                                            | ✅                         |
| 5   | Validation        | Zod                                                                                               | ✅                         |
| 6   | Password security | bcrypt; never store raw; never return password                                                    | ✅                         |
| 7   | Auth model        | JWT access + refresh tokens; email+password only                                                  | ✅ (token details pending) |
| 8   | Testing           | Jest vs real Neon **test branch**; tests every step incl. API                                     | ✅                         |
| 9   | HTTP client       | Axios (+ auto-refresh interceptor)                                                                | ✅                         |
| 10  | Styling           | Tailwind CSS                                                                                      | ✅                         |
| 11  | Package manager   | npm                                                                                               | ✅                         |
| 12  | API response      | success `{ data }`; error `{ error: { message, code, details? } }`; HTTP status on response only  | ✅                         |
| 13  | Naming            | React conventions                                                                                 | ✅                         |
| 14  | Dev approach      | Bottom-up: schema → auth → API → frontend                                                         | ✅                         |
| 15  | Process           | Edge cases; ask before assuming; no assumptions                                                   | ✅                         |
| 16  | Deployment        | Local only                                                                                        | ✅                         |
| 17  | Env config        | Read from `.env`; provide `.env.example`                                                          | ✅                         |
| 18  | Health check      | `GET /api/health` (200 ok / 503 fail) via Drizzle                                                 | ✅                         |
| 19  | Git setup         | `git init`; full Next.js `.gitignore` (keep `.env.example`); `git add .`; verify via `git status` | ✅                         |
| 20  | Formatting        | Prettier                                                                                          | ✅                         |
| 21  | Auth middleware   | `withAuth` HOC (not request augmentation); `AuthUser = { id, email }` from JWT claims only; no DB query in middleware | ✅ |
| 22  | Middleware errors | 401 for missing/invalid/expired token; distinct codes: `MISSING_TOKEN`, `INVALID_TOKEN`, `TOKEN_EXPIRED` | ✅ |
| 23  | GET /auth/me      | DB query required (name/createdAt not in JWT); `passwordHash` excluded via column-level select; 404 if user deleted post-token | ✅ |
| 24  | Project fields    | `id`, `name`, `description?`, `color` (default `#3b82f6`), `ownerId` (FK→users), `createdAt`    | ✅                         |
| 25  | Ownership errors  | 404 for both not-found and wrong-owner (403 would leak resource existence)                        | ✅                         |
| 26  | ownerId source    | Always from JWT (`authUser.id`); never accepted from request body                                 | ✅                         |
| 27  | Task cascade      | Future `tasks.projectId` FK must use `{ onDelete: 'cascade' }`; delete handler needs no change   | ✅ (pending Task table)    |
| 28  | taskCount stub    | `GET /projects/:id` returns `taskCount: 0` until Task table exists; field name locked             | ✅ (stub)                  |
| 29  | PATCH empty body  | Empty body → 400 `VALIDATION_ERROR` (prevents Drizzle `set({})` error)                           | ✅                         |
| 30  | JWT env var name  | Code uses `JWT_SECRET`; spec §7.2 and `.env.example` say `JWT_ACCESS_SECRET` — ⚠️ must reconcile before refresh token work | ⚠️ |
| 31  | HTTP client       | Switched from Axios to native `fetch` wrapped in `apiFetch`. TanStack Query handles caching/invalidation. Axios no longer used. | ✅ |
| 32  | Token storage     | JWT stored in `localStorage` under key `"token"`. Sent as `Authorization: Bearer <token>` on all authenticated requests. | ✅ |
| 33  | 401 handling      | `apiFetch` intercepts 401, clears token via `localStorage.removeItem`, redirects via `window.location.replace('/login')` | ✅ |
| 34  | Error class       | `ApiError(status, message)` — callers check `error.status` (number), not error message strings | ✅ |
| 35  | Query keys        | `['projects']`, `['projects', id]`, `['tasks', projectId, filters]` — prefix invalidation: `['projects']` also clears `['projects', id]` | ✅ |
| 36  | Mutation callbacks | Hook-level `onSuccess` handles cache invalidation; per-call `.mutate(vars, { onSuccess, onError })` handles UI state. Both fire in order. | ✅ |
| 37  | Task fields       | `id, title, description?, dueDate?, priority (HIGH\|MEDIUM\|LOW default MEDIUM), status (TODO\|IN_PROGRESS\|DONE default TODO), projectId, createdAt` | ✅ |
| 38  | Task ownership    | `PATCH /tasks/:id` uses single-query subquery: `WHERE project_id IN (SELECT id FROM projects WHERE owner_id = ?)`. No separate fetch, no race condition. | ✅ |
| 39  | Task cascade      | `tasks.projectId` FK has `ON DELETE CASCADE` — project delete removes all tasks at DB level, no app-level code needed | ✅ |
| 40  | Home page         | `/` redirects to `/dashboard` if token present, `/login` if not. Renders `null` during redirect. | ✅ |
| 41  | NavBar auth state | Login button hidden on `/login` and `/register` pages. Logout clears token + redirects. Auth state read after mount via `useEffect`. | ✅ |
| 42  | Task UI           | Project detail page fully implements task list, filters, create modal, and status toggle. All three task hooks are wired. | ✅ |
| 43  | Status toggle     | Click cycles `TODO → IN_PROGRESS → DONE → TODO`. Visual: filled green circle = DONE, empty circle = other. Disabled during in-flight mutation. | ✅ |
| 44  | Task card design  | Title strikethrough when DONE. Priority + status shown as colored `rounded-full` badges per spec colors. Due date displayed in UTC locale to avoid timezone day-shift. | ✅ |
| 45  | Filter UX         | Filters are server-side only (no client filtering). "Clear filters" button appears only when a filter is active. Empty state message distinguishes "no tasks" from "no matches". | ✅ |
| 46  | Dashboard nav     | Project cards changed from `<div>` to `<Link href="/projects/:id">`. Blue ring on hover. | ✅ |

## Open Questions

**Blocking — auth (last detail):**

- D. Access + refresh token specifics: **expiry durations** (suggest access **15 min**, refresh **7 days**), **storage** (suggest access via `Authorization: Bearer`, refresh via **httpOnly secure cookie**), and **persist refresh tokens (hashed) in DB for revocation?** Confirm or adjust.
- E. **JWT env var name:** `src/lib/jwt.ts` currently reads `JWT_SECRET`. Spec §7.2 and `.env.example` specify `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`. Must align before the refresh token endpoint is built. Confirm which name to use.

**Owner will confirm later:**

- B. `users` table fields (suggested: `id`, `email` unique, `passwordHash`, `createdAt`, `updatedAt`).
- Todo entity fields (a later step).

**Optional / recommended (already adopted unless you object):**

- G. Component tests via **React Testing Library** when the frontend is built. API tests: invoke route handlers directly (e.g. via `next-test-api-route-handler`). Object if you prefer otherwise.
