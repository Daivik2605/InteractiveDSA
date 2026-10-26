import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { curriculum } from "../../lib/curriculum";
import { formatShort } from "../../lib/dates";
import { buildMockRows, EXTRA_LABEL, type MockDateTag, type MockListRow } from "../../lib/mock";
import { bank } from "../../lib/questions";

const TAG_STYLE: Record<MockDateTag, string> = {
  taken: "",
  today: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
  overdue: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
  upcoming: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};
const TAG_LABEL: Record<MockDateTag, string> = { taken: "", today: "Today", overdue: "Overdue", upcoming: "Upcoming" };

const linkBtn = "rounded-md border border-indigo-600 px-2.5 py-1 text-sm text-indigo-700 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-950";

function statusText(r: MockListRow): string {
  if (r.status === "in-progress") return "In progress";
  if (r.status === "not-taken") return "Not taken";
  const score = r.score ? ` ${r.score.correct}/${r.score.total}` : "";
  return `Done${score}${r.retakes > 0 ? ` · ${r.retakes} retake${r.retakes === 1 ? "" : "s"}` : ""}`;
}

function Actions({ r, today }: { r: MockListRow; today: string }) {
  if (r.status === "done") return <Link to={`/mock/${r.number}`} className={linkBtn}>View result</Link>;
  if (r.status === "in-progress") return <Link to={`/mock/${r.number}`} className={linkBtn}>Resume</Link>;
  if (!r.ready) {
    return <button type="button" disabled className="cursor-not-allowed rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-400 dark:border-slate-700">Start</button>;
  }
  const early = r.date !== null && r.date > today;
  return <Link to={`/mock/${r.number}`} className={linkBtn}>{early ? "Do it earlier" : "Start"}</Link>;
}

export function MocksPage() {
  const { plan, db } = usePlanContext();
  const sessions = useLiveQuery(() => db.mocks.toArray(), [db]);
  const runs = useLiveQuery(() => db.mockRuns.toArray(), [db]);
  const retakes = useLiveQuery(() => db.mockRetakes.toArray(), [db]);

  const rows = useMemo(
    () => (sessions && runs && retakes ? buildMockRows({ curriculum, days: plan.days, today: plan.today, sessions, runs, retakes, questions: bank.questions }) : null),
    [plan.days, plan.today, sessions, runs, retakes],
  );

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Mocks</h1>
      <p className="text-slate-600 dark:text-slate-400">All 45 mocks. Dates follow your start date and any extension days. You can do a mock before its day: it ticks that day's Mock row.</p>
      {!rows ? (
        <p className="mt-4 text-slate-500">Loading…</p>
      ) : (
        curriculum.weeks.map((w) => {
          const mine = rows.filter((r) => r.week === w.week);
          if (mine.length === 0) return null;
          return (
            <section key={w.week} aria-label={`Week ${w.week}`} className="mt-6">
              <h2 className="text-lg font-semibold">Week {w.week} <span className="text-base font-normal text-slate-500">· {w.title}</span></h2>
              <ul className="mt-2 space-y-2">
                {mine.map((r) => (
                  <li key={r.number} aria-label={`Mock ${r.number}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Mock {r.number}</span>
                      {r.diagnostic && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">Diagnostic</span>}
                      {r.final && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">Final</span>}
                      {r.dateTag !== "taken" && <span className={`rounded px-1.5 py-0.5 text-xs ${TAG_STYLE[r.dateTag]}`}>{TAG_LABEL[r.dateTag]}</span>}
                      <span className="text-sm text-slate-600 dark:text-slate-400">{r.date ? formatShort(r.date) : "no date"}</span>
                      <span className="ml-auto text-sm font-medium" aria-label="Status">{statusText(r)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Week {r.week} · Day {r.planDay} of 90 · {r.themeTitle} · Extra: {EXTRA_LABEL[r.extra].toLowerCase()}{r.program2 ? " · + Program 2" : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Actions r={r} today={plan.today} />
                      {!r.ready && r.status === "not-taken" && <span className="text-xs text-amber-700 dark:text-amber-300">Content not ready: {r.notReadyReason}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
