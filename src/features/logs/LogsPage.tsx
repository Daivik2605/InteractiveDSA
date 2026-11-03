import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Modal } from "../../app/Modal";
import { usePlanContext } from "../../app/PlanContext";
import { deleteLog, type LogRemoval } from "../../lib/actions";
import { buildConceptCards, getConceptLinks } from "../../lib/concepts";
import { curriculum } from "../../lib/curriculum";
import { formatLong, formatShort } from "../../lib/dates";
import { buildLogs, describeRemoval, groupByDate, LOG_KINDS, type LogEntry, type LogKind } from "../../lib/logs";
import { getResources } from "../../lib/resources";
import { focusRing } from "../content/ui";

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "14:32", or "Mon 2 Nov 14:32" when it was recorded on a different day than the entry's date. */
export function formatMoment(at: string, entryDate: string): string {
  const d = new Date(at);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return localDate(d) === entryDate ? time : `${formatShort(localDate(d))} ${time}`;
}

const KIND_STYLE: Record<LogKind, string> = {
  problem: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  tick: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  mock: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  note: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
  reading: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  plan: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

/** Everything you did or added, newest first, with the date, the plan day and the time it was recorded. */
export function LogsPage() {
  const { plan, db } = usePlanContext();
  const [kind, setKind] = useState<LogKind | "all">("all");
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<LogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tables = useLiveQuery(async () => ({
    attempts: await db.attempts.toArray(),
    completions: await db.completions.toArray(),
    mocks: await db.mocks.toArray(),
    retakes: await db.mockRetakes.toArray(),
    dayNotes: await db.dayNotes.toArray(),
    dayLogs: await db.dayLogs.toArray(),
    topicChecks: await db.topicChecks.toArray(),
    conceptChecks: await db.conceptChecks.toArray(),
    restDays: await db.restDays.toArray(),
    missedReasons: await db.missedReasons.toArray(),
    customItems: await db.customItems.toArray(),
    journal: await db.problemEntries.toArray(),
    extensions: await db.extensions.toArray(),
  }), [db]);

  const entries = useMemo(() => {
    if (!tables) return [];
    const topics = new Map((getResources()?.weeks ?? []).flatMap((w) => w.topics).map((t) => [t.id, t.title]));
    const concepts = new Map(buildConceptCards(curriculum, getResources(), getConceptLinks()).map((c) => [c.id, c.title]));
    const customs = new Map(tables.customItems.map((c) => [c.id, c]));
    return buildLogs(tables, {
      problem: (id) => plan.problemOf(id)?.title ?? customs.get(id)?.title ?? id,
      topic: (id) => topics.get(id),
      concept: (id) => concepts.get(id),
      custom: (id) => customs.get(id),
      planDay: (planDayId) => {
        const d = plan.schedule.find((x) => x.planDayId === planDayId);
        if (!d) return planDayId;
        const n = Number(planDayId.split(/[dx]/)[1]);
        return d.kind === "extension" ? `Week ${d.week} · Extension ${n}` : `Week ${d.week} · Day ${n}`;
      },
    });
  }, [tables, plan]);

  const q = query.trim().toLowerCase();
  const shown = entries.filter((e) => (kind === "all" || e.kind === kind) && (!q || `${e.title} ${e.detail ?? ""}`.toLowerCase().includes(q)));
  const groups = groupByDate(shown);

  const dayLabel = (date: string) => {
    const d = plan.byDate.get(date)?.day;
    if (!d) return date < plan.startDate ? "Before the plan" : "Outside the plan";
    const n = Number(d.planDayId.split(/[dx]/)[1]);
    return d.kind === "extension" ? `Week ${d.week} · Extension day ${n}` : `Week ${d.week} · Day ${n}`;
  };

  async function confirmDelete(removal: LogRemoval) {
    try {
      await deleteLog(db, removal);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setDeleting(null);
  }

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${focusRing} ${on ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500" : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"}`;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Logs</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Everything you did or added, newest first. Deleting a log removes it for good.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="min-w-0 flex-1 basis-56">
          <span className="sr-only">Search logs</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs"
            className={`w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 ${focusRing}`}
          />
        </label>
      </div>
      <div role="group" aria-label="Show" className="mt-3 flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")} className={chip(kind === "all")}>All</button>
        {LOG_KINDS.map((k) => (
          <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={chip(kind === k.id)}>{k.label}</button>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

      {!tables ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-500" role="status">{shown.length} log{shown.length === 1 ? "" : "s"}</p>
          {groups.length === 0 && (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
              {entries.length === 0 ? "Nothing logged yet. Problems you solve, ticks, mocks, notes and anything you add will appear here." : "No logs match."}
            </p>
          )}
          {groups.map((g) => (
            <section key={g.date} className="mt-6" aria-label={g.date}>
              <h2 className="text-base font-semibold">
                {formatLong(g.date)} <span className="font-normal text-slate-500">· {dayLabel(g.date)}</span>
              </h2>
              <ul className="mt-2 space-y-2">
                {g.entries.map((e) => (
                  <li key={e.key} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${KIND_STYLE[e.kind]}`}>{LOG_KINDS.find((k) => k.id === e.kind)!.label}</span>
                        <span>{e.title}</span>
                      </p>
                      {e.detail && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{e.detail}</p>}
                      <p className="mt-0.5 text-xs text-slate-500">
                        {e.at ? <time dateTime={e.at}>{formatMoment(e.at, e.date)}</time> : "time not recorded"}
                        {e.note ? ` · ${e.note}` : ""}
                      </p>
                    </div>
                    {e.removal && (
                      <button
                        type="button"
                        onClick={() => setDeleting(e)}
                        aria-label={`Delete log: ${e.title}`}
                        className={`shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-sm text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-300 dark:hover:bg-rose-950/40 ${focusRing}`}
                      >
                        Delete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {deleting?.removal && (
        <Modal title="Delete this log?" onClose={() => setDeleting(null)}>
          <p className="text-sm font-medium">{deleting.title}</p>
          <p className="mt-2 text-sm">{describeRemoval(deleting.removal)} It cannot be undone.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleting(null)} className="rounded-md px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button type="button" onClick={() => void confirmDelete(deleting.removal!)} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white">Delete log</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
