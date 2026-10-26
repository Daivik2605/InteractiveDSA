// Pure quiz logic: shuffling, Leitner boxes, scoring. Mock question selection is in mock.ts.
// No Dexie, no React, no clock, no Math.random: callers pass `today` and an rng.

import { addDays } from "./dates";
import type { CardState, Question, QuestionType, QuizAnswer } from "../types/content";

export type Rng = () => number;

/** Small seedable PRNG so selection and shuffling are testable. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export interface PresentedQuestion {
  question: Question;
  options: string[];
  answer: number; // index into the shuffled options
}

/** Shuffles the options and tracks where the correct one went. */
export function present(question: Question, rng: Rng): PresentedQuestion {
  const order = shuffle(question.options.map((_, i) => i), rng);
  return { question, options: order.map((i) => question.options[i]!), answer: order.indexOf(question.answer) };
}

// ── Leitner boxes (SPEC 3.7) ─────────────────────────────────────────────────

export type Box = CardState["box"];
export const BOX_INTERVAL_DAYS: Record<Box, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

/** Wrong → box 1. Right → one box up (max 5). New cards start from box 1. */
export function nextCard(questionId: string, prev: CardState | undefined, correct: boolean, today: string): CardState {
  const box: Box = correct ? (Math.min(5, (prev?.box ?? 0) + 1) as Box) : 1;
  return { questionId, box, dueOn: addDays(today, BOX_INTERVAL_DAYS[box]) };
}

/** Latest answer per question id (by timestamp, then array order). */
export function latestAnswers(answers: readonly QuizAnswer[]): Map<string, QuizAnswer> {
  const out = new Map<string, QuizAnswer>();
  for (const a of answers) {
    const prev = out.get(a.questionId);
    if (!prev || a.answeredAt >= prev.answeredAt) out.set(a.questionId, a);
  }
  return out;
}

// ── scoring and stats ────────────────────────────────────────────────────────

export interface QuizResult {
  question: Question;
  correct: boolean;
}

export function scoreByType(results: readonly QuizResult[]): { total: number; correct: number; byType: Map<QuestionType, { total: number; correct: number }> } {
  const byType = new Map<QuestionType, { total: number; correct: number }>();
  for (const r of results) {
    const t = byType.get(r.question.type) ?? { total: 0, correct: 0 };
    t.total++;
    if (r.correct) t.correct++;
    byType.set(r.question.type, t);
  }
  return { total: results.length, correct: results.filter((r) => r.correct).length, byType };
}

export interface PatternStat {
  pattern: string;
  attempts: number;
  correct: number;
  accuracy: number; // 0..1
  avgMs: number | null; // average over answers that have a time
}

/** Accuracy and average time per pattern, weakest first. */
export function patternStats(answers: readonly QuizAnswer[], patternOf: (questionId: string) => string | undefined): PatternStat[] {
  const acc = new Map<string, { attempts: number; correct: number; ms: number; timed: number }>();
  for (const a of answers) {
    const p = patternOf(a.questionId);
    if (!p) continue;
    const s = acc.get(p) ?? { attempts: 0, correct: 0, ms: 0, timed: 0 };
    s.attempts++;
    if (a.correct) s.correct++;
    if (a.ms !== undefined) {
      s.ms += a.ms;
      s.timed++;
    }
    acc.set(p, s);
  }
  return [...acc.entries()]
    .map(([pattern, s]) => ({ pattern, attempts: s.attempts, correct: s.correct, accuracy: s.correct / s.attempts, avgMs: s.timed ? s.ms / s.timed : null }))
    .sort((a, b) => a.accuracy - b.accuracy || a.pattern.localeCompare(b.pattern));
}
