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
      const lines = block.split(/\r?\n/);
      let value = "";
      let found = false;
      for (const line of lines) {
        if (found && /^[\s\t]/.test(line)) {
          value += line.substring(1);
        } else if (found) {
          break;
        } else if (line.match(new RegExp(`^${field}(?:;[^:]*)?:`, "i"))) {
          found = true;
          const idx = line.indexOf(":");
          value = line.substring(idx + 1);
        }
      }
      if (!value) return null;
      let cleaned = value
        .trim()
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t");
      cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
      cleaned = cleaned.replace(/<hr\s*\/?>/gi, "\n---\n");
      cleaned = cleaned.replace(/<[^>]+>/g, "");
      cleaned = cleaned.replace(/&nbsp;/g, " ");
      cleaned = cleaned.replace(/&amp;/g, "&");
      cleaned = cleaned.replace(/&lt;/g, "<");
      cleaned = cleaned.replace(/&gt;/g, ">");
      cleaned = cleaned.replace(/\*\*/g, "");
      cleaned = cleaned.replace(/\n---\n/g, "\n");
      cleaned = cleaned.replace(/---$/gm, "");
      cleaned = cleaned.replace(/^\s*---\s*$/gm, "");
      cleaned = cleaned.replace(/\n\* /g, "\n- ");
      cleaned = cleaned.replace(/^\s*\* /gm, "- ");
      cleaned = cleaned.replace(/^- /gm, "- ");
      cleaned = cleaned.replace(/^-\s+(.+)$/gm, (match, rest) => {
        return "- " + rest.trim() + "\n";
      });
      return cleaned;
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
      description: description || null,
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
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const event of allEvents) {
      const key = event.sourceUid || `${event.title}|${event.date}`;
      if (seen.has(key)) { skipped++; continue; } // duplicate within batch

      seen.add(key);

      try {
        const where = event.sourceUid 
          ? { sourceUid: event.sourceUid }
          : { title: event.title, date: new Date(event.date) };
        
        const existing = await prisma.event.findFirst({ where, select: { id: true } });
        
        await prisma.event.upsert({
          where,
          create: {
            title: event.title,
            description: event.description,
            date: event.date,
            endDate: event.endDate,
            location: event.location,
            type: event.type,
            club: event.club,
            sourceUid: event.sourceUid,
          },
          update: {
            title: event.title,
            description: event.description,
            endDate: event.endDate,
            location: event.location,
            type: event.type,
          },
        });
        
        if (existing) {
          updated++;
        } else {
          imported++;
        }
      } catch (err) {
        if (err.code === "P2002") { skipped++; }
        else { errors.push(`${event.title}: ${err.message}`); }
      }
    }

    res.json({
      imported,
      updated,
      skipped,
      total: allEvents.length,
      files: fileNames,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import from TeamUp ICS feed
router.post("/import-teamup", async (req, res) => {
  try {
    const feedUrl = req.body.feedUrl || process.env.TEAMUP_ICS_FEED;
    const force = req.body.force === true;
    if (!feedUrl) return res.status(400).json({ error: "feedUrl is required or set TEAMUP_ICS_FEED in env" });

    const response = await fetch(feedUrl);
    if (!response.ok) return res.status(502).json({ error: `Failed to fetch feed: ${response.status}` });
    const icsContent = await response.text();
    const allEvents = parseICS(icsContent);
    if (allEvents.length === 0) {
      return res.json({ imported: 0, updated: 0, skipped: 0, total: 0, message: "Nenhum evento encontrado no feed" });
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const seen = new Set();
    console.log("TeamUp import: force =", force, "total events =", allEvents.length);
    for (const event of allEvents) {
      const key = event.sourceUid || `${event.title}|${event.date}`;
      if (seen.has(key)) { skipped++; continue; }
      seen.add(key);
      try {
        let where;
        let existingId = null;
        
        if (event.sourceUid) {
          const existing = await prisma.event.findFirst({ 
            where: { sourceUid: event.sourceUid }, 
            select: { id: true, description: true } 
          });
          if (existing) {
            where = { id: existing.id };
            existingId = existing.id;
          }
        }
        
        if (!where) {
          const existing = await prisma.event.findFirst({ 
            where: { title: event.title, date: new Date(event.date) }, 
            select: { id: true, description: true } 
          });
          if (existing) {
            where = { id: existing.id };
            existingId = existing.id;
          }
        }
        
        const existingDesc = existingId ? await prisma.event.findUnique({ where: { id: existingId }, select: { description: true } }) : null;
        const shouldUpdate = force || !existingDesc?.description || existingDesc.description.length < (event.description?.length || 0);
        console.log("Event:", event.title, "| existingId:", existingId, "| shouldUpdate:", shouldUpdate, "| desc length:", event.description?.length);
        
        if (where) {
          await prisma.event.update({
            where,
            data: {
              title: event.title,
              description: event.description,
              endDate: event.endDate,
              location: event.location,
              type: event.type,
              sourceUid: event.sourceUid,
            },
          });
          if (shouldUpdate) updated++;
          else skipped++;
        } else {
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
        }
      } catch (err) {
        console.error("Error importing event:", event.title, err);
        if (err.code === "P2002") skipped++;
      }
    }
    console.log("TeamUp import result: imported =", imported, "updated =", updated, "skipped =", skipped);
    res.json({ imported, updated, skipped, total: allEvents.length, source: "TeamUp ICS Feed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
