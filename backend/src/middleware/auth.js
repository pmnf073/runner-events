import jwt from "jsonwebtoken";
import prisma from "../db.js";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production");
}

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: "7d" });

// Attaches req.user (read from the database, so role and status changes apply at once)
// when a valid Bearer token is present. Anonymous requests pass through.
export async function loadUser(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (user) req.user = user;
  } catch {}
  next();
}

// Requires a logged-in user with an active account.
export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "É necessário iniciar sessão." });
  if (req.user.status !== "active") return res.status(403).json({ error: "Conta não ativa." });
  next();
}

// Requires an active user with one of the given roles.
export function requireRole(...roles) {
  return (req, res, next) =>
    requireUser(req, res, () => {
      if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Acesso restrito." });
      next();
    });
}

export const requireAdmin = requireRole("admin");
export const requireStaff = requireRole("admin", "organizer");
