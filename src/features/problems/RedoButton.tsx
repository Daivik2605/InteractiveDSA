import { useState } from "react";
import { usePlanContext } from "../../app/PlanContext";
import { addManualRedo } from "../../lib/actions";
import { addDays, formatDayMonth } from "../../lib/dates";

const PRESETS = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In a week", days: 7 },
];

/**
 * One-click "do this again": adds a manual redo task. Shows the next pending redo date once one exists,
 * so a problem you liked is never queued twice by accident. It will appear under "Redo due" on that date.
 */
export function RedoButton({ problemId, className = "" }: { problemId: string; className?: string }) {
  const { plan, db } = usePlanContext();
  const [open, setOpen] = useState(false);
  const pending = plan.snapshot.redos
    .filter((r) => r.problemId === problemId && !r.doneOn && !r.attemptedOn)
    .sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1));
  const link = `text-indigo-700 underline dark:text-indigo-300 ${className}`;

  if (open) {
    return (
      <span className={`inline-flex flex-wrap items-center gap-2 text-sm ${className}`}>
        <span className="text-slate-500">Redo:</span>
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            className="rounded-md border border-indigo-600 px-2 py-0.5 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-950"
            onClick={async () => {
              await addManualRedo(db, problemId, addDays(plan.today, p.days));
              setOpen(false);
            }}
          >
            {p.label}
          </button>
        ))}
        <button type="button" className="text-slate-500 underline" onClick={() => setOpen(false)}>Cancel</button>
      </span>
    );
  }
  return (
    <button type="button" className={link} onClick={() => setOpen(true)} title="Schedule this problem to do again">
      {pending.length > 0 ? `↻ Redo ${formatDayMonth(pending[0]!.dueOn)} · add another` : "↻ Do again later"}
    </button>
  );
}
