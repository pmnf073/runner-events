import { Router } from "express";
import prisma from "../db.js";
import { requireAdmin, requireStaff } from "../middleware/auth.js";
import { serverError, toCents } from "../utils/http.js";

const router = Router();
router.use(requireStaff);

const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/dashboard — indicators for the direção (admin and organizer).
router.get("/", async (_req, res) => {
  try {
    const now = new Date();
    const year = Number(now.toLocaleString("en-US", { timeZone: "Europe/Lisbon", year: "numeric" }));
    const since = new Date(Date.UTC(year - 1, now.getUTCMonth() + 1, 1));

    const [memberGroups, membershipGroups, pendingRegistrations, upcomingEvents, revenueRows, recentEvents] = await Promise.all([
      prisma.member.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.membership.groupBy({ by: ["status"], where: { year }, _count: { _all: true }, _sum: { amount: true, discount: true } }),
      prisma.user.count({ where: { status: "pending" } }),
      prisma.event.count({ where: { parentEventId: null, recurrenceType: null, recurrenceStatus: "active", date: { gte: now, lte: new Date(now.getTime() + 30 * DAY_MS) } } }),
      prisma.$queryRaw`
        SELECT to_char(("date" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Lisbon', 'YYYY-MM') AS month,
               SUM("paidAmount") AS total, COUNT(*)::int AS count
        FROM "Payment" WHERE "date" >= ${since}
        GROUP BY 1 ORDER BY 1`,
      prisma.event.findMany({
        where: { date: { lt: now }, recurrenceStatus: "active", rsvps: { some: {} } },
        orderBy: { date: "desc" },
        take: 10,
        select: { id: true, title: true, date: true, rsvps: { select: { status: true } } },
      }),
    ]);

    const paidThisYear = await prisma.payment.aggregate({ where: { membership: { year } }, _sum: { paidAmount: true } });

    // One row per month for the last 12 months, including months without payments.
    const byMonth = new Map(revenueRows.map((r) => [r.month, { total: toCents(r.total), count: r.count }]));
    const revenueByMonth = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(year, now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      revenueByMonth.push({ month: key, ...(byMonth.get(key) || { total: 0, count: 0 }) });
    }

    const memberships = Object.fromEntries(membershipGroups.map((g) => [g.status, g._count._all]));
    const expected = membershipGroups
      .filter((g) => g.status !== "exempt")
      .reduce((sum, g) => sum + Number(g._sum.amount || 0) - Number(g._sum.discount || 0), 0);

    res.json({
      year,
      members: Object.fromEntries(memberGroups.map((g) => [g.status, g._count._all])),
      memberships,
      fees: { expected: toCents(expected), received: toCents(paidThisYear._sum.paidAmount) },
      pendingRegistrations,
      upcomingEvents,
      revenueByMonth,
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        going: e.rsvps.filter((r) => r.status === "going").length,
        maybe: e.rsvps.filter((r) => r.status === "maybe").length,
      })),
    });
  } catch (err) {
    serverError(res, err, "Erro ao carregar o painel.");
  }
});

// GET /api/dashboard/audit — audit log (admin only), newest first.
router.get("/audit", requireAdmin, async (req, res) => {
  try {
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;
    const where = {};
    if (req.query.entity) where.entity = String(req.query.entity);
    if (req.query.entityId) where.entityId = String(req.query.entityId);
    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ entries, total });
  } catch (err) {
    serverError(res, err, "Erro ao carregar o registo de auditoria.");
  }
});

export default router;
