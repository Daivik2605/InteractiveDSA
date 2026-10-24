// The Problems page's data: every plan, custom and found problem with its journal and attempts.
// Pure: filtering, searching and sorting live here so they can be unit-tested.

import { curriculum } from "./curriculum";
import type { Plan } from "./plan";
import type { Difficulty, ProblemAttempt, ProblemEntry } from "../types/content";

export type ProblemSource = "plan" | "custom" | "found";
export type Outcome = ProblemAttempt["outcome"];

export interface ProblemRow {
  id: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  source: ProblemSource;
  week: number;
  platform?: string;
  tags: string[];
  attempts: number;
  lastAttempt?: ProblemAttempt;
  confidence?: number;
  entry?: ProblemEntry;
}

export interface ProblemFilters {
  week?: number;
  tag?: string;
  difficulty?: Difficulty;
  outcome?: Outcome | "none"; // "none" = never attempted
  source?: ProblemSource;
  maxConfidence?: number; // confidence <= N (unrated problems are excluded)
  search?: string;
}

export type ProblemSort = "last" | "confidence" | "attempts";

const latest = (a: ProblemAttempt, b: ProblemAttempt) => (a.date === b.date ? (a.id ?? 0) - (b.id ?? 0) : a.date < b.date ? -1 : 1);

export function buildProblemRows(plan: Plan): ProblemRow[] {
  const byProblem = new Map<string, ProblemAttempt[]>();
  for (const a of plan.snapshot.attempts) byProblem.set(a.problemId, [...(byProblem.get(a.problemId) ?? []), a]);
  const rowOf = (base: Pick<ProblemRow, "id" | "title" | "url" | "difficulty" | "source" | "week" | "platform">): ProblemRow => {
    const attempts = [...(byProblem.get(base.id) ?? [])].sort(latest);
    const entry = plan.entries.get(base.id);
    return { ...base, tags: entry?.tags ?? [], attempts: attempts.length, lastAttempt: attempts.at(-1), confidence: entry?.confidence, entry };
  };
  const planRows = curriculum.weeks.flatMap((w) =>
    w.days.flatMap((d) =>
      d.problems.map((p) => rowOf({ id: p.id, title: p.title, url: p.url, difficulty: p.difficulty, source: "plan", week: w.week })),
    ),
  );
  const customRows = plan.snapshot.customItems
    .filter((c) => c.kind === "problem")
    .map((c) =>
      rowOf({
        id: c.id,
        title: c.title,
        url: c.url ?? "",
        difficulty: c.difficulty ?? "Medium",
        source: c.planDayId ? "custom" : "found",
        week: c.week,
        platform: c.platform,
      }),
    );
  return [...planRows, ...customRows];
}

/** Case-insensitive substring search over title, description, comments and code. */
export function matchesSearch(row: ProblemRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.title, row.entry?.description, row.entry?.comments, row.entry?.code].some((t) => t?.toLowerCase().includes(q));
}

export function filterProblems(rows: readonly ProblemRow[], f: ProblemFilters): ProblemRow[] {
  return rows.filter(
    (r) =>
      (f.week === undefined || r.week === f.week) &&
      (!f.tag || r.tags.includes(f.tag)) &&
      (!f.difficulty || r.difficulty === f.difficulty) &&
      (!f.outcome || (f.outcome === "none" ? r.attempts === 0 : r.lastAttempt?.outcome === f.outcome)) &&
      (!f.source || r.source === f.source) &&
      (f.maxConfidence === undefined || (r.confidence !== undefined && r.confidence <= f.maxConfidence)) &&
      (!f.search || matchesSearch(r, f.search)),
  );
}

export function sortProblems(rows: readonly ProblemRow[], sort: ProblemSort): ProblemRow[] {
  const key = (r: ProblemRow): number => {
    if (sort === "attempts") return -r.attempts; // most attempts first
    if (sort === "confidence") return r.confidence ?? 99; // lowest first, unrated last
    return r.lastAttempt ? -Date.parse(r.lastAttempt.date) : Infinity; // most recent first, never attempted last
  };
  return [...rows].sort((a, b) => key(a) - key(b) || a.title.localeCompare(b.title));
}

export const allTags = (rows: readonly ProblemRow[]): string[] => [...new Set(rows.flatMap((r) => r.tags))].sort();

export const OUTCOME_LABEL: Record<Outcome, string> = {
  alone: "Solved alone",
  hint: "Needed hint",
  solution: "Needed solution",
  failed: "Failed",
};

/** Plan problem ids start with their week: "w03-d2-p1" → 3. */
export const weekOfProblemId = (id: string): number => Number(/^w(\d+)-/.exec(id)?.[1] ?? 0);
