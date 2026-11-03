import { useSearchParams } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { curriculum } from "../../lib/curriculum";
import { currentWeek } from "../../lib/plan";
import { AddDayButton } from "../calendar/AddDayButton";
import { ConceptsTab } from "./ConceptsTab";
import { DataStructuresTab } from "./DataStructuresTab";
import { PatternsTab } from "./PatternsTab";
import { ProblemsTab } from "./ProblemsTab";
import { buttonClass, focusRing, selectClass } from "./ui";

export const CONTENT_TABS = [
  { id: "problems", label: "Problems" },
  { id: "data-structures", label: "Data Structures" },
  { id: "patterns", label: "Patterns" },
  { id: "concepts", label: "Concepts" },
] as const;
type TabId = (typeof CONTENT_TABS)[number]["id"];

const weekTitle = (week: number) => curriculum.weeks.find((w) => w.week === week)?.title ?? "";

/** Content: one place for the plan's problems, data structures, patterns and concepts, for all weeks or one. */
export function ContentPage() {
  const { plan } = usePlanContext();
  const [params, setParams] = useSearchParams();
  const rawWeek = Number(params.get("week"));
  const week = curriculum.weeks.some((w) => w.week === rawWeek) ? rawWeek : undefined;
  const tab: TabId = CONTENT_TABS.find((t) => t.id === params.get("tab"))?.id ?? "problems";

  const next = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v === undefined || v === "" ? q.delete(k) : q.set(k, v));
    return q;
  };
  const update = (patch: Record<string, string | undefined>) => setParams(next(patch), { replace: true });
  /** Link to this page with `patch` applied (used for the structure cards and the back link). */
  const hrefFor = (patch: Record<string, string | undefined>) => `/content?${next(patch).toString()}`;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Content</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label>
          <span className="mr-2">Week</span>
          <select aria-label="Week" className={selectClass} value={week ?? ""} onChange={(e) => update({ week: e.target.value })}>
            <option value="">All weeks</option>
            {curriculum.weeks.map((w) => (
              <option key={w.week} value={w.week}>Week {w.week} · {w.title}</option>
            ))}
          </select>
        </label>
        <button type="button" className={buttonClass} onClick={() => update({ week: String(currentWeek(plan)) })}>This week</button>
      </div>
      {week !== undefined && (
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-slate-100">Week {week} · {weekTitle(week)}</strong> — {curriculum.weeks.find((w) => w.week === week)!.goal}
        </p>
      )}

      <div role="tablist" aria-label="Content" className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {CONTENT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`content-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="content-panel"
            onClick={() => update({ tab: t.id })}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${focusRing} ${
              tab === t.id
                ? "border-indigo-600 text-indigo-800 dark:border-indigo-400 dark:text-indigo-200"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="content-panel" aria-labelledby={`content-tab-${tab}`} className="mt-4">
        {tab === "problems" && <ProblemsTab plan={plan} week={week} />}
        {tab === "data-structures" && <DataStructuresTab plan={plan} week={week} ds={params.get("ds") ?? ""} hrefFor={hrefFor} />}
        {tab === "patterns" && <PatternsTab week={week} />}
        {tab === "concepts" && <ConceptsTab week={week} />}
      </div>

      {week !== undefined && (
        <div className="mt-8">
          <AddDayButton week={week} />
        </div>
      )}
    </div>
  );
}
