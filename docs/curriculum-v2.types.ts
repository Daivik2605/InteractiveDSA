// Curriculum schema v2 — matches content/curriculum.json (version 2).
// Replaces the Curriculum section of docs/CONTENT_SCHEMA.md. Progress types are unchanged
// except MockSession (see bottom).

export type Difficulty = "Easy" | "Medium" | "Hard";
export type Platform = "LeetCode" | "HackerRank";

/**
 * core      — a problem for this week's topic
 * old-topic — a problem from an earlier week; the UI must hide `fromWeek` and the week's topic
 * fallback  — shown only when the redo queue is empty; never counts toward day status
 * pool      — spare problem; feeds mock Program 1 and free practice
 */
export type ProblemRole = "core" | "old-topic" | "fallback" | "pool";

export interface Problem {
  id: string;            // "w03-d2-p1", "w03-d7-fb", "w03-pool-04" — stable, never reuse
  platform: Platform;
  lcNumber?: number;     // real LeetCode problem number (v1 used it for roadmap position)
  title: string;
  difficulty: Difficulty;
  url: string;
  role: ProblemRole;
  fromWeek?: number;     // old-topic only
}

export type DayKind =
  | "new-topic"      // Day 1: cold try, then concepts + templates
  | "topic"          // practice on this week's topic
  | "python-fluency" // Week 1 Day 4: HackerRank Python
  | "old-topics"     // unlabelled problems from earlier weeks
  | "timed"          // 45 min per problem
  | "redo"           // redo queue first, fallback if empty
  | "wrap-up";       // Week 13 Day 6

export type MockExtra = "debug" | "explain-aloud" | "complexity-check";

export interface MockSlot {
  number: number;        // 1–45
  pythonTheme: number;   // 1–15, index into mockSpec.pythonThemes
  extra: MockExtra;
  program2: boolean;     // even-numbered mocks and Mock 45
  diagnostic: boolean;   // Mock 1
  final: boolean;        // Mock 45
  mcqCount: number;      // 18 (20 for the final)
}

export interface PlanDay {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  planDay: number;       // 1–90, position in the plan ignoring extensions
  kind: DayKind;
  mock: MockSlot | null; // non-null when planDay is odd; extension days never have one
  learn: string | null;  // learn item label; null = no learn item that day (coding only)
  problems: Problem[];   // counted toward day status
  fallback: Problem | null;
  timedMinutes: number | null;
  codingNote: string | null;
}

export interface Week {
  week: number;          // 1–13 (Week 13 has 6 days)
  title: string;
  goal: string;
  concepts: string[];
  visuals: string[];
  templates: string[];
  days: PlanDay[];
  pool: Problem[];
  problemCount: number;  // core problems
  oldTopicCount: number;
  mockCount: number;
}

export interface MockPart {
  part: "A" | "B" | "C" | "D";
  name: string;
  minutes: number;
  mix?: { python: number; currentAndLastWeek: number; spacedReview: number };
  source?: string;
  when?: string;
  rotation?: MockExtra[];
}

export interface MockSpec {
  rule: string;
  parts: MockPart[];
  pythonThemes: { id: number; title: string }[];
}

export interface PracticalTask {
  id: string;            // "pt-01"
  title: string;
  levels: [string, string, string];
  unlockWeek: number;    // first week a mock may use it
}

export interface Curriculum {
  version: 2;
  defaultStartDate: string; // YYYY-MM-DD
  totalPlanDays: number;    // 90
  mockSpec: MockSpec;
  practicalTasks: PracticalTask[];
  weeks: Week[];
}

// Progress: MockSession replaces the v1 shape (bump Dexie, migrate old rows).
export interface MockSession {
  id?: number;
  mockNumber: number;
  date: string;                                  // YYYY-MM-DD actually taken
  mcq: { total: number; correct: number; byType: Record<string, { total: number; correct: number }> };
  programs: { problemId: string; outcome: "alone" | "hint" | "solution" | "failed"; minutes: number; levelsDone?: number }[];
  extra: { kind: MockExtra; done: boolean };
  rating: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}
