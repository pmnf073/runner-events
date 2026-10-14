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
