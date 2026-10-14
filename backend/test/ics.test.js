import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedFeedUrl, parseICS } from "../src/services/ics.js";

const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:one@teamup
SUMMARY:Treino de pista
DTSTART;TZID=Europe/Lisbon:20260415T190000
DTEND;TZID=Europe/Lisbon:20260415T203000
LOCATION:Estádio\\, Alverca
DESCRIPTION:Linha 1<br>Linha muito comprida que continua
  na linha seguinte
END:VEVENT
BEGIN:VEVENT
UID:two@teamup
SUMMARY:Prova de São Silvestre
DTSTART:20261231T180000Z
END:VEVENT
BEGIN:VEVENT
UID:three@teamup
SUMMARY:Caminhada
DTSTART;VALUE=DATE:20261101
END:VEVENT
BEGIN:VEVENT
SUMMARY:Reuniao sem fuso
DTSTART:20260115T210000
END:VEVENT
END:VCALENDAR`;

test("parses TZID, UTC, all-day and floating times", () => {
  const events = parseICS(ics);
  const byUid = Object.fromEntries(events.map((e) => [e.sourceUid || e.title, e]));
  // 19:00 Lisbon summer time = 18:00 UTC
  assert.equal(byUid["one@teamup"].date, "2026-04-15T18:00:00.000Z");
  assert.equal(byUid["one@teamup"].endDate, "2026-04-15T19:30:00.000Z");
  assert.equal(byUid["two@teamup"].date, "2026-12-31T18:00:00.000Z");
  assert.equal(byUid["three@teamup"].date, "2026-11-01T00:00:00.000Z");
  // Floating time is read in Lisbon (winter, UTC+0)
  assert.equal(byUid["Reuniao sem fuso"].date, "2026-01-15T21:00:00.000Z");
});

test("unfolds lines, unescapes text and guesses the type", () => {
  const first = parseICS(ics).find((e) => e.sourceUid === "one@teamup");
  assert.equal(first.location, "Estádio, Alverca");
  assert.equal(first.description, "Linha 1\nLinha muito comprida que continua na linha seguinte");
  assert.equal(first.type, "training");
  const types = Object.fromEntries(parseICS(ics).map((e) => [e.title, e.type]));
  assert.equal(types["Caminhada"], "social");
  assert.equal(types["Reuniao sem fuso"], "meeting");
});

test("only TeamUp feeds are fetched", () => {
  assert.equal(isAllowedFeedUrl("https://ics.teamup.com/feed/abc/0.ics"), true);
  assert.equal(isAllowedFeedUrl("http://ics.teamup.com/feed/abc/0.ics"), false);
  assert.equal(isAllowedFeedUrl("http://169.254.169.254/latest/meta-data"), false);
  assert.equal(isAllowedFeedUrl("not a url"), false);
});
