import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { recordAnswer, setCustomItemDay } from "./actions";
import { curriculum } from "./curriculum";
import { DsaDB } from "./db";
import { itemsForDay } from "./schedule";
import { derivePlan, type Snapshot } from "./plan";
import { learnKind } from "./learn";
import { bank, patternOf } from "./questions";
import {
  BOX_INTERVAL_DAYS,
  mulberry32,
  nextCard,
  patternStats,
  present,
  scoreByType,
  shuffle,
} from "./quiz";
import { buildSchedule, canAttach } from "./schedule";
import type { CardState, CustomItem, Question, QuizAnswer } from "../types/content";

const q = (id: string, week: number, over: Partial<Question> = {}): Question => ({
  id,
  week,
  type: "concept",
  pattern: "P",
  difficulty: "medium",
  prompt: id,
  options: ["a", "b", "c", "d"],
  answer: 1,
  explanation: "e",
  ...over,
});
const card = (questionId: string, box: CardState["box"], dueOn: string): CardState => ({ questionId, box, dueOn });

describe("shuffle and present", () => {
  it("is a permutation and deterministic for a seed", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], mulberry32(7));
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(shuffle([1, 2, 3, 4, 5, 6], mulberry32(7))).toEqual(a);
  });
  it("keeps the correct option's index right after shuffling", () => {
    for (let seed = 0; seed < 20; seed++) {
      const p = present(q("x", 1), mulberry32(seed));
      expect(p.options[p.answer]).toBe("b");
      expect([...p.options].sort()).toEqual(["a", "b", "c", "d"]);
    }
  });
});

describe("Leitner boxes", () => {
  it("wrong → box 1, due tomorrow", () => {
    expect(nextCard("x", card("x", 4, "2026-11-01"), false, "2026-11-01")).toEqual(card("x", 1, "2026-11-02"));
  });
  it("right → one box up, with the box's interval; new cards start at box 1 → 2 when right", () => {
    expect(nextCard("x", undefined, true, "2026-11-01")).toEqual(card("x", 1, "2026-11-02"));
    expect(nextCard("x", card("x", 1, "d"), true, "2026-11-01")).toEqual(card("x", 2, "2026-11-04"));
    expect(nextCard("x", card("x", 3, "d"), true, "2026-11-01")).toEqual(card("x", 4, "2026-11-15"));
    expect(nextCard("x", card("x", 4, "d"), true, "2026-11-01")).toEqual(card("x", 5, "2026-12-01"));
    expect(nextCard("x", card("x", 5, "d"), true, "2026-11-01").box).toBe(5);
  });
  it("uses intervals 1, 3, 7, 14, 30", () => {
    expect(Object.values(BOX_INTERVAL_DAYS)).toEqual([1, 3, 7, 14, 30]);
  });
});

describe("scoring and stats", () => {
  it("scores by type", () => {
    const s = scoreByType([
      { question: q("a", 1, { type: "pattern" }), correct: true },
      { question: q("b", 1, { type: "pattern" }), correct: false },
      { question: q("c", 1, { type: "bug" }), correct: true },
    ]);
    expect(s).toMatchObject({ total: 3, correct: 2 });
    expect(s.byType.get("pattern")).toEqual({ total: 2, correct: 1 });
  });
  it("computes accuracy and average time per pattern, weakest first", () => {
    const answers: QuizAnswer[] = [
      { questionId: "d1", correct: true, answeredAt: "", mode: "drill", ms: 4000 },
      { questionId: "d2", correct: false, answeredAt: "", mode: "drill", ms: 20000 },
      { questionId: "d3", correct: true, answeredAt: "", mode: "drill", ms: 2000 },
      { questionId: "zz", correct: true, answeredAt: "", mode: "drill", ms: 1 },
    ];
    const stats = patternStats(answers, (id) => ({ d1: "A", d2: "A", d3: "B" })[id]);
    expect(stats).toEqual([
      { pattern: "A", attempts: 2, correct: 1, accuracy: 0.5, avgMs: 12000 },
      { pattern: "B", attempts: 1, correct: 1, accuracy: 1, avgMs: 2000 },
    ]);
  });
});

describe("question bank (real content)", () => {
  it("loads the sample week and resolves patterns for questions and drill prompts", () => {
    expect(bank.questions.length).toBeGreaterThanOrEqual(6);
    expect(patternOf(bank, "w01-q01")).toBe("Two Pointers"); // pattern question → its answer
    expect(patternOf(bank, "w01-q05")).toBe("Array Rotation"); // other types → their pattern field
    expect(patternOf(bank, "w01-dr01")).toBe("Sliding Window");
    expect(patternOf(bank, "nope")).toBeUndefined();
  });
});

describe("learnKind", () => {
  it("is read from the curriculum day, never from label text", () => {
    const kinds = new Set(curriculum.weeks.flatMap((w) => w.days.flatMap((d) => itemsForDay(curriculum, `w${String(w.week).padStart(2, "0")}-d${d.day}`).filter((i) => i.kind === "learn").map((i) => learnKind(i)))));
    expect(kinds).toEqual(new Set(["mock", "new-topic", "other"]));
    expect(learnKind(itemsForDay(curriculum, "w01-d1")[0]!)).toBe("mock"); // a mock beats the new-topic kind
    expect(learnKind(itemsForDay(curriculum, "w02-d1")[0]!)).toBe("new-topic"); // no mock on Week 2 Day 1
    expect(learnKind(itemsForDay(curriculum, "w13-d6")[0]!)).toBe("other"); // wrap-up
    expect(learnKind({ kind: "problem" })).toBe("other");
  });
});

