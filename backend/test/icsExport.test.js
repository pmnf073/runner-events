import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCalendar } from "../src/services/icsExport.js";

test("builds a valid calendar with escaped, folded lines", () => {
  const ics = buildCalendar([
    {
      id: "rec_abc_2026-10-14",
      title: "Treino, pista; séries",
      date: "2026-10-14T18:00:00.000Z",
      endDate: null,
      location: "Estádio",
      description: "Linha 1\nLinha 2 ".repeat(10),
    },
  ]);
  const lines = ics.split("\r\n");
  assert.equal(lines[0], "BEGIN:VCALENDAR");
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(lines.includes("SUMMARY:Treino\\, pista\; séries"));
  assert.ok(lines.includes("DTSTART:20261014T180000Z"));
  assert.ok(lines.includes("DTEND:20261014T190000Z"));
  for (const line of lines) assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
  // Unfolding restores the description with escaped newlines.
  const unfolded = ics.replace(/\r\n /g, "");
  assert.match(unfolded, /DESCRIPTION:Linha 1\\nLinha 2 Linha 1/);
});

test("exports all-day events (00:00 UTC) as DATE values", () => {
  const ics = buildCalendar([
    { id: "a", title: "Prova", date: "2026-11-15T00:00:00.000Z", endDate: "2026-11-16T00:00:00.000Z" },
    { id: "b", title: "Trail de 3 dias", date: "2027-05-07T00:00:00.000Z", endDate: "2027-05-10T00:00:00.000Z" },
    { id: "c", title: "Sem fim", date: "2026-12-06T00:00:00.000Z", endDate: null },
  ]);
  const lines = ics.split("\r\n");
  assert.ok(lines.includes("DTSTART;VALUE=DATE:20261115"));
  assert.ok(lines.includes("DTEND;VALUE=DATE:20261116"));
  assert.ok(lines.includes("DTSTART;VALUE=DATE:20270507"));
  assert.ok(lines.includes("DTEND;VALUE=DATE:20270510"));
  assert.ok(lines.includes("DTSTART;VALUE=DATE:20261206"));
  assert.ok(lines.includes("DTEND;VALUE=DATE:20261207"));
});
