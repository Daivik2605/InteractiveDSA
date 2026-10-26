import { describe, expect, it } from "vitest";
import { countedMockAnswers, formatMinutes, mockAccuracy, problemStats, scoreTrend, studySummary, targetMockPath, weakestSpots, WEAK_MIN_ATTEMPTS } from "./dashboard";
import type { MockListRow } from "./mock";
import type { MockSession, ProblemAttempt, QuestionType, QuizAnswer } from "../types/content";

const session = (mockNumber: number, correct: number, over: Partial<MockSession> = {}): MockSession => ({
  id: mockNumber, mockNumber, date: `2026-11-0${mockNumber}`, diagnostic: mockNumber === 1,
  mcq: { total: 18, correct, byType: {} }, questionIds: [], programs: [], extra: { kind: "debug", done: true }, rating: 3, ...over,
});
const ans = (questionId: string, correct: boolean, mockNumber: number | undefined, over: Partial<QuizAnswer> = {}): QuizAnswer => ({
  questionId, correct, mode: "mock", ...(mockNumber !== undefined ? { mockNumber } : {}), answeredAt: "2026-11-02T10:00:00.000Z", ...over,
});

describe("scoreTrend", () => {
  it("lists first-attempt scores in mock order, with Mock 1 as the baseline", () => {
    const t = scoreTrend([session(3, 12), session(1, 9), session(2, 15)]);
    expect(t.map((p) => p.mockNumber)).toEqual([1, 2, 3]);
    expect(t[0]).toMatchObject({ baseline: true, correct: 9, total: 18, percent: 50 });
    expect(t[1]).toMatchObject({ baseline: false, percent: 83 });
  });
  it("counts a mock once, by its first save, and skips sessions with no questions", () => {
    const t = scoreTrend([session(2, 10, { id: 5 }), session(2, 18, { id: 9 }), session(4, 0, { mcq: { total: 0, correct: 0, byType: {} } })]);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ mockNumber: 2, correct: 10 });
  });
  it("is empty with no sessions", () => expect(scoreTrend([])).toEqual([]));
});

describe("countedMockAnswers (what weak spots may read)", () => {
  const sessions = [session(1, 9), session(2, 14, { questionIds: ["a", "b"] }), session(3, 10)];
  it("reads only mode mock, and skips the diagnostic mock", () => {
    const counted = countedMockAnswers(
      [ans("a", true, 1), ans("a", true, 2), ans("a", true, 2, { mode: "weekly" }), ans("b", false, undefined)],
      sessions,
    );
    expect(counted.map((a) => `${a.mockNumber}:${a.questionId}`)).toEqual(["2:a"]);
  });
  it("skips mocks without a saved session, and questions the saved session did not ask", () => {
    const counted = countedMockAnswers([ans("a", true, 7), ans("zzz", true, 2), ans("b", true, 2)], sessions);
    expect(counted.map((a) => a.questionId)).toEqual(["b"]);
  });
  it("keeps only the latest answer for a mock and question (a discarded rerun does not count twice)", () => {
    const counted = countedMockAnswers([ans("a", false, 2, { answeredAt: "2026-11-02T09:00:00Z" }), ans("a", true, 2, { answeredAt: "2026-11-02T10:00:00Z" })], sessions);
    expect(counted).toHaveLength(1);
    expect(counted[0]!.correct).toBe(true);
  });
  it("is unaffected by retakes, which are stored outside quizAnswers", () => {
    const base = countedMockAnswers([ans("a", true, 2)], sessions);
    expect(countedMockAnswers([ans("a", true, 2)], sessions)).toEqual(base);
  });
});

