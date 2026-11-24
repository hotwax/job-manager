import { DateTime } from "luxon";

// Reads the cron expression of a service job and tells how many runs it has in each hour of a given day.
// Service job crons are Quartz expressions ("s m h dom mon dow [year]", with "?", "L", "W", "#"); the standard
// 5-field form ("m h dom mon dow") is read too. Only the fields are read, no occurrences are iterated, so the
// result is deterministic and does not depend on the current time.

const MONTH_NAMES: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
const DOW_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type Scheme = "quartz" | "standard";

const isAny = (field: string) => field === "*" || field === "?";

// Expands one field part list ("*", "6-22", "0,12", "*/2", "0/15", "22-2") into the numbers it covers within
// [min, max]. Returns null when the field cannot be read or has a value outside the range.
function expandField(field: string, min: number, max: number): Set<number> | null {
  const out = new Set<number>();

  for(const part of field.split(",")) {
    const [range, stepStr] = part.split("/");
    const step = stepStr === undefined ? 1 : Number(stepStr);
    if(!Number.isInteger(step) || step < 1 || !range) {return null;}

    let lo: number;
    let hi: number;
    if(isAny(range)) {
      lo = min;
      hi = max;
    } else if(range.includes("-")) {
      const [a, b] = range.split("-");
      lo = Number(a);
      hi = Number(b);
    } else {
      lo = Number(range);
      // "a/b" starts at a and goes on to the end of the range
      hi = stepStr === undefined ? lo : max;
    }

    if(!Number.isInteger(lo) || !Number.isInteger(hi) || lo < min || lo > max || hi < min || hi > max) {return null;}

    if(lo <= hi) {
      for(let i = lo; i <= hi; i += step) {out.add(i);}
    } else {
      // Wrap-around range, e.g. hours 22-2
      for(let i = lo; i <= max; i += step) {out.add(i);}
      for(let i = min; i <= hi; i += step) {out.add(i);}
    }
  }

  return out.size ? out : null;
}

const replaceNames = (field: string, names: Record<string, number>) => field.replace(/[A-Z]{3}/g, (name) => (names[name] !== undefined ? String(names[name]) : name));

// Day of month: also Quartz "L" (last day), "L-n", "LW" (last weekday) and "nW" (weekday nearest to n)
function dayOfMonthMatches(field: string, day: DateTime): boolean | null {
  if(isAny(field)) {return true;}
  const dim = day.daysInMonth as number;

  for(const part of field.split(",")) {
    if(part === "L") {
      if(day.day === dim) {return true;}
    } else if(/^L-\d+$/.test(part)) {
      if(day.day === dim - Number(part.slice(2))) {return true;}
    } else if(part === "LW") {
      const last = day.endOf("month");
      const offset = last.weekday === 6 ? 1 : last.weekday === 7 ? 2 : 0;
      if(day.day === last.day - offset) {return true;}
    } else if(/^\d+W$/.test(part)) {
      const target = Number(part.slice(0, -1));
      if(target < 1 || target > 31) {return null;}
      if(target > dim) {continue;}
      const base = day.set({ day: target });
      let nearest = target;
      if(base.weekday === 6) {nearest = target === 1 ? 3 : target - 1;}
      if(base.weekday === 7) {nearest = target === dim ? target - 2 : target + 1;}
      if(day.day === nearest) {return true;}
    } else {
      const values = expandField(part, 1, 31);
      if(!values) {return null;}
      if(values.has(day.day)) {return true;}
    }
  }

  return false;
}

// Day of week: Quartz numbers 1=SUN..7=SAT (also "nL" for the last such weekday and "n#k" for the k-th),
// standard numbers 0/7=SUN..6=SAT
function dayOfWeekMatches(field: string, day: DateTime, scheme: Scheme): boolean | null {
  if(isAny(field)) {return true;}
  const quartzDow = (day.weekday % 7) + 1;

  for(const part of field.split(",")) {
    if(scheme === "quartz" && part === "L") {
      if(quartzDow === 7) {return true;}
    } else if(scheme === "quartz" && /^\d+L$/.test(part)) {
      const target = Number(part.slice(0, -1));
      if(target < 1 || target > 7) {return null;}
      if(quartzDow === target && day.day + 7 > (day.daysInMonth as number)) {return true;}
    } else if(scheme === "quartz" && /^\d+#\d+$/.test(part)) {
      const [target, nth] = part.split("#").map(Number);
      if(target < 1 || target > 7 || nth < 1 || nth > 5) {return null;}
      if(quartzDow === target && Math.ceil(day.day / 7) === nth) {return true;}
    } else if(scheme === "quartz") {
      const values = expandField(part, 1, 7);
      if(!values) {return null;}
      if(values.has(quartzDow)) {return true;}
    } else {
      const values = expandField(part, 0, 7);
      if(!values) {return null;}
      // standard: 0 and 7 are both Sunday
      if(values.has(day.weekday % 7) || (day.weekday === 7 && values.has(7))) {return true;}
    }
  }

  return false;
}

// Number of runs the cron has in each time slot of the given day, in the zone of that DateTime. A slot is
// `slotMinutes` long (it has to divide an hour, 5 by default), and slot number hour * (60 / slotMinutes) + n
// is the n-th slot of that hour. Returns null when the expression cannot be read, so a caller can leave the
// job out instead of guessing.
export function getRunCounts(cronExpression: string, day: DateTime, slotMinutes = 5): number[] | null {
  if(!cronExpression || !day?.isValid || !Number.isInteger(slotMinutes) || slotMinutes < 1 || 60 % slotMinutes !== 0) {return null;}

  const fields = cronExpression.trim().toUpperCase().split(/\s+/);
  if(fields.length < 5 || fields.length > 7) {return null;}

  const scheme: Scheme = fields.length === 5 ? "standard" : "quartz";
  // Standard crons have no seconds, so the run is at the start of the minute
  const [secondField, minuteField, hourField, domField, monthField, dowField, yearField] = scheme === "standard" ? ["0", ...fields] : fields;

  const seconds = expandField(secondField, 0, 59);
  const minutes = expandField(minuteField, 0, 59);
  const hours = expandField(hourField, 0, 23);
  const months = expandField(replaceNames(monthField, MONTH_NAMES), 1, 12);
  const dowNames = Object.fromEntries(DOW_NAMES.map((name, index) => [name, scheme === "quartz" ? index + 1 : index]));
  const dowMatch = dayOfWeekMatches(replaceNames(dowField, dowNames), day, scheme);
  const domMatch = dayOfMonthMatches(domField, day);
  const years = yearField && !isAny(yearField) ? expandField(yearField, 1970, 2199) : new Set([day.year]);

  if(!seconds || !minutes || !hours || !months || !years || domMatch === null || dowMatch === null) {return null;}

  // Standard cron runs on a day matching either field when both are restricted; Quartz needs both to match
  const bothRestricted = !isAny(domField) && !isAny(dowField);
  const dayMatches = scheme === "standard" && bothRestricted ? domMatch || dowMatch : domMatch && dowMatch;

  const slotsPerHour = 60 / slotMinutes;
  const counts = new Array(24 * slotsPerHour).fill(0);
  if(!dayMatches || !months.has(day.month) || !years.has(day.year)) {return counts;}

  hours.forEach((hour) => {
    minutes.forEach((minute) => {
      counts[hour * slotsPerHour + Math.floor(minute / slotMinutes)] += seconds.size;
    });
  });

  return counts;
}
