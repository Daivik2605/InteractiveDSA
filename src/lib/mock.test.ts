import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveMockRetake, saveMockSession } from "./actions";
import { DsaDB } from "./db";
import { curriculum } from "./curriculum";
import { derivePlan, type Snapshot } from "./plan";
import { bank } from "./questions";
import { mulberry32 } from "./quiz";
import {
  addTimerMinutes,
  breakdown,
  buildMockRows,
  buildMockRun,
  filterKey,
  findMock,
  freshTimer,
  mcqOfAnswers,
  mockContentStatus,
  nextPhase,
  pauseTimer,
  resumeTimer,
  timerElapsed,
  phasesOf,
  pickProgram1,
  pickProgram2,
  program1Pool,
  sectionOfIndex,
  selectMockQuestions,
} from "./mock";
import { recordAnswer } from "./actions";
import type { CardState, MockAnswer, MockSession, Problem, Question, QuestionType, QuizAnswer } from "../types/content";

const types: Record<string, QuestionType> = { a: "pattern", b: "pattern", c: "output", d: "bug", e: "bug", f: "concept" };
const typeOf = (id: string) => types[id];
const answers: MockAnswer[] = [
  { questionId: "a", picked: 0, correct: true, section: "theme" },
  { questionId: "b", picked: 1, correct: false, section: "theme" },
  { questionId: "c", picked: 2, correct: true, section: "current" },
  { questionId: "d", picked: 3, correct: false, section: "current" },
  { questionId: "e", picked: 0, correct: true, section: "review" },
  { questionId: "f", picked: 1, correct: true, section: "review" },
];

describe("breakdown", () => {
  it("adds up: the type buckets and the section buckets each sum to the total", () => {
    const b = breakdown(answers, typeOf);
    expect(b).toMatchObject({ total: 6, correct: 4, percent: 67 });
    for (const buckets of [b.byType, b.bySection]) {
      expect(buckets.reduce((n, x) => n + x.total, 0)).toBe(b.total);
      expect(buckets.reduce((n, x) => n + x.correct, 0)).toBe(b.correct);
    }
    expect(b.byType).toEqual([
      { key: "pattern", total: 2, correct: 1 },
      { key: "output", total: 1, correct: 1 },
      { key: "bug", total: 2, correct: 1 },
      { key: "concept", total: 1, correct: 1 },
    ]);
    expect(b.bySection.map((x) => x.key)).toEqual(["theme", "current", "review"]);
  });

  it("handles no answers and answers without a section", () => {
    expect(breakdown([], typeOf)).toMatchObject({ total: 0, percent: 0, byType: [], bySection: [] });
    expect(breakdown([{ questionId: "a", picked: 0, correct: true }], typeOf).bySection).toEqual([]);
  });

  it("builds the stored summary shape", () => {
    expect(mcqOfAnswers(answers, typeOf)).toEqual({
      total: 6,
      correct: 4,
      byType: { pattern: { total: 2, correct: 1 }, output: { total: 1, correct: 1 }, bug: { total: 2, correct: 1 }, concept: { total: 1, correct: 1 } },
    });
  });

  it("maps a position to its section: theme, then current, then review", () => {
    const g = { theme: 7, current: 6, review: 5 };
    expect([0, 6, 7, 12, 13, 17].map((i) => sectionOfIndex(i, g))).toEqual(["theme", "theme", "current", "current", "review", "review"]);
  });
});

describe("answer key filter", () => {
  it("keeps all, only wrong or only right answers, in order", () => {
    const ids = (f: "all" | "wrong" | "right") => filterKey(answers, f).map((a) => a.questionId).join("");
    expect(ids("all")).toBe("abcdef");
    expect(ids("wrong")).toBe("bd");
    expect(ids("right")).toBe("acef");
  });
});

