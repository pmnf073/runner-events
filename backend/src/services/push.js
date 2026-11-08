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

// Sends one notification; subscriptions the push service no longer knows are removed.
// Returns { ok, statusCode, error } with the push service's answer.
async function sendOne(subscription, body) {
  try {
    const result = await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      body,
      // "high" asks the push service (FCM on Android) to wake a phone in Doze; with the
      // default "normal" an idle phone may only show the notification much later.
      { TTL: 12 * 60 * 60, urgency: "high" },
    );
    return { ok: true, statusCode: result?.statusCode };
  } catch (err) {
    const host = (() => { try { return new URL(subscription.endpoint).host; } catch { return "?"; } })();
    const error = String(err.body || err.message || "").trim().substring(0, 300);
    if (err.statusCode === 404 || err.statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
    } else {
      console.error(`[Push] Send failed (${host}): ${err.statusCode || ""} ${error}`);
    }
    return { ok: false, statusCode: err.statusCode, error };
  }
}

// Identifies a device in the logs without printing the whole endpoint: push service host,
// the end of the endpoint and the browser from the user agent.
function deviceLabel(subscription) {
  let host = "?";
  try { host = new URL(subscription.endpoint).host; } catch { /* keep "?" */ }
  const ua = subscription.userAgent || "";
  const browser = /Android/.test(ua) ? "Android" : /Windows|Macintosh|Linux/.test(ua) ? "PC" : "?";
  return `[${browser} ${host} …${subscription.endpoint.slice(-8)}]`;
}

const payloadBody = (payload) => JSON.stringify({ title: payload.title || CLUB_NAME, ...payload });

// Sends `payload` ({ title, body, url, tag }) to every subscription of the active
// users matching `userWhere`.
export async function sendToUsers(userWhere, payload) {
  if (!isPushConfigured()) return 0;
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user: { status: "active", ...userWhere } },
      include: { user: { select: { name: true } } },
    });
    const body = payloadBody(payload);
    let sent = 0;
    for (const s of subscriptions) {
      const result = await sendOne(s, body);
      if (result.ok) sent++;
      console.log(`[Push] ${payload.tag || ""} -> ${s.user?.name || s.userId} ${deviceLabel(s)}: ${result.ok ? "ok" : "falhou"} ${result.statusCode || ""}`);
    }
    return sent;
  } catch (err) {
    console.error("[Push] Error:", err.message);
    return 0;
  }
}

// Test notification to the user's own devices, with each push service's answer.
export async function sendTest(userId) {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId }, include: { user: { select: { name: true } } } });
  const body = payloadBody({ title: "Notificação de teste", body: "Se estás a ver isto, as notificações funcionam.", url: "/profile", tag: "test" });
  const results = [];
  for (const s of subscriptions) {
    const result = await sendOne(s, body);
    console.log(`[Push] test -> ${s.user?.name || userId} ${deviceLabel(s)}: ${result.ok ? "ok" : "falhou"} ${result.statusCode || ""}`);
    results.push(result);
  }
  return results;
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
      const sent = await sendToUsers({ pushNewEvents: true }, payload);
      console.log(`[Push] "${payload.title}": ${sent} sent`);
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
