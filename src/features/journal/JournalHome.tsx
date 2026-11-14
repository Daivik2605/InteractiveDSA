import { usePlan } from "../../app/PlanContext";
import { formatLong } from "../../lib/dates";
import { useJournal } from "./useJournal";

/** Journal home. Stage 1 is a placeholder with today's date and count; Stage 4 fills it in. */
export function JournalHome() {
  const plan = usePlan();
  const { byDate } = useJournal();
  const todays = byDate.get(plan.today) ?? [];
  return (
    <section className="max-w-2xl space-y-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{formatLong(plan.today)}</p>
      <h1 className="text-2xl font-semibold">Journal</h1>
      <p className="text-slate-600 dark:text-slate-400">
        {todays.length === 0 ? "Nothing logged today yet." : `${todays.length} problem${todays.length === 1 ? "" : "s"} logged today.`}
      </p>
    </section>
  );
}
