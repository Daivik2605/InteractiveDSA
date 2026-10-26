// Pure mock logic (Phase B): which questions, which Program 1/2 and which extra a mock shows, and how a finished
// mock is scored. No Dexie, no React, no clock, no Math.random: callers pass `today` and an rng.

import { compareDates } from "./dates";
import { latestAnswers, scoreByType, shuffle, type QuizResult, type Rng } from "./quiz";
import type {
  CardState,
  Curriculum,
  DebugSnippet,
  MockAnswer,
  MockExtra,
  MockRetake,
  MockRun,
  MockSection,
  MockSession,
  MockSlot,
  PracticalTask,
  Problem,
  ProblemAttempt,
  Question,
  QuestionType,
  QuizAnswer,
} from "../types/content";

// ── Part A: the MCQs ─────────────────────────────────────────────────────────

export const MOCK_THEME_COUNT = 7;
export const MOCK_REVIEW_COUNT = 5;
/** At most this many spaced-review cards come from any one week, so older weeks all show up. */
export const MOCK_REVIEW_CAP_PER_WEEK = 2;

export interface MockQuestionPlan {
  questionIds: string[];
  /** How many came from each source, in display order. Backfill is counted under `current`. */
  groups: { theme: number; current: number; review: number };
}

const isThemeQuestion = (q: Question) => q.theme !== undefined;

/**
 * Picks a mock's MCQs: Python-theme questions first, then this week's and last week's, then spaced-review cards
 * from older weeks that are due. Never repeats a question. When a group is short (Mock 1 has no last week and
 * no due cards) the gap is filled from this week's questions, then the theme's, then any earlier week's, so the
 * total reaches `mock.mcqCount` whenever the bank has enough.
 */
export function selectMockQuestions(args: {
  questions: readonly Question[];
  mock: Pick<MockSlot, "pythonTheme" | "mcqCount">;
  week: number;
  cards: readonly CardState[];
  answers: readonly QuizAnswer[];
  today: string;
  rng: Rng;
}): MockQuestionPlan {
  const { questions, mock, week, cards, answers, today, rng } = args;
  const latest = latestAnswers(answers);
  const total = mock.mcqCount;
  const reviewTarget = Math.min(MOCK_REVIEW_COUNT, Math.max(0, total - MOCK_THEME_COUNT));
  const currentTarget = Math.max(0, total - MOCK_THEME_COUNT - reviewTarget);
  const used = new Set<string>();

  /** Never-answered first, then answered wrong, then the rest; each tier shuffled. */
  const ranked = (pool: readonly Question[]): Question[] => {
    const tier = (q: Question) => (!latest.has(q.id) ? 0 : latest.get(q.id)!.correct ? 2 : 1);
    return [0, 1, 2].flatMap((t) => shuffle(pool.filter((q) => tier(q) === t), rng));
  };
  const take = (pool: readonly Question[], n: number): Question[] => {
    const out: Question[] = [];
    for (const q of pool) {
      if (out.length >= n) break;
      if (used.has(q.id)) continue;
      used.add(q.id);
      out.push(q);
    }
    return out;
  };

  const themePool = ranked(questions.filter((q) => q.theme === mock.pythonTheme));
  const weekQ = (w: number) => ranked(questions.filter((q) => !isThemeQuestion(q) && q.week === w));
  const thisWeek = weekQ(week);
  const lastWeek = week > 1 ? weekQ(week - 1) : [];

  const theme = take(themePool, MOCK_THEME_COUNT);

  // this week + last week: half each when both exist, then whatever either has left
  const lastTarget = lastWeek.length > 0 ? Math.floor(currentTarget / 2) : 0;
  const last = take(lastWeek, lastTarget);
  const current = [...take(thisWeek, currentTarget - last.length), ...last];
  if (current.length < currentTarget) current.push(...take(lastWeek, currentTarget - current.length));

  // spaced review: due cards for questions of weeks before last week, lowest box first, capped per week
  const cardOf = new Map(cards.map((c) => [c.questionId, c]));
  const older = questions.filter((q) => q.week < week - 1 && !isThemeQuestion(q));
  const due = older
    .filter((q) => {
      const c = cardOf.get(q.id);
      return !!c && compareDates(c.dueOn, today) <= 0;
    })
    .sort((a, b) => cardOf.get(a.id)!.box - cardOf.get(b.id)!.box || compareDates(cardOf.get(a.id)!.dueOn, cardOf.get(b.id)!.dueOn) || a.id.localeCompare(b.id));
  const review: Question[] = [];
  const perWeek = new Map<number, number>();
  for (const q of due) {
    if (review.length >= reviewTarget) break;
    if (used.has(q.id) || (perWeek.get(q.week) ?? 0) >= MOCK_REVIEW_CAP_PER_WEEK) continue;
    used.add(q.id);
    review.push(q);
    perWeek.set(q.week, (perWeek.get(q.week) ?? 0) + 1);
  }

  // backfill: this week's questions, then the theme's, then earlier weeks'
  let missing = total - theme.length - current.length - review.length;
  if (missing > 0) current.push(...take(thisWeek, missing));
  missing = total - theme.length - current.length - review.length;
  if (missing > 0) theme.push(...take(themePool, missing));
  missing = total - theme.length - current.length - review.length;
  if (missing > 0) current.push(...take(ranked(questions.filter((q) => !isThemeQuestion(q) && q.week <= week)), missing));

  const picked = [...theme, ...shuffle(current, rng), ...review];
  return {
    questionIds: picked.map((q) => q.id),
    groups: { theme: theme.length, current: current.length, review: review.length },
  };
}

