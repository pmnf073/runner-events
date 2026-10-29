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

// Name split at ":" and " - " (SEO suffixes such as ": Data, Guia e Inscrições",
// the town, or part of the name as in "Sintra Trail – Cruz Alta"), without a
// leading "Prova:".
function nameParts(title) {
  return String(title || "")
    .replace(/ª|º/g, "")
    .replace(/^\s*prova\s*[:–-]\s*/i, "")
    .split(/:|\s[|–-]\s/);
}

function baseName(title) {
  return nameParts(title)[0];
}

function keyOf(text) {
  return [...new Set(words(text).filter((w) => !STOP_WORDS.has(w)))].sort().join(" ");
}

// "6ª Corrida CIMPOR 2026 (10 km)" and "Corrida Cimpor" both give "cimpor corrida":
// accents, case, years, edition numbers (6ª, XXXI), distances, text in brackets
// and filler words are ignored, and the remaining words are sorted.
export function eventNameKey(title) {
  return keyOf(baseName(title));
}

// Keys of the name up to each separator: "Sintra Trail – Cruz Alta 2026 – Guia"
// gives "sintra trail", "alta cruz sintra trail" and "alta cruz guia sintra trail".
function prefixKeys(title) {
  const parts = nameParts(title);
  return parts.map((_, i) => keyOf(parts.slice(0, i + 1).join(" ")));
}

// Words of the name before the first separator, in order and without spaces, so
// "Castelo de Vide Skyrace" and "Castelo de Vide Sky Race" are the same name.
function compactName(title) {
  const list = words(baseName(title)).filter((w) => !STOP_WORDS.has(w));
  return list.length >= 2 ? list.join("") : null;
}

// Two names match when their keys before the first separator are equal (or the
// same letters split into different words), or when the whole of one name equals
// the other up to one of its separators. Keys need at least two words, so a
// single generic word ("Trail", "Corrida") never matches.
export function namesMatch(a, b) {
  const keysA = prefixKeys(a);
  const keysB = prefixKeys(b);
  const compact = compactName(a);
  return compact === compactName(b) && compact !== null || [
    [keysA[0], keysB[0]],
    [keysA.at(-1), keysB],
    [keysB.at(-1), keysA],
  ].some(([key, other]) => key.split(" ").length >= 2 && (Array.isArray(other) ? other.includes(key) : key === other));
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

// Titles, image and edition year of an event page: og:title, the <h1>, og:image
// and the year of the event's date block (data-syr, from the EventON plugin).
// Pages of past editions keep their slug and old poster, and their titles often
// have no year, so data-syr is what tells them apart.
export function readEventPage(html) {
  const ogTitle = metaContent(html, "property", "og:title");
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, "");
  const image = metaContent(html, "property", "og:image") || metaContent(html, "name", "twitter:image");
  const year = /data-syr=["'](\d{4})["']/.exec(html)?.[1];
  return {
    titles: [ogTitle, h1].filter(Boolean).map((t) => decodeEntities(t).trim()),
    image: image ? decodeEntities(image) : null,
    year: year ? Number(year) : null,
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

// Allow/Disallow rules of the "User-agent: *" group, read once a day.
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
    if (applies && (field === "allow" || field === "disallow") && match[2].trim()) {
      rules.push({ allow: field === "allow", path: match[2].trim() });
    }
  }
  return rules;
}

// RFC 9309: "*" matches any characters, "$" ends the pattern, the longest
// matching rule wins and Allow wins a tie.
export function robotsAllows(rules, path) {
  let best = null;
  for (const rule of rules) {
    const anchored = rule.path.endsWith("$");
    const pattern = (anchored ? rule.path.slice(0, -1) : rule.path)
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    if (!new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) best = rule;
  }
  return !best || best.allow;
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
  return robotsAllows(robots.rules, path);
}

async function fetchPage(path) {
  if (!(await allowedByRobots(path))) return null;
  const response = await get(path);
  if (!response?.ok) return null;
  return { ...readEventPage(await response.text()), url: response.url };
}

// The page must name the same race and be the same edition: its date year (or,
// without one, the year in its title) must be the event's year, so an old
// edition's poster is not used.
export function pageMatches(page, title, year) {
  if (!page?.image) return false;
  if (year && page.year && page.year !== year) return false;
  return page.titles.some((t) => namesMatch(t, title) && (!year || page.year || !yearInTitle(t) || yearInTitle(t) === year));
}

// Returns { imageUrl, pageUrl } for the race with this name, or null when no page
// matches reliably. Tries the event page slugs first, then WordPress search.
export async function findPortugalRunningImage(title, date) {
  if (eventNameKey(title).split(" ").length < 2) return null;
  const year = date ? new Date(date).getUTCFullYear() : null;

  for (const slug of slugCandidates(title)) {
    const path = `/eventos/${slug}/`;
    const page = await fetchPage(path);
    if (pageMatches(page, title, year)) return { imageUrl: page.image, pageUrl: page.url };
  }

  // WordPress search needs every word, so a name the site writes differently
  // ("Skyrace" / "Sky Race") is searched again without its last word.
  const terms = words(baseName(title)).filter((w) => !STOP_WORDS.has(w));
  const searches = [terms.join(" ")];
  if (terms.length >= 3) searches.push(terms.slice(0, -1).join(" "));
  const tried = new Set();
  for (const search of searches) {
    const searchPath = `/wp-json/wp/v2/search?per_page=10&search=${encodeURIComponent(search)}`;
    if (!(await allowedByRobots(searchPath))) return null;
    const response = await get(searchPath);
    if (!response?.ok) return null;
    const results = await response.json().catch(() => []);
    if (!Array.isArray(results)) return null;
    for (const result of results) {
      let url;
      try { url = new URL(result.url); } catch { continue; }
      if (url.hostname !== SITE_HOST || !url.pathname.startsWith("/eventos/") || tried.has(url.pathname)) continue;
      tried.add(url.pathname);
      if (!namesMatch(decodeEntities(String(result.title || "")), title)) continue;
      const page = await fetchPage(url.pathname);
      if (pageMatches(page, title, year)) return { imageUrl: page.image, pageUrl: page.url };
    }
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
