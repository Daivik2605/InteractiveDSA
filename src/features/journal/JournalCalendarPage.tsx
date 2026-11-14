import { useState } from "react";
import { usePlan } from "../../app/PlanContext";
import { addMonths, formatLong, monthLabel, parseDate } from "../../lib/dates";
import { JournalMonthGrid } from "./JournalMonthGrid";
import { useJournal } from "./useJournal";

/** Calendar page in Journal mode. Stage 4 adds result colours and the per-day journal. */
export function JournalCalendarPage() {
  const plan = usePlan();
  const { counts, streak } = useJournal();
  const [month, setMonth] = useState({ y: parseDate(plan.today).y, m: parseDate(plan.today).m });
  const [selected, setSelected] = useState<string | null>(plan.today);
  return (
    <section className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">Current streak: {streak.current} · longest: {streak.longest}</p>
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setMonth((x) => addMonths(x, -1))} className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">‹</button>
        <span className="font-medium">{monthLabel(month.y, month.m)}</span>
        <button type="button" aria-label="Next month" onClick={() => setMonth((x) => addMonths(x, 1))} className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">›</button>
      </div>
      <JournalMonthGrid y={month.y} m={month.m} today={plan.today} counts={counts} selected={selected} onSelect={setSelected} size="full" />
      {selected && <p className="text-sm">{formatLong(selected)}: {counts.get(selected) ?? 0} logged</p>}
    </section>
  );
}
