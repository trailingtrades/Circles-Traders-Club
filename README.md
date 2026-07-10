# Circles Traders Club — Learning Portal (LMS)

A secure, production-ready web application that distributes the institute's
HTML-based study material (**Five Circles Options — Selling Playbook**) to
paying students only. Access is gated by login **and** an active subscription
window, and expires automatically. Includes a full admin panel for managing
students, subscriptions and activity logs.

## Feature overview

**Students**
- Email + password login (bcrypt-hashed, 12 rounds), "Remember me", logout
- Forgot / reset password via emailed one-time link (1-hour expiry, single use)
- Dashboard: subscription status, expiry date, days remaining, course name,
  ⚠️ warning when fewer than 7 days remain
- Learning material rendered **only after** authentication + subscription check
- Auto-logout after inactivity (client and server enforced)
- One active session per student (new login logs out other devices — configurable)

**Subscription enforcement**
- Every account has a start and end date; valid through the **end** of the end date
- Expired / not-yet-started / disabled / revoked students see an explanatory
  page and can never reach the content — the content API re-checks on every request
- 7 / 3 / 1-day expiry reminder emails + "expired" notice (daily cron endpoint)

**Admin panel** (separate login at `/admin/login`)
- Dashboard: total / active / expired / disabled counts, new students, expiring
  soon, live sessions, recent logins with IP + device
- Students: create, edit (name, email, password, mobile, dates, notes, course),
  delete, disable temporarily, revoke permanently, force logout, extend subscription
- Search by name / email / phone; filter by active / expired / disabled / revoked;
  pagination
- Bulk operations: CSV import (max 1000 rows), extend, disable, enable, delete,
  force logout, CSV export
- Activity logs: logins, logouts, failed logins, password resets, content access,
  admin changes — with date, time, IP, device and browser; filterable + paginated
- Fully responsive, dark mode

**Content protection**
- The HTML file lives in `/content` — **outside** the public web root; there is
  no direct URL to it
- Served exclusively by `GET /api/course/content` after session + subscription
  checks, with `Cache-Control: no-store`, `X-Robots-Tag: noindex` and
  `frame-ancestors 'self'`
- Per-student watermark (name + email) tiled over the page; right-click, save,
  print and view-source shortcuts disabled (deterrents); every access is logged

**Security**
- bcrypt password hashing; opaque session tokens stored only as SHA-256 hashes
- Database-backed sessions: revocable server-side (force logout works instantly)
- `HttpOnly` + `SameSite=Lax` + `Secure` (in production) cookies
- CSRF defence in depth: SameSite cookies **and** Origin/Host verification on
  every state-changing request
- Rate limiting on login (per IP + per email), forgot-password and reset endpoints
- Zod validation on every input; Prisma parameterised queries (no SQL injection)
- Global security headers: CSP, X-Frame-Options, nosniff, Referrer-Policy
- No email-existence disclosure on login or forgot-password (uniform responses
  + constant-time dummy hash compare)
- Admin identity fully separate from students; admin APIs re-authorise on every call

## Tech stack

| Layer      | Choice                                        |
|------------|-----------------------------------------------|
| Framework  | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling    | Tailwind CSS v4 (dark mode, responsive)       |
| Database   | PostgreSQL                                    |
| ORM        | Prisma 6 (schema + migrations included)       |
| Auth       | Custom DB-backed sessions (httpOnly cookies)  |
| Email      | Nodemailer over SMTP (any provider)           |
| Validation | Zod                                           |

## Project structure

```
content/                        # 🔒 protected learning material (NOT public)
prisma/
  schema.prisma                 # full DB schema (7 tables)
  migrations/                   # SQL migrations
  seed.ts                       # creates first admin + course
src/
  app/
    login/ forgot-password/ reset-password/   # student auth pages
    dashboard/ course/ expired/               # student area
    admin/login/                              # admin auth
    admin/(panel)/                            # admin dashboard, students, logs
    api/
      auth/       # login, logout, forgot-password, reset-password
      profile/    # student profile JSON
      course/     # protected content delivery
      admin/      # admin login/logout, students CRUD, bulk, import, export
      cron/       # daily reminders endpoint
  components/     # UI components (forms, tables, sidebar, theme toggle…)
  lib/            # auth, db, mail, validation, rate-limit, csv, subscription…
```

## Local setup

Prerequisites: Node.js 20+, PostgreSQL 14+.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    → set DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD (min 10 chars)

# 3. Create the schema
npx prisma migrate deploy      # (or: npm run db:migrate)

# 4. Seed the first admin account + course
npm run db:seed

# 5. Run
npm run dev                    # development
npm run build && npm start     # production
```

Open http://localhost:3000/login (students) and
http://localhost:3000/admin/login (admin).

> With `SMTP_HOST` empty, all emails (including password-reset links) are
> printed to the server console — handy for development.

## Environment variables

See [.env.example](.env.example) for the full annotated list:
`DATABASE_URL`, `APP_URL`, `APP_NAME`, `NEXT_PUBLIC_APP_NAME`,
`NEXT_PUBLIC_CONTACT_EMAIL`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`SESSION_IDLE_TIMEOUT_MINUTES`, `ENFORCE_SINGLE_STUDENT_SESSION`,
`SMTP_HOST/PORT/SECURE/USER/PASS/FROM`, `CRON_SECRET`.

## Expiry reminder cron

Schedule a daily call (any scheduler — Vercel Cron, GitHub Actions, cron on a
VPS, Railway cron):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/reminders
```

Sends 7-day, 3-day and 1-day reminders plus an "expired" notice — each at most
once per student per subscription period — and prunes expired sessions/tokens.

## REST API summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/login` | — | Student login |
| POST | `/api/auth/logout` | student | Logout |
| POST | `/api/auth/forgot-password` | — | Send reset link |
| POST | `/api/auth/reset-password` | — | Set new password |
| GET | `/api/profile` | student | Profile + subscription state |
| GET | `/api/course/content` | student + active sub | The learning material |
| POST | `/api/admin/login` | — | Admin login |
| POST | `/api/admin/logout` | admin | Admin logout |
| GET | `/api/admin/students` | admin | List / search / filter / paginate |
| POST | `/api/admin/students` | admin | Create student |
| GET/PUT/DELETE | `/api/admin/students/:id` | admin | Read / update / delete |
| POST | `/api/admin/students/:id/force-logout` | admin | Kill sessions |
| POST | `/api/admin/students/bulk` | admin | extend / disable / enable / delete / force_logout |
| POST | `/api/admin/students/import` | admin | CSV bulk import |
| GET | `/api/admin/students/export` | admin | CSV export |
| GET | `/api/cron/reminders` | `CRON_SECRET` | Daily reminder job |

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step guides (Railway, Render,
DigitalOcean, Vercel + Neon) plus a production checklist.

## Extending (roadmap-ready)

The schema already models **courses** as first-class rows (`Course` table with
`contentPath`); students link to a course. Adding more courses, PDFs, videos,
quizzes or payments later means adding tables/routes — the authentication and
subscription core does not change.

## Scaling note

The rate limiter is in-memory and ideal for a single instance. If you scale
horizontally, swap `src/lib/rate-limit.ts` for a Redis/Upstash-backed
implementation (call sites are unchanged) and keep sessions in PostgreSQL as
they already are.
