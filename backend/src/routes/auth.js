import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import prisma from "../db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

// ─── Admin Setup (one-time) ───
router.post("/admin/setup", async (req, res) => {
  const { email, password, name } = req.body;
  const count = await prisma.user.count({ where: { role: "admin" } });
  if (count > 0) return res.status(403).json({ error: "Admin already exists" });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name: name || "Admin", role: "admin", provider: "local" },
    });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch {
    res.status(500).json({ error: "Failed to create admin" });
  }
});

// ─── Local Login (email + password) ───
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ error: "Credenciais inválidas" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });
    const token = signToken(user);
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: "Login failed" });
      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// ─── Google OAuth ───
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          let user = await prisma.user.findUnique({ where: { email: profile.emails[0].value } });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: profile.emails[0].value,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                provider: "google",
                providerId: profile.id,
              },
            });
          }
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
  router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    (req, res) => {
      const token = signToken(req.user);
      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/callback?token=${token}`);
    }
  );
} else {
  router.get("/google", (_req, res) => res.status(501).json({ error: "Google OAuth not configured" }));
}

// ─── Facebook OAuth ───
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || `${profile.id}@facebook.placeholder`;
          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                provider: "facebook",
                providerId: profile.id,
              },
            });
          }
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
  router.get("/facebook/callback", passport.authenticate("facebook", { session: false, failureRedirect: "/login" }),
    (req, res) => {
      const token = signToken(req.user);
      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/callback?token=${token}`);
    }
  );
} else {
  router.get("/facebook", (_req, res) => res.status(501).json({ error: "Facebook OAuth not configured" }));
}

// ─── TEMP: Promote to admin (remove after first use) ───
router.post("/promote", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Wrong password" });
    await prisma.user.update({ where: { id: user.id }, data: { role: "admin" } });
    res.json({ ok: true, message: "Promoted to admin" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth Me ───
router.get("/me", async (req, res) => {
  // Priority: JWT header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, name: true, role: true, avatar: true },
      });
      if (user) return res.json({ authenticated: true, user });
    } catch {}
  }
  // Fallback: session
  if (req.user) {
    return res.json({
      authenticated: true,
      user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role, avatar: req.user.avatar },
    });
  }
  res.json({ authenticated: false });
});

// ─── Logout ───
router.post("/logout", (req, res) => {
  req.logout?.(() => {});
  res.json({ ok: true });
});

export default router;
