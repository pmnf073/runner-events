import prisma from "../db.js";
import { CLUB_TIME_ZONE, zonedTimeToUtc } from "../utils/timezone.js";
import { autoImagesEnabled, fillMissingImages } from "./portugalRunning.js";

// ICS (iCalendar) parsing and import, shared by the file upload, the manual
// TeamUp sync and the hourly TeamUp sync.

const CLUB = "Alverca Urban Runners";

// Unfolds continuation lines and returns the properties of one VEVENT block as
// { NAME: { params: { PARAM: value }, value } } (first occurrence wins).
function readProperties(block) {
  const lines = block.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const props = {};
  for (const line of lines) {
    const match = /^([A-Za-z-]+)((?:;[^:]*)?):(.*)$/.exec(line);
    if (!match) continue;
    const name = match[1].toUpperCase();
    if (props[name]) continue;
    const params = {};
    for (const part of match[2].split(";").filter(Boolean)) {
      const [key, ...rest] = part.split("=");
      params[key.toUpperCase()] = rest.join("=").replace(/^"|"$/g, "");
    }
    props[name] = { params, value: match[3] };
  }
  return props;
}

// Turns TeamUp's HTML-ish text into plain text with simple "- " lists.
function cleanText(value) {
  if (!value) return null;
  let raw = value
    .trim()
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
  raw = raw.replace(/&nbsp;/g, " ");
  raw = raw.replace(/&amp;/g, "&");
  raw = raw.replace(/&lt;/g, "<");
  raw = raw.replace(/&gt;/g, ">");
  
  let cleaned = raw.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/<hr\s*\/?>/gi, "\n---\n");
  cleaned = cleaned.replace(/<li>/gi, "\n- ");
  cleaned = cleaned.replace(/<\/li>/gi, "");
  cleaned = cleaned.replace(/<ul>/gi, "");
  cleaned = cleaned.replace(/<\/ul>/gi, "");
  cleaned = cleaned.replace(/<strong>([^<]*?)<\/strong>/gi, "**$1**");
  cleaned = cleaned.replace(/<b>([^<]*?)<\/b>/gi, "**$1**");
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  
  cleaned = cleaned.replace(/-\s*---/g, "");
  cleaned = cleaned.replace(/\n\s*\n+/g, "\n");
  
  const titleContentRegex = /\*\*([^*]+)\*\*(.*?)(?=\*\*|$)/gs;
  const matches = [...cleaned.matchAll(titleContentRegex)];
  
  if (matches.length > 0) {
    const result = matches.map((match) => {
      const title = match[1].trim();
      const content = match[2].trim();
      if (content) {
        const names = content.split("\n").filter((line) => line.trim()).map((line) => line.trim());
        return "- " + title + "\n" + names.join("\n");
      } else {
        return "- " + title;
      }
    });
    return result.join("\n\n");
  }
  
  cleaned = cleaned.replace(/^\s*-\s+/gm, "- ");
  return cleaned;
}

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// DTSTART/DTEND: all-day dates become 00:00 UTC; "Z" times are UTC; times with a
// TZID are in that zone; floating times are in the club's zone.
export function parseICSDate(prop) {
  if (!prop?.value) return null;
  const raw = prop.value.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(raw);
  if (!m) return null;
  const [, year, month, day, hour, minute, second, utc] = m;
  if (hour === undefined) return new Date(Date.UTC(+year, +month - 1, +day));
  if (utc) return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +(second || 0)));
  const tzid = prop.params.TZID;
  const timeZone = tzid && isValidTimeZone(tzid) ? tzid : CLUB_TIME_ZONE;
  return zonedTimeToUtc({ year: +year, month: +month, day: +day, hour: +hour, minute: +minute, second: +(second || 0) }, timeZone);
}

function guessType(title) {
  const t = title.toLowerCase();
  if (t.includes("prova") || t.includes("trail") || t.includes("corsa") || t.includes("sao silvestre") || t.includes("monte gordo") || t.includes("montejunto")) return "race";
  if (t.includes("caminhada")) return "social";
  if (t.includes("treino")) return "training";
  if (t.includes("reuniao") || t.includes("staff")) return "meeting";
  if (t.includes("limpeza") || t.includes("aniversario")) return "social";
  if (t.includes("entrega") || t.includes("dorsai")) return "race";
  return "training";
}

export function parseICS(icsContent) {
  const events = [];
  for (const block of icsContent.split("BEGIN:VEVENT").slice(1)) {
    const props = readProperties(block.split("END:VEVENT")[0]);
    const title = cleanText(props.SUMMARY?.value);
    const date = parseICSDate(props.DTSTART);
    if (!title || !date || Number.isNaN(date.getTime())) continue;
    const endDate = parseICSDate(props.DTEND);

    events.push({
      title: title.substring(0, 100),
      description: cleanText(props.DESCRIPTION?.value),
      date: date.toISOString(),
      endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString() : null,
      location: cleanText(props.LOCATION?.value)?.substring(0, 200) || null,
      type: guessType(title),
      club: CLUB,
      sourceUid: props.UID?.value?.trim() || null,
    });
  }
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  return events;
}

