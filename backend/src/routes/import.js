import express from "express";
import multer from "multer";
import prisma from "../db.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function parseICS(icsContent) {
  const events = [];
  const eventBlocks = icsContent.split("BEGIN:VEVENT");

  for (const block of eventBlocks.slice(1)) {
    const getField = (field) => {
      const regex = new RegExp(`${field}(?:;[^:]*)?:(.*)`, "i");
      const match = block.match(regex);
      return match ? match[1].trim().replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, "\n") : null;
    };

    const title = getField("SUMMARY");
    const description = getField("DESCRIPTION");
    const location = getField("LOCATION");
    const dtstart = getField("DTSTART");
    const dtend = getField("DTEND");

    if (!title || !dtstart) continue;

    const parseDate = (dt) => {
      if (!dt) return null;
      const clean = dt.replace("Z", "");
      const year = clean.slice(0, 4);
      const month = clean.slice(4, 6);
      const day = clean.slice(6, 8);
      const hour = clean.length >= 13 ? clean.slice(9, 11) : "00";
      const minute = clean.length >= 13 ? clean.slice(11, 13) : "00";
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
    };

    const startDate = parseDate(dtstart);
    if (isNaN(startDate.getTime())) continue;

    events.push({
      title,
      description: description || "",
      date: startDate.toISOString(),
      endDate: dtend ? parseDate(dtend)?.toISOString() : null,
      location: location || null,
      type: "training",
      club: "Alverca Urban Runners",
    });
  }

  return events;
}

// Upload .ics file
router.post("/import-ics", upload.single("icsFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado" });
    }

    const icsContent = req.file.buffer.toString("utf-8");
    const parsed = parseICS(icsContent);

    if (parsed.length === 0) {
      return res.json({ imported: 0, total: 0, message: "Nenhum evento encontrado no ficheiro" });
    }

    let imported = 0;
    const errors = [];
    for (const event of parsed) {
      try {
        await prisma.event.create({ data: event });
        imported++;
      } catch (err) {
        errors.push(`${event.title}: ${err.meta?.target || err.message}`);
      }
    }

    res.json({ imported, total: parsed.length, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy: import from URL
router.post("/import-teamup", async (req, res) => {
  try {
    const { feedUrl } = req.body;
    if (!feedUrl) return res.status(400).json({ error: "feedUrl is required" });

    const response = await fetch(feedUrl);
    const icsContent = await response.text();
    const parsed = parseICS(icsContent);

    if (parsed.length === 0) {
      return res.json({ imported: 0, message: "No events found in feed" });
    }

    let imported = 0;
    for (const event of parsed) {
      try {
        await prisma.event.create({ data: event });
        imported++;
      } catch { /* skip duplicates */ }
    }

    res.json({ imported, total: parsed.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
