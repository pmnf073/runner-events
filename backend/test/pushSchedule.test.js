import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clubTime,
  memberReminderDue,
  newEventNotifications,
  staffReminderDue,
} from "../src/utils/pushSchedule.js";

// 19:30 in Lisbon on 2026-11-10 (winter, UTC+0) and on 2026-06-09 (summer, UTC+1).
const winterTraining = { id: "t1", title: "Treino", date: "2026-11-10T19:30:00Z" };
const summerTraining = { id: "t2", title: "Treino", date: "2026-06-09T18:30:00Z" };

test("member reminder: from 9h on the training day until the start", () => {
  assert.equal(memberReminderDue(winterTraining, new Date("2026-11-10T08:59:00Z")), false);
  assert.equal(memberReminderDue(winterTraining, new Date("2026-11-10T09:00:00Z")), true);
  assert.equal(memberReminderDue(winterTraining, new Date("2026-11-10T19:29:00Z")), true);
  assert.equal(memberReminderDue(winterTraining, new Date("2026-11-10T19:30:00Z")), false);
  assert.equal(memberReminderDue(winterTraining, new Date("2026-11-09T12:00:00Z")), false);
});

test("member reminder uses the Lisbon clock in summer", () => {
  // 08:30 UTC is 09:30 in Lisbon (UTC+1).
  assert.equal(memberReminderDue(summerTraining, new Date("2026-06-09T07:59:00Z")), false);
  assert.equal(memberReminderDue(summerTraining, new Date("2026-06-09T08:00:00Z")), true);
});

test("staff reminder: 15 min before to 1 h after the start", () => {
  assert.equal(staffReminderDue(winterTraining, new Date("2026-11-10T19:14:00Z")), false);
  assert.equal(staffReminderDue(winterTraining, new Date("2026-11-10T19:15:00Z")), true);
  assert.equal(staffReminderDue(winterTraining, new Date("2026-11-10T20:30:00Z")), true);
  assert.equal(staffReminderDue(winterTraining, new Date("2026-11-10T20:31:00Z")), false);
});

test("clubTime shows the Lisbon wall-clock time", () => {
  assert.equal(clubTime(winterTraining.date), "19h30");
  assert.equal(clubTime(summerTraining.date), "19h30");
});

test("new events: one notification each, past events skipped", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const list = newEventNotifications([
    { id: "a", title: "Corrida A", date: "2026-11-20T10:00:00Z", location: "Alverca" },
    { id: "b", title: "Antiga", date: "2026-11-01T10:00:00Z" },
  ], now);
  assert.equal(list.length, 1);
  assert.equal(list[0].title, "Novo evento: Corrida A");
  assert.equal(list[0].body, "20/11 às 10h00 · Alverca");
  assert.equal(list[0].url, "/event/a");
});

test("new events: many at once become one summary", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const events = Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, title: `Prova ${i}`, date: "2026-12-01T10:00:00Z" }));
  const list = newEventNotifications(events, now);
  assert.equal(list.length, 1);
  assert.equal(list[0].title, "5 novos eventos no calendário");
  assert.equal(list[0].url, "/calendar");
});
