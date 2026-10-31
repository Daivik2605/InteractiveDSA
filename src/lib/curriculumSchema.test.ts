import { describe, expect, it } from "vitest";
import raw from "../../content/curriculum.json";
import { Curriculum } from "../../scripts/curriculum-schema";

const clone = () => structuredClone(raw) as unknown as { weeks: any[] }; // eslint-disable-line @typescript-eslint/no-explicit-any
const messages = (data: unknown) => {
  const r = Curriculum.safeParse(data);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("curriculum v3 schema", () => {
  it("accepts the real file", () => {
    expect(messages(raw)).toEqual([]);
  });

  it("requires 90 plan days: Week 13 has 6, others 7", () => {
    const c = clone();
    c.weeks[12].days.push({ ...c.weeks[12].days[5], day: 7, planDay: 91 });
    expect(messages(c).join("\n")).toMatch(/week 13 must have 6 days/);
    const d = clone();
    d.weeks[0].days.pop();
    expect(messages(d).join("\n")).toMatch(/week 1 must have 7 days/);
  });

  it("has no mock on any plan day and a list of 26 numbered in order", () => {
    const real = raw as unknown as { mocks: any[]; weeks: any[] }; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(real.mocks.map((m) => m.number)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
    expect(real.weeks.flatMap((w) => w.days).some((d) => "mock" in d)).toBe(false);
    const c = clone() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    c.mocks[2].number = 9;
    expect(messages(c).join("\n")).toMatch(/expected Mock 3, got 9/);
    const d = clone() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    d.weeks[0].days[0].mock = d.mocks[0];
    expect(messages(d)).not.toEqual([]); // the strict day object rejects a mock
  });

  it("lays the mocks out as the final design says", () => {
    const m = (raw as unknown as { mocks: any[] }).mocks; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(m.map((x) => x.suggestedAfterWeek)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);
    expect(m.slice(0, 15).map((x) => x.pythonTheme)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(m.filter((x) => x.program2).map((x) => x.number)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26]);
    expect(m[0]).toMatchObject({ diagnostic: true, final: false, mcqCount: 18, extra: "debug", pythonTheme: 1 });
    expect(m[1]).toMatchObject({ program2: true, extra: "explain-aloud", pythonTheme: 2 });
    expect(m[25]).toMatchObject({ final: true, mcqCount: 20, program2: true });
    expect(new Set(m.slice(15).map((x) => x.pythonTheme)).size).toBe(11); // the revisits are spread over 11 different themes
  });

  it("checks the mock table", () => {
    const c = clone() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    c.mocks[25].mcqCount = 18;
    c.mocks[3].program2 = false;
    c.mocks[4].pythonTheme = 9;
    expect(messages(c).join("\n")).toMatch(/expected 20 MCQs/);
    expect(messages(c).join("\n")).toMatch(/program2 must be true for even-numbered mocks/);
    expect(messages(c).join("\n")).toMatch(/Mock 5 must lead with theme 5/);
  });

  it("rejects duplicate ids and duplicate URLs anywhere (days, fallbacks, pools)", () => {
    const c = clone();
    c.weeks[1].pool[0].url = c.weeks[0].days[0].problems[0].url;
    expect(messages(c).join("\n")).toMatch(/duplicate problem URL/);
    const d = clone();
    d.weeks[2].pool[0].id = d.weeks[2].pool[1].id;
    expect(messages(d).join("\n")).toMatch(/duplicate problem id/);
  });

  it("old-topic problems need fromWeek earlier than their week", () => {
    const c = clone();
    const p = c.weeks[1].days[3].problems[0];
    p.fromWeek = 2;
    expect(messages(c).join("\n")).toMatch(/fromWeek 2 must be earlier than week 2/);
    delete p.fromWeek;
    expect(messages(c).join("\n")).toMatch(/old-topic problems need fromWeek/);
  });

  it("a redo day needs a fallback; new-topic days need a learn item", () => {
    const c = clone();
    c.weeks[0].days[6].fallback = null;
    expect(messages(c).join("\n")).toMatch(/redo day needs a fallback/);
    const d = clone();
    d.weeks[1].days[0].learn = null; // Week 2 Day 1: new-topic
    expect(messages(d).join("\n")).toMatch(/new-topic days need a learn item/);
  });

  it("checks the per-week counts", () => {
    const c = clone();
    c.weeks[0].problemCount += 1;
    expect(messages(c).join("\n")).toMatch(/problemCount/);
  });

  it("every day from plan day 5 has 2 counted problems and 2 review slots, except the wrap-up; days 1–4 have none", () => {
    const days = (raw as unknown as { weeks: any[] }).weeks.flatMap((w) => w.days); // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const d of days) {
      const reviewDay = d.planDay >= 5 && d.kind !== "wrap-up";
      expect(d.reviewSlots, `plan day ${d.planDay}`).toBe(reviewDay ? 2 : 0);
      if (reviewDay) expect(d.problems.length, `plan day ${d.planDay}`).toBeGreaterThanOrEqual(2);
    }
    const c = clone();
    c.weeks[0].days[4].problems.pop(); // plan day 5
    expect(messages(c).join("\n")).toMatch(/plan day 5 needs at least 2 counted problems/);
    const d = clone();
    d.weeks[0].days[4].reviewSlots = 0;
    expect(messages(d).join("\n")).toMatch(/plan day 5 must have 2 review slots/);
    const e = clone();
    e.weeks[0].days[1].reviewSlots = 2; // plan day 2
    expect(messages(e).join("\n")).toMatch(/plan day 2 must have 0 review slots/);
  });

  it("keeps plan days 1–4 and every earlier id exactly as the learner studied them", () => {
    const week1 = (raw as unknown as { weeks: any[] }).weeks[0].days; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(week1.slice(0, 4).map((d: any) => d.problems.map((p: any) => `${p.id} ${p.title}`))).toEqual([ // eslint-disable-line @typescript-eslint/no-explicit-any
      ["w01-d1-p1 Plus One"],
      ["w01-d2-p1 Merge Sorted Array", "w01-d2-p2 Remove Duplicates from Sorted Array", "w01-d2-p3 Longest Common Prefix"],
      ["w01-d3-p1 Best Time to Buy and Sell Stock"],
      ["w01-d4-p1 Nested Lists", "w01-d4-p2 Find the Runner-Up Score!", "w01-d4-p3 collections.Counter()", "w01-d4-p4 Word Order"],
    ]);
  });

  it("a day problem moved out of an over-long day stays in that week's pool under its own id", () => {
    const wk13 = (raw as unknown as { weeks: any[] }).weeks[12]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(wk13.pool.map((p: any) => p.id)).toContain("w13-d4-p3"); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(wk13.days[3].problems).toHaveLength(2);
    expect(wk13.pool.find((p: any) => p.id === "w13-d4-p3")).toMatchObject({ role: "pool" }); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(wk13.pool.find((p: any) => p.id === "w13-d4-p3").fromWeek).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("every day has something to do except the wrap-up", () => {
    const c = clone();
    c.weeks[0].days[1].problems = [];
    expect(messages(c).join("\n")).toMatch(/needs a learn item or at least one problem/);
  });
});
