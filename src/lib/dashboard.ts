// Pure dashboard numbers (Phase C): mock score trend, accuracy by theme and type, problems by outcome and difficulty,
// average minutes, and the weakest spots. No Dexie, no React, no clock.

import type { MockListRow } from "./mock";
import type { Difficulty, MockSession, Problem, ProblemAttempt, Question, QuestionType, QuizAnswer } from "../types/content";

// ── mock score trend ─────────────────────────────────────────────────────────

export interface TrendPoint {
  mockNumber: number;
  correct: number;
  total: number;
  percent: number;
  /** Mock 1: shown as the baseline, and left out of every accuracy figure. */
  baseline: boolean;
  date: string;
}

/**
 * First-attempt MCQ score of every saved mock, in mock order. Retakes live in their own table and never appear.
 * A mock saved twice (it should not happen) counts once, by its first save.
 */
export function scoreTrend(sessions: readonly MockSession[]): TrendPoint[] {
  const first = new Map<number, MockSession>();
  for (const s of [...sessions].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) if (!first.has(s.mockNumber)) first.set(s.mockNumber, s);
  return [...first.values()]
    .filter((s) => s.mcq.total > 0)
    .sort((a, b) => a.mockNumber - b.mockNumber)
    .map((s) => ({
      mockNumber: s.mockNumber,
      correct: s.mcq.correct,
      total: s.mcq.total,
      percent: Math.round((s.mcq.correct / s.mcq.total) * 100),
      baseline: s.diagnostic,
      date: s.date,
    }));
}

// ── accuracy by theme and type ───────────────────────────────────────────────

export interface Accuracy {
  key: string;
  attempts: number;
  correct: number;
  accuracy: number; // 0..1
}

/**
 * The mock answers that count for weak spots: mode "mock", from a mock with a saved session that is not the
 * diagnostic, restricted to the questions that session asked, and only the latest answer per mock and question
 * (a discarded and rerun mock does not count twice).
 */
export function countedMockAnswers(answers: readonly QuizAnswer[], sessions: readonly MockSession[]): QuizAnswer[] {
  const allowed = new Map<number, Set<string> | null>();
  for (const s of sessions) {
    if (s.diagnostic || allowed.has(s.mockNumber)) continue;
    allowed.set(s.mockNumber, s.questionIds.length > 0 ? new Set(s.questionIds) : null);
  }
  const latest = new Map<string, QuizAnswer>();
  for (const a of answers) {
    if (a.mode !== "mock" || a.mockNumber === undefined || !allowed.has(a.mockNumber)) continue;
    const ids = allowed.get(a.mockNumber);
    if (ids && !ids.has(a.questionId)) continue;
    const key = `${a.mockNumber}|${a.questionId}`;
    const prev = latest.get(key);
    if (!prev || a.answeredAt >= prev.answeredAt) latest.set(key, a);
  }
  return [...latest.values()];
}

function tally(keys: (a: QuizAnswer) => string | undefined, answers: readonly QuizAnswer[]): Accuracy[] {
  const acc = new Map<string, { attempts: number; correct: number }>();
  for (const a of answers) {
    const key = keys(a);
    if (key === undefined) continue;
    const s = acc.get(key) ?? { attempts: 0, correct: 0 };
    s.attempts++;
    if (a.correct) s.correct++;
    acc.set(key, s);
  }
  return [...acc.entries()].map(([key, s]) => ({ key, attempts: s.attempts, correct: s.correct, accuracy: s.correct / s.attempts }));
}

export interface MockAccuracy {
  byTheme: Accuracy[]; // key = theme number as a string, sorted by theme
  byType: Accuracy[]; // key = question type, in the usual order
}

const TYPE_ORDER: QuestionType[] = ["pattern", "complexity", "output", "bug", "approach", "concept"];

export function mockAccuracy(counted: readonly QuizAnswer[], questionOf: (id: string) => Pick<Question, "type" | "theme"> | undefined): MockAccuracy {
  const byTheme = tally((a) => {
    const t = questionOf(a.questionId)?.theme;
    return t === undefined ? undefined : String(t);
  }, counted).sort((a, b) => Number(a.key) - Number(b.key));
  const byType = tally((a) => questionOf(a.questionId)?.type, counted).sort((a, b) => TYPE_ORDER.indexOf(a.key as QuestionType) - TYPE_ORDER.indexOf(b.key as QuestionType));
  return { byTheme, byType };
}

// ── weakest spots ────────────────────────────────────────────────────────────

export const WEAK_MIN_ATTEMPTS = 3;
export const WEAK_COUNT = 5;

export interface WeakSpot extends Accuracy {
  kind: "theme" | "type";
  label: string;
}

/** The lowest-accuracy themes and types (with at least WEAK_MIN_ATTEMPTS answers), weakest first. */
export function weakestSpots(args: { accuracy: MockAccuracy; themeTitle: (theme: number) => string; typeLabel: (type: QuestionType) => string; count?: number }): WeakSpot[] {
  const { accuracy, themeTitle, typeLabel, count = WEAK_COUNT } = args;
  const spots: WeakSpot[] = [
    ...accuracy.byTheme.map((a) => ({ ...a, kind: "theme" as const, label: `Theme ${a.key}: ${themeTitle(Number(a.key))}` })),
    ...accuracy.byType.map((a) => ({ ...a, kind: "type" as const, label: `${typeLabel(a.key as QuestionType)} questions` })),
  ];
  return spots
    .filter((s) => s.attempts >= WEAK_MIN_ATTEMPTS)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.label.localeCompare(b.label))
    .slice(0, count);
}