// ── Part B: Program 1 ────────────────────────────────────────────────────────

export interface Program1Pick {
  problem: Problem | null;
  /** Shown to the learner when the usual pool could not supply the problem. Never names a week. */
  note?: string;
}

const allProblems = (c: Curriculum) => c.weeks.flatMap((w) => [...w.days.flatMap((d) => d.problems), ...w.pool]);

/** The problems Program 1 normally draws from for a mock in `week` (before the attempted ones are removed). */
export function program1Pool(curriculum: Curriculum, week: number): Problem[] {
  if (week <= 2) {
    const w1 = curriculum.weeks.find((w) => w.week === 1)?.pool ?? [];
    const hackerRank = allProblems(curriculum).filter((p) => p.platform === "HackerRank" && p.role !== "pool");
    return [...w1, ...hackerRank];
  }
  return curriculum.weeks.filter((w) => w.week < week).flatMap((w) => w.pool);
}

/**
 * One unlabelled problem the learner has not attempted. `attempted` holds every problem id with an attempt of
 * any kind (mock attempts included). Whether a problem is also on a plan day is ignored: the HackerRank ones are.
 * Order of preference: the usual pool, then plan problems of earlier weeks, then any week's pool. Never throws.
 */
export function pickProgram1(args: { curriculum: Curriculum; week: number; attempted: ReadonlySet<string>; rng: Rng }): Program1Pick {
  const { curriculum, week, attempted, rng } = args;
  const fresh = (list: readonly Problem[]) => {
    const seen = new Set<string>();
    return list.filter((p) => !attempted.has(p.id) && !seen.has(p.id) && !!seen.add(p.id));
  };
  const first = (list: readonly Problem[]) => shuffle(list, rng)[0];

  const usual = first(fresh(program1Pool(curriculum, week)));
  if (usual) return { problem: usual };

  const earlier = first(
    fresh(curriculum.weeks.filter((w) => w.week < week).flatMap((w) => w.days.flatMap((d) => d.problems)).filter((p) => p.role !== "fallback")),
  );
  if (earlier) return { problem: earlier, note: "The usual pool for this mock is used up, so this is a problem from your earlier plan that you have not attempted yet." };

  const anyPool = first(fresh(curriculum.weeks.flatMap((w) => w.pool)));
  if (anyPool) return { problem: anyPool, note: "The usual pool for this mock is used up, so this problem comes from another week's spare pool." };

  return { problem: null, note: "Every spare problem has been attempted. Pick any problem you like, log it from the Problems page, and skip this part." };
}

