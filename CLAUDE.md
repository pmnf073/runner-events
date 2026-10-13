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

There are no tests, no linter and no type checker. Verify changes with `npm run build` in `frontend/` and by running the app.

## Environment

- The database is PostgreSQL only (Prisma `postgresql` provider); a local or Neon `DATABASE_URL` is required to start the backend.
- `JWT_SECRET` signs both the JWTs and the Express session. `.env.example` lists `SESSION_SECRET`, but the code never reads it.
- CORS: outside production only `http://localhost:5173` is allowed. In production the allow-list is `FRONTEND_URLS` (comma-separated), falling back to `FRONTEND_URL` plus hardcoded domains in `backend/src/index.js`.
- Google and Facebook OAuth routes are registered only when their env vars are set; otherwise they return 501.
- Setting `TEAMUP_ICS_FEED` enables an hourly import of that ICS feed on the backend process, deduplicated by `Event.sourceUid`.
- Frontend: `VITE_API_URL` is the backend origin in production. When it is empty, requests are relative and the Vite dev server proxies `/api` and `/auth` to `localhost:3001`.

## Deployment

Frontend on Vercel (root `frontend/`, SPA rewrite in `vercel.json`), backend on Render (`backend/render.yaml`), database on Neon. Vercel deploys on every push to `main`. Migrations are not run by the Render build; run `npx prisma migrate deploy` after deploying a schema change.

## Architecture

### Backend

`backend/src/index.js` wires middleware and mounts the routers: `/auth` and `/api/{events,rsvps,import,admin,members,payments}`. Each file in `routes/` talks to Prisma directly through the shared client in `db.js`; there is no controller or service layer.

Authentication is a JWT (7 days, payload `{ id, email, role, status }`) sent as `Authorization: Bearer`. The frontend keeps it in `localStorage` under `token`. OAuth logins end in a redirect to the frontend route `/auth/callback` carrying the token.

Authorization helpers are **duplicated per route file** rather than shared (`auth`, `isAdmin`, `isOrganizerOrAdmin`, `requireAdmin`, `requireAdminOrOrganizer`, `requireStaff`); only `payments.js` uses `middleware/admin.js`. When changing an auth rule, check every route file. `auth` in `events.js` is optional: it attaches `req.user` if a valid token is present and lets anonymous requests through.

Roles are `admin`, `organizer`, `member`. User `status` is `pending` until an admin approves the `Registration`; pending, inactive and banned users cannot log in. Enum-like fields are plain strings in the Prisma schema, with the allowed values listed in comments there.

### Recurring events

This is the part that needs several files to understand (`utils/recurrence.js`, `routes/events.js`, `routes/rsvps.js`).

- A recurring series is one `Event` row with `recurrenceType` set (`weekly`, `biweekly`, `monthly`). Occurrences are **not stored**; `GET /api/events` expands them for the requested `start`/`end` range.
- A generated occurrence has a virtual id `rec_<parentId>_<YYYY-MM-DD>`. Any endpoint that takes an event id must accept both real and virtual ids (`parseVirtualEventId`, `findParentAndOccurrence`).
- An occurrence becomes a real row (with `parentEventId` and `recurrenceInstanceDate`) only when it diverges from the series: edited alone, cancelled (`recurrenceStatus: "cancelled"`), or given an RSVP (`ensurePersistedEvent`).
- `PUT /api/events/:id` takes `recurrenceScope`: `single` writes an override row, `future` ends the series the day before and creates a new series, `all` (default) updates the parent.
- All recurrence date arithmetic is in UTC.

### Membership and payments

`User` 1:1 `Member` (sequential `memberNumber`) → `Membership` (one per member per year) → `Payment`. `AccountEntry` is the member's ledger and the source of the balance: creating a membership adds a debit `Anuidade <year>`, registering a payment adds a credit and updates the membership status. Payment create/update/delete must keep `AccountEntry` and `Membership.status` consistent. Receipt numbers are generated as `<year>-<sequence>`. `AnnualFeeConfig` holds the fee per year and is used to generate memberships in bulk.

### Frontend

`src/App.jsx` holds the layout, the route table and the logged-in `user` state, which is passed to pages as a prop (no global store or auth context). Pages in `src/pages/` are large self-contained components that fetch their own data.

- API access: `src/services/api.js` adds the token and base URL. Several pages still define their own local copy of `api()`; prefer the shared one for new code.
- Styling mixes Tailwind classes with inline styles driven by CSS variables (`--bg-page`, `--text-primary`, …) defined in `src/index.css` for `:root.dark` and `:root.light`. `ThemeContext.jsx` toggles the class on `<html>`. Use the variables, not fixed colours, so both themes work.
- Dates are shown and typed as `dd/mm/yyyy` and converted to `YYYY-MM-DD` before being sent. The helpers (`formatDate`, `parseInputDateToYMD`) are defined locally in each page.
- `src/pages/AboutPage copy.jsx` is an unused leftover.