describe("retakes leave the official result alone", () => {
  let db: DsaDB;
  let n = 0;
  beforeEach(() => void (db = new DsaDB(`mockretake-${n++}`)));
  afterEach(async () => db.delete());

  const session: MockSession = {
    mockNumber: 1,
    date: "2026-10-26",
    diagnostic: true,
    mcq: mcqOfAnswers(answers, typeOf),
    questionIds: answers.map((a) => a.questionId),
    answers,
    programs: [],
    extra: { kind: "debug", done: true },
    rating: 3,
  };

  it("writes only to mockRetakes, numbering retakes from 1", async () => {
    await saveMockSession(db, session, { itemId: "w01-d1:learn", planDayId: "w01-d1" });
    await db.cards.put({ questionId: "a", box: 2, dueOn: "2026-10-29" });
    const before = { mocks: await db.mocks.toArray(), completions: await db.completions.toArray(), cards: await db.cards.toArray(), answers: await db.quizAnswers.toArray(), attempts: await db.attempts.toArray(), redos: await db.redos.toArray() };

    const retake = { mockNumber: 1, date: "2026-10-27", mcq: mcqOfAnswers(answers.map((a) => ({ ...a, correct: true })), typeOf), answers: answers.map((a) => ({ ...a, correct: true })) };
    await saveMockRetake(db, retake);
    await saveMockRetake(db, { ...retake, date: "2026-10-28" });

    expect((await db.mockRetakes.toArray()).map((r) => r.retakeNumber)).toEqual([1, 2]);
    expect({ mocks: await db.mocks.toArray(), completions: await db.completions.toArray(), cards: await db.cards.toArray(), answers: await db.quizAnswers.toArray(), attempts: await db.attempts.toArray(), redos: await db.redos.toArray() }).toEqual(before);
    expect((await db.mocks.toArray())[0]!.mcq.correct).toBe(4);
  });
});

// ── question picker ──────────────────────────────────────────────────────────

const mk = (id: string, week: number, theme?: number): Question => ({
  id, week, ...(theme ? { theme } : {}), type: "concept", pattern: "P", difficulty: "medium", prompt: id, options: ["a", "b", "c", "d"], answer: 0, explanation: "e",
});
const many = (prefix: string, week: number, n: number, theme?: number) => Array.from({ length: n }, (_, i) => mk(`${prefix}${String(i + 1).padStart(2, "0")}`, week, theme));
const bankQs = [
  ...many("t1-", 1, 10, 1), ...many("t2-", 1, 10, 2),
  ...many("w1-", 1, 12), ...many("w2-", 2, 12), ...many("w3-", 3, 12), ...many("w4-", 4, 12),
];
const card = (questionId: string, box: CardState["box"], dueOn: string): CardState => ({ questionId, box, dueOn });
const pick = (over: Partial<Parameters<typeof selectMockQuestions>[0]> = {}) =>
  selectMockQuestions({ questions: bankQs, mock: { pythonTheme: 1, mcqCount: 18 }, week: 4, cards: [], answers: [], today: "2026-11-20", rng: mulberry32(5), ...over });
const weekOfId = (id: string) => bankQs.find((q) => q.id === id)!.week;