// ── plan-dependent behaviour ─────────────────────────────────────────────────

let db: DsaDB;
let n = 0;
beforeEach(() => void (db = new DsaDB(`quiz-${n++}`)));
afterEach(async () => db.delete());

const START = "2026-10-26";
async function planAt(today: string) {
  const snap: Snapshot = {
    settings: { id: "settings", startDate: START, theme: "system" },
    completions: await db.completions.toArray(),
    extensions: await db.extensions.toArray(),
    restDays: await db.restDays.toArray(),
    redos: await db.redos.toArray(),
    attempts: await db.attempts.toArray(),
    customItems: await db.customItems.toArray(),
    moves: await db.itemMoves.toArray(),
    dayLogs: await db.dayLogs.toArray(),
    problemEntries: await db.problemEntries.toArray(),
  };
  return derivePlan(curriculum, snap, today);
}

describe("recordAnswer", () => {
  it("saves the answer and moves the Leitner card for weekly/review answers", async () => {
    await recordAnswer(db, { questionId: "w01-q01", correct: true, mode: "weekly" }, "2026-10-27T09:00:00.000Z", "2026-10-27");
    expect(await db.quizAnswers.toArray()).toMatchObject([{ questionId: "w01-q01", correct: true, mode: "weekly", answeredAt: "2026-10-27T09:00:00.000Z" }]);
    expect(await db.cards.get("w01-q01")).toEqual({ questionId: "w01-q01", box: 1, dueOn: "2026-10-28" });
    await recordAnswer(db, { questionId: "w01-q01", correct: true, mode: "review" }, "2026-10-28T09:00:00.000Z", "2026-10-28");
    expect((await db.cards.get("w01-q01"))!).toMatchObject({ box: 2, dueOn: "2026-10-31" });
    await recordAnswer(db, { questionId: "w01-q01", correct: false, mode: "review" }, "2026-10-31T09:00:00.000Z", "2026-10-31");
    expect((await db.cards.get("w01-q01"))!).toMatchObject({ box: 1, dueOn: "2026-11-01" });
  });
  it("records drill answers (with time) without touching cards", async () => {
    await recordAnswer(db, { questionId: "w01-dr01", correct: false, mode: "drill", ms: 20000 }, "2026-10-27T09:00:00.000Z", "2026-10-27");
    expect(await db.quizAnswers.toArray()).toMatchObject([{ questionId: "w01-dr01", mode: "drill", ms: 20000 }]);
    expect(await db.cards.count()).toBe(0);
  });
});

describe("attach / detach a custom problem", () => {
  const schedule = buildSchedule(curriculum, START, [{ id: 1, week: 1, extraDays: 1, createdOn: START }]);
  const item: CustomItem = { id: "c-1", week: 1, kind: "problem", title: "Found", createdOn: START };
  const base = { schedule, item, completions: new Map() };

  it("allows a day of the problem's week (extension days included) and detaching", () => {
    expect(canAttach({ ...base, planDayId: "w01-d3" }).ok).toBe(true);
    expect(canAttach({ ...base, planDayId: "w01-x1" }).ok).toBe(true);
    expect(canAttach({ ...base, planDayId: undefined }).ok).toBe(true);
  });
  it("rejects other weeks, unknown days, tasks and ticked problems", () => {
    expect(canAttach({ ...base, planDayId: "w02-d1" }).ok).toBe(false);
    expect(canAttach({ ...base, planDayId: "w99-d1" }).ok).toBe(false);
    expect(canAttach({ ...base, item: { ...item, kind: "task" }, planDayId: "w01-d1" }).ok).toBe(false);
    const ticked = new Map([["c-1", { itemId: "c-1", planDayId: "w01-d1", completedOn: START }]]);
    expect(canAttach({ ...base, completions: ticked, planDayId: "w01-d2" }).ok).toBe(false);
    expect(canAttach({ ...base, completions: ticked, planDayId: undefined }).ok).toBe(false);
  });
  it("the action attaches then detaches, keeping the item", async () => {
    await db.customItems.add(item);
    const sched = schedule;
    expect(await setCustomItemDay(db, { itemId: "c-1", planDayId: "w01-d3", schedule: sched })).toEqual({ ok: true });
    expect((await db.customItems.get("c-1"))!.planDayId).toBe("w01-d3");
    expect((await planAt("2026-10-27")).days[2]!.items.some((i) => i.itemId === "c-1")).toBe(true);
    expect(await setCustomItemDay(db, { itemId: "c-1", planDayId: undefined, schedule: sched })).toEqual({ ok: true });
    const stored = (await db.customItems.get("c-1"))!;
    expect("planDayId" in stored).toBe(false);
    expect((await planAt("2026-10-27")).days.flatMap((d) => d.items).some((i) => i.itemId === "c-1")).toBe(false);
  });
  it("the action refuses a wrong-week day and a ticked problem", async () => {
    await db.customItems.add({ ...item, planDayId: "w01-d1" });
    expect((await setCustomItemDay(db, { itemId: "c-1", planDayId: "w02-d1", schedule })).ok).toBe(false);
    await db.completions.put({ itemId: "c-1", planDayId: "w01-d1", completedOn: START });
    const r = await setCustomItemDay(db, { itemId: "c-1", planDayId: undefined, schedule });
    expect(r.ok).toBe(false);
    expect((await db.customItems.get("c-1"))!.planDayId).toBe("w01-d1");
  });
});
