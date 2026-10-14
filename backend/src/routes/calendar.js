import { Router } from "express";
import prisma from "../db.js";
import { listEvents } from "../services/events.js";
import { buildCalendar } from "../services/icsExport.js";

const router = Router();
const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/calendar/<token>.ics — personal subscription URL (Google Calendar,
// Apple Calendar, Outlook). The token stands in for the login, because calendar
// apps cannot send one; it is created and revoked in "O meu perfil".
router.get("/:token.ics", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { calendarToken: req.params.token } });
    if (!user || user.status !== "active") return res.status(404).send("Not found");

    const events = await listEvents({
      rangeStart: new Date(Date.now() - 30 * DAY_MS),
      rangeEnd: new Date(Date.now() + 365 * DAY_MS),
    });
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=900");
    res.send(buildCalendar(events));
  } catch (err) {
    console.error("[GET /api/calendar]", err);
    res.status(500).send("Error");
  }
});

export default router;
