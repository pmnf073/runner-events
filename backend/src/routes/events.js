import { Router } from "express";
import prisma from "../db.js";
import { requireAdmin, requireStaff, requireUser } from "../middleware/auth.js";
import { listEvents } from "../services/events.js";
import extractImageFromUrl from "../services/imageExtractor.js";
import { goingToEvents, notifyCancelled } from "../services/reminders.js";
import { ALLOWED, isAllowed, serverError } from "../utils/http.js";
import {
  dateKey,
  eventOccurrenceDate,
  generateRecurrenceInstances,
  materializeInstance,
  parseVirtualEventId,
  recurrenceDefaultEndDate,
  validateRecurrencePattern,
  withOriginalTime,
} from "../utils/recurrence.js";

const router = Router();

function eventValidationError(body, creating) {
  if (creating && !body.title?.trim()) return "O título é obrigatório.";
  if (creating && !body.date) return "A data é obrigatória.";
  if (body.date && Number.isNaN(new Date(body.date).getTime())) return "Data inválida.";
  if ((creating || body.type !== undefined) && !isAllowed("eventType", body.type)) {
    return `Tipo de evento inválido (${ALLOWED.eventType.join(", ")}).`;
  }
  if (body.recurrenceType) {
    const validation = validateRecurrencePattern(recurrenceValidationPayload(body));
    if (!validation.isValid) return validation.errors.join(", ");
  }
  return null;
}

function recurrenceValidationPayload(body) {
  return {
    recurrenceType: body.recurrenceType,
    recurrenceDaysOfWeek: body.recurrenceDaysOfWeek,
    recurrenceEndDate: body.recurrenceEndDate,
  };
}

async function resolveImageUrl(body) {
  if (body.imageUrl || !body.url) return body.imageUrl || null;
  return await extractImageFromUrl(body.url);
}

async function buildEventData(body, existing = null, includeRecurrence = true) {
  const finalImageUrl = await resolveImageUrl(body);
  const data = {
    title: body.title,
    description: body.description,
    date: body.date ? new Date(body.date) : undefined,
    endDate: body.endDate ? new Date(body.endDate) : body.endDate === null ? null : undefined,
    location: body.location,
    lat: body.lat,
    lng: body.lng,
    type: body.type,
    club: body.club || existing?.club || "Alverca Urban Runners",
    distance: body.distance,
    elevation: body.elevation,
    gpxUrl: body.gpxUrl,
    url: body.url,
    imageUrl: finalImageUrl,
  };

  if (includeRecurrence) {
    const recurrenceType = body.recurrenceType || null;
    data.recurrenceType = recurrenceType;
    data.recurrenceDaysOfWeek = recurrenceType ? body.recurrenceDaysOfWeek || null : null;
    data.recurrenceEndDate = recurrenceType
      ? body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : recurrenceDefaultEndDate(body.date || existing?.date)
      : null;
  }

  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
}

function copyInstanceData(baseEvent, occurrenceDate) {
  const instance = materializeInstance(baseEvent, occurrenceDate);
  return {
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
    parentEventId: baseEvent.id,
    isRecurrenceInstance: true,
    recurrenceInstanceDate: occurrenceDate,
    recurrenceStatus: "active",
  };
}

