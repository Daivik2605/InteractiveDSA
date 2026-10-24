import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { recordAnswer, setCustomItemDay, tickItem } from "./actions";
import { curriculum } from "./curriculum";
import { DsaDB } from "./db";
import { itemsForDay } from "./schedule";
import { derivePlan, type Snapshot } from "./plan";
import { learnItemToTick, learnKind } from "./learn";
import { itemLabel } from "./labels";
import { bank, buildBank, patternOf } from "./questions";
import {
  BOX_INTERVAL_DAYS,
  DRILL_OPTIONS,
  mulberry32,
  nextCard,
  patternPool,
  patternStats,
  present,
  scoreByType,
  selectDrill,
  selectReviewQuestions,
  shuffle,
} from "./quiz";
import { buildSchedule, canAttach } from "./schedule";
import type { CardState, CustomItem, DrillPrompt, Question, QuestionFile, QuizAnswer } from "../types/content";

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
const ids = (list: Question[]) => list.map((x) => x.id);
const card = (questionId: string, box: CardState["box"], dueOn: string): CardState => ({ questionId, box, dueOn });
const ans = (questionId: string, correct: boolean, at = "2026-11-01T10:00:00.000Z"): QuizAnswer => ({ questionId, correct, answeredAt: at, mode: "weekly" });

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

describe("review selection", () => {
  const rng = () => mulberry32(3);
  const week = (w: number, n: number) => Array.from({ length: n }, (_, i) => q(`w${w}-q${i + 1}`, w));

  it("puts due cards first, lowest box first, then never-seen, then the rest", () => {
    const questions = [...week(1, 4)];
    const cards = [card("w1-q1", 3, "2026-11-01"), card("w1-q2", 1, "2026-11-01"), card("w1-q3", 2, "2026-11-30")];
    const out = selectReviewQuestions({ questions, currentWeek: 2, cards, answers: [ans("w1-q3", true)], today: "2026-11-05", rng: rng(), count: 4 });
    expect(ids(out)).toEqual(["w1-q2", "w1-q1", "w1-q4", "w1-q3"]); // due (box 1, box 3), unseen, then not-due-but-seen
  });
  it("skips cards that are not due before unseen ones", () => {
    const questions = week(1, 3);
    const out = selectReviewQuestions({ questions, currentWeek: 2, cards: [card("w1-q1", 5, "2027-01-01")], answers: [ans("w1-q1", true)], today: "2026-11-05", rng: rng(), count: 2 });
    expect(ids(out)).not.toContain("w1-q1");
  });
  it("caps questions at 5 per week so older weeks appear", () => {
    const questions = [...week(1, 30), ...week(2, 30), ...week(3, 30)];
    const out = selectReviewQuestions({ questions, currentWeek: 4, cards: [], answers: [], today: "2026-11-05", rng: rng() });
    expect(out).toHaveLength(15);
    for (const w of [1, 2, 3]) expect(out.filter((x) => x.week === w)).toHaveLength(5);
  });
  it("relaxes the cap only when the cap would leave the quiz short", () => {
    const out = selectReviewQuestions({ questions: week(1, 30), currentWeek: 2, cards: [], answers: [], today: "2026-11-05", rng: rng() });
    expect(out).toHaveLength(15);
  });
  it("only draws from earlier weeks", () => {
    const out = selectReviewQuestions({ questions: [...week(1, 5), ...week(2, 5)], currentWeek: 2, cards: [], answers: [], today: "2026-11-05", rng: rng() });
    expect(out.every((x) => x.week === 1)).toBe(true);
  });
  it("week 1 has no earlier weeks: wrong answers first, then random week-1 questions", () => {
    const questions = week(1, 6);
    const out = selectReviewQuestions({
      questions,
      currentWeek: 1,
      cards: [],
      answers: [ans("w1-q4", false), ans("w1-q2", true), ans("w1-q5", false), ans("w1-q5", true, "2026-11-02T10:00:00.000Z")],
      today: "2026-11-05",
      rng: rng(),
      count: 15,
    });
    expect(out).toHaveLength(6);
    expect(ids(out)[0]).toBe("w1-q4"); // latest answer wrong; q5 was later corrected
    expect(new Set(ids(out)).size).toBe(6);
  });
});