describe("accuracy and weakest spots", () => {
  const types: Record<string, { type: QuestionType; theme?: number }> = {
    a: { type: "output", theme: 1 }, b: { type: "output", theme: 1 }, c: { type: "bug", theme: 2 }, d: { type: "bug", theme: 2 },
    e: { type: "pattern" }, f: { type: "pattern" }, g: { type: "concept", theme: 3 },
  };
  const counted = [
    ans("a", true, 2), ans("b", false, 2), ans("a", false, 3), // theme 1: 1/3
    ans("c", true, 2), ans("d", true, 2), ans("c", true, 3), // theme 2: 3/3
    ans("e", false, 2), ans("f", true, 2), // pattern, no theme: 1/2
    ans("g", false, 2), // theme 3: 0/1
  ];
  const acc = mockAccuracy(counted, (id) => types[id]);

  it("splits by theme (themed questions only) and by type", () => {
    expect(acc.byTheme.map((t) => [t.key, t.correct, t.attempts])).toEqual([["1", 1, 3], ["2", 3, 3], ["3", 0, 1]]);
    expect(acc.byType.map((t) => [t.key, t.correct, t.attempts])).toEqual([["pattern", 1, 2], ["output", 1, 3], ["bug", 3, 3], ["concept", 0, 1]]);
  });

  it("ranks the weakest themes and types together, needing the minimum number of answers", () => {
    const weak = weakestSpots({ accuracy: acc, themeTitle: (t) => `T${t}`, typeLabel: (t) => t });
    expect(WEAK_MIN_ATTEMPTS).toBe(3);
    // 1/3 (output, theme 1) before 3/3 (bug, theme 2); equal accuracy and attempts fall back to label order
    expect(weak.map((w) => w.label)).toEqual(["output questions", "Theme 1: T1", "bug questions", "Theme 2: T2"]);
    expect(weak.map((w) => w.kind)).toEqual(["type", "theme", "type", "theme"]);
    expect(weak.some((w) => w.key === "pattern" || w.key === "3")).toBe(false); // pattern has 2 answers, theme 3 has 1
  });

  it("limits the list to 5, weakest first", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ key: String(i + 1), attempts: 4, correct: i, accuracy: i / 4 }));
    const weak = weakestSpots({ accuracy: { byTheme: many, byType: [] }, themeTitle: () => "x", typeLabel: (t) => t });
    expect(weak).toHaveLength(5);
    expect(weak.map((w) => w.key)).toEqual(["1", "2", "3", "4", "5"]);
    expect(weak.map((w) => w.accuracy)).toEqual([...weak.map((w) => w.accuracy)].sort((x, y) => x - y));
  });

  it("is empty when nothing has enough answers", () => {
    expect(weakestSpots({ accuracy: mockAccuracy([ans("a", false, 2)], (id) => types[id]), themeTitle: () => "", typeLabel: (t) => t })).toEqual([]);
  });
});

describe("targetMockPath", () => {
  const row = (number: number, themeId: number, status: MockListRow["status"], ready: boolean): MockListRow => ({
    number, week: 1, planDay: number, planDayId: "w01-d1", date: null, dateTag: "upcoming", themeId, themeTitle: "t", extra: "debug",
    program2: false, diagnostic: false, final: false, status, score: null, retakes: 0, ready, notReadyReason: null,
  });
  const rows = [row(1, 1, "done", true), row(2, 2, "not-taken", true), row(3, 3, "not-taken", true), row(4, 4, "not-taken", false), row(16, 1, "not-taken", true)];
  it("sends a weak theme to the first untaken, ready mock that leads with it", () => {
    expect(targetMockPath({ kind: "theme", key: "3" }, rows)).toBe("/mock/3");
    expect(targetMockPath({ kind: "theme", key: "1" }, rows)).toBe("/mock/16"); // Mock 1 is done
  });
  it("sends a weak type, or a theme with no open mock, to the next untaken ready mock, then to the Mocks page", () => {
    expect(targetMockPath({ kind: "type", key: "bug" }, rows)).toBe("/mock/2");
    expect(targetMockPath({ kind: "theme", key: "4" }, rows)).toBe("/mock/2"); // Mock 4 is not ready
    expect(targetMockPath({ kind: "type", key: "bug" }, rows.filter((r) => r.status === "done"))).toBe("/mocks");
  });
});

