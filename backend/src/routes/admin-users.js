import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Auth required" });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (payload.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ─── List users (admin only) ───
router.get("/users", requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: e.message });
  }
});

// ─── Get single user ───
router.get("/users/:id", requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        altContact: true,
        address: true,
        dob: true,
        avatar: true,
        provider: true,
        role: true,
        status: true,
        clubs: true,
        notes: true,
        invitedBy: true,
        createdAt: true,
        updatedAt: true,
        rsvps: {
          include: {
            event: { select: { id: true, title: true, date: true, type: true } },
          },
        },
        registrations: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Update user ───
router.put("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, altContact, address, dob, role, status, notes } = req.body;
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

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Approve/Reject registration ───
router.put("/users/:id/registration", requireAdmin, async (req, res) => {
  try {
    const { action, reason } = req.body; // action: "approve" | "reject"
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
    }

    const registration = await prisma.registration.findFirst({
      where: { userId: req.params.id, status: "pending" },
    });

    if (!registration) {
      return res.status(404).json({ error: "No pending registration found" });
    }

    const updateData = {};
    if (action === "approve") {
      updateData.status = "approved";
      updateData.reviewerId = req.user.id;
      updateData.reviewedAt = new Date();

      // Also activate user
      await prisma.user.update({
        where: { id: req.params.id },
        data: { status: "active" },
      });
    } else {
      updateData.status = "rejected";
      updateData.reviewerId = req.user.id;
      updateData.reviewedAt = new Date();
      updateData.rejectionReason = reason || null;
    }

    await prisma.registration.update({
      where: { id: registration.id },
      data: updateData,
    });

    res.json({ ok: true, action });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Delete user ───
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Stats ───
router.get("/users/stats", requireAdmin, async (req, res) => {
  try {
    const total = await prisma.user.count();
    const pending = await prisma.user.count({ where: { status: "pending" } });
    const active = await prisma.user.count({ where: { status: "active" } });
    const inactive = await prisma.user.count({ where: { status: "inactive" } });
    const banned = await prisma.user.count({ where: { status: "banned" } });
    res.json({ total, pending, active, inactive, banned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
