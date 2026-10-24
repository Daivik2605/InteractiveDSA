import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { addDayToWeek } from "../../lib/actions";
import { curriculum } from "../../lib/curriculum";
import { scheduleContext } from "../../lib/plan";

/** "+ Add a day to Week N": a +1 extension that follows the 3.12 rules, then opens the new day to fill. */
export function AddDayButton({ week, className }: { week: number; className?: string }) {
  const { plan, db } = usePlanContext();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className={className ?? "rounded-md border border-indigo-300 px-3 py-1.5 text-sm text-indigo-800 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-950"}
        onClick={async () => {
          const r = await addDayToWeek(db, scheduleContext(plan, curriculum), week);
          if (r.ok) {
            setError(null);
            navigate(`/day/${r.planDayId}`);
          } else setError(r.reason);
        }}
      >
        + Add a day to Week {week}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    </div>
  );
}
