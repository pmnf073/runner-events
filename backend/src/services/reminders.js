import prisma from "../db.js";
import { CLUB_NAME, frontendUrl, isEmailConfigured, sendEmail } from "./email.js";

// Automatic emails: fee due soon / overdue, the day-before reminder for events
// the member said they are going to, and the notice when such an event is
// cancelled. Users with emailOptOut get none of them.

const DAY_MS = 24 * 60 * 60 * 1000;
const FEE_DUE_SOON_DAYS = 7;
// Only fees that fell due recently get an "overdue" email, so turning email on
// does not message everyone about old debts.
const FEE_OVERDUE_WINDOW_DAYS = 60;

const ptDate = (value) => new Date(value).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });
const ptDateTime = (value) =>
  new Date(value).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", dateStyle: "full", timeStyle: "short" });
const euros = (value) => `${Number(value).toFixed(2).replace(".", ",")} €`;

// Sends the email once per key: the key is claimed in NotificationLog before
// sending and released if sending fails, so the next run tries again.
async function sendOnce(key, message) {
  const { count } = await prisma.notificationLog.createMany({ data: [{ key }], skipDuplicates: true });
  if (count === 0) return false;
  const result = await sendEmail(message);
  if (!result.sent) {
    await prisma.notificationLog.delete({ where: { key } }).catch(() => {});
    return false;
  }
  return true;
}

async function feeReminders(now) {
  const memberships = await prisma.membership.findMany({
    where: {
      status: { in: ["pending", "partial"] },
      dueDate: {
        gte: new Date(now.getTime() - FEE_OVERDUE_WINDOW_DAYS * DAY_MS),
        lte: new Date(now.getTime() + FEE_DUE_SOON_DAYS * DAY_MS),
      },
      member: { status: "active", user: { status: "active", emailOptOut: false } },
    },
    include: { member: { include: { user: true } }, payments: { select: { paidAmount: true } } },
  });

  let sent = 0;
  for (const m of memberships) {
    const user = m.member.user;
    const due = Math.max(0, Number(m.amount) - Number(m.discount || 0));
    const paid = m.payments.reduce((sum, p) => sum + Number(p.paidAmount), 0);
    const missing = Math.max(0, due - paid);
    const overdue = m.dueDate < now;
    const key = `${overdue ? "fee-overdue" : "fee-due-soon"}:${m.id}`;
    const text = overdue
      ? `Olá ${user.name},\n\nA quota de ${m.year} do ${CLUB_NAME} venceu a ${ptDate(m.dueDate)} e ainda tem ${euros(missing)} por pagar.\n\nSe já pagaste, ignora esta mensagem. Podes ver o estado da tua quota em:\n${frontendUrl("/profile")}`
      : `Olá ${user.name},\n\nA quota de ${m.year} do ${CLUB_NAME} vence a ${ptDate(m.dueDate)}. Valor por pagar: ${euros(missing)}.\n\nPodes ver o estado da tua quota em:\n${frontendUrl("/profile")}`;
    const subject = overdue ? `Quota de ${m.year} em atraso` : `A quota de ${m.year} vence em breve`;
    if (await sendOnce(key, { to: user.email, subject: `${CLUB_NAME}: ${subject}`, text })) sent++;
  }
  return sent;
}

async function eventReminders(now) {
  const rsvps = await prisma.rsvp.findMany({
    where: {
      status: "going",
      user: { status: "active", emailOptOut: false },
      event: { recurrenceStatus: "active", date: { gt: now, lte: new Date(now.getTime() + DAY_MS) } },
    },
    include: { user: true, event: true },
  });

  let sent = 0;
  for (const { user, event } of rsvps) {
    const text = `Olá ${user.name},\n\nLembrete: ${event.title}\n${ptDateTime(event.date)}${event.location ? `\n${event.location}` : ""}\n\nDetalhes do evento:\n${frontendUrl(`/event/${event.id}`)}`;
    if (await sendOnce(`event-reminder:${event.id}:${user.id}`, { to: user.email, subject: `${CLUB_NAME}: amanhã, ${event.title}`, text })) sent++;
  }
  return sent;
}

// Runs every hour on the backend process; does nothing until email is configured.
export async function runReminders(now = new Date()) {
  if (!isEmailConfigured()) return { fees: 0, events: 0, skipped: true };
  const fees = await feeReminders(now);
  const events = await eventReminders(now);
  return { fees, events };
}

// Users who said they are going to the (persisted) events matching `where`,
// read before the events are cancelled or deleted.
export async function goingToEvents(where) {
  const rsvps = await prisma.rsvp.findMany({
    where: { status: "going", event: { ...where, date: { gt: new Date() } }, user: { status: "active", emailOptOut: false } },
    include: { user: true, event: true },
  });
  return rsvps.map(({ user, event }) => ({ email: user.email, name: user.name, title: event.title, date: event.date }));
}

// Sends the cancellation notice; never throws.
export async function notifyCancelled(recipients) {
  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `${CLUB_NAME}: cancelado, ${r.title}`,
      text: `Olá ${r.name},\n\nO evento "${r.title}" de ${ptDateTime(r.date)}, em que tinhas confirmado presença, foi cancelado.\n\nCalendário do clube:\n${frontendUrl("/calendar")}`,
    }).catch(() => {});
  }
}
