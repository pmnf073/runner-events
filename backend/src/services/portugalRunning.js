import prisma from "../db.js";

// Looks up race events on portugalrunning.com by name and takes the page's
// og:image. Matching is deliberately strict: the event name and the page title
// must reduce to the same words (see eventNameKey), otherwise nothing is used.

const SITE = "https://www.portugalrunning.com";
const SITE_HOST = "www.portugalrunning.com";
const USER_AGENT = "AlvercaUrbanRunnersBot/1.0 (+https://github.com/pmnf073/runner-events)";
const TIMEOUT_MS = 8000;
const PAUSE_MS = 1000;
const RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000;
// The TeamUp import types most races as "training" (see guessType in ics.js), so
// every type except meetings and social events is tried, minus club trainings.
const SKIPPED_TYPES = ["meeting", "social"];
const SKIPPED_TITLES = /treino|reuni|entrega/i;

const STOP_WORDS = new Set(["de", "do", "da", "dos", "das", "e", "a", "o", "em", "na", "no", "prova", "edicao", "ed"]);
const ROMAN = /^(?=[ivxlc]+$)c{0,3}(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;

function words(title) {
  return String(title || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s?(?:km|k|m)\b/g, " ")
    .replace(/\b\d+\s?(?:a|o|\.a|\.o)?(?=\s|$)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !/^(19|20)\d\d$/.test(w) && !/^\d+$/.test(w) && !(ROMAN.test(w) && w !== "lx"));
}

// Name without a leading "Prova:" and without what follows ":" or " - "
// (SEO suffixes such as ": Data, Guia e Inscrições", or the town).
function baseName(title) {
  return String(title || "")
    .replace(/ª|º/g, "")
    .replace(/^\s*prova\s*[:–-]\s*/i, "")
    .split(/:|\s[|–-]\s/)[0];
}

// "6ª Corrida CIMPOR 2026 (10 km)" and "Corrida Cimpor" both give "cimpor corrida":
// accents, case, years, edition numbers (6ª, XXXI), distances, text in brackets
// and filler words are ignored, and the remaining words are sorted.
export function eventNameKey(title) {
  const base = baseName(title);
  return [...new Set(words(base).filter((w) => !STOP_WORDS.has(w)))].sort().join(" ");
}

// Two names match only when their keys are equal and have at least two words,
// so a single generic word ("Trail", "Corrida") never matches.
export function namesMatch(a, b) {
  const key = eventNameKey(a);
  return key.split(" ").length >= 2 && key === eventNameKey(b);
}

export function yearInTitle(title) {
  const match = /\b(19|20)\d\d\b/.exec(String(title || ""));
  return match ? Number(match[0]) : null;
}

// Event page slugs on the site look like /eventos/corrida-sporting/ or
// /eventos/corrida-porto-de-leixoes/ (without year or edition).
export function slugCandidates(title) {
  const base = baseName(title);
  const all = words(base).filter((w) => w !== "prova");
  const short = all.filter((w) => !STOP_WORDS.has(w));
  return [...new Set([all.join("-"), short.join("-")])].filter((s) => s.includes("-"));
}

function metaContent(html, attr, name) {
  const re1 = new RegExp(`<meta[^>]*${attr}=["']${name}["'][^>]*content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${name}["']`, "i");
  return (html.match(re1) || html.match(re2))?.[1] || null;
}

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

// Titles and image of an event page: og:title, the <h1> and og:image.
export function readEventPage(html) {
  const ogTitle = metaContent(html, "property", "og:title");
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, "");
  const image = metaContent(html, "property", "og:image") || metaContent(html, "name", "twitter:image");
  return {
    titles: [ogTitle, h1].filter(Boolean).map((t) => decodeEntities(t).trim()),
    image: image ? decodeEntities(image) : null,
  };
}

