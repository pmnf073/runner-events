import { Router } from "express";
import prisma from "../db.js";
import adminMiddleware from "../middleware/admin.js";

const router = Router();

// GET /api/staff/users — list users (readonly, for staff: admin + organizer)
router.get("/", adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (err) {
    console.error("[GET /api/staff/users]", err);
    res.status(500).json({ error: "Erro ao carregar utilizadores" });
  }
});

export default router;
