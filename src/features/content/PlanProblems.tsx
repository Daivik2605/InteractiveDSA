import { useState } from "react";
import { contentProblems, matchesContentFilters, type ContentFilters, type ContentProblem } from "../../lib/contentProblems";
import { curriculum } from "../../lib/curriculum";
import type { Plan } from "../../lib/plan";
import { EmptyState, SectionHeading, selectClass, focusRing } from "./ui";
import { ProblemLine } from "./ProblemLine";

/**
 * Plan problems with the platform / difficulty / status filters, grouped by week, and a "Show spare problems" toggle.
 * `weeks` is the set of weeks to list (undefined = every week). `spareFilter` picks which spare problems the toggle reveals.
 * Old-topic problems sit under the day they are scheduled on and spare problems carry no week: neither shows where it came from.
 */
export function PlanProblems({ plan, weeks, spareFilter }: { plan: Plan; weeks: readonly number[] | undefined; spareFilter: (r: ContentProblem) => boolean }) {
  const [filters, setFilters] = useState<ContentFilters>({ platform: "", difficulty: "", status: "" });
  const [showSpare, setShowSpare] = useState(false);
  const { byWeek, spare } = contentProblems(plan, curriculum);
  const keep = (r: ContentProblem) => matchesContentFilters(plan, r, filters);

  const shownWeeks = curriculum.weeks.filter((w) => weeks === undefined || weeks.includes(w.week));
  const spareRows = spare.filter((r) => keep(r) && spareFilter(r));
  const shown = shownWeeks.reduce((n, w) => n + (byWeek.get(w.week) ?? []).filter(keep).length, 0) + (showSpare ? spareRows.length : 0);

  return (
    <div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Platform" className={selectClass} value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value as ContentFilters["platform"] })}>
          <option value="">All platforms</option>
          <option value="LeetCode">LeetCode</option>
          <option value="HackerRank">HackerRank</option>
        </select>
        <select aria-label="Difficulty" className={selectClass} value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as ContentFilters["difficulty"] })}>
          <option value="">All difficulties</option>
          {(["Easy", "Medium", "Hard"] as const).map((d) => <option key={d}>{d}</option>)}
        </select>
        <select aria-label="Status" className={selectClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as ContentFilters["status"] })}>
          <option value="">Any status</option>
          <option value="none">Not attempted</option>
          <option value="alone">Solved alone</option>
          <option value="work">Needs work</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" className={`h-4 w-4 rounded accent-indigo-600 ${focusRing}`} checked={showSpare} onChange={(e) => setShowSpare(e.target.checked)} /> Show spare problems
        </label>
      </div>
      <p className="mt-3 text-sm text-slate-500" role="status">{shown} problem{shown === 1 ? "" : "s"}</p>

      {shownWeeks.map((w) => {
        const rows = (byWeek.get(w.week) ?? []).filter(keep);
        if (rows.length === 0) return null;
        return (
          <section key={w.week} className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800" aria-label={`Week ${w.week} problems`}>
            <h3 className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-800 dark:bg-slate-900/50">Week {w.week} · {w.title}</h3>
            <ul className="divide-y divide-slate-100 px-3 dark:divide-slate-900">
              {rows.map((r) => <ProblemLine key={r.problem.id} plan={plan} row={r} />)}
            </ul>
          </section>
        );
      })}

      {showSpare && (
        <section aria-label="Spare problems">
          <SectionHeading level={3}>Spare problems</SectionHeading>
          <p className="text-sm text-slate-500">Extra problems used by mocks and free practice.</p>
          {spareRows.length === 0 ? (
            <EmptyState>No spare problems match.</EmptyState>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 px-3 dark:divide-slate-900 dark:border-slate-800">
              {spareRows.map((r) => <ProblemLine key={r.problem.id} plan={plan} row={r} />)}
            </ul>
          )}
        </section>
      )}
      {shown === 0 && !showSpare && <EmptyState>No problems match these filters.</EmptyState>}
    </div>
  );
}
