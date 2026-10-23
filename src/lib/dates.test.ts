import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  compareDates,
  daysInMonth,
  diffDays,
  formatShort,
  isValidDate,
  monthGrid,
  monthLabel,
  parseDate,
  todayLocal,
  weekdayIndex,
} from "./dates";

describe("dates", () => {
  it("validates and parses", () => {
    expect(isValidDate("2026-10-26")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-1-5")).toBe(false);
    expect(parseDate("2026-10-26")).toEqual({ y: 2026, m: 10, d: 26 });
    expect(() => parseDate("nope")).toThrow();
  });

  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-10-26", 1)).toBe("2026-10-27");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2026-10-26", 90)).toBe("2027-01-24");
    expect(addDays("2026-10-26", 0)).toBe("2026-10-26");
  });

  it("diffs exactly across DST changes", () => {
    expect(diffDays("2026-03-07", "2026-03-09")).toBe(2); // US spring forward 8 Mar
    expect(diffDays("2026-10-31", "2026-11-02")).toBe(2); // US fall back 1 Nov
    expect(diffDays("2026-10-26", "2026-10-20")).toBe(-6);
  });

  it("compares and finds weekdays", () => {
    expect(compareDates("2026-10-26", "2026-11-01")).toBe(-1);
    expect(compareDates("2026-10-26", "2026-10-26")).toBe(0);
    expect(weekdayIndex("2026-10-26")).toBe(0); // Monday
    expect(weekdayIndex("2026-11-01")).toBe(6); // Sunday
  });

  it("reads today from local fields, not UTC", () => {
    expect(todayLocal(new Date(2026, 9, 25, 23, 59))).toBe("2026-10-25");
    expect(todayLocal(new Date(2026, 9, 26, 0, 1))).toBe("2026-10-26");
  });

  it("formats and builds month grids", () => {
    expect(formatShort("2026-11-03")).toBe("Tue 3 Nov");
    expect(monthLabel(2026, 11)).toBe("November 2026");
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(addMonths({ y: 2026, m: 12 }, 1)).toEqual({ y: 2027, m: 1 });
    expect(addMonths({ y: 2026, m: 1 }, -1)).toEqual({ y: 2025, m: 12 });
    const grid = monthGrid(2026, 11); // 1 Nov 2026 is a Sunday
    expect(grid[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(grid.every((r) => r.length === 7)).toBe(true);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
  });
});