describe("pattern drill selection", () => {
  const prompt = (id: string, week: number, answer: string): DrillPrompt => ({ id, week, description: id, answer, distractors: ["D1", "D2", "D3", "D4", "D5"].filter((d) => d !== answer).concat(["D6"]).slice(0, 5) });
  const file: QuestionFile = {
    week: 1,
    questions: [q("w01-q01", 1, { type: "pattern", options: ["Two Pointers", "Sliding Window", "Hash Map", "Binary Search"], answer: 0 }), q("w01-q02", 1)],
    drill: [prompt("w01-dr01", 1, "Greedy"), prompt("w02-dr01", 2, "Heap")],
  };
  const b = buildBank([file]);

  it("pool holds every pattern name", () => {
    expect(patternPool(b)).toEqual(expect.arrayContaining(["Two Pointers", "Greedy", "Heap", "D1", "Binary Search"]));
  });
  it("draws prompts and pattern questions only from weeks up to the current one", () => {
    const items = selectDrill({ bank: b, upToWeek: 1, rng: mulberry32(1), count: 10 });
    expect(items.map((i) => i.id).sort()).toEqual(["w01-dr01", "w01-q01"]);
  });
  it("gives every item six distinct options with the right answer index", () => {
    for (let seed = 0; seed < 10; seed++) {
      for (const item of selectDrill({ bank: b, upToWeek: 2, rng: mulberry32(seed) })) {
        expect(item.options).toHaveLength(DRILL_OPTIONS);
        expect(new Set(item.options).size).toBe(DRILL_OPTIONS);
        expect(item.options[item.answer]).toBe(item.pattern);
      }
    }
  });
  it("limits to the count and never repeats", () => {
    const many = buildBank([{ week: 1, questions: [], drill: Array.from({ length: 20 }, (_, i) => prompt(`w01-dr${String(i + 1).padStart(2, "0")}`, 1, `A${i}`)) }]);
    const items = selectDrill({ bank: many, upToWeek: 1, rng: mulberry32(2) });
    expect(items).toHaveLength(10);
    expect(new Set(items.map((i) => i.id)).size).toBe(10);
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

describe("learn items", () => {
  it("classifies every curriculum learn item", () => {
    const kinds = new Set(curriculum.weeks.flatMap((w) => w.days.map((d) => learnKind(d.learn))));
    expect(kinds).toEqual(new Set(["other", "weekly-quiz", "drill", "review"]));
    expect(learnKind("Weekly quiz (30+ MCQs)")).toBe("weekly-quiz");
    expect(learnKind("Pattern drill (5 min)")).toBe("drill");
    expect(learnKind("Review quiz (15 questions from past weeks, weighted to mistakes)")).toBe("review");
    expect(learnKind("Visuals + Python templates")).toBe("other");
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

describe("learnItemToTick", () => {
  it("picks today's open learn item when its kind matches", async () => {
    const plan = await planAt("2026-10-27"); // week 1 day 2 = weekly quiz
    expect(learnItemToTick(plan, "weekly-quiz", 1)).toEqual({ itemId: "w01-d2:learn", planDayId: "w01-d2" });
    expect(learnItemToTick(plan, "drill")).toBeNull(); // nothing open for it yet
  });
  it("does not tick today's item for another week's weekly quiz", async () => {
    const plan = await planAt("2026-11-03"); // week 2 day 2 = weekly quiz of week 2
    expect(learnItemToTick(plan, "weekly-quiz", 1)?.itemId).toBe("w01-d2:learn"); // oldest missed week-1 quiz, from catch-up
    expect(learnItemToTick(plan, "weekly-quiz", 2)?.itemId).toBe("w02-d2:learn");
  });
  it("prefers today's item, then the oldest matching catch-up item, and never re-ticks a done one", async () => {
    let plan = await planAt("2026-10-30"); // week 1 day 5 = drill; days 3, 4 drills missed
    expect(learnItemToTick(plan, "drill")?.itemId).toBe("w01-d5:learn"); // today's item first
    await tickItem(db, { itemId: "w01-d5:learn", planDayId: "w01-d5" }, "2026-10-30");
    plan = await planAt("2026-10-30");
    expect(learnItemToTick(plan, "drill")?.itemId).toBe("w01-d3:learn");
  });
  it("returns null outside the plan", async () => {
    expect(learnItemToTick(await planAt("2026-10-01"), "drill")).toBeNull();
  });
  it("uses the learn label from the curriculum", async () => {
    const plan = await planAt("2026-10-27");
    const item = itemsForDay(curriculum, "w01-d2").find((i) => i.kind === "learn")!;
    expect(learnKind(itemLabel(plan, item))).toBe("weekly-quiz");
  });
});

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
