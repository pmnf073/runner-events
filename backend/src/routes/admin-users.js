import { Router } from "express";
import prisma from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { ALLOWED, isAllowed, isValidNif, serverError } from "../utils/http.js";

const router = Router();
router.use(requireAdmin);

// Refuses changes that would leave the club without an active admin.
async function wouldRemoveLastAdmin(userId, nextRole, nextStatus) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, status: true } });
  if (!user || user.role !== "admin" || user.status !== "active") return false;
  if ((nextRole ?? "admin") === "admin" && (nextStatus ?? "active") === "active") return false;
  const activeAdmins = await prisma.user.count({ where: { role: "admin", status: "active" } });
  return activeAdmins <= 1;
}

// ─── Stats (MUST be before /users/:id or Express matches "stats" as :id) ───
router.get("/users/stats", async (req, res) => {
  try {
    const groups = await prisma.user.groupBy({ by: ["status"], _count: { _all: true } });
    const counts = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
    res.json({
      total: groups.reduce((sum, g) => sum + g._count._all, 0),
      pending: counts.pending || 0,
      active: counts.active || 0,
      inactive: counts.inactive || 0,
      banned: counts.banned || 0,
    });
  } catch (e) {
    serverError(res, e);
  }
});

// ─── List users (admin only) ───
router.get("/users", async (req, res) => {
  try {
    const { status, role, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        altContact: true,
        address: true,
        dob: true,
        nif: true,
        avatar: true,
        provider: true,
        role: true,
        status: true,
        clubs: true,
        notes: true,
        invitedBy: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { rsvps: true } },
      },
    });
    res.json(users);
  } catch (e) {
    serverError(res, e);
  }
});

// ─── Approve/Reject registration (MUST be before /users/:id) ───
router.put("/users/:id/registration", async (req, res) => {
  try {
    const { action, reason } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Ação inválida (approve ou reject)." });
    }

    const registration = await prisma.registration.findFirst({
      where: { userId: req.params.id, status: "pending" },
    });

    if (!registration) {
      if (action === "approve") {
        await prisma.user.update({ where: { id: req.params.id }, data: { status: "active" } });
        return res.json({ ok: true, action, note: "User activated directly" });
      } else {
        await prisma.user.update({ where: { id: req.params.id }, data: { status: "inactive" } });
        return res.json({ ok: true, action, note: "User deactivated directly" });
      }
    }

    const updateData = {};
    if (action === "approve") {
      updateData.status = "approved";
      updateData.reviewerId = req.user.id;
      updateData.reviewedAt = new Date();
      await prisma.user.update({ where: { id: req.params.id }, data: { status: "active" } });
    } else {
      updateData.status = "rejected";
      updateData.reviewerId = req.user.id;
      updateData.reviewedAt = new Date();
      updateData.rejectionReason = reason || null;
    }

    await prisma.registration.update({ where: { id: registration.id }, data: updateData });
    res.json({ ok: true, action });
  } catch (e) {
    serverError(res, e);
  }
});

// ─── Get single user ───
router.get("/users/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, name: true, phone: true, altContact: true,
        address: true, dob: true, nif: true, avatar: true, provider: true, role: true,
        status: true, clubs: true, notes: true, invitedBy: true,
        createdAt: true, updatedAt: true,
        rsvps: { include: { event: { select: { id: true, title: true, date: true, type: true } } } },
        registrations: true,
      },
    });
    if (!user) return res.status(404).json({ error: "Utilizador não encontrado." });
    res.json(user);
  } catch (e) {
    serverError(res, e);
  }
});

// ─── Update user ───
router.put("/users/:id", async (req, res) => {
  try {
    const { name, email, phone, altContact, address, dob, role, status, notes, nif } = req.body;
    if (role !== undefined && !isAllowed("userRole", role)) {
      return res.status(400).json({ error: `Perfil inválido (${ALLOWED.userRole.join(", ")}).` });
    }
    if (status !== undefined && !isAllowed("userStatus", status)) {
      return res.status(400).json({ error: `Estado inválido (${ALLOWED.userStatus.join(", ")}).` });
    }
    if (nif && !isValidNif(nif)) return res.status(400).json({ error: "NIF inválido." });
    if (await wouldRemoveLastAdmin(req.params.id, role, status)) {
      return res.status(400).json({ error: "Tem de existir pelo menos um administrador ativo." });
    }
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (altContact !== undefined) updateData.altContact = altContact;
    if (address !== undefined) updateData.address = address;
    if (dob !== undefined) updateData.dob = dob ? new Date(dob) : null;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (nif !== undefined) updateData.nif = nif || null;
    const { password, ...user } = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
    res.json(user);
  } catch (e) {
    serverError(res, e);
  }
});

// ─── Delete user ───
router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "Não podes eliminar a tua própria conta." });
    }
    if (await wouldRemoveLastAdmin(req.params.id, null, "inactive")) {
      return res.status(400).json({ error: "Tem de existir pelo menos um administrador ativo." });
    }
    const payments = await prisma.payment.count({ where: { member: { userId: req.params.id } } });
    if (payments > 0) {
      return res.status(409).json({
        error: "Este utilizador é sócio com pagamentos registados e não pode ser eliminado. Desativa a conta em vez disso.",
      });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Utilizador não encontrado." });
    serverError(res, e);
  }
});

export default router;