/** Ids with an attempt of any kind, for `pickProgram1`. */
export const attemptedIds = (attempts: readonly ProblemAttempt[]): Set<string> => new Set(attempts.map((a) => a.problemId));

// ── Part C: Program 2 ────────────────────────────────────────────────────────

/** A practical task unlocked by `week`, preferring ones not used in an earlier mock. */
export function pickProgram2(args: { tasks: readonly PracticalTask[]; week: number; usedTaskIds: ReadonlySet<string>; rng: Rng }): string | null {
  const open = args.tasks.filter((t) => t.unlockWeek <= args.week);
  const unused = open.filter((t) => !args.usedTaskIds.has(t.id));
  return shuffle(unused.length > 0 ? unused : open, args.rng)[0]?.id ?? null;
}

// ── Part D: the extra ────────────────────────────────────────────────────────

/** Debug snippets: one not shown in an earlier mock if possible. `usedIds` are snippet ids of earlier runs. */
export function pickDebugSnippet(snippets: readonly DebugSnippet[], usedIds: ReadonlySet<string>, rng: Rng): DebugSnippet | undefined {
  const unused = snippets.filter((s) => !usedIds.has(s.id));
  return shuffle(unused.length > 0 ? unused : snippets, rng)[0];
}

// ── scoring ──────────────────────────────────────────────────────────────────

export function mcqSummary(results: readonly QuizResult[]): MockSession["mcq"] {
  const s = scoreByType(results);
  return {
    total: s.total,
    correct: s.correct,
    byType: Object.fromEntries([...s.byType.entries()].map(([type, v]) => [type, { ...v }])),
  };
}

export const EXTRA_LABEL: Record<MockExtra, string> = {
  debug: "Debug a snippet",
  "explain-aloud": "Explain aloud",
  "complexity-check": "Complexity check",
};

/** Minutes the timer for a part suggests. Timers are advisory only. */
export const PART_MINUTES = { A: 20, B: 25, C: 30, D: 10 } as const;

// ── building and running a mock ──────────────────────────────────────────────

export interface MockLocation {
  slot: MockSlot;
  week: number;
  /** "w03-d1": the curriculum day that owns the mock, and "w03-d1:learn": its "Mock N" item. */
  homeDayId: string;
  itemId: string;
}

export function findMock(curriculum: Curriculum, number: number): MockLocation | undefined {
  for (const w of curriculum.weeks) {
    for (const d of w.days) {
      if (d.mock?.number !== number) continue;
      const homeDayId = `w${String(w.week).padStart(2, "0")}-d${d.day}`;
      return { slot: d.mock, week: w.week, homeDayId, itemId: `${homeDayId}:learn` };
    }
  }
  return undefined;
}

export type MockPhase = MockRun["phase"];

/** The parts a mock has, in order. Program 2 (C) only on mocks with `program2`. */
export const phasesOf = (hasProgram2: boolean): Exclude<MockPhase, "end">[] => (hasProgram2 ? ["A", "B", "C", "D"] : ["A", "B", "D"]);

export function nextPhase(hasProgram2: boolean, phase: MockPhase): MockPhase {
  const order = phasesOf(hasProgram2);
  const i = order.indexOf(phase as Exclude<MockPhase, "end">);
  return i >= 0 && i + 1 < order.length ? order[i + 1]! : "end";
}

/** Everything a mock needs to pick its content, gathered by the caller from Dexie and the bundled content. */
export interface MockInputs {
  curriculum: Curriculum;
  questions: readonly Question[];
  debugSnippets: readonly DebugSnippet[];
  cards: readonly CardState[];
  answers: readonly QuizAnswer[];
  attempts: readonly ProblemAttempt[];
  sessions: readonly MockSession[];
  /** Practical task ids that have content; others are never picked. Leave out to allow every curriculum task. */
  practicalIds?: ReadonlySet<string>;
  today: string;
  rng: Rng;
}

