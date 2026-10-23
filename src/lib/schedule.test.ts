import { describe, expect, it } from "vitest";
import realCurriculum from "../../content/curriculum.json";
import type { Curriculum, ItemCompletion, PlanDay, ProblemAttempt, RedoTask, WeekExtension } from "../types/content";
import {
  addExtension,
  buildSchedule,
  canAddRestDay,
  catchUpQueue,
  dayStatus,
  evaluateDays,
  fillSlots,
  finishDate,
  indexCompletions,
  itemsForDay,
  redoDates,
  redosDue,
  removeExtension,
  redoChanges,
  shortenExtension,
  streaks,
  type ScheduleContext,
} from "./schedule";

// ── fixtures ─────────────────────────────────────────────────────────────────
// 3 weeks from Mon 2026-10-26. Week 1 = 10-26..11-01, week 2 = 11-02..11-08, week 3 = 11-09..11-15.
// Days 1–6: learn + one problem. Day 7: learn + two redo slots.

const START = "2026-10-26";

function makeCurriculum(weeks = 3): Curriculum {
  return {
    version: 1,
    defaultStartDate: START,
    weeks: Array.from({ length: weeks }, (_, i) => {
      const w = i + 1;
      const nn = String(w).padStart(2, "0");
      const days = [1, 2, 3, 4, 5, 6, 7].map(
        (day): PlanDay => ({
          day: day as PlanDay["day"],
          learn: `learn ${w}.${day}`,
          codingNote: day === 7 ? "redo" : null,
          problems:
            day === 7
              ? []
              : [
                  {
                    id: `w${nn}-d${day}-p1`,
                    title: `P ${w}.${day}`,
                    difficulty: "Medium",
                    url: "https://leetcode.com/problems/x/",
                    source: "original",
                  },
                ],
        }),
      );
      return { week: w, title: `Week ${w}`, goal: "", concepts: [], visuals: [], templates: [], days, problemCount: 6 };
    }),
  };
}

const curriculum = makeCurriculum();

const dayOf = (itemId: string) => /^(w\d{2}-[dx]\d+)/.exec(itemId)![1]!;
const tick = (itemId: string, completedOn: string): ItemCompletion => ({
  itemId,
  planDayId: dayOf(itemId),
  completedOn,
});
const tickDay = (id: string, completedOn: string, c: Curriculum = curriculum) =>
  itemsForDay(c, id).map((i) => tick(i.itemId, completedOn));

function evaluate(opts: {
  today: string;
  done?: ItemCompletion[];
  rest?: string[];
  extensions?: WeekExtension[];
  c?: Curriculum;
}) {
  const c = opts.c ?? curriculum;
  const completions = indexCompletions(opts.done ?? []);
  const schedule = buildSchedule(c, START, opts.extensions ?? []);
  const days = evaluateDays({
    curriculum: c,
    schedule,
    completions,
    restDates: new Set(opts.rest ?? []),
    today: opts.today,
  });
  return { schedule, days, completions };
}

const statusOn = (days: ReturnType<typeof evaluate>["days"], date: string) =>
  days.find((d) => d.day.date === date)!.status;

function ctx(over: Partial<ScheduleContext> & { today: string }): ScheduleContext {
  return { curriculum, startDate: START, extensions: [], completions: new Map(), ...over };
}

const ext = (id: number, week: number, extraDays: number): WeekExtension => ({
  id,
  week,
  extraDays,
  createdOn: "2026-10-26",
});

// ── schedule ─────────────────────────────────────────────────────────────────

