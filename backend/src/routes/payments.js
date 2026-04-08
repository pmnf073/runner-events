import express from "express";
import prisma from "../db.js";
import adminMiddleware from "../middleware/admin.js";

const router = express.Router();

/* ── Middleware: admin or organizer ── */
function requireStaff(req, res, next) {
  if (!req.user || !["admin", "organizer"].includes(req.user.role)) {
    return res.status(403).json({ error: "Acesso restrito." });
  }
  next();
}

/* ── GET /api/payments — all payments (with filters) ── */
router.get("/", requireStaff, async (req, res) => {
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
router.get("/:id", requireStaff, async (req, res) => {
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
router.post("/", requireStaff, async (req, res) => {
  try {
    const { memberId, membershipId, amount, paidAmount, date, method, reference, notes, receiptNumber } = req.body;

    if (!memberId || !amount || !method) {
      return res.status(400).json({ error: "memberId, amount e method são obrigatórios." });
    }

    // Validate member exists
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ error: "Sócio não encontrado." });

    // If membershipId provided, validate
    if (membershipId) {
      const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
      if (!membership) return res.status(400).json({ error: "Membership inválido." });
    }

    // receiptNumber must be unique, generate if not provided
    let finalReceiptNumber = receiptNumber;
    if (!finalReceiptNumber) {
      // Generate like YYYY-XXXX sequential per year
      const year = new Date().getFullYear();
      const lastReceipt = await prisma.payment.findFirst({
        where: { receiptNumber: { startsWith: `${year}-` } },
        orderBy: { receiptNumber: "desc" },
      });
      let nextSeq = 1;
      if (lastReceipt) {
        const lastSeq = parseInt(lastReceipt.receiptNumber.split("-")[1], 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }
      finalReceiptNumber = `${year}-${String(nextSeq).padStart(4, "0")}`;
    }

    const createdByUserId = req.user.id;

    const payment = await prisma.payment.create({
      data: {
        memberId,
        membershipId: membershipId || null,
        amount: String(amount),
        paidAmount: paidAmount ? String(paidAmount) : String(amount),
        date: date ? new Date(date) : new Date(),
        method,
        reference: reference || null,
        receiptNumber: finalReceiptNumber,
        notes: notes || null,
        createdBy: createdByUserId,
      },
      include: { member: { include: { user: { select: { name: true } } } } },
    });

    // Create AccountEntry for the payment (credit to member account)
    await prisma.accountEntry.create({
      data: {
        memberId,
        paymentId: payment.id,
        type: "credit",
        description: `Pagamento #${payment.receiptNumber} (${method})`,
        amount: payment.paidAmount,
        date: payment.date,
      },
    });

    // Update membership status if fully paid and linked
    if (membershipId) {
      const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
      if (membership) {
        const totalPaid = await prisma.payment.aggregate({
          where: { membershipId, deletedAt: null },
          _sum: { paidAmount: true },
        });
        const newStatus =
          Number(totalPaid._sum.paidAmount) >= Number(membership.amount) ? "paid" :
          Number(totalPaid._sum.paidAmount) > 0 ? "partial" : "pending";
        await prisma.membership.update({
          where: { id: membershipId },
          data: {
            status: newStatus,
            paidDate: newStatus === "paid" ? new Date() : membership.paidDate,
          },
        });
      }
    }

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
router.put("/:id", requireStaff, async (req, res) => {
  try {
    const { amount, paidAmount, date, method, reference, notes, receiptNumber } = req.body;

    // Find existing payment
    const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Pagamento não encontrado." });

    // Prevent changing memberId or membershipId after creation (complex)
    const data = {};
    if (amount !== undefined) data.amount = String(amount);
    if (paidAmount !== undefined) data.paidAmount = String(paidAmount);
    if (date !== undefined) data.date = new Date(date);
    if (method !== undefined) data.method = method;
    if (reference !== undefined) data.reference = reference || null;
    if (notes !== undefined) data.notes = notes;
    if (receiptNumber !== undefined) data.receiptNumber = receiptNumber;

    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data,
      include: { member: { include: { user: { select: { name: true } } } } },
    });

    // If membership linked, recalc status
    if (existing.membershipId) {
      const totalPaid = await prisma.payment.aggregate({
        where: { membershipId: existing.membershipId },
        _sum: { paidAmount: true },
      });
      const membership = await prisma.membership.findUnique({ where: { id: existing.membershipId } });
      if (membership) {
        const newStatus =
          Number(totalPaid._sum.paidAmount) >= Number(membership.amount) ? "paid" :
          Number(totalPaid._sum.paidAmount) > 0 ? "partial" : "pending";
        await prisma.membership.update({
          where: { id: existing.membershipId },
          data: {
            status: newStatus,
            paidDate: newStatus === "paid" ? new Date() : membership.paidDate,
          },
        });
      }
    }

    res.json(payment);
  } catch (err) {
    console.error("[PUT /api/payments/:id]", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Pagamento não encontrado." });
    if (err.code === "P2002") return res.status(400).json({ error: "Receipt number already exists." });
    res.status(500).json({ error: "Erro ao atualizar pagamento." });
  }
});

/* ── DELETE /api/payments/:id ── */
router.delete("/:id", requireStaff, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ error: "Pagamento não encontrado." });

    await prisma.payment.delete({ where: { id: req.params.id } });

    // Also delete associated AccountEntry entries (cascade might handle, but be explicit)
    await prisma.accountEntry.deleteMany({ where: { paymentId: req.params.id } });

    // Recalculate membership status if linked
    if (payment.membershipId) {
      const totalPaid = await prisma.payment.aggregate({
        where: { membershipId: payment.membershipId },
        _sum: { paidAmount: true },
      });
      const membership = await prisma.membership.findUnique({ where: { id: payment.membershipId } });
      if (membership) {
        const newStatus = Number(totalPaid._sum.paidAmount) > 0 ? "partial" : "pending";
        await prisma.membership.update({
          where: { id: payment.membershipId },
          data: { status: newStatus, paidDate: null },
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/payments/:id]", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Pagamento não encontrado." });
    res.status(500).json({ error: "Erro ao eliminar pagamento." });
  }
});

/* ── GET /api/members/:memberId/payments — handy shortcut ── */
router.get("/member/:memberId", requireStaff, async (req, res) => {
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
