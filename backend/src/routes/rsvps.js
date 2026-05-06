import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db.js";
import { materializeInstance, parseVirtualEventId } from "../utils/recurrence.js";

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

async function ensurePersistedEvent(eventId) {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (existing) return existing;

  const parsed = parseVirtualEventId(eventId);
  if (!parsed) return null;

  const parent = await prisma.event.findUnique({ where: { id: parsed.parentEventId } });
  if (!parent || !parent.recurrenceType) return null;

  const found = await prisma.event.findFirst({
    where: {
      parentEventId: parent.id,
      recurrenceInstanceDate: parsed.occurrenceDate,
    },
  });
  if (found) return found.recurrenceStatus === "cancelled" ? null : found;

  const instance = materializeInstance(parent, parsed.occurrenceDate);
  return prisma.event.create({
    data: {
      title: instance.title,
      description: instance.description,
      date: new Date(instance.date),
      endDate: instance.endDate ? new Date(instance.endDate) : null,
      location: instance.location,
      lat: instance.lat,
      lng: instance.lng,
      type: instance.type,
      club: instance.club,
      distance: instance.distance,
      elevation: instance.elevation,
      gpxUrl: instance.gpxUrl,
      url: instance.url,
      imageUrl: instance.imageUrl,
      createdBy: instance.createdBy,
      parentEventId: parent.id,
      isRecurrenceInstance: true,
      recurrenceInstanceDate: parsed.occurrenceDate,
      recurrenceStatus: "active",
    },
  });
}

// POST /api/rsvps — RSVP to an event
router.post("/", auth, async (req, res) => {
  try {
    const { eventId, status } = req.body;
    if (!["going", "maybe", "not_going"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const persistedEvent = await ensurePersistedEvent(eventId);
    if (!persistedEvent) return res.status(404).json({ error: "Event not found" });

    const rsvp = await prisma.rsvp.upsert({
      where: { userId_eventId: { userId: req.user.id, eventId: persistedEvent.id } },
      update: { status },
      create: { userId: req.user.id, eventId: persistedEvent.id, status },
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
