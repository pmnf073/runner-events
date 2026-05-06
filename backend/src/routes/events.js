import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db.js";
import extractImageFromUrl from "../services/imageExtractor.js";
import {
  dateKey,
  eventOccurrenceDate,
  generateRecurrenceInstances,
  materializeInstance,
  parseVirtualEventId,
  recurrenceDefaultEndDate,
  validateRecurrencePattern,
} from "../utils/recurrence.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (user) { req.user = user; return next(); }
  } catch {}
  next();
}

async function isAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") return next();

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      if (payload.role === "admin") return next();
    } catch {}
  }

  return res.status(403).json({ error: "Admin access required" });
}

async function isOrganizerOrAdmin(req, res, next) {
  if (req.user && ["admin", "organizer"].includes(req.user.role)) return next();

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      if (["admin", "organizer"].includes(payload.role)) return next();
    } catch {}
  }

  return res.status(403).json({ error: "Admin or Organizer access required" });
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

function previousOccurrenceEnd(occurrenceDate) {
  const end = eventOccurrenceDate(occurrenceDate);
  end.setUTCDate(end.getUTCDate() - 1);
  return end;
}

router.post("/extract-image", isAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const imageUrl = await extractImageFromUrl(url);
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const { start, end, type, club } = req.query;
    const rangeStart = start ? new Date(start) : new Date();
    const rangeEnd = end ? new Date(end) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const filters = {};
    if (type) filters.type = type;
    if (club) filters.club = club;

    const events = await prisma.event.findMany({
      where: {
        ...filters,
        OR: [
          {
            parentEventId: null,
            recurrenceType: null,
            date: { gte: rangeStart, lte: rangeEnd },
          },
          {
            parentEventId: null,
            recurrenceType: { not: null },
            date: { lte: rangeEnd },
            OR: [
              { recurrenceEndDate: null },
              { recurrenceEndDate: { gte: rangeStart } },
            ],
          },
          {
            parentEventId: { not: null },
            date: { gte: rangeStart, lte: rangeEnd },
          },
        ],
      },
      orderBy: { date: "asc" },
      include: {
        rsvps: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });

    const overridesByParent = new Map();
    for (const event of events) {
      if (!event.parentEventId) continue;
      if (!overridesByParent.has(event.parentEventId)) overridesByParent.set(event.parentEventId, []);
      overridesByParent.get(event.parentEventId).push(event);
    }

    const allEvents = [];
    for (const event of events) {
      if (event.parentEventId) continue;
      if (event.recurrenceType) {
        allEvents.push(...generateRecurrenceInstances(event, rangeStart, rangeEnd, overridesByParent.get(event.id) || []));
      } else if (event.recurrenceStatus !== "cancelled") {
        allEvents.push(event);
      }
    }

    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(allEvents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        rsvps: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });
    if (event) {
      if (event.recurrenceStatus === "cancelled") return res.status(404).json({ error: "Event not found" });
      if (event.parentEventId && event.recurrenceInstanceDate) {
        const parent = await prisma.event.findUnique({ where: { id: event.parentEventId } });
        if (parent?.recurrenceType) return res.json(materializeInstance(parent, event.recurrenceInstanceDate, event));
      }
      return res.json(event);
    }

    const recurring = await findParentAndOccurrence(req.params.id);
    if (!recurring) return res.status(404).json({ error: "Event not found" });

    const override = await findOverride(recurring.parent.id, recurring.occurrenceDate, true);
    if (override?.recurrenceStatus === "cancelled") return res.status(404).json({ error: "Event not found" });

    res.json(materializeInstance(recurring.parent, recurring.occurrenceDate, override));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", isOrganizerOrAdmin, async (req, res) => {
  try {
    if (req.body.recurrenceType) {
      const validation = validateRecurrencePattern(recurrenceValidationPayload(req.body));
      if (!validation.isValid) return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const event = await prisma.event.create({
      data: {
        ...(await buildEventData(req.body)),
        createdBy: req.user?.id || "system",
      },
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", isOrganizerOrAdmin, async (req, res) => {
  try {
    if (req.body.recurrenceType) {
      const validation = validateRecurrencePattern(recurrenceValidationPayload(req.body));
      if (!validation.isValid) return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const scope = req.body.recurrenceScope || "all";
    const recurring = await findParentAndOccurrence(req.params.id);
    const existing = recurring
      ? recurring.parent
      : await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Event not found" });

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
      await prisma.event.deleteMany({
        where: {
          parentEventId: recurring.parent.id,
          recurrenceInstanceDate: { gte: eventOccurrenceDate(recurring.occurrenceDate) },
          rsvps: { none: {} },
        },
      });
      const event = await prisma.event.create({
        data: {
          ...(await buildEventData(req.body, recurring.parent, true)),
          createdBy: req.user?.id || recurring.parent.createdBy || "system",
        },
      });
      return res.json(event);
    }

    const targetId = recurring ? recurring.parent.id : req.params.id;
    const bodyForUpdate = { ...req.body };
    if (recurring && bodyForUpdate.date) {
      const parentDate = new Date(recurring.parent.date);
      const changedDate = new Date(bodyForUpdate.date);
      bodyForUpdate.date = new Date(Date.UTC(
        parentDate.getUTCFullYear(),
        parentDate.getUTCMonth(),
        parentDate.getUTCDate(),
        changedDate.getUTCHours(),
        changedDate.getUTCMinutes(),
        changedDate.getUTCSeconds(),
        changedDate.getUTCMilliseconds(),
      )).toISOString();
    }
    const event = await prisma.event.update({
      where: { id: targetId },
      data: await buildEventData(bodyForUpdate, existing, true),
    });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const scope = req.query.scope || "all";
    const recurring = await findParentAndOccurrence(req.params.id);

    if (recurring && scope === "single") {
      const override = await findOverride(recurring.parent.id, recurring.occurrenceDate);
      if (override) {
        await prisma.event.update({ where: { id: override.id }, data: { recurrenceStatus: "cancelled" } });
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
      return res.json({ ok: true });
    }

    const targetId = recurring ? recurring.parent.id : req.params.id;
    await prisma.event.deleteMany({ where: { parentEventId: targetId } });
    await prisma.event.delete({ where: { id: targetId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