describe("buildSchedule", () => {
  it("dates each plan day consecutively from the start date", () => {
    const s = buildSchedule(curriculum, START);
    expect(s).toHaveLength(21);
    expect(s[0]).toEqual({ planDayId: "w01-d1", week: 1, kind: "plan", date: "2026-10-26" });
    expect(s[6]).toMatchObject({ planDayId: "w01-d7", date: "2026-11-01" });
    expect(s[7]).toMatchObject({ planDayId: "w02-d1", date: "2026-11-02" });
    expect(finishDate(s)).toBe("2026-11-15");
  });

  it("inserts extension days after day 7 and shifts later weeks", () => {
    const s = buildSchedule(curriculum, START, [ext(1, 1, 2)]);
    expect(s).toHaveLength(23);
    expect(s[7]).toEqual({ planDayId: "w01-x1", week: 1, kind: "extension", date: "2026-11-02" });
    expect(s[8]).toMatchObject({ planDayId: "w01-x2", date: "2026-11-03" });
    expect(s[9]).toMatchObject({ planDayId: "w02-d1", date: "2026-11-04" });
    expect(finishDate(s)).toBe("2026-11-17");
  });

  it("sums several extensions of the same week", () => {
    const s = buildSchedule(curriculum, START, [ext(1, 2, 1), ext(2, 2, 2)]);
    expect(s.filter((d) => d.kind === "extension").map((d) => d.planDayId)).toEqual(["w02-x1", "w02-x2", "w02-x3"]);
    expect(finishDate(s)).toBe("2026-11-18");
  });

  it("builds the real curriculum: 13 weeks = 91 days, finishing 2027-01-24", () => {
    const real = realCurriculum as unknown as Curriculum;
    const s = buildSchedule(real, real.defaultStartDate);
    expect(s).toHaveLength(91);
    expect(finishDate(s)).toBe("2027-01-24");
    expect(new Set(s.map((d) => d.planDayId)).size).toBe(91);
    const items = s.flatMap((d) => itemsForDay(real, d.planDayId));
    expect(items.filter((i) => i.kind === "problem")).toHaveLength(161);
    expect(items.filter((i) => i.kind === "learn")).toHaveLength(91);
    expect(items.filter((i) => i.kind === "slot")).toHaveLength(26); // two per day 7
    expect(new Set(items.map((i) => i.itemId)).size).toBe(items.length);
  });
});

describe("itemsForDay", () => {
  it("gives learn + problems, plus two slots on day 7", () => {
    expect(itemsForDay(curriculum, "w01-d1").map((i) => i.itemId)).toEqual(["w01-d1:learn", "w01-d1-p1"]);
    expect(itemsForDay(curriculum, "w01-d7").map((i) => i.itemId)).toEqual([
      "w01-d7:learn",
      "w01-d7:s1",
      "w01-d7:s2",
    ]);
  });

  it("gives extension days two slots", () => {
    expect(itemsForDay(curriculum, "w02-x3").map((i) => [i.itemId, i.kind])).toEqual([
      ["w02-x3:s1", "slot"],
      ["w02-x3:s2", "slot"],
    ]);
  });

  it("rejects unknown ids", () => {
    expect(() => itemsForDay(curriculum, "w09-d1")).toThrow();
    expect(() => itemsForDay(curriculum, "bogus")).toThrow();
  });
});

// ── day status ───────────────────────────────────────────────────────────────

