// "Adicionar ao calendário" for a single event: a Google Calendar link and an
// .ics file (Apple Calendar, Outlook, and most Android calendar apps).

// Events without an end time get this duration.
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

function eventRange(event) {
  const start = new Date(event.date);
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  return { start, end: end > start ? end : new Date(start.getTime() + DEFAULT_DURATION_MS) };
}

// 2026-11-08T09:00:00.000Z -> 20261108T090000Z
function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function descriptionFor(event, pageUrl) {
  return [event.description, pageUrl].filter(Boolean).join("\n\n");
}

export function googleCalendarUrl(event, pageUrl) {
  const { start, end } = eventRange(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "",
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
    details: descriptionFor(event, pageUrl),
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

// RFC 5545 text escaping.
function icsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/[;,]/g, (c) => `\\${c}`);
}

// Lines longer than 75 octets are folded (approximated by characters).
function fold(line) {
  const parts = [];
  for (let i = 0; i < line.length; i += 73) parts.push(line.slice(i, i + 73));
  return parts.join("\r\n ");
}

export function buildEventIcs(event, pageUrl) {
  const { start, end } = eventRange(event);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Alverca Urban Runners//Calendario//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsText(event.id)}@alverca-urban-runners`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${icsText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${icsText(event.location)}`);
  const description = descriptionFor(event, pageUrl);
  if (description) lines.push(`DESCRIPTION:${icsText(description)}`);
  if (pageUrl) lines.push(`URL:${pageUrl}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadEventIcs(event, pageUrl) {
  const blob = new Blob([buildEventIcs(event, pageUrl)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = (event.title || "evento").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  a.href = url;
  a.download = `${safeName || "evento"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