/**
 * Where "Start targeted mock" goes. A weak theme goes to the first untaken, ready mock that leads with that theme
 * (the theme cycles three times through the 45 mocks); anything else, or no such mock, goes to the next untaken,
 * ready mock, and then to the Mocks page.
 */
export function targetMockPath(spot: Pick<WeakSpot, "kind" | "key">, rows: readonly MockListRow[]): string {
  const open = rows.filter((r) => r.status !== "done" && r.ready);
  const match = spot.kind === "theme" ? open.find((r) => r.themeId === Number(spot.key)) : undefined;
  const pick = match ?? open[0];
  return pick ? `/mock/${pick.number}` : "/mocks";
}

// ── problems ─────────────────────────────────────────────────────────────────

export type Outcome = ProblemAttempt["outcome"];
export const OUTCOMES: Outcome[] = ["alone", "hint", "solution", "failed"];
export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

export interface ProblemStats {
  total: number;
  byOutcome: { outcome: Outcome; count: number }[];
  /** One row per difficulty with a count for each outcome. */
  byDifficulty: ({ difficulty: Difficulty; total: number } & Record<Outcome, number>)[];
  /** Mean minutes over attempts that logged some, or null when none did. */
  avgMinutes: number | null;
  avgMinutesByDifficulty: { difficulty: Difficulty; avgMinutes: number | null; attempts: number }[];
}

/** Each problem counts once, by its latest attempt (mock attempts included: they are real attempts). */
export function problemStats(attempts: readonly ProblemAttempt[], problemOf: (id: string) => Pick<Problem, "difficulty"> | undefined): ProblemStats {
  const latest = new Map<string, ProblemAttempt>();
  for (const a of [...attempts].sort((x, y) => (x.date === y.date ? (x.id ?? 0) - (y.id ?? 0) : x.date < y.date ? -1 : 1))) latest.set(a.problemId, a);
  const difficultyOf = (id: string): Difficulty => problemOf(id)?.difficulty ?? "Medium";

  const byOutcome = OUTCOMES.map((outcome) => ({ outcome, count: [...latest.values()].filter((a) => a.outcome === outcome).length }));
  const byDifficulty = DIFFICULTIES.map((difficulty) => {
    const mine = [...latest.values()].filter((a) => difficultyOf(a.problemId) === difficulty);
    const row = { difficulty, total: mine.length } as ProblemStats["byDifficulty"][number];
    for (const o of OUTCOMES) row[o] = mine.filter((a) => a.outcome === o).length;
    return row;
  });

  const timed = attempts.filter((a) => a.minutes > 0);
  const mean = (list: readonly ProblemAttempt[]) => (list.length === 0 ? null : Math.round((list.reduce((n, a) => n + a.minutes, 0) / list.length) * 10) / 10);
  return {
    total: latest.size,
    byOutcome,
    byDifficulty,
    avgMinutes: mean(timed),
    avgMinutesByDifficulty: DIFFICULTIES.map((difficulty) => {
      const mine = timed.filter((a) => difficultyOf(a.problemId) === difficulty);
      return { difficulty, avgMinutes: mean(mine), attempts: mine.length };
    }),
  };
}

// ── study summary ────────────────────────────────────────────────────────────

export interface StudySummary {
  /** Plan days finished, on time or late. */
  daysDone: number;
  daysDoneOnTime: number;
  streak: number;
  /** Distinct problems solved alone at least once (mock attempts included). */
  solvedAlone: number;
  /** Minutes of every attempt (Program 1 of a mock is one), plus Program 2 minutes from saved mocks. */
  studyMinutes: number;
}

export function studySummary(args: {
  days: readonly { status: string }[];
  streak: number;
  attempts: readonly Pick<ProblemAttempt, "problemId" | "outcome" | "minutes">[];
  sessions: readonly Pick<MockSession, "mockNumber" | "programs">[];
}): StudySummary {
  const { days, streak, attempts, sessions } = args;
  const onTime = days.filter((d) => d.status === "done").length;
  // Program 1 of a mock is already an attempt; only Program 2 (a practical task, no attempt) adds minutes here.
  const seen = new Set<number>();
  const program2 = sessions
    .filter((s) => !seen.has(s.mockNumber) && !!seen.add(s.mockNumber))
    .flatMap((s) => s.programs)
    .filter((p) => p.part === 2 && !p.skipped)
    .reduce((n, p) => n + p.minutes, 0);
  return {
    daysDone: onTime + days.filter((d) => d.status === "done-late").length,
    daysDoneOnTime: onTime,
    streak,
    solvedAlone: new Set(attempts.filter((a) => a.outcome === "alone").map((a) => a.problemId)).size,
    studyMinutes: attempts.reduce((n, a) => n + a.minutes, 0) + program2,
  };
}

/** "5h 20m", "45m", "0m". */
export function formatMinutes(total: number): string {
  const m = Math.round(total);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}