describe("dayStatus", () => {
  const day = { planDayId: "w01-d1", week: 1, kind: "plan" as const, date: "2026-10-26" };
  const items = itemsForDay(curriculum, "w01-d1");
  const status = (today: string, done: ItemCompletion[] = [], rest: string[] = []) =>
    dayStatus({ day, items, completions: indexCompletions(done), restDates: new Set(rest), today });

  it("done: everything ticked on or before the date", () => {
    expect(status("2026-10-30", tickDay("w01-d1", "2026-10-26"))).toBe("done");
    expect(status("2026-10-30", tickDay("w01-d1", "2026-10-24"))).toBe("done"); // ahead of plan
  });

  it("done-late: everything ticked, at least one after the date", () => {
    const done = [tick("w01-d1:learn", "2026-10-26"), tick("w01-d1-p1", "2026-10-28")];
    expect(status("2026-10-30", done)).toBe("done-late");
  });

  it("partial: date passed, some items ticked", () => {
    expect(status("2026-10-30", [tick("w01-d1:learn", "2026-10-26")])).toBe("partial");
  });

  it("missed: date passed, nothing ticked", () => {
    expect(status("2026-10-30")).toBe("missed");
  });

  it("today and upcoming", () => {
    expect(status("2026-10-26")).toBe("today");
    expect(status("2026-10-26", [tick("w01-d1:learn", "2026-10-26")])).toBe("today");
    expect(status("2026-10-25")).toBe("upcoming");
  });

  it("rest: an unfinished rest day; finishing it anyway still shows done", () => {
    expect(status("2026-10-26", [], ["2026-10-26"])).toBe("rest");
    expect(status("2026-10-30", [], ["2026-10-26"])).toBe("rest");
    expect(status("2026-10-26", tickDay("w01-d1", "2026-10-26"), ["2026-10-26"])).toBe("done");
  });

  it("day 7 has a normal status: its two slots must be ticked too", () => {
    const d7 = { planDayId: "w01-d7", week: 1, kind: "plan" as const, date: "2026-11-01" };
    const i7 = itemsForDay(curriculum, "w01-d7");
    const s = (done: ItemCompletion[]) =>
      dayStatus({ day: d7, items: i7, completions: indexCompletions(done), restDates: new Set(), today: "2026-11-05" });
    expect(s([])).toBe("missed");
    expect(s([tick("w01-d7:learn", "2026-11-01")])).toBe("partial");
    expect(s([tick("w01-d7:learn", "2026-11-01"), tick("w01-d7:s1", "2026-11-01")])).toBe("partial");
    expect(s(tickDay("w01-d7", "2026-11-01"))).toBe("done");
    expect(s(tickDay("w01-d7", "2026-11-04"))).toBe("done-late");
  });
});

// ── catch-up queue ───────────────────────────────────────────────────────────

describe("catchUpQueue", () => {
  it("lists unticked past items oldest first with their original date, excluding today", () => {
    const { days, completions } = evaluate({
      today: "2026-10-29",
      done: [...tickDay("w01-d1", "2026-10-26"), tick("w01-d2:learn", "2026-10-27")],
    });
    const q = catchUpQueue(days, completions, "2026-10-29");
    expect(q.map((c) => [c.item.itemId, c.fromDate])).toEqual([
      ["w01-d2-p1", "2026-10-27"],
      ["w01-d3:learn", "2026-10-28"],
      ["w01-d3-p1", "2026-10-28"],
    ]);
  });

  it("includes items from rest days and drops items once ticked late", () => {
    const base = { today: "2026-10-29", rest: ["2026-10-27"] };
    const q1 = evaluate(base);
    expect(catchUpQueue(q1.days, q1.completions, base.today).map((c) => c.item.itemId)).toContain("w01-d2-p1");

    const q2 = evaluate({ ...base, done: [tick("w01-d2-p1", "2026-10-29")] });
    expect(catchUpQueue(q2.days, q2.completions, base.today).map((c) => c.item.itemId)).not.toContain("w01-d2-p1");
  });

  it("never queues slots", () => {
    const { days, completions } = evaluate({ today: "2026-11-10" });
    const q = catchUpQueue(days, completions, "2026-11-10");
    expect(q.some((c) => c.item.kind === "slot")).toBe(false);
    expect(q.some((c) => c.item.itemId === "w01-d7:learn")).toBe(true);
  });
});

// ── streaks ──────────────────────────────────────────────────────────────────

