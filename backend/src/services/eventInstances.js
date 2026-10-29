import prisma from "../db.js";
import { materializeInstance, parseVirtualEventId } from "../utils/recurrence.js";

// Resolves a real or virtual ("rec_<parent>_<date>") id to the persisted event id, if any.
export async function persistedEventId(eventId) {
  const parsed = parseVirtualEventId(eventId);
  if (!parsed) return eventId;
  const found = await prisma.event.findFirst({
    where: { parentEventId: parsed.parentEventId, recurrenceInstanceDate: parsed.occurrenceDate },
    select: { id: true },
  });
  return found?.id || null;
}

// Returns the event for a real or virtual id, saving a recurring occurrence as its own
// row the first time something (an RSVP, a check-in) needs to point at it.
export async function ensurePersistedEvent(eventId) {
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

// The event as shown for a real or virtual id, without saving anything, and the id of
// its row when it has one. Null when it does not exist or was cancelled.
export async function findEvent(eventId) {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (existing) return existing.recurrenceStatus === "cancelled" ? null : { event: existing, persistedId: existing.id };

  const parsed = parseVirtualEventId(eventId);
  if (!parsed) return null;
  const found = await prisma.event.findFirst({
    where: { parentEventId: parsed.parentEventId, recurrenceInstanceDate: parsed.occurrenceDate },
  });
  if (found) return found.recurrenceStatus === "cancelled" ? null : { event: found, persistedId: found.id };

  const parent = await prisma.event.findUnique({ where: { id: parsed.parentEventId } });
  if (!parent?.recurrenceType) return null;
  return { event: materializeInstance(parent, parsed.occurrenceDate), persistedId: null };
}
