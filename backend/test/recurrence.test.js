import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dateKey,
  generateRecurrenceInstances,
  makeVirtualEventId,
  parseVirtualEventId,
} from "../src/utils/recurrence.js";

const lisbonTime = (iso) =>
  new Date(iso).toLocaleTimeString("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" });

const series = (overrides = {}) => ({
  id: "abc",
  title: "Treino",
  // Wednesday 2026-10-14 19:00 in Lisbon (summer time, UTC+1)
  date: new Date("2026-10-14T18:00:00.000Z"),
  endDate: new Date("2026-10-14T19:30:00.000Z"),
  recurrenceType: "weekly",
  recurrenceDaysOfWeek: null,
  recurrenceEndDate: null,
  ...overrides,
});

test("weekly occurrences keep the Lisbon wall-clock time across the DST change", () => {
  const instances = generateRecurrenceInstances(series(), new Date("2026-10-01"), new Date("2026-11-15"));
  assert.deepEqual(instances.map((i) => dateKey(i.date)), ["2026-10-14", "2026-10-21", "2026-10-28", "2026-11-04", "2026-11-11"]);
  for (const instance of instances) {
    assert.equal(lisbonTime(instance.date), "19:00");
    assert.equal(lisbonTime(instance.endDate), "20:30");
  }
  // After 25 October Lisbon is UTC+0, so 19:00 local is 19:00 UTC.
  assert.equal(new Date(instances[2].date).toISOString(), "2026-10-28T19:00:00.000Z");
});

test("biweekly skips every other week", () => {
  const instances = generateRecurrenceInstances(series({ recurrenceType: "biweekly" }), new Date("2026-10-01"), new Date("2026-11-30"));
  assert.deepEqual(instances.map((i) => dateKey(i.date)), ["2026-10-14", "2026-10-28", "2026-11-11", "2026-11-25"]);
});

test("monthly clamps to the last day of shorter months", () => {
  const base = series({ recurrenceType: "monthly", date: new Date("2027-01-31T10:00:00.000Z"), endDate: null });
  const instances = generateRecurrenceInstances(base, new Date("2027-01-01"), new Date("2027-04-30"));
  assert.deepEqual(instances.map((i) => dateKey(i.date)), ["2027-01-31", "2027-02-28", "2027-03-28", "2027-04-28"]);
});

test("several weekdays and an end date", () => {
  const base = series({ recurrenceDaysOfWeek: "[1,3]", recurrenceEndDate: new Date("2026-10-26") });
  const instances = generateRecurrenceInstances(base, new Date("2026-10-01"), new Date("2026-12-31"));
  assert.deepEqual(instances.map((i) => dateKey(i.date)), ["2026-10-14", "2026-10-19", "2026-10-21", "2026-10-26"]);
});

test("cancelled overrides are hidden and edited overrides replace the occurrence", () => {
  const overrides = [
    { id: "o1", recurrenceInstanceDate: new Date("2026-10-21T00:00:00.000Z"), recurrenceStatus: "cancelled", date: new Date("2026-10-21T18:00:00Z") },
    { id: "o2", recurrenceInstanceDate: new Date("2026-10-28T00:00:00.000Z"), recurrenceStatus: "active", title: "Treino especial", date: new Date("2026-10-28T20:00:00Z") },
  ];
  const instances = generateRecurrenceInstances(series(), new Date("2026-10-01"), new Date("2026-10-31"), overrides);
  assert.deepEqual(instances.map((i) => i.id), ["rec_abc_2026-10-14", "o2"]);
  assert.equal(instances[1].title, "Treino especial");
});

test("virtual ids round-trip", () => {
  const id = makeVirtualEventId("abc", new Date("2026-10-14T00:00:00.000Z"));
  assert.equal(id, "rec_abc_2026-10-14");
  const parsed = parseVirtualEventId(id);
  assert.equal(parsed.parentEventId, "abc");
  assert.equal(parsed.occurrenceDate.toISOString(), "2026-10-14T00:00:00.000Z");
  assert.equal(parseVirtualEventId("cmabc123"), null);
});
