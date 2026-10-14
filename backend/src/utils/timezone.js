// The club's events happen in Portugal, so wall-clock times (recurrences, ICS times
// without "Z") are interpreted in this zone, which switches between UTC+0 and UTC+1.
export const CLUB_TIME_ZONE = "Europe/Lisbon";

const formatters = new Map();

function formatterFor(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }));
  }
  return formatters.get(timeZone);
}

// Wall-clock parts of an instant in the given zone (month is 1-12).
export function zonedParts(value, timeZone = CLUB_TIME_ZONE) {
  const parts = {};
  for (const { type, value: v } of formatterFor(timeZone).formatToParts(new Date(value))) {
    if (type !== "literal") parts[type] = Number(v);
  }
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

function offsetMs(instant, timeZone) {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

// The instant at which the zone's clock shows the given wall-clock time.
export function zonedTimeToUtc({ year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0 }, timeZone = CLUB_TIME_ZONE) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let instant = wall - offsetMs(wall, timeZone);
  // Second pass settles times next to a DST change.
  instant = wall - offsetMs(instant, timeZone);
  return new Date(instant);
}
