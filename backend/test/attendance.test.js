import assert from "node:assert/strict";
import { test } from "node:test";
import { attendanceStats, trainingWindow, isTrainingOn, monthRange, weekKey } from "../src/utils/attendance.js";

// Tuesdays and Thursdays at 19:00 in Lisbon (winter time, UTC+0) from 3 Nov 2026.
const training = (day) => new Date(`2026-11-${String(day).padStart(2, "0")}T19:00:00.000Z`);
const season = [3, 5, 10, 12, 17, 19, 24, 26].map(training);

test("a training is on from 30 min before until 2 h after the start", () => {
  const event = { date: "2026-11-03T19:00:00.000Z" };
  const { opensAt, closesAt } = trainingWindow(event);
  assert.equal(opensAt.toISOString(), "2026-11-03T18:30:00.000Z");
  assert.equal(closesAt.toISOString(), "2026-11-03T21:00:00.000Z");
  assert.equal(isTrainingOn(event, new Date("2026-11-03T18:29:00.000Z")), false);
  assert.equal(isTrainingOn(event, new Date("2026-11-03T20:59:00.000Z")), true);
  assert.equal(isTrainingOn(event, new Date("2026-11-03T21:01:00.000Z")), false);
});

test("a training stays on until a late end time", () => {
  const { closesAt } = trainingWindow({ date: "2026-11-03T19:00:00.000Z", endDate: "2026-11-03T22:00:00.000Z" });
  assert.equal(closesAt.toISOString(), "2026-11-03T22:00:00.000Z");
});

test("weeks start on Monday in Lisbon", () => {
  assert.equal(weekKey("2026-11-03T19:00:00.000Z"), "2026-11-02");
  // Sunday 23:30 UTC in summer is already Monday 00:30 in Lisbon.
  assert.equal(weekKey("2026-10-18T23:30:00.000Z"), "2026-10-19");
});

test("monthRange follows Lisbon time across DST", () => {
  const { start, end } = monthRange("2026-10");
  assert.equal(start.toISOString(), "2026-09-30T23:00:00.000Z");
  assert.equal(end.toISOString(), "2026-11-01T00:00:00.000Z");
});

test("one training a week keeps the streak; a missed week resets it", () => {
  const stats = attendanceStats({
    attended: [training(3), training(12), training(17)],
    trainings: season,
    now: new Date("2026-11-30T12:00:00.000Z"),
  });
  // Weeks of 2, 9 and 16 Nov attended, 23 Nov missed (both trainings already held).
  assert.equal(stats.bestStreak, 3);
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.total, 3);
  assert.equal(stats.fullWeeks, 0);
});

test("the current week does not break the streak before it ends", () => {
  const stats = attendanceStats({
    attended: [training(3), training(10), training(17)],
    trainings: season,
    now: new Date("2026-11-24T12:00:00.000Z"),
  });
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.trainedThisWeek, false);
});

test("weeks without any training do not break the streak", () => {
  const stats = attendanceStats({
    attended: [training(3), training(17)],
    trainings: [training(3), training(5), training(17), training(19)], // no trainings in the week of 9 Nov
    now: new Date("2026-11-20T12:00:00.000Z"),
  });
  assert.equal(stats.currentStreak, 2);
});

test("badges: earned, progress and the next one", () => {
  const stats = attendanceStats({ attended: season, trainings: season, now: new Date("2026-11-30T12:00:00.000Z") });
  assert.equal(stats.total, 8);
  assert.equal(stats.fullWeeks, 4);
  assert.equal(stats.bestStreak, 4);
  const byId = Object.fromEntries(stats.badges.map((b) => [b.id, b]));
  assert.equal(byId.first.earned, true);
  assert.equal(byId["streak-4"].earned, true);
  assert.equal(byId["total-10"].earned, false);
  assert.equal(byId["total-10"].progress, 8);
  assert.equal(stats.nextBadge.id, "total-10");
  assert.equal(stats.nextBadge.remaining, 2);
});

test("winter counts December to February as one season", () => {
  const winter = [
    "2026-12-01", "2026-12-03", "2026-12-15", "2027-01-05", "2027-01-07", "2027-01-19", "2027-02-02", "2027-02-04",
  ].map((d) => new Date(`${d}T19:00:00.000Z`));
  const stats = attendanceStats({ attended: winter, trainings: winter, now: new Date("2027-03-01T12:00:00.000Z") });
  assert.equal(stats.bestWinter, 8);
  assert.equal(stats.badges.find((b) => b.id === "winter").earned, true);
});

test("no attendance gives zeros and the first badge as next", () => {
  const stats = attendanceStats({ attended: [], trainings: [], now: new Date("2026-11-30T12:00:00.000Z") });
  assert.equal(stats.total, 0);
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.bestWinter, 0);
  assert.equal(stats.nextBadge.id, "first");
});
