import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { getRunCounts } from "@/utils/cronSchedule";

// Wednesday 2026-11-25
const wednesday = DateTime.fromISO("2026-11-25T10:00:00", { zone: "UTC" });
const sunday = DateTime.fromISO("2026-11-29T10:00:00", { zone: "UTC" });
const lastDayOfMonth = DateTime.fromISO("2026-11-30T10:00:00", { zone: "UTC" });

const total = (counts: number[] | null) => (counts ? counts.reduce((sum, count) => sum + count, 0) : null);
const hoursWithRuns = (counts: number[] | null) => (counts ? counts.flatMap((count, hour) => (count ? [hour] : [])) : null);

// Runs per hour, summing the 12 five-minute slots of each hour; null when the cron cannot be read
const hourly = (cron: string, day: DateTime) => {
  const slots = getRunCounts(cron, day);

  return slots ? Array.from({ length: 24 }, (_, hour) => slots.slice(hour * 12, hour * 12 + 12).reduce((sum, count) => sum + count, 0)) : null;
};

describe("getRunCounts in 5-minute slots", () => {
  it("returns 288 slots for a day, 12 for each hour", () => {
    expect(getRunCounts("0 0 8 * * ?", wednesday)).toHaveLength(288);
  });

  it("puts a run in the slot its minute falls in", () => {
    const counts = getRunCounts("0 7 2 * * ?", wednesday) as number[];
    expect(counts.flatMap((count, slot) => (count ? [slot] : []))).toEqual([2 * 12 + 1]);
  });

  it("puts an every-5-minutes job in every slot, once", () => {
    expect(getRunCounts("0 0/5 * * * ?", wednesday)).toEqual(new Array(288).fill(1));
  });

  it("puts an every-minute job in every slot five times", () => {
    expect(getRunCounts("0 * * * * ?", wednesday)).toEqual(new Array(288).fill(5));
  });

  it("puts a job that runs every 15 minutes in every third slot", () => {
    const counts = getRunCounts("0 0/15 * * * ?", wednesday) as number[];
    expect(counts.slice(0, 12)).toEqual([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
  });

  it("counts every second of a minute in its slot", () => {
    const counts = getRunCounts("0/30 3 5 * * ?", wednesday) as number[];
    expect(counts[5 * 12]).toBe(2);
    expect(total(counts)).toBe(2);
  });

  it("puts runs in 15-minute slots, four to an hour", () => {
    const counts = getRunCounts("0 20 2 * * ?", wednesday, 15) as number[];
    expect(counts.flatMap((count, slot) => (count ? [slot] : []))).toEqual([2 * 4 + 1]);
    expect(getRunCounts("0 0/5 * * * ?", wednesday, 15)).toEqual(new Array(96).fill(3));
    expect(getRunCounts("0 0/15 * * * ?", wednesday, 15)).toEqual(new Array(96).fill(1));
  });

  it("supports other slot lengths that divide an hour", () => {
    expect(getRunCounts("0 30 2 * * ?", wednesday, 15)).toHaveLength(96);
    expect(getRunCounts("0 30 2 * * ?", wednesday, 7)).toBeNull();
  });
});

describe("getRunCounts per hour", () => {
  it("counts every run of a job that fires several times an hour", () => {
    const counts = hourly("0 0/5 * * * ?", wednesday);
    expect(counts).toEqual(new Array(24).fill(12));
  });

  it("puts a daily job in its hour only", () => {
    const counts = hourly("0 30 2 * * ?", wednesday);
    expect(hoursWithRuns(counts)).toEqual([2]);
    expect(total(counts)).toBe(1);
  });

  it("reads hour lists, ranges and steps", () => {
    expect(hoursWithRuns(hourly("0 0 6,18 * * ?", wednesday))).toEqual([6, 18]);
    expect(hoursWithRuns(hourly("0 0 9-11 * * ?", wednesday))).toEqual([9, 10, 11]);
    expect(hoursWithRuns(hourly("0 0 0/6 * * ?", wednesday))).toEqual([0, 6, 12, 18]);
    expect(hoursWithRuns(hourly("0 0 */8 * * ?", wednesday))).toEqual([0, 8, 16]);
  });

  it("reads an overnight range that wraps around midnight", () => {
    expect(hoursWithRuns(hourly("0 0 22-2 * * ?", wednesday))).toEqual([0, 1, 2, 22, 23]);
  });

  it("multiplies the seconds and minutes of the schedule", () => {
    expect(hourly("0/30 0,30 5 * * ?", wednesday)?.[5]).toBe(4);
  });

  it("uses Quartz day-of-week numbers, where 1 is Sunday", () => {
    expect(total(hourly("0 0 8 ? * 1", sunday))).toBe(1);
    expect(total(hourly("0 0 8 ? * 1", wednesday))).toBe(0);
    expect(total(hourly("0 0 8 ? * 4", wednesday))).toBe(1);
  });

  it("reads day names and ranges of days", () => {
    expect(total(hourly("0 0 8 ? * MON-FRI", wednesday))).toBe(1);
    expect(total(hourly("0 0 8 ? * MON-FRI", sunday))).toBe(0);
    expect(total(hourly("0 0 8 ? * SAT,SUN", sunday))).toBe(1);
  });

  it("runs a day-of-month job only on that day", () => {
    expect(total(hourly("0 0 1 25 * ?", wednesday))).toBe(1);
    expect(total(hourly("0 0 1 1 * ?", wednesday))).toBe(0);
  });

  it("reads the last day of the month and the last weekday", () => {
    expect(total(hourly("0 0 23 L * ?", lastDayOfMonth))).toBe(1);
    expect(total(hourly("0 0 23 L * ?", wednesday))).toBe(0);
    // 30 November 2026 is a Monday
    expect(total(hourly("0 0 23 LW * ?", lastDayOfMonth))).toBe(1);
    expect(total(hourly("0 0 23 L-5 * ?", wednesday))).toBe(1);
  });

  it("reads the last and the n-th weekday of the month", () => {
    // Wednesday 25 November is the last Wednesday and the 4th Wednesday of 2026-11
    expect(total(hourly("0 0 8 ? * 4L", wednesday))).toBe(1);
    expect(total(hourly("0 0 8 ? * 4#4", wednesday))).toBe(1);
    expect(total(hourly("0 0 8 ? * 4#2", wednesday))).toBe(0);
  });

  it("reads the weekday nearest to a day of the month", () => {
    // 28 November 2026 is a Saturday, so 28W runs on Friday the 27th
    const friday = DateTime.fromISO("2026-11-27T10:00:00", { zone: "UTC" });
    expect(total(hourly("0 0 8 28W * ?", friday))).toBe(1);
    expect(total(hourly("0 0 8 28W * ?", wednesday))).toBe(0);
  });

  it("checks the month and the year", () => {
    expect(total(hourly("0 0 8 * NOV ?", wednesday))).toBe(1);
    expect(total(hourly("0 0 8 * 1-6 ?", wednesday))).toBe(0);
    expect(total(hourly("0 0 8 * * ? 2026", wednesday))).toBe(1);
    expect(total(hourly("0 0 8 * * ? 2027", wednesday))).toBe(0);
  });

  it("reads a standard 5-field cron, where 1 is Monday", () => {
    expect(hoursWithRuns(hourly("15 6,18 * * *", wednesday))).toEqual([6, 18]);
    expect(total(hourly("0 8 * * 1", wednesday))).toBe(0);
    expect(total(hourly("0 8 * * 3", wednesday))).toBe(1);
    expect(total(hourly("0 8 * * 0", sunday))).toBe(1);
    expect(total(hourly("0 8 * * 7", sunday))).toBe(1);
  });

  it("returns null for an expression it cannot read", () => {
    expect(hourly("", wednesday)).toBeNull();
    expect(hourly("every day", wednesday)).toBeNull();
    expect(hourly("0 0 25 * * ?", wednesday)).toBeNull();
    expect(hourly("0 61 * * * ?", wednesday)).toBeNull();
    expect(hourly("0 0 8 ? * FUNDAY", wednesday)).toBeNull();
    expect(hourly("0 0 8 ? * 4#9", wednesday)).toBeNull();
  });
});
