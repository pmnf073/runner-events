# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Website and back office for the running club Alverca Urban Runners: public calendar of events with RSVP, plus staff-only management of users, members (sócios), annual fees (anuidades) and payments. All user-facing text and API error messages are in European Portuguese; keep new strings in pt-PT.

`PROJECT_PLAN.md` is the original plan and is out of date (structure, schema and hosting differ from the code). `DEPLOY.md` is current.

## Commands

Two independent npm projects, no root `package.json`. Run commands from inside each folder.

Backend (`backend/`, Express + Prisma, ES modules, port 3001):

```bash
cp .env.example .env        # then set DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev      # local: apply/create migrations
npm run dev                 # node --watch src/index.js
npm run db:migrate          # prisma migrate deploy (production)
npm run db:seed             # creates/resets the admin user; needs SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD
```

Frontend (`frontend/`, React 19 + Vite + Tailwind, port 5173):

```bash
npm install
npm run dev
npm run build
```

Backend unit tests (pure logic: recurrence, ICS parsing, NIF) run with `npm test` in `backend/` (`node --test`, files in `backend/test/`). There is no linter and no type checker. Verify frontend changes with `npm run build` in `frontend/` and by running the app.

## Environment

- The database is PostgreSQL only (Prisma `postgresql` provider); a local or Neon `DATABASE_URL` is required to start the backend.
- `JWT_SECRET` signs the JWTs; the backend refuses to start in production without it. There is no Express session.
- CORS: outside production only `http://localhost:5173` is allowed. In production the allow-list is `FRONTEND_URLS` (comma-separated), falling back to `FRONTEND_URL` plus hardcoded domains in `backend/src/index.js`. `FRONTEND_PREVIEW_ORIGINS` optionally adds wildcard origins for Vercel preview deployments (`*` matches one hostname segment); previews talk to the production backend and database.
- Google and Facebook OAuth routes are registered only when their env vars are set; otherwise they return 501.
- Setting `TEAMUP_ICS_FEED` enables an hourly import of that ICS feed on the backend process (`services/ics.js`): events are matched by `Event.sourceUid` and updated, and future imported events missing from the feed are marked `recurrenceStatus: "cancelled"`. The import endpoints only fetch `https://ics.teamup.com/...` or the configured feed.
- Frontend: `VITE_API_URL` is the backend origin in production. When it is empty, requests are relative and the Vite dev server proxies `/api` and `/auth` to `localhost:3001`.

## Deployment

Frontend on Vercel (root `frontend/`, SPA rewrite in `vercel.json`), backend on Render (`backend/render.yaml`), database on Neon. Vercel deploys on every push to `main`. The Render build command (set in the Render dashboard, mirrored in `render.yaml`) runs `prisma migrate deploy` on every deploy; a failing migration aborts the deploy, so every schema change needs a migration that works against the production data.

## Architecture

### Backend

`backend/src/index.js` wires middleware and mounts the routers: `/auth` and `/api/{events,rsvps,import,admin,members,payments}`. Each file in `routes/` talks to Prisma directly through the shared client in `db.js`; there is no controller or service layer.

Authentication is a JWT (7 days, payload `{ id, email, role, status }`) sent as `Authorization: Bearer`. The frontend keeps it in `localStorage` under `token`. OAuth logins end in a redirect to the frontend route `/auth/callback` carrying the token.

Authorization lives in `middleware/auth.js`. `loadUser` runs for every request and attaches `req.user` **from the database** when a valid token is present, so role and status changes apply immediately; route files use `requireUser` (active account), `requireStaff` (admin or organizer) and `requireAdmin`. `/auth/login`, `/auth/register` and `/auth/change-password` are rate-limited in memory (`middleware/rateLimit.js`). API error messages go through `serverError` (`utils/http.js`), which logs the real error and returns a generic pt-PT message; `ALLOWED` there lists the valid values of the enum-like fields.

Roles are `admin`, `organizer`, `member`. User `status` is `pending` until an admin approves the `Registration`; pending, inactive and banned users cannot log in. Enum-like fields are plain strings in the Prisma schema, with the allowed values listed in comments there.

### Recurring events

This is the part that needs several files to understand (`utils/recurrence.js`, `routes/events.js`, `routes/rsvps.js`).

- A recurring series is one `Event` row with `recurrenceType` set (`weekly`, `biweekly`, `monthly`). Occurrences are **not stored**; `GET /api/events` expands them for the requested `start`/`end` range.
- A generated occurrence has a virtual id `rec_<parentId>_<YYYY-MM-DD>`. Any endpoint that takes an event id must accept both real and virtual ids (`parseVirtualEventId`, `findParentAndOccurrence`).
- An occurrence becomes a real row (with `parentEventId` and `recurrenceInstanceDate`) only when it diverges from the series: edited alone, cancelled (`recurrenceStatus: "cancelled"`), or given an RSVP (`ensurePersistedEvent`).
- `PUT /api/events/:id` takes `recurrenceScope`: `single` writes an override row, `future` ends the series the day before and creates a new series, `all` (default) updates the parent.
- Occurrence days are calendar dates in `Europe/Lisbon`, represented as `Date`s at 00:00 UTC of that date; times of day are Lisbon wall-clock times (`utils/timezone.js`), so a 19:00 series stays at 19:00 across DST changes.
- `future` moves occurrences that already have RSVPs to the new series (or makes them standalone events if the new pattern skips that day).

### Membership and payments

`User` 1:1 `Member` (sequential `memberNumber`) → `Membership` (one per member per year) → `Payment`. `AccountEntry` is the member's ledger and the source of the balance: creating a membership adds a debit `Anuidade <year>`, registering a payment adds a credit. `services/ledger.js` holds the rules: `recalcMembership` derives the early-bird discount (only if payments made by `earlybirdDeadline` cover the discounted amount), `Membership.status`/`paidDate` and the debit amount from the linked payments. Payment create/update/delete run in one transaction and call it. Receipt numbers (`<year>-<sequence>`) and member numbers are allocated under a Postgres advisory lock (`lockSequence`). `AnnualFeeConfig` holds the fee per year and is used to generate memberships in bulk.

Money columns are `Decimal(10,2)`; `db.js` makes Prisma `Decimal`s serialize as JSON numbers, so the API returns plain numbers. Wrap them in `Number()` before doing arithmetic.

The Prisma model for RSVPs is `Rsvp` (table `"RSVP"`), accessed as `prisma.rsvp`.

### Frontend

`src/App.jsx` holds the layout, the route table and the logged-in `user` state, which is passed to pages as a prop (no global store or auth context). Pages in `src/pages/` are large self-contained components that fetch their own data.

- API access: `src/services/api.js` adds the token and base URL. Some pages (login, register, import, admin users) still call `fetch` directly; prefer the shared `api()` for new code.
- Styling mixes Tailwind classes with inline styles driven by CSS variables (`--bg-page`, `--text-primary`, …) defined in `src/index.css` for `:root.dark` and `:root.light`. `ThemeContext.jsx` toggles the class on `<html>`. Use the variables, not fixed colours, so both themes work.
- Dates are shown and typed as `dd/mm/yyyy` and converted to `YYYY-MM-DD` before being sent, with the helpers in `src/utils/format.js` (`formatDate`, `displayDateForInput`, `parseInputDateToYMD`, `localDateKey`). Group events by day with `localDateKey`, not by slicing the ISO string (that is the UTC day).
