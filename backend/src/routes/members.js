import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function requireAdminOrOrganizer(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Auth required" });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (!["admin", "organizer"].includes(payload.role)) {
      return res.status(403).json({ error: "Acesso restrito." });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

/* ── GET /api/members — list all members with user data ── */
router.get("/", requireAdminOrOrganizer, async (req, res) => {
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

    // Calculate balance per member
    const membersWithBalance = await Promise.all(
      members.map(async (m) => {
        const debits = await prisma.accountEntry.aggregate({
          where: { memberId: m.id, type: "debit" },
          _sum: { amount: true },
        });
        const credits = await prisma.accountEntry.aggregate({
          where: { memberId: m.id, type: "credit" },
          _sum: { amount: true },
        });
        const balance =
          (Number(credits._sum.amount) || 0) - (Number(debits._sum.amount) || 0);
        return { ...m, balance };
      })
    );

    res.json(membersWithBalance);
  } catch (err) {
    console.error("[GET /api/members]", err);
    res.status(500).json({ error: "Erro ao listar sócios." });
  }
});

/* ── GET /api/members/:id — single member detail ── */
router.get("/:id", requireAdminOrOrganizer, async (req, res) => {
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
    res.json(member);
  } catch (err) {
    console.error("[GET /api/members/:id]", err);
    res.status(500).json({ error: "Erro ao obter dados do sócio." });
  }
});

/* ── POST /api/members — activate/convert user to member ── */
router.post("/", requireAdminOrOrganizer, async (req, res) => {
  try {
    const { userId, notes } = req.body;
    if (!userId) return res.status(400).json({ error: "userId é obrigatório." });

    // Get next member number
    const maxNum = await prisma.member.aggregate({ _max: { memberNumber: true } });
    const nextNumber = (maxNum._max.memberNumber || 0) + 1;

    const member = await prisma.member.create({
      data: {
        userId,
        memberNumber: nextNumber,
        notes: notes || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(member);
  } catch (err) {
    console.error("[POST /api/members]", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Utilizador já é sócio." });
    }
    res.status(500).json({ error: "Erro ao criar sócio." });
  }
});

/* ── PUT /api/members/:id — update member associativo data ── */
router.put("/:id", requireAdminOrOrganizer, async (req, res) => {
  try {
    const { status, position, notes, resignationDate } = req.body;
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

    res.json(member);
  } catch (err) {
    console.error("[PUT /api/members/:id]", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Sócio não encontrado." });
    }
    res.status(500).json({ error: "Erro ao atualizar sócio." });
  }
});

/* ── DELETE /api/members/:id — remove member (cascade to user via relation) ── */
router.delete("/:id", requireAdminOrOrganizer, async (req, res) => {
  try {
    await prisma.member.delete({ where: { id: req.params.id } });
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
router.get("/balance/:id", requireAdminOrOrganizer, async (req, res) => {
  try {
    const debits = await prisma.accountEntry.aggregate({
      where: { memberId: req.params.id, type: "debit" },
      _sum: { amount: true },
    });
    const credits = await prisma.accountEntry.aggregate({
      where: { memberId: req.params.id, type: "credit" },
      _sum: { amount: true },
    });
    const totalDebit = Number(debits._sum.amount) || 0;
    const totalCredit = Number(credits._sum.amount) || 0;
    const balance = totalCredit - totalDebit;

    res.json({
      memberId: req.params.id,
      totalDebits: totalDebit,
      totalCredits: totalCredit,
      balance,
    });
  } catch (err) {
    console.error("[GET /api/members/balance/:id]", err);
    res.status(500).json({ error: "Erro ao calcular saldo." });
  }
});

/* ── Annual Fee Configuration ── */

// GET /api/fees
router.get("/fees", requireAdminOrOrganizer, async (req, res) => {
  try {
    const fees = await prisma.annualFeeConfig.findMany({ orderBy: { year: "desc" } });
    res.json(fees);
  } catch (err) {
    console.error("[GET /api/fees]", err);
    res.status(500).json({ error: "Erro ao listar configurações." });
  }
});

// POST /api/fees
router.post("/fees", requireAdminOrOrganizer, async (req, res) => {
  try {
    const { year, amount, dueDate, earlybirdDiscount, earlybirdDeadline } = req.body;
    if (!year || amount == null || !dueDate) {
      return res.status(400).json({ error: "year, amount e dueDate são obrigatórios." });
    }

    const fee = await prisma.annualFeeConfig.upsert({
      where: { year },
      create: {
        year,
        amount: String(amount),
        dueDate: new Date(dueDate),
        earlybirdDiscount: earlybirdDiscount ? String(earlybirdDiscount) : null,
        earlybirdDeadline: earlybirdDeadline ? new Date(earlybirdDeadline) : null,
      },
      update: {
        amount: String(amount),
        dueDate: new Date(dueDate),
        earlybirdDiscount: earlybirdDiscount ? String(earlybirdDiscount) : null,
        earlybirdDeadline: earlybirdDeadline ? new Date(earlybirdDeadline) : null,
      },
    });

    res.json(fee);
  } catch (err) {
    console.error("[POST /api/fees]", err);
    res.status(500).json({ error: "Erro ao configurar anuidade." });
  }
});

/* ── POST /api/fees/:year/generate-memberships — generate pending memberships for all active members ── */
router.post("/fees/:year/generate-memberships", requireAdminOrOrganizer, async (req, res) => {
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

      await prisma.membership.create({
        data: {
          memberId: member.id,
          year,
          amount: feeConfig.amount,
          dueDate: feeConfig.dueDate,
          discount: feeConfig.earlybirdDiscount, // auto-apply early bird (can be removed later)
        },
      });
      created++;
    }

    res.json({ created, skipped, total: activeMembers.length });
  } catch (err) {
    console.error("[POST /api/fees/:year/generate-memberships]", err);
    res.status(500).json({ error: "Erro ao gerar quotas." });
  }
});

/* ── GET /api/members/stats — quick stats for admin dashboard ── */
router.get("/stats", requireAdminOrOrganizer, async (req, res) => {
  try {
    const totalMembers = await prisma.member.count();
    const activeMembers = await prisma.member.count({ where: { status: "active" } });
    const suspendedMembers = await prisma.member.count({ where: { status: "suspended" } });
    const currentYear = new Date().getFullYear();

    const paidThisYear = await prisma.membership.count({
      where: { year: currentYear, status: "paid" },
    });
    const pendingThisYear = await prisma.membership.count({
      where: { year: currentYear, status: "pending" },
    });

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

export default router;
