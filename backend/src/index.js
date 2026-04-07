import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";
import prisma from "./db.js";

// Routes
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import rsvpRoutes from "./routes/rsvps.js";
import importRoutes from "./routes/import.js";
import adminUsersRoutes from "./routes/admin-users.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS: accept origin from env or wildcard in prod
const corsOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? corsOrigin : "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.JWT_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) { done(err, null); }
});

// Routes
app.use("/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/rsvps", rsvpRoutes);
app.use("/api/import", importRoutes);
app.use("/api/admin", adminUsersRoutes);

// Health
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

/* ── TeamUp ICS Feed Auto-Sync ── */
const TEAMUP_ICS_FEED = process.env.TEAMUP_ICS_FEED;
if (TEAMUP_ICS_FEED) {
  async function parseICSFeed(icsContent) {
    const events = [];
    const eventBlocks = icsContent.split("BEGIN:VEVENT");
    for (const block of eventBlocks.slice(1)) {
      const getField = (field) => {
        const regex = new RegExp(`${field}(?:;[^:]*)?:(.*)`, "i");
        const match = block.match(regex);
        if (!match) return null;
        return match[1].trim().replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, "\n");
      };
      const title = getField("SUMMARY");
      const description = getField("DESCRIPTION");
      const location = getField("LOCATION");
      const dtstartRaw = getField("DTSTART");
      const dtendRaw = getField("DTEND");
      const uid = block.match(/UID:(.*)/i)?.[1]?.trim() || null;
      if (!title || !dtstartRaw) continue;
      const parseDate = (raw) => {
        if (!raw) return null;
        if (/^\d{8}$/.test(raw)) {
          return new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T00:00:00.000Z`);
        }
        const clean = raw.replace(/Z$/, "");
        const datePart = clean.slice(0,8);
        const yyyy = datePart.slice(0,4); const mm = datePart.slice(4,6); const dd = datePart.slice(6,8);
        if (clean.length >= 13) {
          const hh = clean.slice(9,11); const mi = clean.slice(11,13);
          return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00.000Z`);
        }
        return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
      };
      const startDate = parseDate(dtstartRaw);
      if (isNaN(startDate.getTime())) continue;
      let type = "training";
      const t = title.toLowerCase();
      if (t.includes("prova") || t.includes("trail") || t.includes("corsa") || t.includes("sao silvestre") || t.includes("monte gordo") || t.includes("montejunto")) type = "race";
      else if (t.includes("caminhada")) type = "social";
      else if (t.includes("treino")) type = "training";
      else if (t.includes("reuniao") || t.includes("staff")) type = "meeting";
      else if (t.includes("limpeza")) type = "social";
      else if (t.includes("aniversario")) type = "social";
      else if (t.includes("entrega") || t.includes("dorsai")) type = "race";
      events.push({ title: title.substring(0,100), description: (description||"").substring(0,2000), date: startDate.toISOString(), endDate: dtendRaw ? parseDate(dtendRaw)?.toISOString() : null, location: location?.substring(0,200) || null, type, club: "Alverca Urban Runners", sourceUid: uid });
    }
    return events;
  }

  async function syncTeamUp() {
    try {
      console.log("[Sync] Fetching TeamUp ICS feed...");
      const response = await fetch(TEAMUP_ICS_FEED);
      if (!response.ok) { console.log("[Sync] Feed fetch failed:", response.status); return; }
      const icsContent = await response.text();
      const allEvents = await parseICSFeed(icsContent);
      if (allEvents.length === 0) { console.log("[Sync] No events found in feed"); return; }

      // Dedup by sourceUid
      const uids = allEvents.map(e => e.sourceUid).filter(Boolean);
      const existingByUid = new Set();
      if (uids.length > 0) {
        const found = await prisma.event.findMany({ where: { sourceUid: { in: uids } }, select: { sourceUid: true } });
        found.forEach(e => existingByUid.add(e.sourceUid));
      }

      let imported = 0;
      let skipped = 0;
      for (const event of allEvents) {
        if (event.sourceUid && existingByUid.has(event.sourceUid)) { skipped++; continue; }
        try {
          await prisma.event.create({ data: { title: event.title, description: event.description, date: event.date, endDate: event.endDate, location: event.location, type: event.type, club: event.club, sourceUid: event.sourceUid } });
          imported++;
          if (event.sourceUid) existingByUid.add(event.sourceUid);
        } catch { skipped++; }
      }
      console.log(`[Sync] Done — imported: ${imported}, skipped: ${skipped}, total: ${allEvents.length}`);
    } catch (err) {
      console.error("[Sync] Error:", err.message);
    }
  }

  // Initial sync on startup
  syncTeamUp();
  // Repeat every hour
  setInterval(syncTeamUp, 60 * 60 * 1000);
  console.log("[Sync] TeamUp auto-sync enabled (hourly)");
}

app.listen(PORT, () => {
  console.log(`🏃 Backend running on http://localhost:${PORT}`);
});
