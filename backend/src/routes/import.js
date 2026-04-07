import express from "express";
import multer from "multer";
import prisma from "../db.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 20 } });

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
    const uid = block.match(/UID:(.*)/i)?.[1]?.trim() || null;

    if (!title || !dtstartRaw) continue;

    const parseDate = (raw) => {
      if (!raw) return null;
      if (/^\d{8}$/.test(raw)) {
        return new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T00:00:00.000Z`);
      }
      const clean = raw.replace(/Z$/, "");
      const datePart = clean.slice(0,8);
      const yyyy = datePart.slice(0,4);
      const mm = datePart.slice(4,6);
      const dd = datePart.slice(6,8);
      if (clean.length >= 13) {
        const hh = clean.slice(9,11);
        const mi = clean.slice(11,13);
        return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00.000Z`);
      }
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    };

    const startDate = parseDate(dtstartRaw);
    if (isNaN(startDate.getTime())) continue;

    let type = "training";
    const t = title.toLowerCase();
    if (t.includes("prova") || t.includes("trail") || t.includes("corsa") || t.includes("sao silvestre") || t.includes("monte gordo") || t.includes("montejunto")) type = "race";
    else if (t.includes("caminhada")) type = "social";
    else if (t.includes("treino")) type = "training";
    else if (t.includes("reuniao") || t.includes("staff")) type = "meeting";
    else if (t.includes("limpeza")) type = "social";
    else if (t.includes("aniversario")) type = "social";
    else if (t.includes("entrega") || t.includes("dorsai")) type = "race";

    events.push({
      title: title.substring(0, 100),
      description: (description || "").substring(0, 2000),
      date: startDate.toISOString(),
      endDate: dtendRaw ? parseDate(dtendRaw)?.toISOString() : null,
      location: location?.substring(0, 200) || null,
      type,
      club: "Alverca Urban Runners",
      sourceUid: uid,
    });
  }

  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  return events;
}

// Upload .ics files (single or multiple)
router.post("/import-ics", upload.array("icsFiles", 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado" });
    }

    // Parse all files
    const allEvents = [];
    const fileNames = [];
    for (const file of req.files) {
      const icsContent = file.buffer.toString("utf-8");
      const parsed = parseICS(icsContent);
      allEvents.push(...parsed);
      fileNames.push(file.originalname);
    }

    if (allEvents.length === 0) {
      return res.json({ imported: 0, total: 0, files: fileNames, message: "Nenhum evento encontrado nos ficheiros" });
    }

    // Check existing sourceUids (exact match from ICS UID field)
    const uids = allEvents.map(e => e.sourceUid).filter(Boolean);
    const existingByUid = new Set();
    if (uids.length > 0) {
      const found = await prisma.event.findMany({
        where: { sourceUid: { in: uids } },
        select: { sourceUid: true },
      });
      found.forEach(e => existingByUid.add(e.sourceUid));
    }

    // Check existing by title+date (fallback for events without UID)
    const titleDatePairs = allEvents
      .filter(e => !e.sourceUid)
      .map(e => ({ title: e.title, date: e.date }));
    const existingByTitleDate = new Set();
    if (titleDatePairs.length > 0) {
      // Build OR query for title+date matches
      const orClauses = titleDatePairs.map(td => ({
        title: td.title,
        date: new Date(td.date),
      }));
      // We handle this differently - just check each individually to avoid query limits
      for (const td of titleDatePairs) {
        const existing = await prisma.event.findFirst({
          where: { title: td.title, date: new Date(td.date) },
          select: { id: true },
        });
        if (existing) existingByTitleDate.add(`${td.title}|${td.date}`);
      }
    }

    // Deduplicate
    const seen = new Set();
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const event of allEvents) {
      const key = event.sourceUid || `${event.title}|${event.date}`;
      if (seen.has(key)) { skipped++; continue; } // duplicate within batch
      if (event.sourceUid && existingByUid.has(event.sourceUid)) { skipped++; continue; } // existing in DB by UID
      if (!event.sourceUid && existingByTitleDate.has(key)) { skipped++; continue; } // existing in DB by title+date

      seen.add(key);

      try {
        await prisma.event.create({
          data: {
            title: event.title,
            description: event.description,
            date: event.date,
            endDate: event.endDate,
            location: event.location,
            type: event.type,
            club: event.club,
            sourceUid: event.sourceUid,
          },
        });
        imported++;
      } catch (err) {
        if (err.code === "P2002") { skipped++; }
        else { errors.push(`${event.title}: ${err.message}`); }
      }
    }

    res.json({
      imported,
      skipped,
      total: allEvents.length,
      files: fileNames,
      errors: errors.length ? errors : undefined,
    });
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
      return res.json({ imported: 0, message: "Nenhum evento encontrado" });
    }

    let imported = 0;
    for (const event of parsed) {
      try {
        await prisma.event.create({ data: { ...event, sourceUid: event.sourceUid } });
        imported++;
      } catch { /* skip */ }
    }

    res.json({ imported, total: parsed.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
