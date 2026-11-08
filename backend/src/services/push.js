import webpush from "web-push";
import prisma from "../db.js";
import { listEvents } from "./events.js";
import { CLUB_NAME } from "./email.js";
import {
  clubTime,
  memberReminderDue,
  newEventNotifications,
  staffReminderDue,
} from "../utils/pushSchedule.js";

// Web Push notifications (the installed Android app and browsers that accepted them):
// new events and training-day reminders. Configured by VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY and VAPID_SUBJECT; without them nothing is sent. Never throws.

const DAY_MS = 24 * 60 * 60 * 1000;
let configured = null;

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function isPushConfigured() {
  if (configured !== null) return configured;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return (configured = false);
  try {
    const subject = process.env.VAPID_SUBJECT || process.env.FRONTEND_URL || "mailto:geral@alvercaurbanrunners.pt";
    webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  } catch (err) {
    console.error("[Push] Invalid VAPID configuration:", err.message);
    configured = false;
  }
  return configured;
}

// Sends `payload` ({ title, body, url, tag }) to every subscription of the active
// users matching `userWhere`. Subscriptions the push service no longer knows are removed.
export async function sendToUsers(userWhere, payload) {
  if (!isPushConfigured()) return 0;
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user: { status: "active", ...userWhere } },
    });
    const body = JSON.stringify({ title: payload.title || CLUB_NAME, ...payload });
    let sent = 0;
    for (const s of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 12 * 60 * 60 },
        );
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error("[Push] Send failed:", err.statusCode || err.message);
        }
      }
    }
    return sent;
  } catch (err) {
    console.error("[Push] Error:", err.message);
    return 0;
  }
}

// Claims a NotificationLog key; false when it was already sent.
async function claim(key) {
  const { count } = await prisma.notificationLog.createMany({ data: [{ key }], skipDuplicates: true });
  return count > 0;
}

// New events (created by the staff or by a feed sync): [{ id, title, date, location }].
// Runs in the background; never throws.
export function notifyNewEvents(events) {
  if (!isPushConfigured() || !events?.length) return;
  (async () => {
    for (const payload of newEventNotifications(events)) {
      await sendToUsers({ pushNewEvents: true }, payload);
    }
  })().catch((err) => console.error("[Push] New events:", err.message));
}

// Training-day reminders; runs every few minutes on the backend process.
// Members (who have not answered the RSVP yet) get one in the morning; the staff
// get "mark attendance" around the start.
export async function runPushReminders(now = new Date()) {
  if (!isPushConfigured()) return { members: 0, staff: 0, skipped: true };
  const trainings = await listEvents({
    rangeStart: new Date(now.getTime() - DAY_MS),
    rangeEnd: new Date(now.getTime() + DAY_MS),
    filters: { type: "training" },
  });

  let members = 0;
  let staff = 0;
  for (const event of trainings) {
    if (memberReminderDue(event, now) && (await claim(`push-training-member:${event.id}`))) {
      const answered = (event.rsvps || []).map((r) => r.userId);
      members += await sendToUsers(
        { pushTrainingReminders: true, ...(answered.length ? { id: { notIn: answered } } : {}) },
        {
          title: `Hoje há treino às ${clubTime(event.date)}`,
          body: `${event.title}${event.location ? ` · ${event.location}` : ""}. Vens? Confirma a presença.`,
          url: `/event/${event.id}`,
          tag: `training-${event.id}`,
        },
      );
    }
    if (staffReminderDue(event, now) && (await claim(`push-training-staff:${event.id}`))) {
      staff += await sendToUsers(
        { pushTrainingReminders: true, role: { in: ["admin", "organizer"] } },
        {
          title: "Marca as presenças do treino",
          body: `${event.title} às ${clubTime(event.date)}`,
          url: `/event/${event.id}`,
          tag: `attendance-${event.id}`,
        },
      );
    }
  }
  return { members, staff };
}
