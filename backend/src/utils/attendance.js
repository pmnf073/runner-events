import { zonedParts, zonedTimeToUtc } from "./timezone.js";

// Attendance rules for trainings: when a training is on (for marking attendance), weekly streaks and badges.
// Pure functions (no database), so they can be unit tested. Weeks run Monday to
// Sunday in the club's time zone.

const MINUTE_MS = 60 * 1000;
export const OPENS_BEFORE_MS = 30 * MINUTE_MS;
export const CLOSES_AFTER_MS = 2 * 60 * MINUTE_MS;

// A training is "on" from 30 min before the start until 2 h after it (or the end, if later).
export function trainingWindow(event) {
  const start = new Date(event.date).getTime();
  const end = event.endDate ? new Date(event.endDate).getTime() : start;
  return {
    opensAt: new Date(start - OPENS_BEFORE_MS),
    closesAt: new Date(Math.max(start + CLOSES_AFTER_MS, end)),
  };
}

export function isTrainingOn(event, now = new Date()) {
  const { opensAt, closesAt } = trainingWindow(event);
  return now >= opensAt && now <= closesAt;
}

// "YYYY-MM-DD" of the club-time-zone calendar day.
function dayKey(value) {
  const p = zonedParts(value);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// "YYYY-MM-DD" of the Monday of the week that contains the instant.
export function weekKey(value) {
  const p = zonedParts(value);
  const day = new Date(Date.UTC(p.year, p.month - 1, p.day));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export function monthKey(value) {
  const p = zonedParts(value);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

// [start, end) instants of a "YYYY-MM" month in the club's time zone.
export function monthRange(key) {
  const [year, month] = key.split("-").map(Number);
  return {
    start: zonedTimeToUtc({ year, month, day: 1 }),
    end: zonedTimeToUtc({ year: month === 12 ? year + 1 : year, month: month === 12 ? 1 : month + 1, day: 1 }),
  };
}

// Winters run December to February and are named after the year they end in.
function winterKey(value) {
  const p = zonedParts(value);
  if (p.month === 12) return p.year + 1;
  return p.month <= 2 ? p.year : null;
}

const BADGES = [
  { id: "first", label: "Primeiro treino", description: "Vieste ao teu primeiro treino", stat: "total", goal: 1 },
  { id: "total-10", label: "10 treinos", description: "10 treinos no total", stat: "total", goal: 10 },
  { id: "total-25", label: "25 treinos", description: "25 treinos no total", stat: "total", goal: 25 },
  { id: "total-50", label: "50 treinos", description: "50 treinos no total", stat: "total", goal: 50 },
  { id: "total-100", label: "100 treinos", description: "100 treinos no total", stat: "total", goal: 100 },
  { id: "streak-4", label: "Um mês sem falhar", description: "4 semanas seguidas com treino", stat: "bestStreak", goal: 4 },
  { id: "streak-8", label: "Dois meses sem falhar", description: "8 semanas seguidas com treino", stat: "bestStreak", goal: 8 },
  { id: "streak-12", label: "Três meses sem falhar", description: "12 semanas seguidas com treino", stat: "bestStreak", goal: 12 },
  { id: "full-weeks", label: "Semana completa", description: "Terça e quinta na mesma semana, 10 vezes", stat: "fullWeeks", goal: 10 },
  { id: "winter", label: "Corredor de inverno", description: "8 treinos no mesmo inverno (dezembro a fevereiro)", stat: "bestWinter", goal: 8 },
];

// attended: dates of the trainings the person attended.
// trainings: dates of every training held (not cancelled) since their first attendance;
// weeks with no training (holidays, cancellations) do not break a streak.
export function attendanceStats({ attended, trainings, now = new Date() }) {
  const nowMs = new Date(now).getTime();
  // Marking opens before the start, so a training can count a little before it begins.
  const dates = attended.map((d) => new Date(d)).filter((d) => d.getTime() <= nowMs + OPENS_BEFORE_MS);
  const thisMonth = monthKey(now);
  const thisYear = zonedParts(now).year;
  const currentWeek = weekKey(now);

  const daysByWeek = new Map();
  const winters = new Map();
  for (const date of dates) {
    const week = weekKey(date);
    if (!daysByWeek.has(week)) daysByWeek.set(week, new Set());
    daysByWeek.get(week).add(dayKey(date));
    const winter = winterKey(date);
    if (winter) winters.set(winter, (winters.get(winter) || 0) + 1);
  }

  const trainingWeeks = new Set(daysByWeek.keys());
  for (const date of trainings) {
    if (new Date(date).getTime() <= nowMs) trainingWeeks.add(weekKey(date));
  }

  let run = 0;
  let bestStreak = 0;
  for (const week of [...trainingWeeks].sort()) {
    if (daysByWeek.has(week)) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else if (week !== currentWeek) {
      run = 0; // the current week is still open, so missing it so far does not count
    }
  }

  const stats = {
    total: dates.length,
    thisMonth: dates.filter((d) => monthKey(d) === thisMonth).length,
    thisYear: dates.filter((d) => zonedParts(d).year === thisYear).length,
    currentStreak: run,
    bestStreak,
    trainedThisWeek: daysByWeek.has(currentWeek),
    fullWeeks: [...daysByWeek.values()].filter((days) => days.size >= 2).length,
    bestWinter: Math.max(0, ...winters.values()),
  };

  const badges = BADGES.map(({ stat, ...badge }) => ({
    ...badge,
    progress: Math.min(stats[stat], badge.goal),
    earned: stats[stat] >= badge.goal,
  }));
  const next = badges
    .filter((b) => !b.earned)
    .sort((a, b) => (a.goal - a.progress) - (b.goal - b.progress) || a.goal - b.goal)[0] || null;

  return { ...stats, badges, nextBadge: next ? { ...next, remaining: next.goal - next.progress } : null };
}