async function findParentAndOccurrence(id) {
  const parsed = parseVirtualEventId(id);
  if (!parsed) {
    const instance = await prisma.event.findUnique({ where: { id } });
    if (!instance?.parentEventId || !instance.recurrenceInstanceDate) return null;

    const parent = await prisma.event.findUnique({
      where: { id: instance.parentEventId },
      include: { rsvps: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
    });
    if (!parent || !parent.recurrenceType) return null;

    return {
      parent,
      occurrenceDate: eventOccurrenceDate(instance.recurrenceInstanceDate),
      occurrenceKey: dateKey(instance.recurrenceInstanceDate),
      persistedInstance: instance,
    };
  }

  const parent = await prisma.event.findUnique({
    where: { id: parsed.parentEventId },
    include: { rsvps: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
  });
  if (!parent || !parent.recurrenceType) return null;

  return { parent, occurrenceDate: parsed.occurrenceDate, occurrenceKey: parsed.occurrenceKey };
}

async function findOverride(parentId, occurrenceDate, includeRsvps = false) {
  return prisma.event.findFirst({
    where: {
      parentEventId: parentId,
      recurrenceInstanceDate: eventOccurrenceDate(occurrenceDate),
    },
    include: includeRsvps
      ? { rsvps: { include: { user: { select: { id: true, name: true, avatar: true } } } } }
      : undefined,
  });
}

// After "this and following" splits a series, occurrences that already have RSVPs
// move to the new series (taking its new details) so the RSVPs stay visible. If the
// new series has no occurrence on that day, the occurrence becomes a standalone event.
async function moveOccurrencesWithRsvps(oldParentId, fromDay, newSeries) {
  const kept = await prisma.event.findMany({
    where: { parentEventId: oldParentId, recurrenceInstanceDate: { gte: fromDay } },
  });
  if (kept.length === 0) return;

  const lastDay = kept.reduce((max, e) => (e.recurrenceInstanceDate > max ? e.recurrenceInstanceDate : max), fromDay);
  const newDays = new Set(
    generateRecurrenceInstances(newSeries, fromDay, lastDay).map((e) => dateKey(e.recurrenceInstanceDate)),
  );

  for (const occurrence of kept) {
    const day = eventOccurrenceDate(occurrence.recurrenceInstanceDate);
    if (newDays.has(dateKey(day))) {
      const { createdBy, ...data } = copyInstanceData(newSeries, day);
      await prisma.event.update({
        where: { id: occurrence.id },
        data: { ...data, recurrenceStatus: occurrence.recurrenceStatus },
      });
    } else {
      await prisma.event.update({
        where: { id: occurrence.id },
        data: { parentEventId: null, isRecurrenceInstance: false, recurrenceInstanceDate: null },
      });
    }
  }
}

function previousOccurrenceEnd(occurrenceDate) {
  const end = eventOccurrenceDate(occurrenceDate);
  end.setUTCDate(end.getUTCDate() - 1);
  return end;
}

router.post("/extract-image", requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "O URL é obrigatório." });

    const imageUrl = await extractImageFromUrl(url);
    res.json({ imageUrl });
  } catch (err) {
    serverError(res, err);
  }
});

router.get("/", requireUser, async (req, res) => {
  try {
    const { start, end, type, club } = req.query;
    const rangeStart = start ? new Date(start) : new Date();
    const rangeEnd = end ? new Date(end) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const filters = {};
    if (type) filters.type = type;
    if (club) filters.club = club;

    res.json(await listEvents({ rangeStart, rangeEnd, filters }));
  } catch (err) {
    serverError(res, err);
  }
});

router.get("/:id", requireUser, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        rsvps: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });
    if (event) {
      if (event.recurrenceStatus === "cancelled") return res.status(404).json({ error: "Evento não encontrado." });
      if (event.parentEventId && event.recurrenceInstanceDate) {
        const parent = await prisma.event.findUnique({ where: { id: event.parentEventId } });
        if (parent?.recurrenceType) return res.json(materializeInstance(parent, event.recurrenceInstanceDate, event));
      }
      return res.json(event);
    }

    const recurring = await findParentAndOccurrence(req.params.id);
    if (!recurring) return res.status(404).json({ error: "Evento não encontrado." });

    const override = await findOverride(recurring.parent.id, recurring.occurrenceDate, true);
    if (override?.recurrenceStatus === "cancelled") return res.status(404).json({ error: "Evento não encontrado." });

    res.json(materializeInstance(recurring.parent, recurring.occurrenceDate, override));
  } catch (err) {
    serverError(res, err);
  }
});

router.post("/", requireStaff, async (req, res) => {
  try {
    const validationError = eventValidationError(req.body, true);
    if (validationError) return res.status(400).json({ error: validationError });

    const event = await prisma.event.create({
      data: {
        ...(await buildEventData(req.body)),
        createdBy: req.user?.id || "system",
      },
    });
    res.status(201).json(event);
  } catch (err) {
    serverError(res, err);
  }
});

