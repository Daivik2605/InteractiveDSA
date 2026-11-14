import { useState } from "react";
import { usePlan } from "../../app/PlanContext";
import { addMonths, formatShort, monthLabel, parseDate } from "../../lib/dates";
import { JournalMonthGrid } from "./JournalMonthGrid";
import { useJournal } from "./useJournal";

/** The calendar sidebar in Journal mode: journal activity instead of plan status. */
export function JournalSidebar() {
  const plan = usePlan();
  const { counts, streak, byDate } = useJournal();
  const [month, setMonth] = useState(() => ({ y: parseDate(plan.today).y, m: parseDate(plan.today).m }));
  const [selected, setSelected] = useState<string | null>(null);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const picked = selected ? byDate.get(selected) ?? [] : null;
  return (
    <div className="space-y-5 text-sm">
      <section aria-label="Today">
        <p className="text-xs uppercase tracking-wide text-slate-500">{formatShort(plan.today)}</p>
        <p className="text-lg font-semibold">{journalSummary(counts.get(plan.today) ?? 0, streak.current)}</p>
      </section>
      <section aria-label="Month calendar">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => setMonth((x) => addMonths(x, -1))} className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">‹</button>
          <span className="font-medium">{monthLabel(month.y, month.m)}</span>
          <button type="button" aria-label="Next month" onClick={() => setMonth((x) => addMonths(x, 1))} className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">›</button>
        </div>
        <JournalMonthGrid y={month.y} m={month.m} today={plan.today} counts={counts} selected={selected} onSelect={setSelected} />
        <p className="mt-1 text-[11px] text-slate-500">Number = problems logged · ring = today</p>
        {picked && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{formatShort(selected!)}: {picked.length === 0 ? "nothing logged" : `${picked.length} logged`}</p>}
      </section>
      <section aria-label="Stats" className="grid grid-cols-2 gap-2">
        {[
          ["Problems logged", total],
          ["Current streak", streak.current],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
            <div className="text-xl font-semibold tabular-nums">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function journalSummary(todayCount: number, streak: number): string {
  return `${todayCount} logged today · ${streak} day streak`;
}