describe("streaks", () => {
  it("counts consecutive done days; an unfinished today does not break the streak", () => {
    const done = ["w01-d1", "w01-d2", "w01-d3", "w01-d4"].flatMap((d, i) =>
      tickDay(d, `2026-10-${26 + i}`),
    );
    const { days } = evaluate({ today: "2026-10-30", done });
    expect(streaks(days, "2026-10-30")).toEqual({ current: 4, longest: 4 });
  });

  it("includes today once it is done", () => {
    const done = ["w01-d1", "w01-d2", "w01-d3"].flatMap((d, i) => tickDay(d, `2026-10-${26 + i}`));
    const { days } = evaluate({ today: "2026-10-28", done });
    expect(streaks(days, "2026-10-28")).toEqual({ current: 3, longest: 3 });
  });

  it("a missed day resets current but not longest", () => {
    const done = [...tickDay("w01-d1", "2026-10-26"), ...tickDay("w01-d2", "2026-10-27"), ...tickDay("w01-d4", "2026-10-29")];
    const { days } = evaluate({ today: "2026-10-30", done });
    expect(streaks(days, "2026-10-30")).toEqual({ current: 1, longest: 2 });
  });

  it("done-late and missed days break a streak", () => {
    const done = [...tickDay("w01-d1", "2026-10-26"), ...tickDay("w01-d2", "2026-10-28"), ...tickDay("w01-d3", "2026-10-28")];
    const { days } = evaluate({ today: "2026-10-29", done });
    expect(statusOn(days, "2026-10-27")).toBe("done-late");
    expect(streaks(days, "2026-10-29")).toEqual({ current: 1, longest: 1 });
  });

  it("a rest day neither counts nor breaks a streak", () => {
    const done = [...tickDay("w01-d1", "2026-10-26"), ...tickDay("w01-d3", "2026-10-28"), ...tickDay("w01-d4", "2026-10-29")];
    const { days } = evaluate({ today: "2026-10-30", done, rest: ["2026-10-27"] });
    expect(statusOn(days, "2026-10-27")).toBe("rest");
    expect(streaks(days, "2026-10-30")).toEqual({ current: 3, longest: 3 });
  });

  it("a rest day next to a missed day does not hide the miss", () => {
    const done = [...tickDay("w01-d1", "2026-10-26"), ...tickDay("w01-d4", "2026-10-29")];
    const { days } = evaluate({ today: "2026-10-30", done, rest: ["2026-10-27"] }); // d3 (10-28) missed
    expect(streaks(days, "2026-10-30")).toEqual({ current: 1, longest: 1 });
  });

  it("a rest day today is skipped", () => {
    const done = [...tickDay("w01-d1", "2026-10-26"), ...tickDay("w01-d2", "2026-10-27")];
    const { days } = evaluate({ today: "2026-10-28", done, rest: ["2026-10-28"] });
    expect(streaks(days, "2026-10-28")).toEqual({ current: 2, longest: 2 });
  });

  it("is zero before the plan starts", () => {
    const { days } = evaluate({ today: "2026-10-20" });
    expect(streaks(days, "2026-10-20")).toEqual({ current: 0, longest: 0 });
  });
});

// ── slots ────────────────────────────────────────────────────────────────────

describe("fillSlots", () => {
  const redo = (problemId: string): RedoTask => ({ problemId, dueOn: "2026-11-01" });

  function setup(today: string) {
    const { days, completions } = evaluate({ today });
    return catchUpQueue(days, completions, today);
  }

  it("day 7: redo queue first, then catch-up (any week)", () => {
    const catchUp = setup("2026-11-10").filter((c) => c.week === 1);
    const day = { planDayId: "w02-d7", week: 2, kind: "plan" as const, date: "2026-11-08" };
    const fills = fillSlots({
      day,
      slots: itemsForDay(curriculum, "w02-d7").filter((i) => i.kind === "slot"),
      redoDue: [redo("w01-d3-p1")],
      catchUp,
    });
    expect(fills).toEqual([
      { slotId: "w02-d7:s1", source: "redo", problemId: "w01-d3-p1" },
      { slotId: "w02-d7:s2", source: "catchup", problemId: "w01-d1-p1" },
    ]);
  });

  it("extension day: this week's catch-up first, ignoring other weeks, then redos, then free", () => {
    const catchUp = setup("2026-11-10"); // weeks 1 and 2 are missed
    const day = { planDayId: "w02-x1", week: 2, kind: "extension" as const, date: "2026-11-09" };
    const slots = itemsForDay(curriculum, "w02-x1");
    const fills = fillSlots({ day, slots, redoDue: [redo("w01-d1-p1")], catchUp });
    expect(fills[0]).toMatchObject({ source: "catchup", problemId: "w02-d1-p1" });

    const onlyOtherWeeks = catchUp.filter((c) => c.week === 1);
    expect(fillSlots({ day, slots, redoDue: [redo("w01-d1-p1")], catchUp: onlyOtherWeeks })).toEqual([
      { slotId: "w02-x1:s1", source: "redo", problemId: "w01-d1-p1" },
      { slotId: "w02-x1:s2", source: "free" },
    ]);
  });

  it("uses each problem at most once", () => {
    const catchUp = setup("2026-10-29").filter((c) => c.item.kind === "problem");
    const day = { planDayId: "w01-d7", week: 1, kind: "plan" as const, date: "2026-11-01" };
    const fills = fillSlots({
      day,
      slots: itemsForDay(curriculum, "w01-d7").filter((i) => i.kind === "slot"),
      redoDue: [redo(catchUp[0]!.item.problem!.id)],
      catchUp: catchUp.slice(0, 1),
    });
    expect(fills.map((f) => f.source)).toEqual(["redo", "free"]);
  });
});

