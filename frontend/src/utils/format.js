// Shared display/input helpers. Dates are shown and typed as dd/mm/yyyy and sent
// to the API as YYYY-MM-DD.

export function formatCurrency(val) {
  return val != null ? Number(val).toFixed(2) + " €" : "0,00 €";
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// "2026-08-10" or "2026-08-10T00:00:00Z" -> "10/08/2026"
export function displayDateForInput(ymd) {
  if (!ymd) return "";
  const datePart = (ymd || "").split("T")[0];
  if (!datePart) return "";
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return "";
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

// "10/08/2026" -> "2026-08-10"; a value already in yyyy-mm-dd is returned as is.
export function parseInputDateToYMD(input) {
  if (!input) return "";
  if (input.includes("/")) {
    const parts = input.split("/").map((p) => p.trim());
    if (parts.length !== 3) return "";
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return input;
}

// Local calendar day of an instant as "YYYY-MM-DD" (not the UTC day of toISOString).
export function localDateKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// All-day events (e.g. TeamUp events without a time) are stored at 00:00 UTC of
// their day, with the end (when present) at 00:00 UTC of the day after the last.
// The schema has no all-day flag, so they are recognised by that shape.
const isUtcMidnight = (value) => {
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
};

export function isAllDayEvent(event) {
  if (!event?.date || !isUtcMidnight(event.date)) return false;
  return !event.endDate || (isUtcMidnight(event.endDate) && new Date(event.endDate) > new Date(event.date));
}

// First and last day ("YYYY-MM-DD") of an all-day event; the stored end is exclusive.
export function allDayRange(event) {
  const first = new Date(event.date).toISOString().slice(0, 10);
  if (!event.endDate) return { first, last: first };
  const last = new Date(new Date(event.endDate).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { first, last: last < first ? first : last };
}

export const MEMBERSHIP_STATUS = { pending: "Por pagar", partial: "Paga em parte", paid: "Paga", exempt: "Isenta", discounted: "Com desconto" };

export function membershipStatusLabel(status) {
  return MEMBERSHIP_STATUS[status] || status;
}
