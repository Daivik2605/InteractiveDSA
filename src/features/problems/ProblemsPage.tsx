import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { curriculum } from "../../lib/curriculum";
import { formatDayMonth } from "../../lib/dates";
import {
  OUTCOME_LABEL,
  allTags,
  buildProblemRows,
  filterProblems,
  sortProblems,
  type Outcome,
  type ProblemFilters,
  type ProblemSort,
  type ProblemSource,
} from "../../lib/problems";
import type { Difficulty } from "../../types/content";
import { DIFF_STYLE } from "../today/Row";
import { FoundProblemModal } from "./FoundProblemModal";

const sel = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950";
const SOURCE_LABEL: Record<ProblemSource, string> = { plan: "Plan", custom: "Added to a day", found: "Found" };

export function ProblemsPage() {
  const { plan } = usePlanContext();
  const [filters, setFilters] = useState<ProblemFilters>({});
  const [sort, setSort] = useState<ProblemSort>("last");
  const [finding, setFinding] = useState(false);

  const rows = useMemo(() => buildProblemRows(plan), [plan]);
  const shown = useMemo(() => sortProblems(filterProblems(rows, filters), sort), [rows, filters, sort]);
  const tags = useMemo(() => allTags(rows), [rows]);
  const set = <K extends keyof ProblemFilters>(k: K, v: ProblemFilters[K] | "") =>
    setFilters((f) => {
      const next = { ...f };
      if (v === "" || v === undefined) delete next[k];
      else next[k] = v as ProblemFilters[K];
      return next;
    });

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Problems</h1>
        <button type="button" onClick={() => setFinding(true)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Log a problem I found</button>
      </div>

      <section aria-label="Filters" className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="sr-only">Search problems</span>
          <input type="search" placeholder="Search title, description, comments, code" value={filters.search ?? ""} onChange={(e) => set("search", e.target.value)} className={`${sel} w-full`} />
        </label>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Week" className={sel} value={filters.week ?? ""} onChange={(e) => set("week", e.target.value ? Number(e.target.value) : "")}>
            <option value="">All weeks</option>
            {curriculum.weeks.map((w) => <option key={w.week} value={w.week}>Week {w.week}</option>)}
          </select>
          <select aria-label="Pattern tag" className={sel} value={filters.tag ?? ""} onChange={(e) => set("tag", e.target.value)}>
            <option value="">All tags</option>
            {tags.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="Difficulty" className={sel} value={filters.difficulty ?? ""} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
            <option value="">All difficulties</option>
            {(["Easy", "Medium", "Hard"] as const).map((d) => <option key={d}>{d}</option>)}
          </select>
          <select aria-label="Last outcome" className={sel} value={filters.outcome ?? ""} onChange={(e) => set("outcome", e.target.value as Outcome | "none")}>
            <option value="">Any outcome</option>
            <option value="none">Not attempted</option>
            {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
          </select>
          <select aria-label="Source" className={sel} value={filters.source ?? ""} onChange={(e) => set("source", e.target.value as ProblemSource)}>
            <option value="">All sources</option>
            {(Object.keys(SOURCE_LABEL) as ProblemSource[]).map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
          <select aria-label="Confidence at most" className={sel} value={filters.maxConfidence ?? ""} onChange={(e) => set("maxConfidence", e.target.value ? Number(e.target.value) : "")}>
            <option value="">Any confidence</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Confidence ≤ {n}</option>)}
          </select>
          <select aria-label="Sort by" className={sel} value={sort} onChange={(e) => setSort(e.target.value as ProblemSort)}>
            <option value="last">Sort: last attempted</option>
            <option value="confidence">Sort: confidence (lowest first)</option>
            <option value="attempts">Sort: most attempts</option>
          </select>
        </div>
      </section>

      <p className="mt-4 text-sm text-slate-500" role="status">{shown.length} of {rows.length} problems</p>
      <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-800" aria-label="Problems">
        {shown.map((r) => (
          <li key={r.id} className="py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/problems/${encodeURIComponent(r.id)}`} className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">{r.title}</Link>
              <span className={`rounded px-1.5 py-0.5 text-xs ${DIFF_STYLE[r.difficulty]}`}>{r.difficulty}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{SOURCE_LABEL[r.source]}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {r.week !== undefined && `Week ${r.week} · `}{r.platform && `${r.platform} · `}{r.attempts} attempt{r.attempts === 1 ? "" : "s"}
              {r.lastAttempt && ` · last: ${OUTCOME_LABEL[r.lastAttempt.outcome]} on ${formatDayMonth(r.lastAttempt.date)}`}
              {r.confidence !== undefined && ` · confidence ${r.confidence}/5`}
              {r.tags.length > 0 && ` · ${r.tags.join(", ")}`}
            </p>
          </li>
        ))}
      </ul>
      {finding && <FoundProblemModal onClose={() => setFinding(false)} />}
    </div>
  );
}
