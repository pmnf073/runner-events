// Logs the real error and answers with a generic message, so database details
// never reach the client.
export function serverError(res, err, message = "Erro interno.") {
  console.error(`[${res.req.method} ${res.req.originalUrl}]`, err);
  return res.status(500).json({ error: message });
}

// Allowed values for the string "enum" fields of the Prisma schema.
export const ALLOWED = {
  eventType: ["trail", "urban", "race", "training", "social", "meeting"],
  rsvpStatus: ["going", "maybe", "not_going"],
  userRole: ["admin", "organizer", "member"],
  userStatus: ["pending", "active", "inactive", "banned"],
  memberStatus: ["active", "suspended", "resigned", "excluded"],
  memberPosition: ["direcao", "fiscal", "assembleia"],
  paymentMethod: ["transfer", "cash", "mbway", "card"],
};

export const isAllowed = (field, value) => ALLOWED[field].includes(value);

// Rounds a money value to cents.
export const toCents = (value) => Math.round(Number(value || 0) * 100) / 100;

// Portuguese tax number (NIF): 9 digits with a mod-11 check digit.
export function isValidNif(value) {
  const nif = String(value).trim();
  if (!/^\d{9}$/.test(nif)) return false;
  const sum = [...nif.slice(0, 8)].reduce((acc, digit, i) => acc + Number(digit) * (9 - i), 0);
  const check = 11 - (sum % 11);
  return (check >= 10 ? 0 : check) === Number(nif[8]);
}
