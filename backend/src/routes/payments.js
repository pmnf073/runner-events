import express from "express";
import prisma from "../db.js";
import { requireStaff } from "../middleware/auth.js";
import { audit } from "../services/audit.js";
import { lockSequence, recalcMembership } from "../services/ledger.js";
import { streamReceiptPdf } from "../services/receipt.js";
import { ALLOWED, isAllowed } from "../utils/http.js";

const router = express.Router();
router.use(requireStaff);

const creditDescription = (payment) => `Pagamento #${payment.receiptNumber} (${payment.method})`;

async function nextReceiptNumber(tx) {
  await lockSequence(tx, "receiptNumber");
  const year = new Date().getFullYear();
  const lastReceipt = await tx.payment.findFirst({
    where: { receiptNumber: { startsWith: `${year}-` } },
    orderBy: { receiptNumber: "desc" },
  });
  let nextSeq = 1;
  if (lastReceipt) {
    const lastSeq = parseInt(lastReceipt.receiptNumber.split("-")[1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${year}-${String(nextSeq).padStart(4, "0")}`;
}

/* ── GET /api/payments — all payments (with filters) ── */
router.get("/", async (req, res) => {
  try {
    const { memberId, method, status, startDate, endDate, limit = 50, offset = 0 } = req.query;
    const where = {};

    if (memberId) where.memberId = memberId;
    if (method) where.method = method;
    // Payment doesn't have a 'status' field directly; we might filter via linked membership status
    // For now, skip complex filters

    const payments = await prisma.payment.findMany({
      where,
      include: {
        member: { include: { user: { select: { name: true, email: true } } } },
        membership: true,
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.payment.count({ where });
    res.json({ payments, total });
  } catch (err) {
    console.error("[GET /api/payments]", err);
    res.status(500).json({ error: "Erro ao listar pagamentos." });
  }
});

/* ── GET /api/payments/:id ── */
router.get("/:id", async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        member: { include: { user: { select: { name: true, email: true } } } },
        membership: true,
        accountEntries: true,
      },
    });
    if (!payment) return res.status(404).json({ error: "Pagamento não encontrado." });
    res.json(payment);
  } catch (err) {
    console.error("[GET /api/payments/:id]", err);
    res.status(500).json({ error: "Erro ao obter pagamento." });
  }
});

/* ── POST /api/payments ── */
/* ── GET /api/payments/:id/receipt — PDF receipt ── */
router.get("/:id/receipt", async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { member: { include: { user: true } }, membership: true },
    });
    if (!payment) return res.status(404).json({ error: "Pagamento não encontrado." });
    streamReceiptPdf(payment, res);
  } catch (err) {
    console.error("[GET /api/payments/:id/receipt]", err);
    res.status(500).json({ error: "Erro ao gerar o recibo." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { memberId, membershipId, amount, paidAmount, date, method, reference, notes, receiptNumber } = req.body;

    if (!memberId || !amount || !method) {
      return res.status(400).json({ error: "Sócio, valor e método são obrigatórios." });
    }
    if (!(Number(amount) > 0) || (paidAmount != null && !(Number(paidAmount) >= 0))) {
      return res.status(400).json({ error: "Valor inválido." });
    }
    if (!isAllowed("paymentMethod", method)) {
      return res.status(400).json({ error: `Método inválido (${ALLOWED.paymentMethod.join(", ")}).` });
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ error: "Sócio não encontrado." });

    if (membershipId) {
      const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
      if (!membership || membership.memberId !== memberId) {
        return res.status(400).json({ error: "A quota indicada não pertence a este sócio." });
      }
    }

    // Payment, credit entry and membership status are written together or not at all.
    const payment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          memberId,
          membershipId: membershipId || null,
          amount: Number(amount),
          paidAmount: paidAmount != null ? Number(paidAmount) : Number(amount),
          date: date ? new Date(date) : new Date(),
          method,
          reference: reference || null,
          receiptNumber: receiptNumber || (await nextReceiptNumber(tx)),
          notes: notes || null,
          createdBy: req.user.id,
        },
        include: { member: { include: { user: { select: { name: true } } } } },
      });

      await tx.accountEntry.create({
        data: {
          memberId,
          paymentId: payment.id,
          type: "credit",
          description: creditDescription(payment),
          amount: payment.paidAmount,
          date: payment.date,
        },
      });

      if (membershipId) await recalcMembership(tx, membershipId);
      await audit(tx, req, "payment.create", "Payment", payment.id, {
        receiptNumber: payment.receiptNumber, memberId, membershipId: membershipId || null,
        paidAmount: Number(payment.paidAmount), method, date: payment.date,
      });
      return payment;
    });

    res.status(201).json(payment);
  } catch (err) {
    console.error("[POST /api/payments]", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Número de recibo já existe." });
    }
    res.status(500).json({ error: "Erro ao registar pagamento." });
  }
});

/* ── PUT /api/payments/:id ── */
router.put("/:id", async (req, res) => {
  try {
    const { amount, paidAmount, date, method, reference, notes, receiptNumber } = req.body;
    if (method !== undefined && !isAllowed("paymentMethod", method)) {
      return res.status(400).json({ error: `Método inválido (${ALLOWED.paymentMethod.join(", ")}).` });
    }
    if ((amount !== undefined && !(Number(amount) > 0)) || (paidAmount !== undefined && !(Number(paidAmount) >= 0))) {
      return res.status(400).json({ error: "Valor inválido." });
    }

    const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Pagamento não encontrado." });

    // memberId and membershipId are fixed after creation.
    const data = {};
    if (amount !== undefined) data.amount = Number(amount);
    if (paidAmount !== undefined) data.paidAmount = Number(paidAmount);
    if (date !== undefined) data.date = new Date(date);
    if (method !== undefined) data.method = method;
    if (reference !== undefined) data.reference = reference || null;
    if (notes !== undefined) data.notes = notes;
    if (receiptNumber) data.receiptNumber = receiptNumber;

    const payment = await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: req.params.id },
        data,
        include: { member: { include: { user: { select: { name: true } } } } },
      });

      // Keep the payment's credit entry in line with the payment.
      const credit = { amount: updated.paidAmount, date: updated.date, description: creditDescription(updated) };
      const { count } = await tx.accountEntry.updateMany({ where: { paymentId: updated.id, type: "credit" }, data: credit });
      if (count === 0) {
        await tx.accountEntry.create({ data: { ...credit, memberId: updated.memberId, paymentId: updated.id, type: "credit" } });
      }

      if (existing.membershipId) await recalcMembership(tx, existing.membershipId);
      const changes = {};
      for (const key of Object.keys(data)) {
        const before = existing[key] instanceof Date ? existing[key].toISOString() : existing[key];
        const after = updated[key] instanceof Date ? updated[key].toISOString() : updated[key];
        if (String(before) !== String(after)) changes[key] = { before, after };
      }
      await audit(tx, req, "payment.update", "Payment", updated.id, { receiptNumber: updated.receiptNumber, changes });
      return updated;
    });

    res.json(payment);
  } catch (err) {
    console.error("[PUT /api/payments/:id]", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Pagamento não encontrado." });
    if (err.code === "P2002") return res.status(400).json({ error: "Número de recibo já existe." });
    res.status(500).json({ error: "Erro ao atualizar pagamento." });
  }
});

/* ── DELETE /api/payments/:id ── */
router.delete("/:id", async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ error: "Pagamento não encontrado." });

    await prisma.$transaction(async (tx) => {
      // Delete the credit before the payment; deleting the payment sets paymentId to null.
      await tx.accountEntry.deleteMany({ where: { paymentId: req.params.id } });
      await tx.payment.delete({ where: { id: req.params.id } });
      await audit(tx, req, "payment.delete", "Payment", payment.id, {
        receiptNumber: payment.receiptNumber, memberId: payment.memberId,
        paidAmount: Number(payment.paidAmount), method: payment.method, date: payment.date,
      });
      if (payment.membershipId) await recalcMembership(tx, payment.membershipId);
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/payments/:id]", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Pagamento não encontrado." });
    res.status(500).json({ error: "Erro ao eliminar pagamento." });
  }
});

/* ── GET /api/members/:memberId/payments — handy shortcut ── */
router.get("/member/:memberId", async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { memberId: req.params.memberId },
      orderBy: { createdAt: "desc" },
      include: { membership: true },
    });
    res.json(payments);
  } catch (err) {
    console.error("[GET /api/payments/member/:memberId]", err);
    res.status(500).json({ error: "Erro ao listar pagamentos do sócio." });
  }
});

export default router;