// ── rest days ────────────────────────────────────────────────────────────────

describe("canAddRestDay", () => {
  const schedule = buildSchedule(curriculum, START);

  it("allows one per week", () => {
    expect(canAddRestDay(schedule, new Set(), "2026-10-28").ok).toBe(true);
    expect(canAddRestDay(schedule, new Set(["2026-10-27"]), "2026-10-28").ok).toBe(false);
    expect(canAddRestDay(schedule, new Set(["2026-10-27"]), "2026-10-27").ok).toBe(true); // same day
    expect(canAddRestDay(schedule, new Set(["2026-10-27"]), "2026-11-03").ok).toBe(true); // next week
  });

  it("rejects dates outside the plan", () => {
    expect(canAddRestDay(schedule, new Set(), "2026-12-25")).toMatchObject({ ok: false });
  });
});

// ── redo dates ───────────────────────────────────────────────────────────────

describe("redo scheduling", () => {
  it("applies the SPEC 3.4 rules", () => {
    expect(redoDates("hint", 20, "2026-10-26")).toEqual(["2026-10-29"]);
    expect(redoDates("solution", 20, "2026-10-26")).toEqual(["2026-10-29", "2026-11-02"]);
    expect(redoDates("alone", 41, "2026-10-26")).toEqual(["2026-11-02"]);
    expect(redoDates("alone", 40, "2026-10-26")).toEqual([]);
    expect(redoDates("alone", 10, "2026-10-26")).toEqual([]);
  });

  it("lists due, unfinished redos oldest first", () => {
    const redos: RedoTask[] = [
      { problemId: "b", dueOn: "2026-10-30" },
      { problemId: "a", dueOn: "2026-10-28" },
      { problemId: "c", dueOn: "2026-11-05" },
      { problemId: "d", dueOn: "2026-10-27", doneOn: "2026-10-27" },
    ];
    expect(redosDue(redos, "2026-10-30").map((r) => r.problemId)).toEqual(["a", "b"]);
  });

  it("ignores redos that were closed as completed or attempted", () => {
    const redos: RedoTask[] = [
      { problemId: "a", dueOn: "2026-10-27", attemptedOn: "2026-10-28" },
      { problemId: "b", dueOn: "2026-10-27", doneOn: "2026-10-28" },
    ];
    expect(redosDue(redos, "2026-11-30")).toEqual([]);
  });
});

