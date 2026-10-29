import { Router } from "express";
import prisma from "../db.js";
import { requireStaff, requireUser } from "../middleware/auth.js";
import { audit } from "../services/audit.js";
import { ensurePersistedEvent, findEvent } from "../services/eventInstances.js";
import { listEvents } from "../services/events.js";
import { serverError } from "../utils/http.js";
import {
  attendanceStats,
  OPENS_BEFORE_MS,
  trainingWindow,
  isTrainingOn,
  monthKey,
  monthRange,
  weekKey,
} from "../utils/attendance.js";

// Attendance at trainings: the person in charge (admin or organizer) marks who showed
// up; members only RSVP. Also each person's streak and badges and the club's monthly
// goal. Who attended is shown only to the staff; other members see counts.
const router = Router();
router.use(requireUser);

const isStaff = (user) => ["admin", "organizer"].includes(user.role);
// Attendance can be marked from 30 min before the start, and corrected any time after.
const canMark = (event, now = new Date()) => now >= trainingWindow(event).opensAt;
const USER_FIELDS = { id: true, name: true, avatar: true };

// Attendances of trainings that took place in [start, end).
const trainingAttendanceWhere = (start, end) => ({ event: { type: "training", date: { gte: start, lt: end } } });

async function eventAttendance(req, found) {
  const { event, persistedId } = found;
  const attendances = persistedId
    ? await prisma.attendance.findMany({
        where: { eventId: persistedId },
        include: { user: { select: USER_FIELDS } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  return {
    isTraining: event.type === "training",
    count: attendances.length,
    attended: attendances.some((a) => a.userId === req.user.id),
    markingOpen: event.type === "training" && canMark(event),
    opensAt: trainingWindow(event).opensAt,
    attendees: isStaff(req.user)
      ? attendances.map((a) => ({ userId: a.userId, createdAt: a.createdAt, user: a.user }))
      : undefined,
  };
}

// GET /api/attendance/events/:eventId — attendance of a training
router.get("/events/:eventId", async (req, res) => {
  try {
    const found = await findEvent(req.params.eventId);
    if (!found) return res.status(404).json({ error: "Evento não encontrado." });
    res.json(await eventAttendance(req, found));
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/attendance/events/:eventId/users/:userId — staff marks or clears someone's attendance
router.put("/events/:eventId/users/:userId", requireStaff, async (req, res) => {
  try {
    const present = Boolean(req.body.present);
    const found = await findEvent(req.params.eventId);
    if (!found) return res.status(404).json({ error: "Evento não encontrado." });
    if (found.event.type !== "training") return res.status(400).json({ error: "O registo de presença é só para treinos." });
    if (!canMark(found.event)) {
      return res.status(400).json({ error: "Só é possível marcar presenças a partir de 30 minutos antes do treino." });
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true, name: true } });
    if (!user) return res.status(404).json({ error: "Utilizador não encontrado." });

    const event = await ensurePersistedEvent(req.params.eventId);
    if (present) {
      await prisma.attendance.upsert({
        where: { userId_eventId: { userId: user.id, eventId: event.id } },
        update: {},
        create: { userId: user.id, eventId: event.id, markedBy: req.user.id },
      });
    } else {
      await prisma.attendance.deleteMany({ where: { userId: user.id, eventId: event.id } });
    }
    await audit(null, req, present ? "attendance.mark" : "attendance.clear", "Attendance", event.id, { userId: user.id, name: user.name });
    res.json(await eventAttendance(req, { event: found.event, persistedId: event.id }));
  } catch (err) {
    serverError(res, err, "Erro ao guardar a presença.");
  }
});

// GET /api/attendance/people — active users the staff can mark as present
router.get("/people", requireStaff, async (_req, res) => {
  try {
    res.json(await prisma.user.findMany({ where: { status: "active" }, select: USER_FIELDS, orderBy: { name: "asc" } }));
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/attendance/current — trainings happening now, for the staff's shortcut banner
router.get("/current", requireStaff, async (_req, res) => {
  try {
    const now = new Date();
    const events = await listEvents({
      rangeStart: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      rangeEnd: new Date(now.getTime() + OPENS_BEFORE_MS),
      filters: { type: "training" },
    });
    const open = events.filter((e) => isTrainingOn(e, now));
    const persistedIds = open.map((e) => e.id).filter((id) => !String(id).startsWith("rec_"));
    const counts = new Map(
      (await prisma.attendance.groupBy({ by: ["eventId"], where: { eventId: { in: persistedIds } }, _count: { _all: true } }))
        .map((g) => [g.eventId, g._count._all])
    );
    res.json(open.map((e) => ({ id: e.id, title: e.title, date: e.date, location: e.location, count: counts.get(e.id) || 0 })));
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/attendance/me — the logged-in person's trainings, streak and badges
router.get("/me", async (req, res) => {
  try {
    const now = new Date();
    const attendances = await prisma.attendance.findMany({
      where: { userId: req.user.id, event: { type: "training" } },
      select: { event: { select: { date: true } } },
      orderBy: { event: { date: "asc" } },
    });
    const attended = attendances.map((a) => a.event.date);
    let trainings = [];
    if (attended.length) {
      const trainingEvents = await listEvents({
        rangeStart: new Date(`${weekKey(attended[0])}T00:00:00.000Z`),
        rangeEnd: now,
        filters: { type: "training" },
      });
      trainings = trainingEvents.map((e) => e.date);
    }
    res.json(attendanceStats({ attended, trainings, now }));
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/attendance/goal?month=YYYY-MM — the club's goal and progress for a month
router.get("/goal", async (req, res) => {
  try {
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month || "") ? req.query.month : monthKey(new Date());
    const { start, end } = monthRange(month);
    const [goal, count] = await Promise.all([
      prisma.attendanceGoal.findUnique({ where: { month } }),
      prisma.attendance.count({ where: trainingAttendanceWhere(start, end) }),
    ]);
    res.json({ month, target: goal?.target ?? null, count });
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/attendance/goal — staff sets (or with target null, removes) a month's goal
router.put("/goal", requireStaff, async (req, res) => {
  try {
    const { month, target } = req.body;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) return res.status(400).json({ error: "Mês inválido." });
    if (target === null || target === "") {
      await prisma.attendanceGoal.deleteMany({ where: { month } });
    } else {
      const value = Number(target);
      if (!Number.isInteger(value) || value < 1 || value > 100000) return res.status(400).json({ error: "A meta tem de ser um número inteiro positivo." });
      await prisma.attendanceGoal.upsert({ where: { month }, update: { target: value }, create: { month, target: value } });
    }
    await audit(null, req, "attendance.goal", "AttendanceGoal", month, { target: target ?? null });
    const { start, end } = monthRange(month);
    const count = await prisma.attendance.count({ where: trainingAttendanceWhere(start, end) });
    const goal = await prisma.attendanceGoal.findUnique({ where: { month } });
    res.json({ month, target: goal?.target ?? null, count });
  } catch (err) {
    serverError(res, err, "Erro ao guardar a meta.");
  }
});

export default router;
