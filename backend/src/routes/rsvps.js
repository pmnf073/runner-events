import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Login required" });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (user) { req.user = user; return next(); }
  } catch {}
  return res.status(401).json({ error: "Invalid token" });
}

// POST /api/rsvps — RSVP to an event
router.post("/", auth, async (req, res) => {
  try {
    const { eventId, status } = req.body;
    if (!["going", "maybe", "not_going"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const rsvp = await prisma.rsvp.upsert({
      where: { userId_eventId: { userId: req.user.id, eventId } },
      update: { status },
      create: { userId: req.user.id, eventId, status },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(rsvp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rsvps/:eventId — remove RSVP
router.delete("/:eventId", auth, async (req, res) => {
  try {
    await prisma.rsvp.delete({
      where: { userId_eventId: { userId: req.user.id, eventId: req.params.eventId } },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rsvps/:eventId — list all RSVPs for an event (public)
router.get("/:eventId", async (req, res) => {
  try {
    const rsvps = await prisma.rsvp.findMany({
      where: { eventId: req.params.eventId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(rsvps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
