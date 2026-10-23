import { usePlanContext } from "../../app/PlanContext";
import { diffDays, formatDayMonth, formatShort } from "../../lib/dates";
import { curriculum } from "../../lib/curriculum";
import { itemLabel } from "../../lib/labels";
import type { EvaluatedDay } from "../../lib/schedule";
import { MAX_EXTENSION_AT_ONCE } from "../../lib/schedule";
import { currentWeek } from "../../lib/plan";
import { STATUS_META } from "./status";

export function DayDetails({ day }: { day: EvaluatedDay }) {
  const { plan, openExtension } = usePlanContext();
  const { week, planDayId, date, kind } = day.day;
  const w = curriculum.weeks.find((x) => x.week === week);
  const n = Number(planDayId.split(/[dx]/)[1]);
  const meta = STATUS_META[day.status];

  // "Extend Week N until this date" applies to a future date just beyond the current week.
  const cw = currentWeek(plan);
  const lastOfCurrent = plan.schedule.filter((d) => d.week === cw).at(-1)?.date;
  const extra = lastOfCurrent ? diffDays(lastOfCurrent, date) : 0;
  const canExtendUntil = date > plan.today && extra >= 1 && extra <= MAX_EXTENSION_AT_ONCE;

  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800" aria-label="Day details">
      <p className="font-medium">
        {formatShort(date)} · {kind === "extension" ? `Week ${week} extension day ${n}` : `Week ${week} · Day ${n}`}
      </p>
      <p className="text-xs text-slate-500">{w?.title} — {meta.glyph} {meta.label}</p>
      <ul className="mt-2 space-y-1">
        {day.items.map((item) => {
          const c = plan.completions.get(item.itemId);
          const label = itemLabel(plan, item);
          return (
            <li key={item.itemId} className="flex justify-between gap-2">
              <span className={c ? "text-slate-500 line-through" : ""}>{label}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {c ? `✓ ${formatDayMonth(c.completedOn)}${c.completedOn > date ? " (late)" : ""}` : "not done"}
              </span>
            </li>
          );
        })}
      </ul>
      {canExtendUntil && (
        <button
          type="button"
          onClick={() => openExtension({ week: cw, untilDate: date })}
          className="mt-3 w-full rounded-md border border-indigo-300 px-3 py-1.5 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-950"
        >
          Extend Week {cw} until this date
        </button>
      )}
    </div>
  );
}

