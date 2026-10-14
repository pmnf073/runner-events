import { Router } from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import prisma from "../db.js";
import { requireUser, signToken } from "../middleware/auth.js";
import { isValidNif, serverError } from "../utils/http.js";

const router = Router();

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
  const { email, password, name, phone, altContact, address, dob, invitedBy, nif } = req.body;
  
  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string" || !email || !password || !name) {
    return res.status(400).json({ error: "Nome, email e password são obrigatórios." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "A password deve ter pelo menos 8 caracteres." });
  }
  if (nif && !isValidNif(nif)) {
    return res.status(400).json({ error: "NIF inválido (9 dígitos)." });
  }
  
  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email já registado." });
    
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
        nif: nif || null,
        registrations: { create: { status: "pending" } },
      },
    });
    
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
      message: "Registo efetuado. A tua conta será revista por um administrador.",
    });
  } catch (err) {
    serverError(res, err, "Erro ao criar conta.");
  }
});

// ─── Local Login (email + password) ───
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email e password são obrigatórios." });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ error: "Credenciais inválidas" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });
    if (user.status === "pending") return res.status(403).json({ error: "Conta pendente. Aguarda aprovação.", status: "pending" });
    if (user.status === "banned") return res.status(403).json({ error: "Conta banida.", status: "banned" });
    if (user.status === "inactive") return res.status(403).json({ error: "Conta desativada.", status: "inactive" });
    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
    });
  } catch (err) {
    serverError(res, err);
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
  router.get("/google", (_req, res) => res.status(501).json({ error: "Login com Google não configurado." }));
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
  router.get("/facebook", (_req, res) => res.status(501).json({ error: "Login com Facebook não configurado." }));
}

// ─── Auth Me ───
router.get("/me", (req, res) => {
  if (!req.user) return res.json({ authenticated: false });
  const { id, email, name, role, status, avatar, password } = req.user;
  res.json({ authenticated: true, user: { id, email, name, role, status, avatar, hasPassword: Boolean(password) } });
});

// ─── Change Password (authenticated user) ───
router.post("/change-password", requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "A password atual e a nova password são obrigatórias." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "A password deve ter pelo menos 8 caracteres." });
  }
  try {
    const user = req.user;
    if (!user.password) return res.status(400).json({ error: "Esta conta usa login social e não tem password." });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: "Password atual incorreta." });
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ error: "A nova password tem de ser diferente da atual." });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

// ─── Logout ───
// The JWT lives in the browser; the frontend discards it.
router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

export default router;
