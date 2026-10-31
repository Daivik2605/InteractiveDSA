import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { curriculum } from "../../lib/curriculum";
import { buildMockRows, EXTRA_LABEL, type MockListRow } from "../../lib/mock";
import { bank } from "../../lib/questions";

const linkBtn = "rounded-md border border-indigo-600 px-2.5 py-1 text-sm text-indigo-700 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-950";

function statusText(r: MockListRow): string {
  if (r.status === "in-progress") return "In progress";
  if (r.status === "not-taken") return "Not taken";
  const score = r.score ? ` ${r.score.correct}/${r.score.total}` : "";
  return `Done${score}${r.retakes > 0 ? ` · ${r.retakes} retake${r.retakes === 1 ? "" : "s"}` : ""}`;
}

function Actions({ r }: { r: MockListRow }) {
  if (r.status === "done") return <Link to={`/mock/${r.number}`} className={linkBtn}>View result</Link>;
  if (r.status === "in-progress") return <Link to={`/mock/${r.number}`} className={linkBtn}>Resume</Link>;
  if (!r.ready) {
    return <button type="button" disabled className="cursor-not-allowed rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-400 dark:border-slate-700">Start</button>;
  }
  return <Link to={`/mock/${r.number}`} className={linkBtn}>Start</Link>;
}

export function MocksPage() {
  const { db } = usePlanContext();
  const sessions = useLiveQuery(() => db.mocks.toArray(), [db]);
  const runs = useLiveQuery(() => db.mockRuns.toArray(), [db]);
  const retakes = useLiveQuery(() => db.mockRetakes.toArray(), [db]);

  const rows = useMemo(
    () => (sessions && runs && retakes ? buildMockRows({ curriculum, sessions, runs, retakes, questions: bank.questions }) : null),
    [sessions, runs, retakes],
  );

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Mocks</h1>
      <p className="text-slate-600 dark:text-slate-400">26 mocks in a sequence, about two per week. The week on each one is only a hint of when it fits: start any ready mock at any time, in any order.</p>
      {!rows ? (
        <p className="mt-4 text-slate-500">Loading…</p>
      ) : (
        <ol className="mt-4 space-y-2" aria-label="Mock sequence">
          {rows.map((r) => (
            <li key={r.number} aria-label={`Mock ${r.number}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Mock {r.number}</span>
                {r.diagnostic && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">Diagnostic</span>}
                {r.final && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">Final</span>}
                <span className="text-sm text-slate-600 dark:text-slate-400">Good after Week {r.suggestedAfterWeek}</span>
                <span className="ml-auto text-sm font-medium" aria-label="Status">{statusText(r)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {r.themeTitle} · Extra: {EXTRA_LABEL[r.extra].toLowerCase()}{r.program2 ? " · + Program 2" : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Actions r={r} />
                {!r.ready && r.status === "not-taken" && <span className="text-xs text-amber-700 dark:text-amber-300">Content not ready: {r.notReadyReason}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
