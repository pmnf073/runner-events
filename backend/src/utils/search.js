import { zonedParts } from "./timezone.js";

// Lower case, without accents and with runs of spaces collapsed, so that
// "Meia Maratona de Lisboa" matches "maratona lisboa" and "São" matches "sao".
export function normalizeSearch(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// An event matches when every word of the query appears in its title,
// location, description or Lisbon date (dd/mm/yyyy), in any order.
export function eventMatchesSearch(event, query) {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const p = zonedParts(event.date);
  const date = `${String(p.day).padStart(2, "0")}/${String(p.month).padStart(2, "0")}/${p.year}`;
  const haystack = normalizeSearch([event.title, event.location, event.description, date].filter(Boolean).join(" "));
  return words.every((w) => haystack.includes(w));
}
