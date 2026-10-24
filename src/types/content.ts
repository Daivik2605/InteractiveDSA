// Copied from docs/CONTENT_SCHEMA.md — keep in sync with that file.

// ── Curriculum (content/curriculum.json) ─────────────────────────────────────
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Problem {
  id: string; // "w03-d2-p1" — stable, never reuse
  title: string;
  difficulty: Difficulty;
  url: string; // LeetCode URL
  lcNumber?: number; // position in the original 150-problem roadmap
  source: "original" | "added";
}

export interface PlanDay {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  learn: string; // label of the learn item
  problems: Problem[];
  codingNote: string | null; // e.g. day 7 redo instructions
}

export interface Week {
  week: number; // 1–13
  title: string;
  goal: string;
  concepts: string[];
  visuals: string[]; // which visualizer scenes to build
  templates: string[]; // Python templates to include
  days: PlanDay[];
  problemCount: number;
}

export interface Curriculum {
  version: number;
  defaultStartDate: string;
  weeks: Week[];
}

// ── Questions (content/questions/week-NN.json) ───────────────────────────────
export type QuestionType = "pattern" | "complexity" | "output" | "bug" | "approach" | "concept";

export interface Question {
  id: string; // "w01-q07" — stable, never reuse
  week: number;
  type: QuestionType;
  pattern: string; // e.g. "Sliding Window", used by the dashboard
  difficulty: "medium" | "hard"; // interview level
  prompt: string; // markdown allowed
  code?: string; // Python 3.11
  options: string[]; // 4 options
  answer: number; // index into options
  explanation: string; // why, incl. time/space when relevant
  complexity?: { time: string; space: string };
  visual?: { component: string; props: Record<string, unknown> }; // optional diagram
  tags?: string[];
}

export interface DrillPrompt {
  id: string; // "w03-dr04"
  week: number;
  description: string; // 1–3 sentence problem statement, no title
  answer: string; // pattern name
  distractors: string[]; // 5 other pattern names
}

export interface QuestionFile {
  week: number;
  questions: Question[];
  drill?: DrillPrompt[];
}

// ── Progress (Dexie / IndexedDB) ─────────────────────────────────────────────
// Completions belong to plan items, not dates, so extensions can move dates safely.
export interface ItemCompletion {
  itemId: string; // primary key: a problem id ("w03-d2-p1"), "w03-d2:learn", or a slot "w03-d7:s1" / "w03-x1:s1"
  planDayId: string; // "w03-d2" or extension day "w03-x1"
  completedOn: string; // YYYY-MM-DD when actually done
  attemptId?: number; // the ProblemAttempt that produced this completion (lets "untick" undo it)
}

export interface WeekExtension {
  id?: number;
  week: number;
  extraDays: number; // 1–14 total per week (sum of all extensions for that week)
  reason?: string;
  createdOn: string; // YYYY-MM-DD
}

// Computed in lib/schedule.ts, never stored:
export interface ScheduledDay {
  planDayId: string; // "w03-d2" | "w03-x1"
  week: number;
  kind: "plan" | "extension";
  date: string; // YYYY-MM-DD from startDate + preceding days + extensions
}

export interface ProblemAttempt {
  id?: number;
  problemId: string;
  date: string;
  outcome: "alone" | "hint" | "solution" | "failed";
  minutes: number;
  note?: string;
  isRedo: boolean;
}

export interface RedoTask {
  id?: number;
  problemId: string;
  dueOn: string;
  doneOn?: string; // closed as completed (re-solved alone)
  attemptedOn?: string; // closed as attempted (hint/solution): a fresh redo chain replaced it
  createdByAttemptId?: number;
  closedByAttemptId?: number;
}

// Added in Dexie schema v2 (SPEC 3.13, 3.14)
export interface CustomItem {
  id: string; // "c-<uuid>"; used as itemId in completions and problemId in attempts/redos
  planDayId?: string; // day it belongs to ("w03-d2" or "w03-x1"); omitted = journal-only "found" problem
  week: number; // topic week, for filtering
  kind: "problem" | "task";
  platform?: string; // "LeetCode" | other; problems only
  title: string;
  difficulty?: Difficulty; // problems only
  url?: string;
  createdOn: string;
}

export interface ItemMove {
  itemId: string; // primary key: plan item id that was moved
  fromPlanDayId: string;
  toPlanDayId: string; // same week or its extension days
  movedOn: string;
}

// Journal data for ANY problem (plan, custom or found).
export interface ProblemEntry {
  problemId: string; // primary key: plan problem id, or a CustomItem id ("c-…")
  description?: string; // markdown
  approach?: string; // markdown
  code?: string; // Python
  timeComplexity?: string;
  spaceComplexity?: string;
  insight?: string; // key insight / what I missed
  comments?: string;
  confidence?: 1 | 2 | 3 | 4 | 5;
  tags: string[]; // pattern tags
  updatedOn: string;
}

export interface DayLog {
  planDayId: string; // primary key
  notes: string; // markdown
  minutes: number;
  links: string[];
  updatedOn: string;
}

export interface QuizAnswer {
  id?: number;
  questionId: string;
  correct: boolean;
  answeredAt: string; // ISO timestamp
  mode: "weekly" | "review" | "targeted" | "drill";
  ms?: number; // time to answer (drill)
}

export interface CardState {
  questionId: string;
  box: 1 | 2 | 3 | 4 | 5;
  dueOn: string;
}

export interface RestDay {
  date: string;
}

export interface MockSession {
  id?: number;
  date: string;
  problemIds: string[];
  checklist: Record<string, boolean[]>;
  rating: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface Settings {
  id: "settings";
  startDate: string;
  theme: "light" | "dark" | "system";
}
