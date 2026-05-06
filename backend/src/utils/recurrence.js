const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RECURRENCE_DAYS = 365;
const VIRTUAL_PREFIX = "rec";

export function dateKey(value) {
  const d = new Date(value);
  return d.toISOString().slice(0, 10);
}

export function parseVirtualEventId(id) {
  const match = /^rec_(.+)_(\d{4}-\d{2}-\d{2})$/.exec(id) || /^(.+)_(\d{4}-\d{2}-\d{2})$/.exec(id);
  if (!match) return null;
  return {
    parentEventId: match[1],
    occurrenceDate: new Date(`${match[2]}T00:00:00.000Z`),
    occurrenceKey: match[2],
  };
}

export function makeVirtualEventId(parentEventId, occurrenceDate) {
  return `${VIRTUAL_PREFIX}_${parentEventId}_${dateKey(occurrenceDate)}`;
}

export function parseDaysOfWeek(raw, fallbackDate) {
  if (!raw) return [new Date(fallbackDate).getUTCDay()];
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return [...new Set(parsed.map(Number))]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

function utcDateOnly(value) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function withOriginalTime(day, originalDate) {
  const source = new Date(originalDate);
  return new Date(Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds(),
  ));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcWeek(date) {
  const d = utcDateOnly(date);
  const mondayOffset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - mondayOffset);
  return d;
}

function isBiweeklyOccurrence(day, seriesStart) {
  const weekStart = startOfUtcWeek(day);
  const firstWeekStart = startOfUtcWeek(seriesStart);
  const weeks = Math.floor((weekStart - firstWeekStart) / (7 * DAY_MS));
  return weeks >= 0 && weeks % 2 === 0;
}

function addMonthsClamped(date, months) {
  const originalDay = date.getUTCDate();
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(originalDay, lastDay));
  return next;
}

export function recurrenceDefaultEndDate(startDate) {
  return addDays(utcDateOnly(startDate), DEFAULT_RECURRENCE_DAYS);
}

export function eventOccurrenceDate(value) {
  return utcDateOnly(value);
}

export function materializeInstance(baseEvent, occurrenceDate, override = null) {
  if (override) {
    return {
      ...override,
      isRecurrenceInstance: true,
      parentEventId: baseEvent.id,
      recurrenceInstanceDate: override.recurrenceInstanceDate || occurrenceDate,
      recurrenceType: baseEvent.recurrenceType,
      recurrenceDaysOfWeek: baseEvent.recurrenceDaysOfWeek,
      recurrenceEndDate: baseEvent.recurrenceEndDate,
      recurringParent: baseEvent,
    };
  }

  const instanceDate = withOriginalTime(occurrenceDate, baseEvent.date);
  const instance = {
    ...baseEvent,
    id: makeVirtualEventId(baseEvent.id, occurrenceDate),
    date: instanceDate.toISOString(),
    isRecurrenceInstance: true,
    parentEventId: baseEvent.id,
    recurrenceInstanceDate: occurrenceDate.toISOString(),
    recurringParent: baseEvent,
  };

  if (baseEvent.endDate) {
    const duration = new Date(baseEvent.endDate).getTime() - new Date(baseEvent.date).getTime();
    instance.endDate = new Date(instanceDate.getTime() + duration).toISOString();
  }

  return instance;
}

export function generateRecurrenceInstances(baseEvent, rangeStart, rangeEnd, overrides = []) {
  if (!baseEvent.recurrenceType) return [baseEvent];

  const startDay = utcDateOnly(baseEvent.date);
  const from = utcDateOnly(rangeStart);
  const to = utcDateOnly(rangeEnd);
  const recurrenceEnd = baseEvent.recurrenceEndDate
    ? utcDateOnly(baseEvent.recurrenceEndDate)
    : recurrenceDefaultEndDate(baseEvent.date);
  const generationEnd = recurrenceEnd < to ? recurrenceEnd : to;
  const overrideByDay = new Map(overrides.map((event) => [dateKey(event.recurrenceInstanceDate || event.date), event]));
  const instances = [];

  if (baseEvent.recurrenceType === "monthly") {
    let current = startDay;
    while (current <= generationEnd) {
      if (current >= from) {
        const override = overrideByDay.get(dateKey(current));
        if (!override || override.recurrenceStatus !== "cancelled") {
          instances.push(materializeInstance(baseEvent, current, override));
        }
      }
      current = addMonthsClamped(current, 1);
    }
    return instances;
  }

  const daysOfWeek = parseDaysOfWeek(baseEvent.recurrenceDaysOfWeek, baseEvent.date);
  let current = startDay;
  while (current <= generationEnd) {
    const day = current.getUTCDay();
    const rightWeek = baseEvent.recurrenceType !== "biweekly" || isBiweeklyOccurrence(current, startDay);
    if (current >= from && daysOfWeek.includes(day) && rightWeek) {
      const override = overrideByDay.get(dateKey(current));
      if (!override || override.recurrenceStatus !== "cancelled") {
        instances.push(materializeInstance(baseEvent, current, override));
      }
    }
    current = addDays(current, 1);
  }

  return instances;
}

export function validateRecurrencePattern(recurrenceData) {
  const errors = [];

  if (!recurrenceData.recurrenceType) return { isValid: true, errors };

  const validTypes = ["weekly", "biweekly", "monthly"];
  if (!validTypes.includes(recurrenceData.recurrenceType)) {
    errors.push("Tipo de recorrencia invalido");
  }

  if (recurrenceData.recurrenceDaysOfWeek) {
    try {
      const days = parseDaysOfWeek(recurrenceData.recurrenceDaysOfWeek, new Date());
      if (days.length === 0) errors.push("Seleciona pelo menos um dia da semana");
    } catch {
      errors.push("Formato de dias invalido");
    }
  }

  if (recurrenceData.recurrenceEndDate) {
    const endDate = new Date(recurrenceData.recurrenceEndDate);
    if (Number.isNaN(endDate.getTime())) errors.push("Data de fim invalida");
  }

  return { isValid: errors.length === 0, errors };
}
