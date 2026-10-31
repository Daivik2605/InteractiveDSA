import { useEffect, useState } from "react";
import { usePlanContext } from "../../app/PlanContext";
import { saveMissedReason } from "../../lib/actions";

/** "Why did I miss this day?" — optional, saved on demand, removable by saving it empty. */
export function MissedReason({ planDayId }: { planDayId: string }) {
  const { plan, db } = usePlanContext();
  const saved = plan.missedReasons.get(planDayId)?.reason ?? "";
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [saved]);
  return (
    <form
      aria-label="Reason this day was missed"
      className="mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        void saveMissedReason(db, planDayId, text, plan.today);
      }}
    >
      <label className="block text-xs text-slate-600 dark:text-slate-400">
        Reason (optional)
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Why was this day missed?"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <button type="submit" disabled={text.trim() === saved} className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-slate-700">
        {saved ? "Update reason" : "Save reason"}
      </button>
    </form>
  );
}