describe("selectMockQuestions", () => {
  it("asks 7 theme questions first, then this and last week, then review", () => {
    const due = [card("w1-01", 1, "2026-11-19"), card("w1-02", 2, "2026-11-19"), card("w2-01", 1, "2026-11-19")];
    const plan = pick({ cards: due });
    expect(plan.questionIds).toHaveLength(18);
    // only 3 cards are due, so the 2 missing review slots are backfilled from this week
    expect(plan.groups).toEqual({ theme: 7, current: 8, review: 3 });
    const [theme, current, review] = [plan.questionIds.slice(0, 7), plan.questionIds.slice(7, 15), plan.questionIds.slice(15)];
    expect(theme.every((id) => id.startsWith("t1-"))).toBe(true);
    expect(current.map(weekOfId).filter((w) => w === 3)).toHaveLength(3); // half of the 6 regular slots are last week
    expect(current.map(weekOfId).filter((w) => w === 4)).toHaveLength(5);
    expect(review.sort()).toEqual(["w1-01", "w1-02", "w2-01"]); // the due cards
  });

  it("never repeats a question", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const ids = pick({ rng: mulberry32(seed) }).questionIds;
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("takes only due cards from weeks before last week, lowest box first, at most 2 per week", () => {
    const cards = [
      card("w1-01", 3, "2026-11-19"), card("w1-02", 1, "2026-11-19"), card("w1-03", 2, "2026-11-19"), // three from week 1
      card("w2-01", 4, "2026-11-19"), card("w2-02", 5, "2026-11-19"),
      card("w3-01", 1, "2026-11-19"), // last week: not a review week
      card("w1-04", 1, "2026-11-30"), // not due yet
    ];
    const review = pick({ cards }).questionIds.slice(13);
    expect(review.filter((id) => id.startsWith("w1-"))).toHaveLength(2);
    expect(review).toContain("w1-02"); // box 1 before box 2 and 3
    expect(review).toContain("w1-03");
    expect(review).not.toContain("w1-01"); // third from week 1: over the cap
    expect(review).not.toContain("w1-04"); // not due
    expect(review).not.toContain("w3-01");
    expect(review.filter((id) => id.startsWith("w2-"))).toHaveLength(2);
  });

  it("backfills a short group so Mock 1 still gets 18: 7 theme and 11 from week 1", () => {
    const plan = pick({ week: 1 });
    expect(plan.questionIds).toHaveLength(18);
    expect(plan.groups).toEqual({ theme: 7, current: 11, review: 0 });
    expect(plan.questionIds.slice(7).every((id) => id.startsWith("w1-"))).toBe(true);
  });

  it("asks 20 on the final mock and returns fewer, without throwing, when the bank is short", () => {
    expect(pick({ mock: { pythonTheme: 1, mcqCount: 20 } }).questionIds).toHaveLength(20);
    const tiny = pick({ questions: [...many("t1-", 1, 3, 1), ...many("w1-", 1, 2)], week: 1 });
    expect(tiny.questionIds).toHaveLength(5);
  });

  it("prefers questions you have not answered, then ones you got wrong", () => {
    const answers: QuizAnswer[] = [
      ...many("t1-", 1, 5, 1).map((q) => ({ questionId: q.id, correct: true, answeredAt: "2026-11-01T10:00:00Z", mode: "mock" as const })),
      { questionId: "t1-06", correct: false, answeredAt: "2026-11-01T10:00:00Z", mode: "mock" },
    ];
    const theme = pick({ answers }).questionIds.slice(0, 7);
    expect(theme).toHaveLength(7);
    expect(theme).toContain("t1-06"); // the wrong one comes before the answered-right ones
    expect(["t1-07", "t1-08", "t1-09", "t1-10"].every((id) => theme.includes(id))).toBe(true); // all four unseen ones
    expect(theme.filter((id) => ["t1-01", "t1-02", "t1-03", "t1-04", "t1-05"].includes(id))).toHaveLength(2); // 4 unseen + 1 wrong = 5 of 7: two answered-right fill the rest
  });

  it("is deterministic for a seed", () => {
    expect(pick({ rng: mulberry32(9) })).toEqual(pick({ rng: mulberry32(9) }));
  });
});

describe("mock answers move Leitner cards", () => {
  let db: DsaDB;
  let n = 100;
  beforeEach(() => void (db = new DsaDB(`mockleitner-${n++}`)));
  afterEach(async () => db.delete());
  it("right goes up a box, wrong goes back to box 1, and mockNumber is kept on the answer", async () => {
    await recordAnswer(db, { questionId: "w01-q01", correct: true, mode: "mock", mockNumber: 3 }, "2026-10-30T09:00:00Z", "2026-10-30");
    await recordAnswer(db, { questionId: "w01-q01", correct: true, mode: "mock", mockNumber: 4 }, "2026-11-01T09:00:00Z", "2026-11-01");
    expect(await db.cards.get("w01-q01")).toMatchObject({ box: 2, dueOn: "2026-11-04" });
    await recordAnswer(db, { questionId: "w01-q01", correct: false, mode: "mock", mockNumber: 5 }, "2026-11-04T09:00:00Z", "2026-11-04");
    expect(await db.cards.get("w01-q01")).toMatchObject({ box: 1, dueOn: "2026-11-05" });
    expect((await db.quizAnswers.toArray()).map((a) => a.mockNumber)).toEqual([3, 4, 5]);
  });
});

// ── Program 1 and Program 2 pickers ──────────────────────────────────────────

const ids = (list: Problem[]) => list.map((p) => p.id);
const week1Pool = curriculum.weeks[0]!.pool;
const hackerRank = curriculum.weeks.flatMap((w) => w.days.flatMap((d) => d.problems)).filter((p) => p.platform === "HackerRank");

describe("Program 1 picker", () => {
  it("Weeks 1-2 draw from the Week 1 pool and the HackerRank problems", () => {
    const pool = ids(program1Pool(curriculum, 1));
    expect(pool).toHaveLength(week1Pool.length + hackerRank.length);
    expect(pool.sort()).toEqual([...ids(week1Pool), ...ids(hackerRank)].sort());
    expect(ids(program1Pool(curriculum, 2)).sort()).toEqual(pool);
  });

  it("later weeks draw only from pools of earlier weeks", () => {
    const pool = program1Pool(curriculum, 3);
    expect(pool.every((p) => p.role === "pool" && Number(p.id.slice(1, 3)) < 3)).toBe(true);
    expect(pool).toHaveLength(curriculum.weeks[0]!.pool.length + curriculum.weeks[1]!.pool.length);
  });

  it("never picks an attempted problem, and picks one when any is left", () => {
    const pool = program1Pool(curriculum, 1);
    const attempted = new Set(pool.slice(1).map((p) => p.id));
    for (let seed = 0; seed < 10; seed++) {
      const r = pickProgram1({ curriculum, week: 1, attempted, rng: mulberry32(seed) });
      expect(r.problem?.id).toBe(pool[0]!.id);
      expect(r.note).toBeUndefined();
    }
  });

  it("falls back to your earlier plan problems with a clear note, then to any pool, then to a message", () => {
    const usual = new Set(ids(program1Pool(curriculum, 2)));
    const r2 = pickProgram1({ curriculum, week: 2, attempted: usual, rng: mulberry32(1) });
    expect(r2.problem).toBeTruthy();
    expect(r2.note).toMatch(/pool for this mock is used up/);
    expect(r2.note).not.toMatch(/week \d/i); // never names a week

    const everything = new Set(curriculum.weeks.flatMap((w) => [...w.days.flatMap((d) => d.problems), ...w.pool]).map((p) => p.id));
    const none = pickProgram1({ curriculum, week: 2, attempted: everything, rng: mulberry32(1) });
    expect(none.problem).toBeNull();
    expect(none.note).toMatch(/attempted/);
  });

  it("covers Mocks 1-13 in order without running dry", () => {
    const attempted = new Set<string>();
    const rng = mulberry32(7);
    for (let m = 1; m <= 13; m++) {
      const r = pickProgram1({ curriculum, week: findMock(curriculum, m)!.week, attempted, rng });
      expect(r.problem, `Mock ${m}`).toBeTruthy();
      expect(r.note).toBeUndefined();
      attempted.add(r.problem!.id);
    }
  });
});

describe("Program 2 picker", () => {
  const tasks = curriculum.practicalTasks;
  it("only offers tasks unlocked by the week, and none in Week 1", () => {
    expect(pickProgram2({ tasks, week: 1, usedTaskIds: new Set(), rng: mulberry32(1) })).toBeNull();
    for (let seed = 0; seed < 20; seed++) {
      expect(["pt-01", "pt-02", "pt-03"]).toContain(pickProgram2({ tasks, week: 2, usedTaskIds: new Set(), rng: mulberry32(seed) }));
    }
  });
  it("prefers tasks not used in an earlier mock, and reuses one when all are used", () => {
    expect(pickProgram2({ tasks, week: 2, usedTaskIds: new Set(["pt-01", "pt-02"]), rng: mulberry32(3) })).toBe("pt-03");
    expect(["pt-01", "pt-02", "pt-03"]).toContain(pickProgram2({ tasks, week: 2, usedTaskIds: new Set(["pt-01", "pt-02", "pt-03"]), rng: mulberry32(3) }));
  });
});

describe("building a mock", () => {
  const inputs = (over = {}) => ({ curriculum, questions: bank.questions, debugSnippets: [], cards: [], answers: [], attempts: [], sessions: [], today: "2026-10-26", rng: mulberry32(2), ...over });

  it("Mock 1 is odd-numbered with no Program 2 and the debug extra; Mock 2 has Program 2 but no task yet in Week 1", () => {
    const m1 = buildMockRun(1, inputs())!;
    expect(m1).toMatchObject({ phase: "A", program2: null, extra: { kind: "debug" } });
    expect(m1.questionIds).toHaveLength(18);
    const m2 = buildMockRun(2, inputs())!;
    expect(m2.program2).toEqual({ taskId: null });
  });

  it("only picks practical tasks that have content", () => {
    for (let seed = 0; seed < 15; seed++) {
      const run = buildMockRun(6, inputs({ rng: mulberry32(seed), practicalIds: new Set(["pt-02"]) }))!;
      expect(run.program2).toEqual({ taskId: "pt-02" });
    }
  });

  it("builds from the mock's own week, not from today", () => {
    const early = buildMockRun(3, inputs({ today: "2026-10-20" }))!; // a week before the plan starts
    const weekIds = early.questionIds.filter((id) => !id.startsWith("t"));
    expect(weekIds.length).toBeGreaterThan(0);
    expect(weekIds.every((id) => id.startsWith("w01-"))).toBe(true);
    expect(early.questionIds.slice(0, 7).every((id) => id.startsWith("t03-"))).toBe(true);
  });

  it("returns nothing for a mock that does not exist", () => {
    expect(buildMockRun(99, inputs())).toBeUndefined();
    expect(findMock(curriculum, 0)).toBeUndefined();
  });

  it("walks A, B, (C), D, end", () => {
    expect(phasesOf(false)).toEqual(["A", "B", "D"]);
    expect(phasesOf(true)).toEqual(["A", "B", "C", "D"]);
    expect(nextPhase(false, "B")).toBe("D");
    expect(nextPhase(true, "B")).toBe("C");
    expect(nextPhase(true, "D")).toBe("end");
  });
});

// ── the Mocks list ───────────────────────────────────────────────────────────

describe("buildMockRows", () => {
  const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
    settings: { id: "settings", startDate: "2026-10-26", theme: "system" },
    completions: [], extensions: [], restDays: [], redos: [], attempts: [], customItems: [], moves: [], dayLogs: [], problemEntries: [], ...over,
  });
  const rowsFor = (today: string, snapshot: Snapshot, extra: Partial<Parameters<typeof buildMockRows>[0]> = {}) => {
    const plan = derivePlan(curriculum, snapshot, today);
    return buildMockRows({ curriculum, days: plan.days, today, sessions: [], runs: [], retakes: [], questions: bank.questions, ...extra });
  };
  const sessionOf = (mockNumber: number, correct: number): MockSession => ({
    mockNumber, date: "2026-10-26", diagnostic: mockNumber === 1, mcq: { total: 18, correct, byType: {} }, questionIds: [], programs: [], extra: { kind: "debug", done: true }, rating: 3,
  });

  it("lists all 45 mocks with their plan day, week, theme and extra", () => {
    const rows = rowsFor("2026-10-26", snap());
    expect(rows).toHaveLength(45);
    expect(rows.map((r) => r.number)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    expect(rows[0]).toMatchObject({ number: 1, week: 1, planDay: 1, diagnostic: true, program2: false, extra: "debug", themeId: 1 });
    expect(rows[1]).toMatchObject({ number: 2, planDay: 3, program2: true });
    expect(rows[44]).toMatchObject({ number: 45, final: true, week: 13, planDay: 89 });
    expect(rows[0]!.themeTitle).toMatch(/Types, mutability/);
  });

  it("dates come from the real schedule; a 2-day extension shifts every later mock", () => {
    const base = rowsFor("2026-10-26", snap());
    expect(base[0]!.date).toBe("2026-10-26"); // Mock 1: Week 1 Day 1
    expect(base[4]!.date).toBe("2026-11-03"); // Mock 5: Week 2 Day 2
    expect(base[44]!.date).toBe("2027-01-22");
    const ext = rowsFor("2026-10-26", snap({ extensions: [{ id: 1, week: 1, extraDays: 2, createdOn: "2026-10-26" }] }));
    expect(ext[0]!.date).toBe("2026-10-26"); // Week 1 itself does not move
    expect(ext[3]!.date).toBe("2026-11-01"); // Mock 4: Week 1 Day 7
    expect(ext[4]!.date).toBe("2026-11-05"); // Mock 5: two days later
    expect(ext[44]!.date).toBe("2027-01-24");
    expect(ext[4]!.planDay).toBe(base[4]!.planDay); // the plan day number does not change
    expect(ext[4]!.planDayId).toBe("w02-d2");
  });

  it("tags dates as Today, Overdue or Upcoming, and taken once done", () => {
    const rows = rowsFor("2026-10-28", snap(), { sessions: [sessionOf(1, 13)] });
    expect(rows[0]!.dateTag).toBe("taken"); // Mock 1, done
    expect(rows[1]!.dateTag).toBe("today"); // Mock 2 is on 2026-10-28
    expect(rows[2]!.dateTag).toBe("upcoming");
    const late = rowsFor("2026-10-29", snap());
    expect(late[0]!.dateTag).toBe("overdue");
    expect(late[1]!.dateTag).toBe("overdue");
  });

  it("shows status, first-attempt score and retake count", () => {
    const rows = rowsFor("2026-10-28", snap(), { sessions: [sessionOf(1, 13)], runs: [{ mockNumber: 2 }], retakes: [{ mockNumber: 1 }, { mockNumber: 1 }] });
    expect(rows[0]).toMatchObject({ status: "done", score: { correct: 13, total: 18 }, retakes: 2 });
    expect(rows[1]).toMatchObject({ status: "in-progress", score: null });
    expect(rows[2]).toMatchObject({ status: "not-taken", score: null, retakes: 0 });
  });

  it("marks a mock Content not ready until its theme and week questions exist", () => {
    const rows = rowsFor("2026-10-26", snap());
    expect(rows[0]).toMatchObject({ ready: true, notReadyReason: null }); // theme 1 and Week 1 are written
    expect(rows[44]).toMatchObject({ ready: false, notReadyReason: expect.stringMatching(/Python theme 15|Week 13/) }); // the last mock needs the last content
    // the rule itself, on a small bank so it does not depend on how much content exists yet
    const themeQs = Array.from({ length: 7 }, (_, i) => mk(`t5-${i}`, 2, 5));
    const weekQs = Array.from({ length: 6 }, (_, i) => mk(`w2-${i}`, 2));
    expect(mockContentStatus({ pythonTheme: 5 }, 2, [...themeQs, ...weekQs])).toEqual({ ready: true, reason: null });
    expect(mockContentStatus({ pythonTheme: 5 }, 2, [...themeQs.slice(1), ...weekQs])).toEqual({ ready: false, reason: "Python theme 5 questions are not written yet" });
    expect(mockContentStatus({ pythonTheme: 5 }, 2, [...themeQs, ...weekQs.slice(1)])).toEqual({ ready: false, reason: "Week 2 questions are not written yet" });
    expect(mockContentStatus({ pythonTheme: 5 }, 3, [...themeQs, ...weekQs])).toEqual({ ready: false, reason: "Week 3 questions are not written yet" });
  });
});

describe("advisory timer", () => {
  it("counts wall-clock seconds while running and freezes while paused", () => {
    const t = freshTimer("A", 1_000);
    expect(timerElapsed(t, 1_000)).toBe(0);
    expect(timerElapsed(t, 66_500)).toBe(65);
    const paused = pauseTimer(t, 11_000);
    expect(paused).toMatchObject({ elapsedSec: 10, runningSince: null });
    expect(timerElapsed(paused, 900_000)).toBe(10);
    expect(pauseTimer(paused, 950_000)).toBe(paused);
    const resumed = resumeTimer(paused, 100_000);
    expect(timerElapsed(resumed, 105_000)).toBe(15);
    expect(resumeTimer(resumed, 200_000)).toBe(resumed);
  });

  it("adds 10 minutes each press without touching elapsed time", () => {
    const t = addTimerMinutes(addTimerMinutes(freshTimer("B", 0)));
    expect(t.addedMinutes).toBe(20);
    expect(timerElapsed(t, 0)).toBe(0);
  });
});
