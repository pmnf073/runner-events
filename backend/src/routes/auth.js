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
  jwt.sign({ id: user.id, email: user.email, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: "7d" });

const frontendUrl = (path) => new URL(path, process.env.FRONTEND_URL || "http://localhost:5173").toString();

function redirectToFrontend(res, path, params = {}) {
  const url = new URL(path, process.env.FRONTEND_URL || "http://localhost:5173");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  res.redirect(url.toString());
}

async function findOrCreateOAuthUser({ provider, email, name, avatar }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) return user;

  return prisma.user.create({
    data: {
      email,
      name,
      avatar,
      provider,
      role: "member",
      status: "pending",
      registrations: { create: { status: "pending" } },
    },
  });
}

function completeOAuthLogin(req, res) {
  const user = req.user;
  if (user.status === "pending") return redirectToFrontend(res, "/register-success", { email: user.email });
  if (user.status === "banned" || user.status === "inactive") {
    return redirectToFrontend(res, "/login", { oauthError: "account-unavailable" });
  }
  return redirectToFrontend(res, "/auth/callback", { token: signToken(user) });
}

// ─── Register (email + password) ───
router.post("/register", async (req, res) => {
  const { email, password, name, phone, altContact, address, dob, invitedBy } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Nome, email e password sao obrigatorios" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password deve ter pelo menos 8 caracteres" });
  }
  
  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email ja registado" });
    
    const hashed = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        phone: phone || null,
        altContact: altContact || null,
        address: address || null,
        dob: dob ? new Date(dob) : null,
        provider: "local",
        role: "member",
        status: "pending",
        invitedBy: invitedBy || null,
      },
    });
    
    // Create registration request
    await prisma.registration.create({
      data: { userId: user.id, status: "pending" }
    });
    
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
      message: "Registo efetuado. A tua conta sera revista por um administrador.",
    });
  } catch (e) {
    res.status(500).json({ error: "Erro ao criar conta" });
  }
});

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
    if (user.status === "pending") return res.status(403).json({ error: "Conta pendente. Aguarda aprovacao.", status: "pending" });
    if (user.status === "banned") return res.status(403).json({ error: "Conta banida.", status: "banned" });
    if (user.status === "inactive") return res.status(403).json({ error: "Conta desativada.", status: "inactive" });
    const token = signToken(user);
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: "Login failed" });
      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
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
          const email = profile.emails?.[0]?.value;
          if (!email) throw new Error("Google não disponibilizou um email para esta conta.");
          const user = await findOrCreateOAuthUser({
            provider: "google",
            email,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          });
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
  router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: frontendUrl("/login?oauthError=google") }), completeOAuthLogin);
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
        profileFields: ["id", "displayName", "photos", "email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) throw new Error("Facebook não disponibilizou um email para esta conta.");
          const user = await findOrCreateOAuthUser({
            provider: "facebook",
            email,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          });
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
  router.get("/facebook/callback", passport.authenticate("facebook", { session: false, failureRedirect: frontendUrl("/login?oauthError=facebook") }), completeOAuthLogin);
} else {
  router.get("/facebook", (_req, res) => res.status(501).json({ error: "Facebook OAuth not configured" }));
}

// ─── Auth Me ───
router.get("/me", async (req, res) => {
  // Priority: JWT header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, name: true, role: true, status: true, avatar: true, password: true },
      });
      if (user) {
        const { password, ...safeUser } = user;
        return res.json({ authenticated: true, user: { ...safeUser, hasPassword: Boolean(password) } });
      }
    } catch {}
  }
  // Fallback: session
  if (req.user) {
    return res.json({
      authenticated: true,
      user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role, avatar: req.user.avatar, hasPassword: Boolean(req.user.password) },
    });
  }
  res.json({ authenticated: false });
});

// ─── Change Password (authenticated user) ───
router.post("/change-password", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Auth required" });
  let payload;
  try {
    payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }

  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "Password atual e nova password sao obrigatorias" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password deve ter pelo menos 8 caracteres" });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ error: "Token inválido" });
    if (!user.password) return res.status(400).json({ error: "Esta conta usa login social e nao tem password." });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: "Password atual incorreta" });
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ error: "A nova password tem de ser diferente da atual" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// ─── Logout ───
router.post("/logout", (req, res) => {
  req.logout?.(() => {});
  res.json({ ok: true });
});

export default router;
