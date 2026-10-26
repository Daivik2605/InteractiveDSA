import { useState } from "react";
import { Link } from "react-router-dom";
import { Markdown } from "../../components/Markdown";
import { usePlanContext } from "../../app/PlanContext";
import { curriculum, DAY_KIND_LABEL, weekOf } from "../../lib/curriculum";
import { formatShort } from "../../lib/dates";
import { platformOf } from "../../lib/labels";
import { currentWeek, type Plan } from "../../lib/plan";
import { OUTCOME_LABEL } from "../../lib/problems";
import { conceptsMarkdown, templatesMarkdown } from "../../lib/weekContent";
import type { Problem } from "../../types/content";
import { AddDayButton } from "../calendar/AddDayButton";
import { DIFF_STYLE } from "../today/Row";

const TABS = ["Concepts", "Templates", "Problems"] as const;
type Tab = (typeof TABS)[number];

/** A week's lesson: Concepts, Templates and the Problems (day list). A Visuals tab comes later. */
export function WeeksPage() {
  const { plan } = usePlanContext();
  const [week, setWeek] = useState(() => currentWeek(plan));
  const [tab, setTab] = useState<Tab>("Concepts");
  const w = weekOf(week)!;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Weeks</h1>
      <label className="mt-3 block text-sm">
        Week
        <select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
        >
          {curriculum.weeks.map((x) => (
            <option key={x.week} value={x.week}>
              Week {x.week} · {x.title}
            </option>
          ))}
        </select>
      </label>
      <h2 className="mt-4 text-xl font-semibold">Week {w.week} · {w.title}</h2>
      <p className="text-slate-600 dark:text-slate-400">{w.goal}</p>

      <div role="tablist" aria-label="Week lesson" className="mt-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="week-panel"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t
                ? "border-indigo-600 text-indigo-800 dark:border-indigo-400 dark:text-indigo-200"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="week-panel" aria-labelledby={`tab-${tab}`} className="mt-4">
        {tab === "Concepts" && <Lesson text={conceptsMarkdown(week)} what="concept notes" week={week} />}
        {tab === "Templates" && <Lesson text={templatesMarkdown(week)} what="templates" week={week} />}
        {tab === "Problems" && <ProblemsTab plan={plan} week={week} />}
      </div>

      <div className="mt-8">
        <AddDayButton week={week} />
      </div>
    </div>
  );
}

function Lesson({ text, what, week }: { text: string | undefined; what: string; week: number }) {
  if (!text) return <p className="text-slate-500">No {what} written for Week {week} yet.</p>;
  return <Markdown className="text-base [&_h3]:mt-6 [&_h3]:text-lg">{text}</Markdown>;
}

/** The week's day list. Old-topic problems are listed without their source week. */
function ProblemsTab({ plan, week }: { plan: Plan; week: number }) {
  const w = weekOf(week)!;
  const dateOf = (planDayId: string) => plan.schedule.find((d) => d.planDayId === planDayId)?.date;
  const lastOutcome = (id: string) => {
    const tries = plan.dayAttempts.filter((a) => a.problemId === id);
    const last = tries.sort((a, b) => (a.date === b.date ? (a.id ?? 0) - (b.id ?? 0) : a.date < b.date ? -1 : 1)).at(-1);
    return last ? OUTCOME_LABEL[last.outcome] : undefined;
  };
  const line = (p: Problem, tag?: string) => (
    <li key={p.id} className="flex flex-wrap items-center gap-2 py-1 text-sm">
      <Link to={`/problems/${encodeURIComponent(p.id)}`} className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">
        {p.title}
      </Link>
      <span className={`rounded px-1.5 py-0.5 text-xs ${DIFF_STYLE[p.difficulty]}`}>{p.difficulty}</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{platformOf(plan, p)}</span>
      {tag && <span className="text-xs text-slate-500">{tag}</span>}
      <span className="text-xs text-slate-500">{lastOutcome(p.id) ?? "not attempted"}</span>
    </li>
  );

  return (
    <ol className="space-y-4" aria-label={`Week ${week} days`}>
      {w.days.map((d) => {
        const id = `w${String(week).padStart(2, "0")}-d${d.day}`;
        const date = dateOf(id);
        return (
          <li key={id}>
            <h3 className="font-semibold">
              Day {d.day} <span className="font-normal text-slate-600 dark:text-slate-400">· {DAY_KIND_LABEL[d.kind]}{date ? ` · ${formatShort(date)}` : ""}</span>
            </h3>
            {d.mock && <p className="text-sm text-slate-600 dark:text-slate-400">Mock {d.mock.number}{d.mock.diagnostic ? " (diagnostic)" : d.mock.final ? " (final)" : ""}</p>}
            {d.codingNote && <p className="text-sm text-slate-600 dark:text-slate-400">{d.codingNote}</p>}
            <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-900">
              {d.problems.map((p) => line(p))}
              {d.fallback && line(d.fallback, "fallback if no redos are due")}
            </ul>
            {d.problems.length === 0 && !d.fallback && <p className="text-sm text-slate-500">No problems.</p>}
          </li>
        );
      })}
    </ol>
  );
}
