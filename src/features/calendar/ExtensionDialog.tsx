import { useMemo, useState } from "react";
import { Modal } from "../../app/Modal";
import { usePlanContext } from "../../app/PlanContext";
import { saveExtensions } from "../../lib/actions";
import { curriculum } from "../../lib/curriculum";
import { diffDays, formatShort, isValidDate } from "../../lib/dates";
import { currentWeek } from "../../lib/plan";
import { addExtension, buildSchedule, finishDate, MAX_EXTENSION_AT_ONCE, type ScheduleContext } from "../../lib/schedule";

export function ExtensionDialog() {
  const { plan, db, extensionPrefill, closeExtension } = usePlanContext();
  const prefill = extensionPrefill ?? {};
  const [week, setWeek] = useState(prefill.week ?? currentWeek(plan));
  const [mode, setMode] = useState<"days" | "date">(prefill.untilDate ? "date" : "days");
  const [days, setDays] = useState(1);
  const [until, setUntil] = useState(prefill.untilDate ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const weekLast = plan.schedule.filter((d) => d.week === week).at(-1)?.date ?? plan.startDate;
  const extraDays = mode === "days" ? days : isValidDate(until) ? diffDays(weekLast, until) : 0;

  const result = useMemo(() => {
    const ctx: ScheduleContext = {
      curriculum,
      startDate: plan.startDate,
      extensions: plan.snapshot.extensions,
      completions: plan.completions,
      today: plan.today,
    };
    return addExtension(ctx, { week, extraDays, reason: reason.trim() || undefined });
  }, [plan, week, extraDays, reason]);

  const preview = useMemo(() => {
    if (!result.ok) return null;
    const next = buildSchedule(curriculum, plan.startDate, result.extensions);
    return {
      nextWeekStart: next.find((d) => d.week === week + 1)?.date ?? null,
      finish: finishDate(next),
    };
  }, [result, plan.startDate, week]);

  const originalNextStart = plan.schedule.find((d) => d.week === week + 1)?.date ?? null;

  async function confirm() {
    if (!result.ok) return;
    setSaving(true);
    await saveExtensions(db, result.extensions);
    closeExtension();
  }

  const field = "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950";
  return (
    <Modal title="Need more time on this topic?" onClose={closeExtension}>
      <div className="space-y-4 text-sm">
        <label className="block">
          Week to extend
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))} className={field}>
            {curriculum.weeks.map((w) => (
              <option key={w.week} value={w.week}>
                Week {w.week} — {w.title}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="sr-only">How long</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="mode" checked={mode === "days"} onChange={() => setMode("days")} /> Add days
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="mode" checked={mode === "date"} onChange={() => setMode("date")} /> Until a date
            </label>
          </div>
          {mode === "days" ? (
            <label className="mt-2 block">
              Extra days
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={field}>
                {Array.from({ length: MAX_EXTENSION_AT_ONCE }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    +{n} day{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="mt-2 block">
              Week {week} ends on (currently {formatShort(weekLast)})
              <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className={field} />
            </label>
          )}
        </fieldset>

        <label className="block">
          Reason (optional)
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
        </label>

        <div aria-live="polite" className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
          {result.ok && preview ? (
            <ul className="space-y-1">
              <li>
                Adds <strong>{extraDays}</strong> extension day{extraDays > 1 ? "s" : ""} after Week {week}: they hold your catch-up items, redos due, then "redo any 2 problems".
              </li>
              {preview.nextWeekStart && (
                <li>
                  Week {week + 1} starts <strong>{formatShort(preview.nextWeekStart)}</strong>
                  {originalNextStart && <> (was {formatShort(originalNextStart)})</>}
                </li>
              )}
              {preview.finish && (
                <li>
                  New finish date <strong>{formatShort(preview.finish)}</strong> (was {plan.finish ? formatShort(plan.finish) : "—"})
                </li>
              )}
            </ul>
          ) : (
            <p role="alert" className="text-rose-700 dark:text-rose-300">
              {result.ok ? "" : result.reason}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={closeExtension} className="rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button
            type="button"
            disabled={!result.ok || saving}
            onClick={confirm}
            className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:opacity-40"
          >
            Extend Week {week}
          </button>
        </div>
      </div>
    </Modal>
  );
}
