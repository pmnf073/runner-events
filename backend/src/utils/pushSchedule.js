import { zonedParts } from "./timezone.js";

// When the push reminders for trainings go out, and how new events are announced.
// Pure functions (no database), so they can be unit tested.

const MINUTE_MS = 60 * 1000;
// Members: from this hour (club time zone) on the training day, until the start.
export const MORNING_REMINDER_HOUR = 9;
// Staff ("mark attendance"): from 15 min before the start until 1 h after it.
export const STAFF_REMINDER_BEFORE_MS = 15 * MINUTE_MS;
export const STAFF_REMINDER_AFTER_MS = 60 * MINUTE_MS;
// More new events than this in one go (a TeamUp sync) become a single summary.
export const MAX_SINGLE_EVENT_NOTIFICATIONS = 3;

const sameDay = (a, b) => a.year === b.year && a.month === b.month && a.day === b.day;

// Morning reminder for members: training day, after MORNING_REMINDER_HOUR, before the start.
export function memberReminderDue(event, now = new Date()) {
  const start = new Date(event.date);
  if (now >= start) return false;
  const today = zonedParts(now);
  return sameDay(today, zonedParts(start)) && today.hour >= MORNING_REMINDER_HOUR;
}

// Reminder for the staff to mark attendance, around the start of the training.
export function staffReminderDue(event, now = new Date()) {
  const start = new Date(event.date).getTime();
  const t = now.getTime();
  return t >= start - STAFF_REMINDER_BEFORE_MS && t <= start + STAFF_REMINDER_AFTER_MS;
}

// "19h30" in the club's time zone.
export function clubTime(value) {
  const p = zonedParts(value);
  return `${p.hour}h${String(p.minute).padStart(2, "0")}`;
}

// "dd/mm" in the club's time zone.
function clubDayMonth(value) {
  const p = zonedParts(value);
  return `${String(p.day).padStart(2, "0")}/${String(p.month).padStart(2, "0")}`;
}

// Notifications for newly created events: one per future event, or a single
// summary when there are more than MAX_SINGLE_EVENT_NOTIFICATIONS.
export function newEventNotifications(events, now = new Date()) {
  const upcoming = events.filter((e) => new Date(e.date) > now);
  if (upcoming.length === 0) return [];
  if (upcoming.length > MAX_SINGLE_EVENT_NOTIFICATIONS) {
    return [{
      title: `${upcoming.length} novos eventos no calendário`,
      body: upcoming.slice(0, 3).map((e) => e.title).join(", ") + "…",
      url: "/calendar",
      tag: "new-events",
    }];
  }
  return upcoming.map((e) => ({
    title: `Novo evento: ${e.title}`,
    body: `${clubDayMonth(e.date)} às ${clubTime(e.date)}${e.location ? ` · ${e.location}` : ""}`,
    url: `/event/${e.id}`,
    tag: `event-${e.id}`,
  }));
}
