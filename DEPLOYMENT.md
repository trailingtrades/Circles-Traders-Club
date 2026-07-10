# Deployment Guide

The app is a standard Next.js server application with a PostgreSQL database.
Any platform that runs Node.js 20+ works. Below are recipes for the most
common options, followed by a production checklist.

In every case the sequence is:

1. Provision **PostgreSQL** and note its connection string.
2. Set the **environment variables** (see `.env.example`).
3. Run **migrations**: `npx prisma migrate deploy`
4. Run the **seed** once: `npm run db:seed` (creates the first admin + course)
5. Build & start: `npm run build` → `npm start`
6. Schedule the **daily reminder cron** hitting `/api/cron/reminders`.

---

## Option A — Railway (easiest)

1. Create a new Railway project → **Deploy from GitHub repo**.
2. Add a **PostgreSQL** service; Railway injects `DATABASE_URL` automatically
   (reference it in the app service's variables).
3. In the app service → Variables, add everything from `.env.example`
   (`APP_URL` = your Railway domain, strong `ADMIN_PASSWORD`, `CRON_SECRET`,
   SMTP settings).
4. Settings → Deploy:
   - Build command: `npm run build`
   - Pre-deploy command: `npx prisma migrate deploy`
   - Start command: `npm start`
5. One-time seed: open a shell on the service (or run locally against the
   production `DATABASE_URL`): `npm run db:seed`
6. Cron: add a Railway **cron job** service (schedule `0 3 * * *`) running:
   `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/reminders`

## Option B — Render

1. New → **PostgreSQL** instance; copy the internal connection string.
2. New → **Web Service** from your repo:
   - Build command: `npm install && npm run build`
   - Start command: `npx prisma migrate deploy && npm start`
   - Add all environment variables.
3. Seed once from the service shell: `npm run db:seed`
4. New → **Cron Job**:
   - Schedule: `0 3 * * *`
   - Command: `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<your-app>.onrender.com/api/cron/reminders`

## Option C — DigitalOcean App Platform / any VPS

App Platform mirrors the Render steps (managed PG + web service + scheduled
function). On a plain VPS:

```bash
# once
git clone <repo> && cd <repo>
npm install
cp .env.example .env   # fill in values; DATABASE_URL points at local/managed PG
npx prisma migrate deploy
npm run db:seed
npm run build

# run under a process manager
npm install -g pm2
pm2 start npm --name circles-lms -- start
pm2 save && pm2 startup

# daily reminders (crontab -e)
0 3 * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/reminders
```

Put nginx/Caddy in front for TLS (the app is HTTPS-ready: secure cookies are
enabled automatically when `NODE_ENV=production`).

## Option D — Vercel + managed Postgres (Neon/Supabase)

1. Create a Postgres database at Neon/Supabase; use the **pooled** connection
   string as `DATABASE_URL`.
2. Import the repo into Vercel; add all environment variables.
3. The build command is already `prisma generate && next build`. Run
   migrations from your machine: `DATABASE_URL=<prod-url> npx prisma migrate deploy`
   and seed the same way.
4. Add `vercel.json` cron (or use the dashboard) to call
   `/api/cron/reminders` daily. Vercel Cron sends no custom headers, so either
   use an external pinger that can send the `Authorization` header (e.g.
   GitHub Actions `schedule`), or keep the endpoint as-is and trigger it from
   any scheduler you control.

> Note: the in-memory login rate limiter resets per serverless instance on
> Vercel. Acceptable for a small institute; for stricter guarantees use a
> Redis-backed limiter (see README "Scaling note").

---

## Production checklist

- [ ] `DATABASE_URL` uses SSL (`?sslmode=require` for most managed providers)
- [ ] `APP_URL` set to the real https:// domain (used in email links)
- [ ] `ADMIN_PASSWORD` is long and unique; rotate after first login
- [ ] `CRON_SECRET` is a long random string (`openssl rand -base64 32`)
- [ ] SMTP configured and a test email verified (create a test student)
- [ ] Daily cron scheduled and returning `{"ok":true,...}`
- [ ] Database backups enabled on the provider
- [ ] `ENFORCE_SINGLE_STUDENT_SESSION=true` (default) if you want to stop
      credential sharing
- [ ] Log in as admin, create a real student, log in as that student on your
      phone, and confirm the playbook renders

## Updating the learning material

Replace `content/options-selling-playbook.html` and redeploy. To add another
course, drop a new HTML file into `content/` and insert a `Course` row
(e.g. via `npx prisma studio`) — then assign students to it.