async function get(path) {
  const response = await fetch(`${SITE}${path}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (new URL(response.url).hostname !== SITE_HOST) return null;
  return response;
}

// Disallow rules of the "User-agent: *" group, read once a day.
let robots = { rules: null, at: 0 };

export function parseRobots(text) {
  const rules = [];
  let applies = false;
  let inAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const field = match[1].toLowerCase();
    if (field === "user-agent") {
      if (!inAgents) applies = false;
      inAgents = true;
      if (match[2].trim() === "*") applies = true;
      continue;
    }
    inAgents = false;
    if (applies && field === "disallow" && match[2].trim()) rules.push(match[2].trim());
  }
  return rules;
}

async function allowedByRobots(path) {
  if (!robots.rules || Date.now() - robots.at > ROBOTS_TTL_MS) {
    try {
      const response = await get("/robots.txt");
      robots = { rules: response?.ok ? parseRobots(await response.text()) : [], at: Date.now() };
    } catch {
      return false;
    }
  }
  return !robots.rules.some((rule) => path.startsWith(rule.replace(/\*.*$/, "")));
}

async function fetchPage(path) {
  if (!(await allowedByRobots(path))) return null;
  const response = await get(path);
  if (!response?.ok) return null;
  return readEventPage(await response.text());
}

// The page must name the same race and, when its title has a year, the same year
// as the event (an old edition's poster is not used).
function pageMatches(page, title, year) {
  if (!page?.image) return false;
  return page.titles.some((t) => namesMatch(t, title) && (!year || !yearInTitle(t) || yearInTitle(t) === year));
}

// Returns { imageUrl, pageUrl } for the race with this name, or null when no page
// matches reliably. Tries the event page slugs first, then WordPress search.
export async function findPortugalRunningImage(title, date) {
  if (eventNameKey(title).split(" ").length < 2) return null;
  const year = date ? new Date(date).getUTCFullYear() : null;

  for (const slug of slugCandidates(title)) {
    const path = `/eventos/${slug}/`;
    const page = await fetchPage(path);
    if (pageMatches(page, title, year)) return { imageUrl: page.image, pageUrl: `${SITE}${path}` };
  }

  const searchPath = `/wp-json/wp/v2/search?per_page=10&search=${encodeURIComponent(eventNameKey(title))}`;
  if (!(await allowedByRobots(searchPath))) return null;
  const response = await get(searchPath);
  if (!response?.ok) return null;
  const results = await response.json().catch(() => []);
  if (!Array.isArray(results)) return null;
  for (const result of results) {
    let url;
    try { url = new URL(result.url); } catch { continue; }
    if (url.hostname !== SITE_HOST || !url.pathname.startsWith("/eventos/")) continue;
    if (!namesMatch(decodeEntities(String(result.title || "")), title)) continue;
    const page = await fetchPage(url.pathname);
    if (pageMatches(page, title, year)) return { imageUrl: page.image, pageUrl: `${SITE}${url.pathname}` };
  }
  return null;
}

// Events already looked up without a match in this process, so the hourly sync
// does not ask the site again for a week.
const misses = new Map();
let running = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fills imageUrl (and url, when empty) for upcoming races without an image.
// `limit` caps the lookups per run; `force` ignores earlier misses.
export async function fillMissingImages({ limit = 10, force = false } = {}) {
  const result = { checked: 0, found: 0, events: [] };
  if (running) return { ...result, busy: true };
  running = true;
  try {
    const events = await prisma.event.findMany({
      where: {
        imageUrl: null,
        type: { notIn: SKIPPED_TYPES },
        recurrenceType: null,
        recurrenceStatus: "active",
        date: { gte: new Date() },
      },
      select: { id: true, title: true, date: true, url: true },
      orderBy: { date: "asc" },
      take: 200,
    });
    for (const event of events) {
      if (result.checked >= limit) break;
      if (SKIPPED_TITLES.test(event.title)) continue;
      if (!force && Date.now() - (misses.get(event.id) || 0) < RETRY_AFTER_MS) continue;
      if (result.checked > 0) await sleep(PAUSE_MS);
      result.checked++;
      let found = null;
      try {
        found = await findPortugalRunningImage(event.title, event.date);
      } catch (err) {
        console.error("[Portugal Running]", event.title, err.message);
      }
      if (!found) {
        misses.set(event.id, Date.now());
        continue;
      }
      misses.delete(event.id);
      const data = { imageUrl: found.imageUrl, ...(event.url ? {} : { url: found.pageUrl }) };
      const { count } = await prisma.event.updateMany({ where: { id: event.id, imageUrl: null }, data });
      if (count) {
        result.found++;
        result.events.push({ id: event.id, title: event.title, ...found });
      }
    }
  } finally {
    running = false;
  }
  return result;
}

// Automatic lookups after each TeamUp sync, unless PORTUGAL_RUNNING_IMAGES=false.
export function autoImagesEnabled() {
  return process.env.PORTUGAL_RUNNING_IMAGES !== "false";
}
