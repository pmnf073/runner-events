import { CLUB_NAME, frontendUrl } from "./email.js";

// iCalendar (RFC 5545) output for the personal calendar subscription.

const escapeText = (value) =>
  String(value ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const utcStamp = (value) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Lines longer than 75 octets continue on the next line, starting with a space.
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (Buffer.byteLength(current + char, "utf8") > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildCalendar(events, { name = CLUB_NAME } = {}) {
  const now = utcStamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeText(name)}//Calendario//PT`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:Europe/Lisbon",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ];
  for (const event of events) {
    const start = new Date(event.date);
    const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
    const url = frontendUrl(`/event/${event.id}`);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@runner-events`,
      `DTSTAMP:${now}`,
      `DTSTART:${utcStamp(start)}`,
      `DTEND:${utcStamp(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      `DESCRIPTION:${escapeText([event.description, url].filter(Boolean).join("\n\n"))}`,
      `URL:${url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
