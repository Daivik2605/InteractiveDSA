import { useState } from "react";
import { usePlanContext } from "../../app/PlanContext";
import { platformOf } from "../../lib/labels";
import type { Plan } from "../../lib/plan";
import type { Problem, ProblemAttempt } from "../../types/content";
import { DIFF_STYLE } from "./Row";
import { OUTCOMES } from "./LogModal";

export interface TodayProblem {
  attempt: ProblemAttempt;
  problem: Problem | undefined;
  platform: string | undefined;
}

/** Every problem attempt logged today, from any week (plan, redo, catch-up, found). Mock attempts are excluded. Newest first. */
export function problemsDoneToday(plan: Plan): TodayProblem[] {
  return plan.dayAttempts
    .filter((a) => a.date === plan.today)
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .map((attempt) => {
      const problem = plan.problemOf(attempt.problemId);
      return { attempt, problem, platform: problem ? platformOf(plan, problem) : undefined };
    });
}

const OUTCOME_LABEL = {
  ...(Object.fromEntries(OUTCOMES.map((o) => [o.value, o.label])) as Record<ProblemAttempt["outcome"], string>),
  failed: "Attempted",
};
const isSolved = (p: TodayProblem) => p.attempt.outcome !== "failed";
/** Distinct problems solved (a problem solved twice today counts once); attempted = tried but failed and not solved. */
export function todayCounts(items: TodayProblem[]) {
  const solved = new Set(items.filter(isSolved).map((p) => p.attempt.problemId));
  const attempted = new Set(items.filter((p) => !isSolved(p) && !solved.has(p.attempt.problemId)).map((p) => p.attempt.problemId));
  return { solved: solved.size, attempted: attempted.size };
}
const onPlatform = (p: TodayProblem, name: string) => (p.platform ?? "").toLowerCase().replace(/\s+/g, "") === name.toLowerCase();

function Item({ p }: { p: TodayProblem }) {
  const { attempt, problem } = p;
  const title = problem?.title ?? attempt.problemId;
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
      {problem?.url ? (
        <a href={problem.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">
          {title}<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="font-medium">{title}</span>
      )}
      {problem && <span className={`rounded px-1.5 py-0.5 text-xs ${DIFF_STYLE[problem.difficulty]}`}>{problem.difficulty}</span>}
      {p.platform && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{p.platform}</span>}
      <span className="text-xs text-slate-500">
        {attempt.outcome === "failed" ? "Attempted" : OUTCOME_LABEL[attempt.outcome]} · {attempt.minutes} min{attempt.isRedo ? " · redo" : ""}
      </span>
    </li>
  );
}

/** Today page: tabs for everything done today — all problems, LeetCode, HackerRank. */
export function TodaysProblemsTabs() {
  const { plan } = usePlanContext();
  const [tab, setTab] = useState<"all" | "LeetCode" | "HackerRank">("all");
  const all = problemsDoneToday(plan);
  const tabs = [
    { id: "all" as const, label: "Problems solved", items: all },
    { id: "LeetCode" as const, label: "LeetCode", items: all.filter((p) => onPlatform(p, "LeetCode")) },
    { id: "HackerRank" as const, label: "HackerRank", items: all.filter((p) => onPlatform(p, "HackerRank")) },
  ];
  const current = tabs.find((t) => t.id === tab)!;
  return (
    <section className="mt-8" aria-label="Problems done today">
      <div role="tablist" aria-label="Problems done today" className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`today-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="today-tabpanel"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"}`}
          >
            {t.label} <span className="tabular-nums text-xs text-slate-500">({todayCounts(t.items).solved})</span>
          </button>
        ))}
      </div>
      <ul id="today-tabpanel" role="tabpanel" aria-labelledby={`today-tab-${tab}`} className="mt-3 space-y-2">
        {current.items.length === 0 ? (
          <li className="text-sm text-slate-500">{tab === "all" ? "No problems logged today yet." : `No ${tab} problems logged today.`}</li>
        ) : (
          current.items.map((p) => <Item key={p.attempt.id} p={p} />)
        )}
      </ul>
    </section>
  );
}

/** Sidebar: always shows today's problems, whatever page is open. */
export function TodaysProblemsList() {
  const { plan } = usePlanContext();
  const items = problemsDoneToday(plan);
  const counts = todayCounts(items);
  return (
    <section aria-label="Problems solved today">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Problems solved today · {counts.solved}{counts.attempted > 0 ? ` · ${counts.attempted} attempted` : ""}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">None yet.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((p) => (
            <li key={p.attempt.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{p.problem?.title ?? p.attempt.problemId}</span>
              <span className="shrink-0 text-xs text-slate-500">{isSolved(p) ? (p.platform ?? "") : `Attempted${p.platform ? ` · ${p.platform}` : ""}`}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
