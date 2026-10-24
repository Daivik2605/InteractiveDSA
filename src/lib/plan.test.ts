import { describe, expect, it } from "vitest";
import { curriculum } from "./curriculum";
import { currentWeek, derivePlan, type Snapshot } from "./plan";

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  settings: { id: "settings", startDate: "2026-10-26", theme: "system" },
  completions: [],
  extensions: [],
  restDays: [],
  redos: [],
  attempts: [],
  customItems: [],
  moves: [],
  dayLogs: [],
  problemEntries: [],
  ...over,
});

describe("derivePlan", () => {
  it("before the start date", () => {
    const p = derivePlan(curriculum, snap(), "2026-10-20");
    expect(p.phase).toBe("before");
    expect(p.todayDay).toBeNull();
    expect(currentWeek(p)).toBe(1);
    expect(p.stats).toEqual({ missed: 0, partial: 0, catchUpCount: 0 });
  });

  it("during the plan: day number, week, totals, finish", () => {
    const p = derivePlan(curriculum, snap(), "2026-11-03"); // week 2 day 2
    expect(p.phase).toBe("during");
    expect(p.todayDay!.day.planDayId).toBe("w02-d2");
    expect(p.dayNumber).toBe(9);
    expect(p.totalDays).toBe(90);
    expect(p.finish).toBe("2027-01-23");
    expect(p.daysAdded).toBe(0);
    expect(p.stats.missed).toBe(8); // days 1–8 all missed
    expect(p.stats.catchUpCount).toBeGreaterThan(8);
  });

  it("start date two weeks ago shows missed days and a catch-up queue", () => {
    const p = derivePlan(curriculum, snap({ settings: { id: "settings", startDate: "2026-10-12", theme: "system" } }), "2026-10-26");
    expect(p.stats.missed).toBe(14);
    expect(p.catchUp[0]).toMatchObject({ planDayId: "w01-d1", fromDate: "2026-10-12" });
    expect(p.todayDay!.day.planDayId).toBe("w03-d1");
  });

  it("extending Week 1 by 3 days moves Week 2 and the finish date", () => {
    const p = derivePlan(
      curriculum,
      snap({ extensions: [{ id: 1, week: 1, extraDays: 3, createdOn: "2026-10-26" }] }),
      "2026-10-26",
    );
    expect(p.byDate.get("2026-11-05")!.day.planDayId).toBe("w02-d1");
    expect(p.totalDays).toBe(93);
    expect(p.finish).toBe("2027-01-26");
    expect(p.daysAdded).toBe(3);
  });

  it("after the plan", () => {
    const p = derivePlan(curriculum, snap(), "2027-02-01");
    expect(p.phase).toBe("after");
    expect(currentWeek(p)).toBe(13);
  });
});
