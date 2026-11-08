import { Router } from "express";
import prisma from "../db.js";
import { requireStaff, requireUser } from "../middleware/auth.js";
import { audit } from "../services/audit.js";
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

const USER_FIELDS = { id: true, name: true, avatar: true };

// PUT /api/rsvps/:eventId/users/:userId — admins and organizers answer for
// someone else (e.g. a member who confirmed by phone). Body: { status }.
router.put("/:eventId/users/:userId", requireStaff, async (req, res) => {
  try {
    const status = req.body?.status || "going";
    if (!isAllowed("rsvpStatus", status)) return res.status(400).json({ error: "Resposta inválida." });
    const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true, name: true, status: true } });
    if (!user || user.status !== "active") return res.status(404).json({ error: "Utilizador não encontrado." });
    const persistedEvent = await ensurePersistedEvent(req.params.eventId);
    if (!persistedEvent) return res.status(404).json({ error: "Evento não encontrado." });

    const rsvp = await prisma.rsvp.upsert({
      where: { userId_eventId: { userId: user.id, eventId: persistedEvent.id } },
      update: { status },
      create: { userId: user.id, eventId: persistedEvent.id, status },
      include: { user: { select: USER_FIELDS } },
    });
    await audit(null, req, "rsvp.set", "Rsvp", persistedEvent.id, { userId: user.id, name: user.name, status, event: persistedEvent.title });
    res.json(rsvp);
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/rsvps/:eventId/users/:userId — admins and organizers remove someone's answer
router.delete("/:eventId/users/:userId", requireStaff, async (req, res) => {
  try {
    const eventId = await persistedEventId(req.params.eventId);
    if (eventId) {
      const { count } = await prisma.rsvp.deleteMany({ where: { userId: req.params.userId, eventId } });
      if (count) await audit(null, req, "rsvp.remove", "Rsvp", eventId, { userId: req.params.userId });
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