// Creates new events and updates existing ones (matched by UID, or by title and
// date when there is no UID). Fields edited only in the app (image, link,
// distance...) are kept.
export async function importEvents(events) {
  const result = { imported: 0, updated: 0, skipped: 0, total: events.length, errors: [] };
  const seen = new Set();

  for (const event of events) {
    const key = event.sourceUid || `${event.title}|${event.date}`;
    if (seen.has(key)) { result.skipped++; continue; }
    seen.add(key);

    try {
      const existing = await prisma.event.findFirst({
        where: event.sourceUid ? { sourceUid: event.sourceUid } : { title: event.title, date: new Date(event.date) },
        select: { id: true },
      });
      const fields = {
        title: event.title,
        description: event.description,
        date: new Date(event.date),
        endDate: event.endDate ? new Date(event.endDate) : null,
        location: event.location,
        type: event.type,
      };
      if (existing) {
        await prisma.event.update({ where: { id: existing.id }, data: { ...fields, recurrenceStatus: "active" } });
        result.updated++;
      } else {
        await prisma.event.create({ data: { ...fields, club: event.club, sourceUid: event.sourceUid } });
        result.imported++;
      }
    } catch (err) {
      console.error("[ICS import]", event.title, err);
      result.errors.push(event.title);
    }
  }
  return result;
}

// For a full feed: future imported events that are no longer in the feed (within
// the period the feed covers) are marked cancelled, which hides them; if they come
// back to the feed, importEvents reactivates them.
export async function cancelEventsMissingFromFeed(events) {
  const uids = events.map((e) => e.sourceUid).filter(Boolean);
  if (uids.length === 0) return 0;
  const lastDate = new Date(events[events.length - 1].date);
  const { count } = await prisma.event.updateMany({
    where: {
      sourceUid: { not: null, notIn: uids },
      parentEventId: null,
      recurrenceType: null,
      recurrenceStatus: "active",
      date: { gte: new Date(), lte: lastDate },
    },
    data: { recurrenceStatus: "cancelled" },
  });
  return count;
}

// Only TeamUp ICS feeds (or the configured feed) may be fetched by the server.
export function isAllowedFeedUrl(feedUrl) {
  if (feedUrl === process.env.TEAMUP_ICS_FEED) return true;
  try {
    const url = new URL(feedUrl);
    return url.protocol === "https:" && url.hostname === "ics.teamup.com";
  } catch {
    return false;
  }
}

export async function syncFeed(feedUrl) {
  const response = await fetch(feedUrl);
  if (!response.ok) throw new Error(`Feed fetch failed: ${response.status}`);
  const events = parseICS(await response.text());
  const result = await importEvents(events);
  result.cancelled = await cancelEventsMissingFromFeed(events);
  return result;
}

const SYNC_LOG_DAYS = 90;

// Runs syncFeed and records the outcome in SyncLog (source "auto" or "manual"),
// so the import page can show when the last sync ran and whether it failed.
// A failure to write the log never hides the sync result or error.
export async function syncFeedAndLog(feedUrl, source) {
  const startedAt = new Date();
  let result = null;
  let error = null;
  try {
    result = await syncFeed(feedUrl);
  } catch (err) {
    error = err;
  }
  try {
    await prisma.syncLog.create({
      data: {
        source,
        ok: !error,
        imported: result?.imported ?? 0,
        updated: result?.updated ?? 0,
        cancelled: result?.cancelled ?? 0,
        total: result?.total ?? 0,
        error: error ? String(error.message || error).substring(0, 500) : null,
        startedAt,
      },
    });
    await prisma.syncLog.deleteMany({
      where: { finishedAt: { lt: new Date(Date.now() - SYNC_LOG_DAYS * 24 * 60 * 60 * 1000) } },
    });
  } catch (err) {
    console.error("[Sync] Could not write SyncLog:", err.message);
  }
  if (error) throw error;
  // Images for new races are looked up in the background, after the sync.
  if (autoImagesEnabled()) {
    fillMissingImages()
      .then(({ checked, found }) => { if (checked) console.log(`[Portugal Running] checked ${checked}, found ${found}`); })
      .catch((err) => console.error("[Portugal Running]", err.message));
  }
  return result;
}

// Last sync (successful or not) and last successful sync.
export async function getSyncStatus() {
  const [last, lastOk] = await Promise.all([
    prisma.syncLog.findFirst({ orderBy: { finishedAt: "desc" } }),
    prisma.syncLog.findFirst({ where: { ok: true }, orderBy: { finishedAt: "desc" } }),
  ]);
  return { autoSync: Boolean(process.env.TEAMUP_ICS_FEED), last, lastOk };
}
