import { Router } from "express";
import crypto from "crypto";
import prisma from "../db.js";
import { requireUser } from "../middleware/auth.js";
import { memberBalances } from "../services/ledger.js";
import { streamReceiptPdf } from "../services/receipt.js";
import { isValidNif, serverError } from "../utils/http.js";

// "O meu perfil": the logged-in user's own data, membership and payments.
const router = Router();
router.use(requireUser);

const PROFILE_FIELDS = {
  id: true, email: true, name: true, phone: true, altContact: true, address: true, dob: true,
  nif: true, avatar: true, provider: true, role: true, status: true, emailOptOut: true,
  calendarToken: true, createdAt: true,
};

router.get("/profile", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: PROFILE_FIELDS });
    const member = await prisma.member.findUnique({
      where: { userId: req.user.id },
      include: {
        memberships: { orderBy: { year: "desc" } },
        payments: { orderBy: { date: "desc" }, include: { membership: { select: { year: true } } } },
      },
    });
    const balance = member ? (await memberBalances([member.id])).get(member.id).balance : null;
    res.json({ user, member: member ? { ...member, balance } : null });
  } catch (err) {
    serverError(res, err);
  }
});

router.put("/profile", async (req, res) => {
  try {
    const { name, phone, altContact, address, dob, nif, emailOptOut } = req.body;
    if (name !== undefined && !String(name).trim()) return res.status(400).json({ error: "O nome é obrigatório." });
    if (nif && !isValidNif(nif)) return res.status(400).json({ error: "NIF inválido." });
    if (dob && Number.isNaN(new Date(dob).getTime())) return res.status(400).json({ error: "Data de nascimento inválida." });

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (phone !== undefined) data.phone = phone || null;
    if (altContact !== undefined) data.altContact = altContact || null;
    if (address !== undefined) data.address = address || null;
    if (dob !== undefined) data.dob = dob ? new Date(dob) : null;
    if (nif !== undefined) data.nif = nif ? String(nif).trim() : null;
    if (emailOptOut !== undefined) data.emailOptOut = Boolean(emailOptOut);

    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: PROFILE_FIELDS });
    res.json({ user });
  } catch (err) {
    serverError(res, err, "Erro ao guardar o perfil.");
  }
});

// Receipt of one of the user's own payments.
router.get("/payments/:id/receipt", async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { member: { include: { user: true } }, membership: true },
    });
    if (!payment || payment.member.userId !== req.user.id) {
      return res.status(404).json({ error: "Pagamento não encontrado." });
    }
    streamReceiptPdf(payment, res);
  } catch (err) {
    serverError(res, err, "Erro ao gerar o recibo.");
  }
});

// Creates (or replaces, which revokes the old link) the calendar subscription token.
router.post("/calendar-token", async (req, res) => {
  try {
    const calendarToken = crypto.randomBytes(24).toString("hex");
    await prisma.user.update({ where: { id: req.user.id }, data: { calendarToken } });
    res.json({ calendarToken });
  } catch (err) {
    serverError(res, err);
  }
});

router.delete("/calendar-token", async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { calendarToken: null } });
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