describe("redoChanges", () => {
  const attempt = (over: Partial<ProblemAttempt>): ProblemAttempt => ({
    problemId: "a",
    date: "2026-10-29",
    outcome: "alone",
    minutes: 20,
    isRedo: true,
    ...over,
  });
  const pending: RedoTask[] = [
    { id: 1, problemId: "a", dueOn: "2026-10-29" },
    { id: 2, problemId: "a", dueOn: "2026-11-02" },
    { id: 3, problemId: "other", dueOn: "2026-10-29" },
  ];
  const ids = (xs: { task: RedoTask }[]) => xs.map((x) => x.task.id);

  it("closes due tasks as completed when re-solved alone, leaving the later one pending", () => {
    const r = redoChanges(pending, attempt({}));
    expect(r.close.map((c) => [c.task.id, c.as])).toEqual([[1, "completed"]]);
    expect(r.create).toEqual([]);
  });

  it("hint/solution on a redo: closes the whole old chain as attempted and starts a new one", () => {
    const hint = redoChanges(pending, attempt({ outcome: "hint" }));
    expect(hint.close.map((c) => [c.task.id, c.as])).toEqual([[1, "attempted"], [2, "attempted"]]);
    expect(hint.create).toEqual([{ problemId: "a", dueOn: "2026-11-01" }]);

    const sol = redoChanges(pending, attempt({ outcome: "solution" }));
    expect(sol.create.map((c) => c.dueOn)).toEqual(["2026-11-01", "2026-11-05"]);
  });

  it("a slow solve alone completes the due task and replaces the rest with a +7d redo", () => {
    const r = redoChanges(pending, attempt({ minutes: 55 }));
    expect(r.close.map((c) => [c.task.id, c.as])).toEqual([[1, "completed"], [2, "attempted"]]);
    expect(r.create).toEqual([{ problemId: "a", dueOn: "2026-11-05" }]);
  });

  it("a non-redo solve alone changes nothing; never touches other problems", () => {
    expect(redoChanges(pending, attempt({ isRedo: false }))).toEqual({ close: [], create: [] });
    expect(ids(redoChanges(pending, attempt({ outcome: "solution" })).close)).not.toContain(3);
  });

  it("a first attempt with a hint just creates redos", () => {
    const r = redoChanges([], attempt({ isRedo: false, outcome: "hint" }));
    expect(r).toEqual({ close: [], create: [{ problemId: "a", dueOn: "2026-11-01" }] });
  });
});

// ── week extensions ──────────────────────────────────────────────────────────

