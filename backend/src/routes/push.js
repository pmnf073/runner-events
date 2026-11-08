import { Router } from "express";
import prisma from "../db.js";
import { requireUser } from "../middleware/auth.js";
import { isPushConfigured, sendTest, vapidPublicKey } from "../services/push.js";
import { serverError } from "../utils/http.js";

// Web Push: the public key the browser needs to subscribe, the logged-in user's
// subscriptions (one per device/app) and which notifications they want.
const router = Router();

const PREFERENCE_FIELDS = { pushNewEvents: true, pushTrainingReminders: true };

// GET /api/push/config — whether push is on and the VAPID public key (no login needed)
router.get("/config", (_req, res) => {
  res.json({ enabled: isPushConfigured(), publicKey: isPushConfigured() ? vapidPublicKey() : null });
});

router.use(requireUser);

// GET /api/push/preferences
router.get("/preferences", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: PREFERENCE_FIELDS });
    const devices = await prisma.pushSubscription.count({ where: { userId: req.user.id } });
    res.json({ ...user, devices });
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/push/preferences { pushNewEvents?, pushTrainingReminders? }
router.put("/preferences", async (req, res) => {
  try {
    const data = {};
    for (const field of Object.keys(PREFERENCE_FIELDS)) {
      if (req.body[field] !== undefined) data[field] = Boolean(req.body[field]);
    }
    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: PREFERENCE_FIELDS });
    res.json(user);
  } catch (err) {
    serverError(res, err);
  }
});

const validSubscription = (body) =>
  typeof body?.endpoint === "string" && body.endpoint.startsWith("https://") && body.endpoint.length <= 1000 &&
  typeof body?.keys?.p256dh === "string" && body.keys.p256dh.length <= 200 &&
  typeof body?.keys?.auth === "string" && body.keys.auth.length <= 100;

// POST /api/push/subscriptions — the PushSubscription JSON from the browser
router.post("/subscriptions", async (req, res) => {
  try {
    if (!isPushConfigured()) return res.status(501).json({ error: "As notificações não estão configuradas." });
    if (!validSubscription(req.body)) return res.status(400).json({ error: "Subscrição inválida." });
    const { endpoint, keys } = req.body;
    const data = {
      userId: req.user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: String(req.get("user-agent") || "").substring(0, 300) || null,
    };
    // The same device may have been subscribed by another account before: it now belongs to this one.
    await prisma.pushSubscription.upsert({ where: { endpoint }, create: { endpoint, ...data }, update: data });
    res.status(201).json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/push/subscriptions { endpoint }
router.delete("/subscriptions", async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== "string") return res.status(400).json({ error: "Subscrição inválida." });
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } });
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/push/test — test notification to the logged-in user's devices
router.post("/test", async (req, res) => {
  try {
    if (!isPushConfigured()) return res.status(501).json({ error: "As notificações não estão configuradas." });
    const results = await sendTest(req.user.id);
    res.json({ devices: results.length, sent: results.filter((r) => r.ok).length, results });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
