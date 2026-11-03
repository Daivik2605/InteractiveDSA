// The Content page's Problems tab: every plan problem (day problems, fallbacks, spare pool) with where it sits.
// Old-topic and pool problems never reveal the week or topic they came from: they are listed under the day they are
// scheduled on (old-topic) or in one flat spare list (pool).

import type { Curriculum, Problem, ProblemAttempt } from "../types/content";
import type { Plan } from "./plan";
import { platformOf } from "./labels";
import { weekOfProblemId } from "./problems";

export interface ContentProblem {
  problem: Problem;
  /** The week of the day it is scheduled on (spare problems: the week only once attempted, else undefined). */
  week: number | undefined;
  planDayId?: string;
  day?: number;
  date?: string;
  fallback: boolean;
  spare: boolean;
}

export type StatusFilter = "" | "none" | "alone" | "work";
export interface ContentFilters {
  platform: "" | "LeetCode" | "HackerRank";
  difficulty: "" | Problem["difficulty"];
  status: StatusFilter;
}

export const latestAttempt = (plan: Plan, problemId: string): ProblemAttempt | undefined =>
  plan.dayAttempts
    .filter((a) => a.problemId === problemId)
    .sort((a, b) => (a.date === b.date ? (a.id ?? 0) - (b.id ?? 0) : a.date < b.date ? -1 : 1))
    .at(-1);

/** Scheduled problems by week (in day order) and the flat spare list. */
export function contentProblems(plan: Plan, curriculum: Curriculum): { byWeek: Map<number, ContentProblem[]>; spare: ContentProblem[] } {
  const byWeek = new Map<number, ContentProblem[]>();
  const spare: ContentProblem[] = [];
  const attempted = new Set(plan.dayAttempts.map((a) => a.problemId));
  for (const w of curriculum.weeks) {
    const rows: ContentProblem[] = [];
    for (const d of w.days) {
      const planDayId = `w${String(w.week).padStart(2, "0")}-d${d.day}`;
      const date = plan.schedule.find((x) => x.planDayId === planDayId)?.date;
      const at = { week: w.week, planDayId, day: d.day, ...(date ? { date } : {}), spare: false };
      for (const problem of d.problems) rows.push({ problem, ...at, fallback: false });
      if (d.fallback) rows.push({ problem: d.fallback, ...at, fallback: true });
    }
    byWeek.set(w.week, rows);
    for (const problem of w.pool) {
      spare.push({ problem, week: attempted.has(problem.id) ? weekOfProblemId(problem.id) : undefined, fallback: false, spare: true });
    }
  }
  return { byWeek, spare };
}

export function matchesContentFilters(plan: Plan, row: ContentProblem, f: ContentFilters): boolean {
  const { problem } = row;
  if (f.platform && (platformOf(plan, problem) ?? "").toLowerCase() !== f.platform.toLowerCase()) return false;
  if (f.difficulty && problem.difficulty !== f.difficulty) return false;
  if (f.status) {
    const last = latestAttempt(plan, problem.id);
    if (f.status === "none") return !last;
    if (f.status === "alone") return last?.outcome === "alone";
    return !!last && last.outcome !== "alone"; // needs work: the latest try took a hint or the solution, or failed
  }
  return true;
}
