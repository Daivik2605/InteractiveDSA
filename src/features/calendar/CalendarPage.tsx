import { useState } from "react";
import { usePlanContext } from "../../app/PlanContext";
import { curriculum } from "../../lib/curriculum";
import { addMonths, formatDayMonth, monthLabel, parseDate } from "../../lib/dates";
import { DayDetails } from "./DayDetails";
import { MonthGrid } from "./MonthGrid";
import { STATUS_META, weekHue } from "./status";

export function CalendarPage() {
  const { plan, openExtension } = usePlanContext();
  const anchor = plan.phase === "before" ? plan.startDate : plan.today;
  const [month, setMonth] = useState({ y: parseDate(anchor).y, m: parseDate(anchor).m });
  const [selected, setSelected] = useState<string | null>(plan.todayDay ? plan.today : null);
  const selectedDay = selected ? plan.byDate.get(selected) : undefined;

  const weeks = curriculum.weeks.map((w) => {
    const days = plan.schedule.filter((d) => d.week === w.week);
    return { ...w, first: days[0]?.date, last: days.at(-1)?.date, extra: days.filter((d) => d.kind === "extension").length };
  });
  const stats: [string, number][] = [
    ["Current streak", plan.streak.current],
    ["Longest streak", plan.streak.longest],
    ["Days missed", plan.stats.missed],
    ["Catch-up items", plan.stats.catchUpCount],
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold">Calendar</h1>

      <section aria-label="Streaks and totals" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section aria-label="Month">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setMonth((x) => addMonths(x, -1))} className="rounded border border-slate-300 px-3 py-1 dark:border-slate-700">‹</button>
            <h2 className="text-lg font-semibold">{monthLabel(month.y, month.m)}</h2>
            <button type="button" aria-label="Next month" onClick={() => setMonth((x) => addMonths(x, 1))} className="rounded border border-slate-300 px-3 py-1 dark:border-slate-700">›</button>
          </div>
          <MonthGrid plan={plan} y={month.y} m={month.m} selected={selected} onSelect={setSelected} size="full" />
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400" aria-label="Legend">
            {(["done", "done-late", "partial", "missed", "rest", "upcoming"] as const).map((s) => (
              <li key={s} className="flex items-center gap-1">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${STATUS_META[s].dot}`} aria-hidden /> {STATUS_META[s].glyph} {STATUS_META[s].label}
              </li>
            ))}
            <li>+ extension day</li>
          </ul>
        </section>

        <div className="space-y-4">
          {selectedDay ? <DayDetails day={selectedDay} /> : <p className="text-sm text-slate-500">Select a day to see its items.</p>}
        </div>
      </div>

      <section className="mt-8" aria-label="Weeks">
        <h2 className="text-lg font-semibold">Weeks</h2>
        <ul className="mt-2 divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {weeks.map((w) => (
            <li key={w.week} className="flex items-center gap-3 py-1.5">
              <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: `hsl(${weekHue(w.week)} 65% 50%)` }} />
              <span className="flex-1">Week {w.week} · {w.title}{w.extra > 0 && <span className="text-amber-700 dark:text-amber-300"> (+{w.extra} days)</span>}</span>
              {w.first && w.last && <span className="text-xs text-slate-500">{formatDayMonth(w.first)} – {formatDayMonth(w.last)}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-label="Extensions">
        <h2 className="text-lg font-semibold">Extensions</h2>
        {plan.snapshot.extensions.length === 0 ? (
          <p className="text-sm text-slate-500">None. Use “Need more time on this topic?” if a week needs longer.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {plan.snapshot.extensions.map((e) => (
              <li key={e.id}>Week {e.week}: +{e.extraDays} day{e.extraDays > 1 ? "s" : ""}{e.reason ? ` — ${e.reason}` : ""} <span className="text-xs text-slate-500">(added {formatDayMonth(e.createdOn)}; manage in Settings)</span></li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => openExtension()} className="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Need more time on this topic?</button>
      </section>
    </div>
  );
}
