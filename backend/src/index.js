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
app.use("/api", importRoutes);

// Health
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`🏃 Backend running on http://localhost:${PORT}`);
});