/** Picks a mock's content once; the result is stored so a reload shows the same mock. */
export function buildMockRun(number: number, inputs: MockInputs): MockRun | undefined {
  const loc = findMock(inputs.curriculum, number);
  if (!loc) return undefined;
  const { slot, week } = loc;
  const qs = selectMockQuestions({ questions: inputs.questions, mock: slot, week, cards: inputs.cards, answers: inputs.answers, today: inputs.today, rng: inputs.rng });
  const p1 = pickProgram1({ curriculum: inputs.curriculum, week, attempted: attemptedIds(inputs.attempts), rng: inputs.rng });
  const usedTasks = new Set(inputs.sessions.flatMap((s) => s.programs.filter((p) => p.part === 2).map((p) => p.problemId)));
  const taskId = slot.program2 ? pickProgram2({ tasks: inputs.curriculum.practicalTasks.filter((t) => !inputs.practicalIds || inputs.practicalIds.has(t.id)), week, usedTaskIds: usedTasks, rng: inputs.rng }) : null;
  const usedSnippets = new Set(inputs.sessions.map((s) => s.extra.snippetId).filter((x): x is string => !!x));
  const snippet = slot.extra === "debug" ? pickDebugSnippet(inputs.debugSnippets, usedSnippets, inputs.rng) : undefined;
  return {
    mockNumber: number,
    startedOn: inputs.today,
    questionIds: qs.questionIds,
    groups: qs.groups,
    program1: { problemId: p1.problem?.id ?? null, ...(p1.note ? { note: p1.note } : {}) },
    program2: slot.program2 ? { taskId } : null,
    extra: { kind: slot.extra, ...(snippet ? { snippetId: snippet.id } : {}) },
    answers: [],
    phase: "A",
    programs: [],
    extraDone: false,
  };
}

// ── results: breakdown and answer key ────────────────────────────────────────

export const SECTION_LABEL: Record<MockSection, string> = {
  theme: "Python language",
  current: "This and last week",
  review: "Spaced review",
};
const SECTION_ORDER: MockSection[] = ["theme", "current", "review"];
const TYPE_ORDER: QuestionType[] = ["pattern", "complexity", "output", "bug", "approach", "concept"];

/** Which section the i-th question of a mock belongs to; questions are asked theme, then current, then review. */
export function sectionOfIndex(i: number, groups: { theme: number; current: number; review: number }): MockSection {
  return i < groups.theme ? "theme" : i < groups.theme + groups.current ? "current" : "review";
}

export interface Bucket {
  key: string;
  total: number;
  correct: number;
}

export interface Breakdown {
  total: number;
  correct: number;
  percent: number;
  byType: Bucket[];
  bySection: Bucket[];
}

/** Score, and the same score split by question type and by section. Buckets with no questions are left out. */
export function breakdown(answers: readonly MockAnswer[], typeOf: (questionId: string) => QuestionType | undefined): Breakdown {
  const tally = <K extends string>(keyOf: (a: MockAnswer) => K | undefined, order: readonly K[]): Bucket[] =>
    order
      .map((key) => {
        const mine = answers.filter((a) => keyOf(a) === key);
        return { key, total: mine.length, correct: mine.filter((a) => a.correct).length };
      })
      .filter((b) => b.total > 0);
  const correct = answers.filter((a) => a.correct).length;
  return {
    total: answers.length,
    correct,
    percent: answers.length === 0 ? 0 : Math.round((correct / answers.length) * 100),
    byType: tally((a) => typeOf(a.questionId), TYPE_ORDER),
    bySection: tally((a) => a.section, SECTION_ORDER),
  };
}

/** A MockSession.mcq summary from answers, so sessions and retakes store the same shape. */
export function mcqOfAnswers(answers: readonly MockAnswer[], typeOf: (questionId: string) => QuestionType | undefined): MockSession["mcq"] {
  const b = breakdown(answers, typeOf);
  return { total: b.total, correct: b.correct, byType: Object.fromEntries(b.byType.map((t) => [t.key, { total: t.total, correct: t.correct }])) };
}

export type KeyFilter = "all" | "wrong" | "right";

