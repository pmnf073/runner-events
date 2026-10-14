import prisma from "../db.js";
import { generateRecurrenceInstances } from "../utils/recurrence.js";

// Events in [rangeStart, rangeEnd] with recurring series expanded into their
// occurrences and cancelled ones left out, sorted by date. Used by the calendar
// API, the personal ICS feed and the reminders.
export async function listEvents({ rangeStart, rangeEnd, filters = {} }) {
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
  return allEvents;
}
