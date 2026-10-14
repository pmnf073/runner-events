import express from "express";
import prisma from "../db.js";
import { requireAdmin, requireStaff } from "../middleware/auth.js";
import { audit } from "../services/audit.js";
import { ensureMembershipDebit, lockSequence, memberBalances } from "../services/ledger.js";
import { ALLOWED, isAllowed } from "../utils/http.js";

const router = express.Router();
router.use(requireStaff);

/* ── GET /api/members — list all members with user data ── */
router.get("/", async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            nif: true,
            role: true,
            status: true,
          },
        },
        memberships: {
          orderBy: { year: "desc" },
        },
        _count: {
          select: { payments: true, accountEntries: true },
        },
      },
      orderBy: { memberNumber: "asc" },
    });

    const balances = await memberBalances(members.map((m) => m.id));
    const membersWithBalance = members.map((m) => ({ ...m, balance: balances.get(m.id).balance }));

    res.json(membersWithBalance);
  } catch (err) {
    console.error("[GET /api/members]", err);
    res.status(500).json({ error: "Erro ao listar sócios." });
  }
});

/* ── GET /api/members/fees ── */
router.get("/fees", async (req, res) => {
  try {
    const fees = await prisma.annualFeeConfig.findMany({ orderBy: { year: "desc" } });
    res.json(fees);
  } catch (err) {
    console.error("[GET /api/members/fees]", err);
    res.status(500).json({ error: "Erro ao listar configurações." });
  }
});

/* ── GET /api/members/stats — quick stats for admin dashboard (must stay before /:id) ── */
router.get("/stats", async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const [totalMembers, activeMembers, suspendedMembers, paidThisYear, pendingThisYear] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { status: "active" } }),
      prisma.member.count({ where: { status: "suspended" } }),
      prisma.membership.count({ where: { year: currentYear, status: "paid" } }),
      prisma.membership.count({ where: { year: currentYear, status: "pending" } }),
    ]);

    res.json({
      totalMembers,
      activeMembers,
      suspendedMembers,
      currentYear,
      paidThisYear,
      pendingThisYear,
    });
  } catch (err) {
    console.error("[GET /api/members/stats]", err);
    res.status(500).json({ error: "Erro ao obter estatísticas." });
  }
});

/* ── GET /api/members/:id — single member detail ── */
router.get("/:id", async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, phone: true,
            nif: true, role: true, status: true, address: true, dob: true,
          },
        },
        memberships: { orderBy: { year: "desc" } },
        payments: { orderBy: { createdAt: "desc" }, take: 20 },
        accountEntries: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!member) return res.status(404).json({ error: "Sócio não encontrado." });

    const { balance } = (await memberBalances([member.id])).get(member.id);
    res.json({ ...member, balance });
  } catch (err) {
    console.error("[GET /api/members/:id]", err);
    res.status(500).json({ error: "Erro ao obter dados do sócio." });
  }
});

/* ── POST /api/members — activate/convert user to member ── */
router.post("/", async (req, res) => {
  try {
    const { userId, notes } = req.body;
    if (!userId) return res.status(400).json({ error: "userId é obrigatório." });

    const member = await prisma.$transaction(async (tx) => {
      await lockSequence(tx, "memberNumber");
      const maxNum = await tx.member.aggregate({ _max: { memberNumber: true } });
      const created = await tx.member.create({
        data: {
          userId,
          memberNumber: (maxNum._max.memberNumber || 0) + 1,
          notes: notes || null,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
      await audit(tx, req, "member.create", "Member", created.id, { memberNumber: created.memberNumber, user: created.user.name });
      return created;
    });

    res.status(201).json(member);
  } catch (err) {
    console.error("[POST /api/members]", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Utilizador já é sócio." });
    }
    if (err.code === "P2003") {
      return res.status(400).json({ error: "Utilizador não encontrado." });
    }
    res.status(500).json({ error: "Erro ao criar sócio." });
  }
});

/* ── PUT /api/members/:id — update member associativo data ── */
router.put("/:id", async (req, res) => {
  try {
    const { status, position, notes, resignationDate } = req.body;
    if (status !== undefined && !isAllowed("memberStatus", status)) {
      return res.status(400).json({ error: `Estado inválido (${ALLOWED.memberStatus.join(", ")}).` });
    }
    if (position && !isAllowed("memberPosition", position)) {
      return res.status(400).json({ error: `Cargo inválido (${ALLOWED.memberPosition.join(", ")}).` });
    }
    const data = {};
    if (status !== undefined) data.status = status;
    if (position !== undefined) data.position = position || null;
    if (notes !== undefined) data.notes = notes;
    if (resignationDate !== undefined) data.resignationDate = resignationDate ? new Date(resignationDate) : null;

    const member = await prisma.member.update({
      where: { id: req.params.id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    await audit(null, req, "member.update", "Member", member.id, { memberNumber: member.memberNumber, user: member.user.name, ...data });

    res.json(member);
  } catch (err) {
    console.error("[PUT /api/members/:id]", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Sócio não encontrado." });
    }
    res.status(500).json({ error: "Erro ao atualizar sócio." });
  }
});

/* ── DELETE /api/members/:id — remove the member record (the user account stays) ── */
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const payments = await prisma.payment.count({ where: { memberId: req.params.id } });
    if (payments > 0) {
      return res.status(409).json({
        error: "Este sócio tem pagamentos registados e não pode ser eliminado. Muda o estado para \"Demitiu-se\" ou \"Excluído\".",
      });
    }
    const deleted = await prisma.member.delete({ where: { id: req.params.id }, include: { user: { select: { name: true } } } });
    await audit(null, req, "member.delete", "Member", deleted.id, { memberNumber: deleted.memberNumber, user: deleted.user.name });
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/members/:id]", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Sócio não encontrado." });
    }
    res.status(500).json({ error: "Erro ao eliminar sócio." });
  }
});

