import { describe, expect, it } from "vitest";
import raw from "../../content/curriculum.json";
import { Curriculum } from "../../scripts/curriculum-schema";

const clone = () => structuredClone(raw) as unknown as { weeks: any[] }; // eslint-disable-line @typescript-eslint/no-explicit-any
const messages = (data: unknown) => {
  const r = Curriculum.safeParse(data);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("curriculum v2 schema", () => {
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

  it("allows a mock exactly on odd plan days, numbered 1–45 in order", () => {
    const c = clone();
    c.weeks[0].days[1].mock = c.weeks[0].days[0].mock; // an even day with a mock
    expect(messages(c).join("\n")).toMatch(/even plan days must not have a mock/);
    const d = clone();
    d.weeks[0].days[2].mock.number = 9;
    expect(messages(d).join("\n")).toMatch(/expected Mock 2, got 9/);
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

  it("a redo day needs a fallback; mock and new-topic days need a learn item", () => {
    const c = clone();
    c.weeks[0].days[6].fallback = null;
    expect(messages(c).join("\n")).toMatch(/redo day needs a fallback/);
    const d = clone();
    d.weeks[1].days[0].learn = null; // Week 2 Day 1: new-topic
    expect(messages(d).join("\n")).toMatch(/mock and new-topic days need a learn item/);
    const e = clone();
    e.weeks[0].days[0].learn = null; // Week 1 Day 1: mock + new-topic
    expect(messages(e).join("\n")).toMatch(/need a learn item/);
  });

  it("checks the per-week counts and mock details", () => {
    const c = clone();
    c.weeks[0].problemCount += 1;
    expect(messages(c).join("\n")).toMatch(/problemCount/);
    const d = clone();
    d.weeks[0].days[0].mock.pythonTheme = 5;
    expect(messages(d).join("\n")).toMatch(/must lead with theme 1/);
  });

  it("every day has something to do except the wrap-up", () => {
    const c = clone();
    c.weeks[0].days[1].problems = [];
    expect(messages(c).join("\n")).toMatch(/needs a learn item or at least one problem/);
  });
});
