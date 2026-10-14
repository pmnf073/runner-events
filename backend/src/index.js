import express from "express";
import cors from "cors";
import passport from "passport";
import dotenv from "dotenv";
import { loadUser } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { syncFeed } from "./services/ics.js";
import { runReminders } from "./services/reminders.js";

// Routes
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import rsvpRoutes from "./routes/rsvps.js";
import importRoutes from "./routes/import.js";
import adminUsersRoutes from "./routes/admin-users.js";
import membersRoutes from "./routes/members.js";
import paymentsRoutes from "./routes/payments.js";
import meRoutes from "./routes/me.js";
import calendarRoutes from "./routes/calendar.js";
import dashboardRoutes from "./routes/dashboard.js";
import announcementsRoutes from "./routes/announcements.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
// Render sits behind one proxy; req.ip is then the client's IP (used by the rate limit).
app.set("trust proxy", 1);

// Middleware - CORS: accept one or more frontend origins.
const fallbackFrontendOrigins = [
  process.env.FRONTEND_URL,
  "https://runner-events.vercel.app",
  "https://alvercaurbanrunners.pt",
  "https://www.alvercaurbanrunners.pt",
  "http://localhost:5173",
].filter(Boolean);
const corsOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : fallbackFrontendOrigins;

// Vercel preview deployments: comma-separated origins where "*" matches one hostname segment,
// e.g. https://runner-events-*-myteam.vercel.app
const previewOriginPatterns = (process.env.FRONTEND_PREVIEW_ORIGINS || "")
  .split(",").map((pattern) => pattern.trim()).filter(Boolean)
  .map((pattern) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9-]+")}$`));

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = process.env.NODE_ENV === "production" ? corsOrigins : ["http://localhost:5173"];
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (previewOriginPatterns.some((pattern) => pattern.test(origin))) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
// Event images selected locally are optimized in the browser and sent as data URLs.
app.use(express.json({ limit: "3mb" }));

// OAuth only; logins are stateless (JWT), so there is no session.
app.use(passport.initialize());

// Attaches req.user from the Bearer token for every route.
app.use(loadUser);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Demasiadas tentativas. Tenta novamente daqui a alguns minutos.",
});
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);
app.use("/auth/change-password", authLimiter);
app.use("/auth/forgot-password", authLimiter);
app.use("/auth/reset-password", authLimiter);

// Routes
app.use("/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/rsvps", rsvpRoutes);
app.use("/api/import", importRoutes);
app.use("/api/admin", adminUsersRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/me", meRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/announcements", announcementsRoutes);

// Health
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

/* ── TeamUp ICS Feed Auto-Sync ── */
const TEAMUP_ICS_FEED = process.env.TEAMUP_ICS_FEED;
if (TEAMUP_ICS_FEED) {
  async function syncTeamUp() {
    try {
      const { imported, updated, cancelled, total } = await syncFeed(TEAMUP_ICS_FEED);
      console.log(`[Sync] TeamUp: imported ${imported}, updated ${updated}, cancelled ${cancelled}, total ${total}`);
    } catch (err) {
      console.error("[Sync] Error:", err.message);
    }
  }

  // Initial sync on startup, then every hour while the process is running.
  syncTeamUp();
  setInterval(syncTeamUp, 60 * 60 * 1000);
  console.log("[Sync] TeamUp auto-sync enabled (hourly)");
}

/* ── Email reminders (fees, events): hourly, only when email is configured ── */
async function remindersJob() {
  try {
    const result = await runReminders();
    if (!result.skipped && (result.fees || result.events)) {
      console.log(`[Reminders] fees ${result.fees}, events ${result.events}`);
    }
  } catch (err) {
    console.error("[Reminders] Error:", err.message);
  }
}
setTimeout(remindersJob, 60 * 1000).unref();
setInterval(remindersJob, 60 * 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(`🏃 Backend running on http://localhost:${PORT}`);
});
