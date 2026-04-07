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
      if (!match) return null;
      return match[1]
        .trim()
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\n/g, "\n");
    };

    const title = getField("SUMMARY");
    const description = getField("DESCRIPTION");
    const location = getField("LOCATION");
    const dtstartRaw = getField("DTSTART");
    const dtendRaw = getField("DTEND");

    if (!title || !dtstartRaw) continue;

    const parseDate = (raw) => {
      if (!raw) return null;
      // Handle DATE only (all-day): 20250523
      if (/^\d{8}$/.test(raw)) {
        return new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T00:00:00.000Z`);
      }
      // Handle datetime with Z suffix: 20260407T094834Z
      // Handle datetime without Z: 20260407T193000 (Lisbon TZ from DTSTART;TZID)
      const clean = raw.replace(/Z$/, "");
      // Format YYYYMMDD -> yyyy-mm-dd
      const datePart = clean.slice(0,8);
      const yyyy = datePart.slice(0,4);
      const mm = datePart.slice(4,6);
      const dd = datePart.slice(6,8);
      // Time part if present
      if (clean.length >= 13) {
        const hh = clean.slice(9,11);
        const mi = clean.slice(11,13);
        // DTSTART with TZID means local time, store as UTC
        return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00.000Z`);
      }
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    };

    const startDate = parseDate(dtstartRaw);
    if (isNaN(startDate.getTime())) continue;

    // Auto-detect type from title
    let type = "training";
    const t = title.toLowerCase();
    if (t.includes("prova") || t.includes("trail") || t.includes("corsa") || t.includes("sao silvestre") || t.includes("monte gordo") || t.includes("montejunto")) type = "race";
    else if (t.includes("caminhada")) type = "social";
    else if (t.includes("treino")) type = "training";
    else if (t.includes("reuniao") || t.includes("staff")) type = "meeting";
    else if (t.includes("limpeza")) type = "social";
    else if (t.includes("aniversario")) type = "social";
    else if (t.includes("entrega") || t.includes("dorsai")) type = "race";

    const descriptionUnescaped = description?.replace(/\\&amp;/g, "é").replace(/\\&amp\;/g, "é") || "";

    events.push({
      title: title.substring(0, 100),
      description: descriptionUnescaped.substring(0, 2000),
      date: startDate.toISOString(),
      endDate: dtendRaw ? parseDate(dtendRaw)?.toISOString() : null,
      location: location?.substring(0, 200) || null,
      type,
      club: "Alverca Urban Runners",
    });
  }

  // Sort by date
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

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
      return res.json({ imported: 0, total: 0, message: "Nenhum evento futuro encontrado no ficheiro" });
    }

    let imported = 0;
    const errors = [];
    for (const event of parsed) {
      try {
        await prisma.event.create({ data: event });
        imported++;
      } catch (err) {
        // Skip duplicates (title + date clash)
        if (err.code === "P2002") {
          console.log(`[import] Skipped duplicate: ${event.title} on ${event.date}`);
        } else {
          errors.push(`${event.title}: ${err.message}`);
        }
      }
    }

    res.json({ imported, total: parsed.length, errors: errors.length ? errors : undefined });
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
      return res.json({ imported: 0, message: "Nenhum evento futuro encontrado" });
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