export function filterKey<T extends { correct: boolean }>(items: readonly T[], filter: KeyFilter): T[] {
  return filter === "all" ? [...items] : items.filter((a) => (filter === "right" ? a.correct : !a.correct));
}

// ── the Mocks page: one row per mock ─────────────────────────────────────────

/** Fewest this-week questions a mock needs before it can start. */
export const MOCK_MIN_WEEK_QUESTIONS = 6;

export type MockStatus = "not-taken" | "in-progress" | "done";
/** "taken" once done; otherwise how the scheduled date compares with today. */
export type MockDateTag = "taken" | "today" | "overdue" | "upcoming";

export interface MockListRow {
  number: number;
  week: number;
  planDay: number; // 1–90
  planDayId: string; // where the Mock row is now (after moves and extension days)
  date: string | null;
  dateTag: MockDateTag;
  themeId: number;
  themeTitle: string;
  extra: MockExtra;
  program2: boolean;
  diagnostic: boolean;
  final: boolean;
  status: MockStatus;
  score: { correct: number; total: number } | null;
  retakes: number;
  ready: boolean;
  /** Why Start is disabled; shown with "Content not ready". */
  notReadyReason: string | null;
}

/** Whether the question bank can fill a mock's Python-theme and this-week parts. */
export function mockContentStatus(slot: Pick<MockSlot, "pythonTheme">, week: number, questions: readonly Question[]): { ready: boolean; reason: string | null } {
  const themeCount = questions.filter((q) => q.theme === slot.pythonTheme).length;
  if (themeCount < MOCK_THEME_COUNT) return { ready: false, reason: `Python theme ${slot.pythonTheme} questions are not written yet` };
  const weekCount = questions.filter((q) => q.theme === undefined && q.week === week).length;
  if (weekCount < MOCK_MIN_WEEK_QUESTIONS) return { ready: false, reason: `Week ${week} questions are not written yet` };
  return { ready: true, reason: null };
}

export function buildMockRows(args: {
  curriculum: Curriculum;
  days: readonly { day: { planDayId: string; date: string }; items: readonly { itemId: string }[] }[];
  today: string;
  sessions: readonly MockSession[];
  runs: readonly Pick<MockRun, "mockNumber">[];
  retakes: readonly Pick<MockRetake, "mockNumber">[];
  questions: readonly Question[];
}): MockListRow[] {
  const { curriculum, days, today, sessions, runs, retakes, questions } = args;
  const rows: MockListRow[] = [];
  for (const w of curriculum.weeks) {
    for (const d of w.days) {
      const slot = d.mock;
      if (!slot) continue;
      const homeDayId = `w${String(w.week).padStart(2, "0")}-d${d.day}`;
      const itemId = `${homeDayId}:learn`;
      const scheduled = days.find((x) => x.items.some((i) => i.itemId === itemId));
      const session = [...sessions].reverse().find((s) => s.mockNumber === slot.number);
      const status: MockStatus = session ? "done" : runs.some((r) => r.mockNumber === slot.number) ? "in-progress" : "not-taken";
      const date = scheduled?.day.date ?? null;
      const dateTag: MockDateTag = session ? "taken" : date === today ? "today" : date !== null && date < today ? "overdue" : "upcoming";
      const content = mockContentStatus(slot, w.week, questions);
      rows.push({
        number: slot.number,
        week: w.week,
        planDay: d.planDay,
        planDayId: scheduled?.day.planDayId ?? homeDayId,
        date,
        dateTag,
        themeId: slot.pythonTheme,
        themeTitle: curriculum.mockSpec.pythonThemes.find((t) => t.id === slot.pythonTheme)?.title ?? `Theme ${slot.pythonTheme}`,
        extra: slot.extra,
        program2: slot.program2,
        diagnostic: slot.diagnostic,
        final: slot.final,
        status,
        score: session ? { correct: session.mcq.correct, total: session.mcq.total } : null,
        retakes: retakes.filter((r) => r.mockNumber === slot.number).length,
        ready: content.ready,
        notReadyReason: content.reason,
      });
    }
  }
  return rows.sort((a, b) => a.number - b.number);
}