router.put("/:id", requireStaff, async (req, res) => {
  try {
    const validationError = eventValidationError(req.body, false);
    if (validationError) return res.status(400).json({ error: validationError });

    const scope = req.body.recurrenceScope || "all";
    const recurring = await findParentAndOccurrence(req.params.id);
    const existing = recurring
      ? recurring.parent
      : await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Evento não encontrado." });

    if (recurring && scope === "single") {
      const override = await findOverride(recurring.parent.id, recurring.occurrenceDate);
      const data = {
        ...copyInstanceData(recurring.parent, recurring.occurrenceDate),
        ...(await buildEventData(req.body, recurring.parent, false)),
        parentEventId: recurring.parent.id,
        isRecurrenceInstance: true,
        recurrenceInstanceDate: recurring.occurrenceDate,
        recurrenceStatus: "active",
      };
      const event = override
        ? await prisma.event.update({ where: { id: override.id }, data })
        : await prisma.event.create({ data });
      return res.json(materializeInstance(recurring.parent, recurring.occurrenceDate, event));
    }

    if (recurring && scope === "future") {
      await prisma.event.update({
        where: { id: recurring.parent.id },
        data: { recurrenceEndDate: previousOccurrenceEnd(recurring.occurrenceDate) },
      });
      const fromDay = eventOccurrenceDate(recurring.occurrenceDate);
      await prisma.event.deleteMany({
        where: {
          parentEventId: recurring.parent.id,
          recurrenceInstanceDate: { gte: fromDay },
          rsvps: { none: {} },
        },
      });
      const event = await prisma.event.create({
        data: {
          ...(await buildEventData(req.body, recurring.parent, true)),
          createdBy: req.user?.id || recurring.parent.createdBy || "system",
        },
      });
      await moveOccurrencesWithRsvps(recurring.parent.id, fromDay, event);
      return res.json(event);
    }

    const targetId = recurring ? recurring.parent.id : req.params.id;
    const bodyForUpdate = { ...req.body };
    if (recurring && bodyForUpdate.date) {
      // Editing the whole series from one occurrence: keep the series' first day and
      // take the new wall-clock time (and duration) from the edited occurrence.
      const changedDate = new Date(bodyForUpdate.date);
      const seriesDate = withOriginalTime(eventOccurrenceDate(recurring.parent.date), changedDate);
      if (bodyForUpdate.endDate) {
        const duration = new Date(bodyForUpdate.endDate).getTime() - changedDate.getTime();
        bodyForUpdate.endDate = new Date(seriesDate.getTime() + duration).toISOString();
      }
      bodyForUpdate.date = seriesDate.toISOString();
    }
    const event = await prisma.event.update({
      where: { id: targetId },
      data: await buildEventData(bodyForUpdate, existing, true),
    });
    res.json(event);
  } catch (err) {
    serverError(res, err);
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const scope = req.query.scope || "all";
    const recurring = await findParentAndOccurrence(req.params.id);

    if (recurring && scope === "single") {
      const override = await findOverride(recurring.parent.id, recurring.occurrenceDate);
      if (override) {
        const going = await goingToEvents({ id: override.id, recurrenceStatus: "active" });
        await prisma.event.update({ where: { id: override.id }, data: { recurrenceStatus: "cancelled" } });
        notifyCancelled(going);
      } else {
        await prisma.event.create({
          data: {
            ...copyInstanceData(recurring.parent, recurring.occurrenceDate),
            recurrenceStatus: "cancelled",
          },
        });
      }
      return res.json({ ok: true });
    }

    if (recurring && scope === "future") {
      await prisma.event.update({
        where: { id: recurring.parent.id },
        data: { recurrenceEndDate: previousOccurrenceEnd(recurring.occurrenceDate) },
      });
      // Persisted occurrences after the new end would be left hidden; remove them.
      const removed = {
        parentEventId: recurring.parent.id,
        recurrenceInstanceDate: { gte: eventOccurrenceDate(recurring.occurrenceDate) },
      };
      const going = await goingToEvents({ ...removed, recurrenceStatus: "active" });
      await prisma.event.deleteMany({ where: removed });
      notifyCancelled(going);
      return res.json({ ok: true });
    }

    const targetId = recurring ? recurring.parent.id : req.params.id;
    const going = await goingToEvents({ OR: [{ id: targetId }, { parentEventId: targetId }], recurrenceStatus: "active" });
    await prisma.event.deleteMany({ where: { parentEventId: targetId } });
    await prisma.event.delete({ where: { id: targetId } });
    notifyCancelled(going);
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
