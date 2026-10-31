import { useEffect } from "react";
import { Link } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { ensureDayDraws } from "../../lib/actions";
import { curriculum } from "../../lib/curriculum";
import { formatShort } from "../../lib/dates";
import { itemLabel } from "../../lib/labels";
import { parsePlanDayId } from "../../lib/schedule";
import { MissedReason } from "../calendar/MissedReason";
import { DIFF_STYLE } from "../today/Row";

/** Everything still owed: unfinished items by the date they were planned for, mocks not taken for finished weeks, and missed days. */
export function IncompletePage() {
  const { plan, db } = usePlanContext();
  // Review problems are drawn when a day is first opened; listing a day here opens it.
  const undrawn = [...new Set(plan.catchUp.filter((c) => c.item.kind === "review" && !c.item.problem).map((c) => c.planDayId))];
  const undrawnKey = undrawn.join(",");
  useEffect(() => {
    for (const id of undrawn) void ensureDayDraws(db, curriculum, id, plan.today).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, plan.today, undrawnKey]);
  const groups = [...new Map(plan.catchUp.map((c) => [c.planDayId, c.fromDate])).entries()].map(([planDayId, date]) => ({
    planDayId,
    date,
    items: plan.catchUp.filter((c) => c.planDayId === planDayId),
  }));
  const dayNo = (id: string) => parsePlanDayId(id);
  const overdueMocks = plan.weekProgress
    .filter((w) => w.ended)
    .flatMap((w) => curriculum.mocks.filter((m) => m.suggestedAfterWeek === w.week && !plan.snapshot.mocksDone.includes(m.number)));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Incomplete</h1>
      <p className="text-slate-600 dark:text-slate-400">Unfinished work stays here, and keeps growing, until you tick it off.</p>

      <section className="mt-6" aria-label="Incomplete tasks">
        <h2 className="text-lg font-semibold">Incomplete tasks <span className="text-base font-normal text-slate-500">· {plan.catchUp.length}</span></h2>
        {groups.length === 0 && <p className="mt-2 text-sm text-slate-500">Nothing is waiting. Every earlier item is ticked.</p>}
        {groups.map((g) => (
          <div key={g.planDayId} className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800" aria-label={`Planned ${formatShort(g.date)}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{formatShort(g.date)}</span>
              <span className="text-xs text-slate-500">Week {plan.byDate.get(g.date)?.day.week} · {dayNo(g.planDayId).kind === "extension" ? "Extension" : "Day"} {dayNo(g.planDayId).n}</span>
              <Link to={`/day/${g.planDayId}`} className="ml-auto text-sm text-indigo-700 underline dark:text-indigo-300">Open day</Link>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {g.items.map((c) => (
                <li key={c.item.itemId} className="flex flex-wrap items-center gap-2">
                  {c.item.problem?.url ? (
                    <a href={c.item.problem.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline dark:text-indigo-300">
                      {itemLabel(plan, c.item)}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span>{itemLabel(plan, c.item)}</span>
                  )}
                  {c.item.problem && <span className={`rounded px-1.5 py-0.5 text-xs ${DIFF_STYLE[c.item.problem.difficulty]}`}>{c.item.problem.difficulty}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {groups.length > 0 && <p className="mt-2 text-xs text-slate-500">Log them from the Catch-up queue on Today, or tick them with a date on the day itself.</p>}
      </section>

      <section className="mt-8" aria-label="Mocks not taken">
        <h2 className="text-lg font-semibold">Mocks not taken <span className="text-base font-normal text-slate-500">· {overdueMocks.length}</span></h2>
        {overdueMocks.length === 0 && <p className="mt-2 text-sm text-slate-500">Every mock for a finished week is done.</p>}
        <ul className="mt-2 space-y-2 text-sm">
          {overdueMocks.map((m) => (
            <li key={m.number} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <span>Mock {m.number} <span className="text-xs text-slate-500">· was due after Week {m.suggestedAfterWeek}</span></span>
              <Link to={`/mock/${m.number}`} className="rounded-md border border-indigo-600 px-2 py-0.5 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300">Open Mock {m.number}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-label="Days missed">
        <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-300">Days missed <span className="text-base font-normal">· {plan.missedDays.length}</span></h2>
        {plan.missedDays.length === 0 && <p className="mt-2 text-sm text-slate-500">No missed days.</p>}
        <ul className="mt-2 space-y-2 text-sm">
          {plan.missedDays.map((d) => (
            <li key={d.day.planDayId} aria-label={`Missed ${formatShort(d.day.date)}`} className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40">
              <p className="font-medium text-rose-800 dark:text-rose-200">{formatShort(d.day.date)} · Week {d.day.week} · {dayNo(d.day.planDayId).kind === "extension" ? "Extension" : "Day"} {dayNo(d.day.planDayId).n}</p>
              <MissedReason planDayId={d.day.planDayId} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
