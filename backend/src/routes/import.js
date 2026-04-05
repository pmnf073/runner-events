import express from "express";
import prisma from "../db.js";

const router = express.Router();

async function fetchTeamUpEvents(feedUrl) {
  try {
    const response = await fetch(feedUrl);
    const icalData = await response.text();
    
    const events = [];
    const eventBlocks = icalData.split("BEGIN:VEVENT");
    
    for (const block of eventBlocks.slice(1)) {
      const getField = (field) => {
        const match = block.match(new RegExp(`${field}[:;].*`, "i"));
        return match ? match[0].split(":").slice(1).join(":").trim() : null;
      };
      
      const title = getField("SUMMARY");
      const description = getField("DESCRIPTION");
      const location = getField("LOCATION");
      const dtstart = getField("DTSTART");
      const dtend = getField("DTEND");
      
      if (!title || !dtstart) return null;
      
      const parseDate = (dt) => {
        if (!dt) return null;
        const year = dt.slice(0, 4);
        const month = dt.slice(4, 6);
        const day = dt.slice(6, 8);
        const hour = dt.slice(9, 11) || "00";
        const minute = dt.slice(11, 13) || "00";
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
      };
      
      events.push({
        title,
        description: description || "",
        date: parseDate(dtstart),
        endDate: dtend ? parseDate(dtend) : null,
        location: location || null,
        type: "training",
        club: "Alverca Urban Runners",
      });
    }
    
    return events.filter(Boolean);
  } catch (error) {
    console.error("Error fetching TeamUp events:", error);
    return [];
  }
}

router.post("/import-teamup", async (req, res) => {
  try {
    const { feedUrl } = req.body;
    if (!feedUrl) {
      return res.status(400).json({ error: "feedUrl is required" });
    }
    
    const teamUpEvents = await fetchTeamUpEvents(feedUrl);
    
    if (teamUpEvents.length === 0) {
      return res.json({ imported: 0, message: "No events found in feed" });
    }
    
    let imported = 0;
    for (const event of teamUpEvents) {
      try {
        await prisma.event.create({ data: event });
        imported++;
      } catch (err) {
        console.error(`Error importing event "${event.title}":`, err.message);
      }
    }
    
    res.json({ imported, total: teamUpEvents.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
