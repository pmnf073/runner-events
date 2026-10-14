import prisma from "../db.js";
import { toCents } from "../utils/http.js";
import { dateKey } from "../utils/recurrence.js";

// Membership fees, payments and the member's account (AccountEntry) must stay
// consistent: the "Anuidade <year>" debit holds what is due, each payment has one
// credit, and Membership.status/discount follow from the linked payments.

export const membershipDebitDescription = (year) => `Anuidade ${year}`;

const amountDue = (membership, discount) => toCents(Math.max(0, Number(membership.amount) - Number(discount || 0)));

// Creates the membership's debit if missing. Returns true when one was created.
export async function ensureMembershipDebit(tx, membership) {
  const description = membershipDebitDescription(membership.year);
  const existing = await tx.accountEntry.findFirst({
    where: { memberId: membership.memberId, type: "debit", description },
  });
  if (existing) return false;

  await tx.accountEntry.create({
    data: {
      memberId: membership.memberId,
      type: "debit",
      description,
      amount: amountDue(membership, membership.discount),
      date: membership.createdAt,
    },
  });
  return true;
}

// Recomputes a membership's early-bird discount, status and paid date from its
// payments, and keeps its debit equal to the amount due.
// The early-bird discount applies only when the payments made up to the deadline
// cover the discounted amount.
export async function recalcMembership(tx, membershipId) {
  const membership = await tx.membership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.status === "exempt") return;

  const [fee, payments] = await Promise.all([
    tx.annualFeeConfig.findUnique({ where: { year: membership.year } }),
    tx.payment.findMany({ where: { membershipId }, select: { paidAmount: true, date: true }, orderBy: { date: "asc" } }),
  ]);
  const totalPaid = toCents(payments.reduce((sum, p) => sum + Number(p.paidAmount), 0));

  let discount = 0;
  if (fee?.earlybirdDiscount && fee.earlybirdDeadline) {
    const deadline = dateKey(fee.earlybirdDeadline);
    const paidByDeadline = toCents(
      payments.filter((p) => dateKey(p.date) <= deadline).reduce((sum, p) => sum + Number(p.paidAmount), 0),
    );
    if (paidByDeadline > 0 && paidByDeadline >= amountDue(membership, fee.earlybirdDiscount)) {
      discount = Number(fee.earlybirdDiscount);
    }
  }

  const due = amountDue(membership, discount);
  const status = totalPaid >= due ? "paid" : totalPaid > 0 ? "partial" : "pending";
  const lastPayment = payments[payments.length - 1];

  await tx.membership.update({
    where: { id: membershipId },
    data: {
      discount: discount || null,
      discountReason: discount ? "Pagamento antecipado" : null,
      status,
      paidDate: status === "paid" ? (membership.paidDate ?? lastPayment?.date ?? new Date()) : null,
    },
  });

  await ensureMembershipDebit(tx, membership);
  await tx.accountEntry.updateMany({
    where: { memberId: membership.memberId, type: "debit", description: membershipDebitDescription(membership.year) },
    data: { amount: due },
  });
}

// Balance per member (credits from payments minus debits), in one query.
export async function memberBalances(memberIds) {
  const sums = await prisma.accountEntry.groupBy({
    by: ["memberId", "type"],
    where: {
      memberId: { in: memberIds },
      OR: [{ type: "debit" }, { type: "credit", paymentId: { not: null } }],
    },
    _sum: { amount: true },
  });
  const totals = new Map(memberIds.map((id) => [id, { totalDebits: 0, totalCredits: 0 }]));
  for (const row of sums) {
    const entry = totals.get(row.memberId);
    if (row.type === "debit") entry.totalDebits = toCents(row._sum.amount);
    else entry.totalCredits = toCents(row._sum.amount);
  }
  for (const entry of totals.values()) entry.balance = toCents(entry.totalCredits - entry.totalDebits);
  return totals;
}

// Serializes allocation of a sequential number (receipt or member number) until
// the surrounding transaction ends, so two requests never pick the same one.
export async function lockSequence(tx, name) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${name}))`;
}

// Applies a saved AnnualFeeConfig to that year's memberships: all take the new due
// date, those without payments take the new amount, and every one is recalculated
// because the early-bird rules may have changed. Returns how many were updated.
export async function applyFeeToMemberships(tx, fee) {
  const memberships = await tx.membership.findMany({
    where: { year: fee.year, status: { not: "exempt" } },
    select: { id: true, _count: { select: { payments: true } } },
  });
  for (const m of memberships) {
    await tx.membership.update({
      where: { id: m.id },
      data: m._count.payments === 0 ? { amount: fee.amount, dueDate: fee.dueDate } : { dueDate: fee.dueDate },
    });
    await recalcMembership(tx, m.id);
  }
  return memberships.length;
}

// Amount still missing on each membership (id -> euros). While the early-bird
// deadline has not passed, the discounted amount is what is due, which matches
// the rule in recalcMembership for a payment registered today.
export async function outstandingByMembership(memberships) {
  if (memberships.length === 0) return new Map();
  const [fees, paid] = await Promise.all([
    prisma.annualFeeConfig.findMany({ where: { year: { in: [...new Set(memberships.map((m) => m.year))] } } }),
    prisma.payment.groupBy({
      by: ["membershipId"],
      where: { membershipId: { in: memberships.map((m) => m.id) } },
      _sum: { paidAmount: true },
    }),
  ]);
  const feeByYear = new Map(fees.map((f) => [f.year, f]));
  const paidById = new Map(paid.map((p) => [p.membershipId, Number(p._sum.paidAmount || 0)]));
  const today = dateKey(new Date());

  return new Map(
    memberships.map((m) => {
      if (m.status === "exempt" || m.status === "paid") return [m.id, 0];
      const fee = feeByYear.get(m.year);
      const earlybirdOpen = fee?.earlybirdDiscount && fee.earlybirdDeadline && today <= dateKey(fee.earlybirdDeadline);
      const due = amountDue(m, earlybirdOpen ? fee.earlybirdDiscount : m.discount);
      return [m.id, toCents(Math.max(0, due - (paidById.get(m.id) || 0)))];
    }),
  );
}
