// Pure quiz logic (SPEC 3.6–3.8): shuffling, Leitner boxes, review/drill selection, scoring.
// No Dexie, no React, no clock, no Math.random: callers pass `today` and an rng.

import { addDays, compareDates } from "./dates";
import type { QuestionBank } from "./questions";
import type { CardState, DrillPrompt, Question, QuestionType, QuizAnswer } from "../types/content";

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

// ── review quiz selection (SPEC 3.7) ─────────────────────────────────────────

export const REVIEW_COUNT = 15;
export const REVIEW_CAP_PER_WEEK = 5;

/** Latest answer per question id (by timestamp, then array order). */
function latestAnswers(answers: readonly QuizAnswer[]): Map<string, QuizAnswer> {
  const out = new Map<string, QuizAnswer>();
  for (const a of answers) {
    const prev = out.get(a.questionId);
    if (!prev || a.answeredAt >= prev.answeredAt) out.set(a.questionId, a);
  }
  return out;
}

/**
 * Picks the review quiz. Earlier weeks: due cards first (lowest box first), then never-seen
 * questions, then random ones, at most `cap` per week — relaxed only if that leaves it short.
 * Week 1 (no earlier weeks): this week's questions answered wrong, then random ones.
 */
export function selectReviewQuestions(args: {
  questions: readonly Question[];
  currentWeek: number;
  cards: readonly CardState[];
  answers: readonly QuizAnswer[];
  today: string;
  rng: Rng;
  count?: number;
  cap?: number;
}): Question[] {
  const { questions, currentWeek, cards, answers, today, rng, count = REVIEW_COUNT, cap = REVIEW_CAP_PER_WEEK } = args;
  const latest = latestAnswers(answers);
  const earlier = questions.filter((q) => q.week < currentWeek);

  if (earlier.length === 0) {
    const thisWeek = questions.filter((q) => q.week === currentWeek);
    const wrong = shuffle(thisWeek.filter((q) => latest.get(q.id)?.correct === false), rng);
    const rest = shuffle(thisWeek.filter((q) => latest.get(q.id)?.correct !== false), rng);
    return [...wrong, ...rest].slice(0, count);
  }

  const cardOf = new Map(cards.map((c) => [c.questionId, c]));
  const due = earlier
    .filter((q) => {
      const c = cardOf.get(q.id);
      return !!c && compareDates(c.dueOn, today) <= 0;
    })
    .sort((a, b) => cardOf.get(a.id)!.box - cardOf.get(b.id)!.box || compareDates(cardOf.get(a.id)!.dueOn, cardOf.get(b.id)!.dueOn) || a.id.localeCompare(b.id));
  const dueIds = new Set(due.map((q) => q.id));
  const seen = (q: Question) => cardOf.has(q.id) || latest.has(q.id);
  const unseen = shuffle(earlier.filter((q) => !dueIds.has(q.id) && !seen(q)), rng);
  const unseenIds = new Set(unseen.map((q) => q.id));
  const rest = shuffle(earlier.filter((q) => !dueIds.has(q.id) && !unseenIds.has(q.id)), rng);

  const ordered = [...due, ...unseen, ...rest];
  const picked: Question[] = [];
  const perWeek = new Map<number, number>();
  for (const q of ordered) {
    if (picked.length >= count) break;
    if ((perWeek.get(q.week) ?? 0) >= cap) continue;
    picked.push(q);
    perWeek.set(q.week, (perWeek.get(q.week) ?? 0) + 1);
  }
  if (picked.length < count) {
    const have = new Set(picked.map((q) => q.id));
    for (const q of ordered) if (picked.length < count && !have.has(q.id)) picked.push(q);
  }
  return picked;
}

// ── pattern drill (SPEC 3.8) ─────────────────────────────────────────────────

export const DRILL_COUNT = 10;
export const DRILL_OPTIONS = 6;
export const DRILL_SECONDS = 20;

export interface DrillItem {
  id: string; // question id or drill prompt id
  text: string;
  code?: string;
  options: string[];
  answer: number;
  pattern: string; // the correct pattern name
}

/** Every pattern name the bank knows: used to pad pattern questions up to six options. */
export function patternPool(bank: Pick<QuestionBank, "questions" | "drill">): string[] {
  const names = new Set<string>();
  for (const d of bank.drill) [d.answer, ...d.distractors].forEach((n) => names.add(n));
  for (const q of bank.questions) if (q.type === "pattern") q.options.forEach((n) => names.add(n));
  return [...names];
}

function fromPrompt(d: DrillPrompt, rng: Rng): DrillItem {
  const options = shuffle([d.answer, ...d.distractors], rng);
  return { id: d.id, text: d.description, options, answer: options.indexOf(d.answer), pattern: d.answer };
}

function fromQuestion(q: Question, pool: readonly string[], rng: Rng): DrillItem {
  const correct = q.options[q.answer]!;
  const used = new Set(q.options);
  const extra = shuffle(pool.filter((n) => !used.has(n)), rng).slice(0, Math.max(0, DRILL_OPTIONS - q.options.length));
  const options = shuffle([...q.options, ...extra], rng);
  return { id: q.id, text: q.prompt, ...(q.code ? { code: q.code } : {}), options, answer: options.indexOf(correct), pattern: correct };
}

/** Up to `count` distinct drill items from weeks 1..upToWeek: drill prompts plus `pattern` questions. */
export function selectDrill(args: { bank: QuestionBank; upToWeek: number; rng: Rng; count?: number }): DrillItem[] {
  const { bank, upToWeek, rng, count = DRILL_COUNT } = args;
  const pool = patternPool(bank);
  const items: (() => DrillItem)[] = [
    ...bank.drill.filter((d) => d.week <= upToWeek).map((d) => () => fromPrompt(d, rng)),
    ...bank.questions.filter((q) => q.type === "pattern" && q.week <= upToWeek).map((q) => () => fromQuestion(q, pool, rng)),
  ];
  return shuffle(items, rng).slice(0, count).map((make) => make());
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
