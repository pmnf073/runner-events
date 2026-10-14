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

export const MEMBERSHIP_STATUS = { pending: "Por pagar", partial: "Paga em parte", paid: "Paga", exempt: "Isenta", discounted: "Com desconto" };

export function membershipStatusLabel(status) {
  return MEMBERSHIP_STATUS[status] || status;
}
