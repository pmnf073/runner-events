import { Router } from "express";
import prisma from "../db.js";
import { requireUser } from "../middleware/auth.js";
import { isAllowed, serverError } from "../utils/http.js";
import { ensurePersistedEvent, persistedEventId } from "../services/eventInstances.js";

const router = Router();

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
