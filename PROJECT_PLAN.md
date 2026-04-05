# 📅 Runner's Group Calendar — Project Plan

## 🎯 Overview
A collaborative calendar app for running groups (Trail Encostas de Xira, Alverca Urban Runners, etc.) to manage events, races, trainings and social activities.

**Replaces:** TeamUp (limited features)
**Target:** Private group use, social login, admin-managed content

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + Vite + Tailwind CSS |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL (or SQLite for dev) |
| **Auth** | Google OAuth + Facebook (social login) |
| **Hosting** | Vercel (frontend) + Railway/Fly.io (backend) |
| **Maps** | Google Maps API or Leaflet (free) |

---

## 📋 Feature Scope

### Phase 1 — MVP
- [ ] **Calendar View** — monthly/weekly/daily, color-coded by club
- [ ] **Event CRUD** — admin-only create/edit/delete
- [ ] **Social Login** — Google + Facebook
- [ ] **Event Types** — trail run, urban run, race, training, social, meeting
- [ ] **RSVP** — attending / maybe / not going
- [ ] **Import from TeamUp** — iCal/CSV parser
- [ ] **Location** — address + map embed
- [ ] **Responsive** — works on mobile + desktop

### Phase 2 — Social
- [ ] **Member profiles** — name, avatar, clubs, stats
- [ ] **Comments per event**
- [ ] **Share events** — generate image for WhatsApp/Telegram
- [ ] **Event photos gallery**
- [ ] **Club/Organization tags**

### Phase 3 — Smart
- [ ] **Weather forecast** on event day
- [ ] **Push notifications** reminders
- [ ] **Recurring events**
- [ ] **Route info** — distance, elevation, GPX upload
- [ ] **Carpool coordination**
- [ ] **Strava sync**
- [ ] **Google Calendar export** (iCal subscribe)

---

## 📁 Project Structure

```
runner-calendar/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Event, User, RSVP
│   │   ├── routes/          # API routes
│   │   ├── models/          # DB models
│   │   ├── middleware/      # Auth, validation
│   │   ├── services/        # TeamUp import, weather
│   │   └── index.js         # Express app
│   ├── prisma/              # DB schema + migrations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Calendar, EventCard, etc.
│   │   ├── pages/           # Home, Event, Login
│   │   ├── hooks/           # useEvents, useAuth
│   │   ├── services/        # API client
│   │   └── App.jsx
│   └── package.json
└── PROJECT_PLAN.md
```

---

## 🗃️ Database Schema (initial draft)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  avatar    String?
  provider  String   // "google" | "facebook"
  role      String   @default("member") // "admin" | "member"
  clubs     String[] // ["Trail Encostas de Xira", "Alverca Urban Runners"]
  createdAt DateTime @default(now())
}

model Event {
  id          String   @id @default(uuid())
  title       String
  description String?
  date        DateTime
  endDate     DateTime?
  location    String?
  lat         Float?
  lng         Float?
  type        String   // "trail" | "urban" | "race" | "training" | "social"
  club        String   // which club organized
  distance    Float?
  elevation   Int?
  gpxUrl      String?
  createdBy   String   // user id
  recurring   String?  // "weekly" | "monthly" | null
  createdAt   DateTime @default(now())
  rsvps       RSVP[]
}

model RSVP {
  id        String   @id @default(uuid())
  userId    String
  eventId   String
  status    String   // "going" | "maybe" | "not_going"
  event     Event    @relation(fields: [eventId], references: [id])
}
```

---

## 🔄 Data Migration from TeamUp

1. User exports iCal feed or CSV from TeamUp
2. Backend script parses and imports all events
3. Maps TeamUp sub-calendars → our `club` field
4. Maps TeamUp event types → our `type` field
5. Creates initial admin users

---

## 🚀 Next Steps

1. **Get TeamUp feed link** (for data import)
2. **Set up project scaffold** (React + Node.js)
3. **Database + Auth** first
4. **Calendar UI** second
5. **Admin panel** + RSVP third

---

**Questions remaining:**
- TeamUp feed link or export file?
- Which clubs/groups to include initially?
- Preferred DB hosting (PostgreSQL on Railway is free tier)?