describe("problemStats", () => {
  const at = (problemId: string, outcome: ProblemAttempt["outcome"], minutes: number, date: string, id: number): ProblemAttempt => ({ id, problemId, outcome, minutes, date, isRedo: false });
  const diff = { e1: "Easy", m1: "Medium", m2: "Medium", h1: "Hard" } as const;
  const problemOf = (id: string) => (id in diff ? { difficulty: diff[id as keyof typeof diff] } : undefined);

  it("counts each problem once, by its latest attempt, by outcome and difficulty", () => {
    const s = problemStats(
      [at("m1", "hint", 40, "2026-11-01", 1), at("m1", "alone", 20, "2026-11-04", 2), at("e1", "alone", 10, "2026-11-02", 3), at("h1", "failed", 45, "2026-11-03", 4), at("m2", "solution", 30, "2026-11-03", 5)],
      problemOf,
    );
    expect(s.total).toBe(4);
    expect(s.byOutcome).toEqual([{ outcome: "alone", count: 2 }, { outcome: "hint", count: 0 }, { outcome: "solution", count: 1 }, { outcome: "failed", count: 1 }]);
    expect(s.byDifficulty.find((d) => d.difficulty === "Medium")).toMatchObject({ total: 2, alone: 1, solution: 1 });
    expect(s.byDifficulty.reduce((n, d) => n + d.total, 0)).toBe(s.total);
  });

  it("averages minutes over attempts that logged some, overall and by difficulty", () => {
    const s = problemStats([at("m1", "alone", 20, "d1", 1), at("m2", "alone", 40, "d1", 2), at("e1", "alone", 0, "d1", 3), at("unknown", "alone", 10, "d1", 4)], problemOf);
    expect(s.avgMinutes).toBe(23.3); // (20 + 40 + 10) / 3; the 0-minute attempt is ignored
    expect(s.avgMinutesByDifficulty.find((d) => d.difficulty === "Medium")).toMatchObject({ avgMinutes: 23.3, attempts: 3 }); // unknown ids count as Medium
    expect(s.avgMinutesByDifficulty.find((d) => d.difficulty === "Hard")).toMatchObject({ avgMinutes: null, attempts: 0 });
  });

  it("handles no attempts", () => {
    expect(problemStats([], problemOf)).toMatchObject({ total: 0, avgMinutes: null });
  });
});

describe("studySummary", () => {
  const days = [{ status: "done" }, { status: "done" }, { status: "done-late" }, { status: "missed" }, { status: "partial" }, { status: "upcoming" }];
  const attempts = [
    { problemId: "a", outcome: "alone" as const, minutes: 20 },
    { problemId: "a", outcome: "alone" as const, minutes: 15 }, // the same problem solved alone twice counts once
    { problemId: "b", outcome: "hint" as const, minutes: 40 },
    { problemId: "c", outcome: "alone" as const, minutes: 0 },
  ];
  const prog = (part: 1 | 2, minutes: number, skipped = false) => ({ part, problemId: "x", outcome: "alone" as const, minutes, ...(skipped ? { skipped } : {}) });

  it("counts finished days (on time and late), the streak, distinct problems solved alone and all logged minutes", () => {
    const s = studySummary({ days, streak: 2, attempts, sessions: [] });
    expect(s).toEqual({ daysDone: 3, daysDoneOnTime: 2, streak: 2, solvedAlone: 2, studyMinutes: 75 });
  });

  it("adds Program 2 minutes from saved mocks, but not Program 1 (already an attempt) or skipped programs", () => {
    const s = studySummary({ days: [], streak: 0, attempts: [], sessions: [{ mockNumber: 2, programs: [prog(1, 25), prog(2, 30)] }, { mockNumber: 4, programs: [prog(2, 20, true)] }] });
    expect(s.studyMinutes).toBe(30);
  });

  it("counts a mock saved twice once", () => {
    const s = studySummary({ days: [], streak: 0, attempts: [], sessions: [{ mockNumber: 2, programs: [prog(2, 30)] }, { mockNumber: 2, programs: [prog(2, 30)] }] });
    expect(s.studyMinutes).toBe(30);
  });

  it("is all zeros with no data", () => {
    expect(studySummary({ days: [], streak: 0, attempts: [], sessions: [] })).toEqual({ daysDone: 0, daysDoneOnTime: 0, streak: 0, solvedAlone: 0, studyMinutes: 0 });
  });

  it("formats minutes", () => {
    expect([0, 45, 60, 125, 320].map(formatMinutes)).toEqual(["0m", "45m", "1h 00m", "2h 05m", "5h 20m"]);
  });
});
