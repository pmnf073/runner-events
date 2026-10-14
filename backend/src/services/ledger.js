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
