import { useState } from "react";
import { usePlanContext } from "../../app/PlanContext";
import { addMonths, formatShort, monthLabel, parseDate } from "../../lib/dates";
import { curriculum } from "../../lib/curriculum";
import { currentWeek } from "../../lib/plan";
import { FoundProblemModal } from "../problems/FoundProblemModal";
import { AddDayButton } from "./AddDayButton";
import { DayDetails } from "./DayDetails";
import { MonthGrid } from "./MonthGrid";

function dayLabel(plan: ReturnType<typeof usePlanContext>["plan"]) {
  const d = plan.todayDay?.day;
  if (!d) return plan.phase === "before" ? "Plan not started" : "Plan complete";
  const n = Number(d.planDayId.split(/[dx]/)[1]);
  return d.kind === "extension" ? `Week ${d.week} · Extension ${n}` : `Week ${d.week} · Day ${n}`;
}

/** Short summary for the mobile top bar. */
export function sidebarSummary(plan: ReturnType<typeof usePlanContext>["plan"]) {
  return `${dayLabel(plan)} · ${plan.stats.missed} missed`;
}

/** SPEC 3.12: today, mini calendar, stats, finish date, extension button. */
export function Sidebar() {
  const { plan, openExtension } = usePlanContext();
  const anchor = plan.phase === "before" ? plan.startDate : plan.phase === "after" && plan.finish ? plan.finish : plan.today;
  const [month, setMonth] = useState(() => ({ y: parseDate(anchor).y, m: parseDate(anchor).m }));
  const [selected, setSelected] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);
  const selectedDay = selected ? plan.byDate.get(selected) : undefined;
  const topic = curriculum.weeks.find((w) => w.week === currentWeek(plan))?.title;

  return (
    <div className="space-y-5 text-sm">
      <section aria-label="Today">
        <p className="text-xs uppercase tracking-wide text-slate-500">{formatShort(plan.today)}</p>
        <p className="text-lg font-semibold">{dayLabel(plan)}</p>
        <p className="text-slate-600 dark:text-slate-400">{plan.phase === "during" ? topic : plan.phase === "before" ? `Starts ${formatShort(plan.startDate)}` : ""}</p>
        {plan.dayNumber && <p className="text-xs text-slate-500">Day {plan.dayNumber} of {plan.totalDays}</p>}
      </section>

      <section aria-label="Month calendar">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => setMonth((x) => addMonths(x, -1))} className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">‹</button>
          <span className="font-medium">{monthLabel(month.y, month.m)}</span>
          <button type="button" aria-label="Next month" onClick={() => setMonth((x) => addMonths(x, 1))} className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">›</button>
        </div>
        <MonthGrid plan={plan} y={month.y} m={month.m} selected={selected} onSelect={setSelected} />
        <p className="mt-1 text-[11px] text-slate-500">✓ done · ✓L late · ◐ partial · ✕ missed · R rest · + extension · ring = today</p>
      </section>

      {selectedDay && <DayDetails day={selectedDay} />}

      <section aria-label="Stats" className="grid grid-cols-2 gap-2">
        {[
          ["Days missed", plan.stats.missed],
          ["Partial days", plan.stats.partial],
          ["Catch-up items", plan.stats.catchUpCount],
          ["Current streak", plan.streak.current],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
            <div className="text-xl font-semibold tabular-nums">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </section>

      <section aria-label="Finish date">
        <p className="text-xs uppercase tracking-wide text-slate-500">Finish date</p>
        <p className="font-medium">{plan.finish ? formatShort(plan.finish) : "—"}</p>
        {plan.daysAdded > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">+{plan.daysAdded} days vs original plan</p>}
      </section>

      <button
        type="button"
        onClick={() => openExtension()}
        className="w-full rounded-md bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-500"
      >
        Need more time on this topic?
      </button>
      <AddDayButton week={currentWeek(plan)} className="w-full rounded-md border border-indigo-300 px-3 py-2 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-950" />
      <button
        type="button"
        onClick={() => setFinding(true)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
      >
        Log a problem I found
      </button>
      {finding && <FoundProblemModal onClose={() => setFinding(false)} />}
    </div>
  );
}