/* ── GET /api/members/balance/:id — get current balance ── */
router.get("/balance/:id", async (req, res) => {
  try {
    const { totalDebits, totalCredits, balance } = (await memberBalances([req.params.id])).get(req.params.id);
    res.json({
      memberId: req.params.id,
      totalDebits,
      totalCredits,
      balance,
    });
  } catch (err) {
    console.error("[GET /api/members/balance/:id]", err);
    res.status(500).json({ error: "Erro ao calcular saldo." });
  }
});

/* ── Annual Fee Configuration ── */

// POST /api/members/fees
router.post("/fees", async (req, res) => {
  try {
    const { amount, dueDate, earlybirdDiscount, earlybirdDeadline } = req.body;
    const year = parseInt(req.body.year, 10);
    if (!year || amount == null || !dueDate) {
      return res.status(400).json({ error: "Ano, valor e prazo são obrigatórios." });
    }
    if (!(Number(amount) >= 0) || (earlybirdDiscount && !(Number(earlybirdDiscount) >= 0))) {
      return res.status(400).json({ error: "Valor inválido." });
    }

    const fee = await prisma.annualFeeConfig.upsert({
      where: { year },
      create: {
        year,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        earlybirdDiscount: earlybirdDiscount ? Number(earlybirdDiscount) : null,
        earlybirdDeadline: earlybirdDeadline ? new Date(earlybirdDeadline) : null,
      },
      update: {
        amount: Number(amount),
        dueDate: new Date(dueDate),
        earlybirdDiscount: earlybirdDiscount ? Number(earlybirdDiscount) : null,
        earlybirdDeadline: earlybirdDeadline ? new Date(earlybirdDeadline) : null,
      },
    });

    await audit(null, req, "fee.configure", "AnnualFeeConfig", fee.id, {
      year, amount: Number(amount), dueDate, earlybirdDiscount: earlybirdDiscount ?? null, earlybirdDeadline: earlybirdDeadline ?? null,
    });
    res.json(fee);
  } catch (err) {
    console.error("[POST /api/members/fees]", err);
    res.status(500).json({ error: "Erro ao configurar anuidade." });
  }
});

/* ── POST /api/members/fees/:year/generate-memberships — generate pending memberships for all active members ── */
router.post("/fees/:year/generate-memberships", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (isNaN(year)) return res.status(400).json({ error: "Ano inválido." });

    const feeConfig = await prisma.annualFeeConfig.findUnique({ where: { year } });
    if (!feeConfig) {
      return res.status(400).json({ error: `Configuração de anuidade para ${year} não encontrada. Cria-a primeiro.` });
    }

    const activeMembers = await prisma.member.findMany({
      where: { status: "active" },
    });

    let created = 0;
    let skipped = 0;

    for (const member of activeMembers) {
      const exists = await prisma.membership.findUnique({
        where: { memberId_year: { memberId: member.id, year } },
      });
      if (exists) {
        skipped++;
        continue;
      }

      // The early-bird discount is applied when a payment is registered before the deadline.
      await prisma.$transaction(async (tx) => {
        const membership = await tx.membership.create({
          data: {
            memberId: member.id,
            year,
            amount: feeConfig.amount,
            dueDate: feeConfig.dueDate,
          },
        });
        await ensureMembershipDebit(tx, membership);
      });
      created++;
    }

    await audit(null, req, "membership.generate", "Membership", null, { year, created, skipped });
    res.json({ created, skipped, total: activeMembers.length });
  } catch (err) {
    console.error("[POST /api/members/fees/:year/generate-memberships]", err);
    res.status(500).json({ error: "Erro ao gerar quotas." });
  }
});

/* ── POST /api/members/fees/sync-account-entries — add missing debits for existing memberships ── */
router.post("/fees/sync-account-entries", async (_req, res) => {
  try {
    const memberships = await prisma.membership.findMany();
    let created = 0;
    for (const membership of memberships) {
      if (await ensureMembershipDebit(prisma, membership)) created++;
    }
    res.json({ created, total: memberships.length });
  } catch (err) {
    console.error("[POST /api/members/fees/sync-account-entries]", err);
    res.status(500).json({ error: "Erro ao sincronizar a conta corrente." });
  }
});

export default router;
