import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db.js";
import extractImageFromUrl from "../services/imageExtractor.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (user) { req.user = user; return next(); }
  } catch {}
  next();
}

async function isAdmin(req, res, next) {
  // Check DB role first
  if (req.user && req.user.role === "admin") return next();
  
  // Fallback: check JWT payload directly
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      if (payload.role === "admin") return next();
    } catch {}
  }
  
  return res.status(403).json({ error: "Admin access required" });
}

router.post("/extract-image", isAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    
    const imageUrl = await extractImageFromUrl(url);
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const { start, end, type, club } = req.query;
    const where = {};
    if (start || end) {
      where.date = {};
      if (start) where.date.gte = new Date(start);
      if (end) where.date.lte = new Date(end);
    }
    if (type) where.type = type;
    if (club) where.club = club;

    const events = await prisma.event.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        rsvps: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        rsvps: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", isAdmin, async (req, res) => {
  try {
    const { title, description, date, endDate, location, lat, lng, type, club, distance, elevation, gpxUrl, url, imageUrl } = req.body;
    
    let finalImageUrl = imageUrl;
    if (url && !finalImageUrl) {
      const extractedImage = await extractImageFromUrl(url);
      if (extractedImage) finalImageUrl = extractedImage;
    }

    const event = await prisma.event.create({
      data: {
        title, description, date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        location, lat, lng, type,
        club: club || "Alverca Urban Runners",
        distance, elevation, gpxUrl, url, imageUrl: finalImageUrl,
        createdBy: req.user?.id || "system",
      },
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", isAdmin, async (req, res) => {
  try {
    const { title, description, date, endDate, location, lat, lng, type, club, distance, elevation, gpxUrl, url, imageUrl } = req.body;
    
    let finalImageUrl = imageUrl;
    if (url && !finalImageUrl) {
      const extractedImage = await extractImageFromUrl(url);
      if (extractedImage) finalImageUrl = extractedImage;
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title, description,
        date: date ? new Date(date) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        location, lat, lng, type, club, distance, elevation, gpxUrl, url, imageUrl: finalImageUrl,
      },
    });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", isAdmin, async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
