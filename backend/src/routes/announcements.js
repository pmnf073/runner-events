import { Router } from "express";
import prisma from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { audit } from "../services/audit.js";
import { CLUB_NAME, frontendUrl, isEmailConfigured, sendBulk } from "../services/email.js";
import { serverError } from "../utils/http.js";

// Emails from the direção to members. Users who opted out never receive them.
const router = Router();
router.use(requireAdmin);

export const AUDIENCES = {
  members_active: "Sócios ativos",
  fees_overdue: "Sócios com quota em atraso",
  users_active: "Todos os utilizadores ativos",
};

function audienceWhere(audience) {
  const base = { status: "active" };
  if (audience === "users_active") return base;
  if (audience === "members_active") return { ...base, member: { is: { status: "active" } } };
  if (audience === "fees_overdue") {
    return {
      ...base,
      member: { is: { status: "active", memberships: { some: { status: { in: ["pending", "partial"] }, dueDate: { lt: new Date() } } } } },
    };
  }
  return null;
}

// GET /api/announcements/audience?audience=… — how many people would receive it.
router.get("/audience", async (req, res) => {
  try {
    const where = audienceWhere(req.query.audience);
    if (!where) return res.status(400).json({ error: "Destinatários inválidos." });
    const [recipients, optedOut] = await Promise.all([
      prisma.user.count({ where: { ...where, emailOptOut: false } }),
      prisma.user.count({ where: { ...where, emailOptOut: true } }),
    ]);
    res.json({ recipients, optedOut, emailConfigured: isEmailConfigured() });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/announcements — answers at once and sends in the background
// (about 2 emails per second); the result goes to the audit log.
router.post("/", async (req, res) => {
  try {
    const { subject, body, audience } = req.body;
    if (typeof subject !== "string" || !subject.trim() || typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "Assunto e mensagem são obrigatórios." });
    }
    const where = audienceWhere(audience);
    if (!where) return res.status(400).json({ error: "Destinatários inválidos." });
    if (!isEmailConfigured()) return res.status(400).json({ error: "O envio de email não está configurado no servidor." });

    const users = await prisma.user.findMany({ where: { ...where, emailOptOut: false }, select: { email: true, name: true } });
    const footer = `\n\n--\nRecebes este email por estares inscrito no ${CLUB_NAME}. Para deixares de receber comunicações, altera as preferências em ${frontendUrl("/profile")}`;
    const messages = users.map((u) => ({
      to: u.email,
      subject: subject.trim(),
      text: `Olá ${u.name},\n\n${body.trim()}${footer}`,
    }));

    res.status(202).json({ recipients: messages.length });

    const result = await sendBulk(messages);
    await audit(null, req, "announcement.send", "Announcement", null, {
      subject: subject.trim(), audience, recipients: messages.length, ...result,
    });
  } catch (err) {
    if (!res.headersSent) serverError(res, err, "Erro ao enviar a comunicação.");
    else console.error("[Announcements]", err);
  }
});

export default router;
