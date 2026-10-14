import { Router } from "express";
import prisma from "../db.js";
import { requireUser } from "../middleware/auth.js";
import { isAllowed, serverError } from "../utils/http.js";
import { materializeInstance, parseVirtualEventId } from "../utils/recurrence.js";

const router = Router();

// Resolves a real or virtual ("rec_<parent>_<date>") id to the persisted event id, if any.
async function persistedEventId(eventId) {
  const parsed = parseVirtualEventId(eventId);
  if (!parsed) return eventId;
  const found = await prisma.event.findFirst({
    where: { parentEventId: parsed.parentEventId, recurrenceInstanceDate: parsed.occurrenceDate },
    select: { id: true },
  });
  return found?.id || null;
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
router.post("/", requireUser, async (req, res) => {
  try {
    const { eventId, status } = req.body;
    if (!isAllowed("rsvpStatus", status)) {
      return res.status(400).json({ error: "Resposta inválida." });
    }
    const persistedEvent = await ensurePersistedEvent(eventId);
    if (!persistedEvent) return res.status(404).json({ error: "Evento não encontrado." });

    const rsvp = await prisma.rsvp.upsert({
      where: { userId_eventId: { userId: req.user.id, eventId: persistedEvent.id } },
      update: { status },
      create: { userId: req.user.id, eventId: persistedEvent.id, status },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(rsvp);
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/rsvps/:eventId — remove RSVP
router.delete("/:eventId", requireUser, async (req, res) => {
  try {
    const eventId = await persistedEventId(req.params.eventId);
    if (eventId) {
      await prisma.rsvp.deleteMany({ where: { userId: req.user.id, eventId } });
    }
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/rsvps/:eventId — list all RSVPs for an event (logged-in users)
router.get("/:eventId", requireUser, async (req, res) => {
  try {
    const rsvps = await prisma.rsvp.findMany({
      where: { eventId: (await persistedEventId(req.params.eventId)) || "" },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(rsvps);
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