describe("extending weeks", () => {
  it("extends the current week and shifts later weeks", () => {
    const c = ctx({ today: "2026-10-28" });
    const r = addExtension(c, { week: 1, extraDays: 3, reason: "arrays are hard" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extensions).toEqual([
      { id: 1, week: 1, extraDays: 3, reason: "arrays are hard", createdOn: "2026-10-28" },
    ]);
    const s = buildSchedule(curriculum, START, r.extensions);
    expect(s.find((d) => d.planDayId === "w02-d1")!.date).toBe("2026-11-05");
    expect(finishDate(s)).toBe("2026-11-18");
  });

  it("extends a future week", () => {
    const r = addExtension(ctx({ today: "2026-10-28" }), { week: 3, extraDays: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(finishDate(buildSchedule(curriculum, START, r.extensions))).toBe("2026-11-17");
  });

  it("extends an already-passed week when nothing in the following week is ticked", () => {
    // Today is Week 2 Day 2 but the learner is still on Week 1's topic.
    const c = ctx({ today: "2026-11-03", completions: indexCompletions(tickDay("w01-d1", "2026-10-26")) });
    const r = addExtension(c, { week: 1, extraDays: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = buildSchedule(curriculum, START, r.extensions);
    expect(s.find((d) => d.planDayId === "w02-d1")!.date).toBe("2026-11-04");
    expect(s.find((d) => d.planDayId === "w01-x2")!.date).toBe("2026-11-03");
  });

  it("refuses to extend a passed week once the following week has ticked items", () => {
    const c = ctx({ today: "2026-11-03", completions: indexCompletions([tick("w02-d1:learn", "2026-11-02")]) });
    const r = addExtension(c, { week: 1, extraDays: 2 });
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.reason).toMatch(/Week 2/);
  });

  it("still allows extending the current week when the next week has ticks (ahead of plan)", () => {
    const c = ctx({ today: "2026-10-30", completions: indexCompletions([tick("w02-d1:learn", "2026-10-29")]) });
    expect(addExtension(c, { week: 1, extraDays: 1 }).ok).toBe(true);
  });

  it("validates size, cap and week", () => {
    const c = ctx({ today: "2026-10-28" });
    for (const n of [0, 8, 1.5, -1]) expect(addExtension(c, { week: 1, extraDays: n }).ok).toBe(false);
    expect(addExtension(c, { week: 14, extraDays: 1 })).toMatchObject({ ok: false });

    const a = addExtension(c, { week: 1, extraDays: 7 });
    if (!a.ok) throw new Error("expected ok");
    const b = addExtension({ ...c, extensions: a.extensions }, { week: 1, extraDays: 7 });
    if (!b.ok) throw new Error("expected ok");
    expect(b.extensions.map((e) => e.id)).toEqual([1, 2]);
    expect(addExtension({ ...c, extensions: b.extensions }, { week: 1, extraDays: 1 })).toMatchObject({ ok: false });
    expect(addExtension({ ...c, extensions: b.extensions }, { week: 2, extraDays: 1 }).ok).toBe(true);
  });

  it("removes a future extension and pulls later weeks back", () => {
    const c = ctx({ today: "2026-10-28", extensions: [ext(1, 1, 3)] });
    const r = removeExtension(c, 1);
    expect(r).toEqual({ ok: true, extensions: [] });
    expect(finishDate(buildSchedule(curriculum, START, []))).toBe("2026-11-15");
  });

  it("shortens an extension whose tail days haven't arrived", () => {
    // x1 = 11-02, x2 = 11-03, x3 = 11-04
    const extensions = [ext(1, 1, 3)];
    const ok = shortenExtension(ctx({ today: "2026-11-03", extensions }), 1, 2);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.extensions[0]!.extraDays).toBe(2);

    expect(shortenExtension(ctx({ today: "2026-11-04", extensions }), 1, 2)).toMatchObject({ ok: false });
    expect(shortenExtension(ctx({ today: "2026-10-28", extensions }), 1, 3)).toMatchObject({ ok: false });
    expect(shortenExtension(ctx({ today: "2026-10-28", extensions }), 1, 0)).toMatchObject({ ok: false });
    expect(shortenExtension(ctx({ today: "2026-10-28", extensions }), 99, 1)).toMatchObject({ ok: false });
  });

  it("refuses to remove extension days that have arrived", () => {
    const c = ctx({ today: "2026-11-02", extensions: [ext(1, 1, 3)] });
    const r = removeExtension(c, 1);
    expect(r).toMatchObject({ ok: false });
    expect(removeExtension(c, 42)).toMatchObject({ ok: false });
  });

  it("refuses to remove extension days that already have ticked items", () => {
    const c = ctx({
      today: "2026-10-28",
      extensions: [ext(1, 1, 3)],
      completions: indexCompletions([tick("w01-x3:s1", "2026-10-28")]),
    });
    expect(removeExtension(c, 1)).toMatchObject({ ok: false });
  });

  it("never moves completions: items stay done while their day's date shifts", () => {
    const done = tickDay("w03-d1", "2026-11-01"); // done early, scheduled 11-09
    const before = evaluate({ today: "2026-11-04", done });
    expect(before.days.find((d) => d.day.planDayId === "w03-d1")!.day.date).toBe("2026-11-09");

    const r = addExtension(ctx({ today: "2026-11-04", completions: before.completions }), { week: 2, extraDays: 2 });
    if (!r.ok) throw new Error(r.reason);
    const after = evaluate({ today: "2026-11-04", done, extensions: r.extensions });
    const w3d1 = after.days.find((d) => d.day.planDayId === "w03-d1")!;
    expect(w3d1.day.date).toBe("2026-11-11");
    expect(w3d1.status).toBe("done");
  });

  it("keeps missed days counted after an extension", () => {
    const today = "2026-10-30";
    const countMissed = (extensions: WeekExtension[]) =>
      evaluate({ today, extensions }).days.filter((d) => d.status === "missed").length;
    expect(countMissed([])).toBe(4);
    const r = addExtension(ctx({ today }), { week: 1, extraDays: 2 });
    if (!r.ok) throw new Error(r.reason);
    expect(countMissed(r.extensions)).toBe(4);
  });
});
