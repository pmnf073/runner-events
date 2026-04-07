import jwt from "jsonwebtoken";
import prisma from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export default async function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Auth required" });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (payload.role !== "admin" && payload.role !== "organizer") {
      return res.status(403).json({ error: "Acesso restrito a administradores ou organizadores." });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}
