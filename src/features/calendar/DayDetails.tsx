import { Link } from "react-router-dom";
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
      {plan.dayLogs.get(planDayId) && (
        <div className="mt-2 rounded bg-slate-50 p-2 text-xs dark:bg-slate-900" aria-label="Study log">
          <p className="font-medium">
            What I studied{plan.dayLogs.get(planDayId)!.minutes > 0 ? ` · ${plan.dayLogs.get(planDayId)!.minutes} min` : ""}
          </p>
          {plan.dayLogs.get(planDayId)!.notes && <p className="mt-0.5 whitespace-pre-wrap">{plan.dayLogs.get(planDayId)!.notes}</p>}
          {plan.dayLogs.get(planDayId)!.links.map((l) => (
            <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="block truncate text-indigo-700 underline dark:text-indigo-300">{l}</a>
          ))}
          {plan.dayLogs.get(planDayId)!.updatedOn > date && <p className="mt-0.5 text-slate-500">edited on {formatShort(plan.dayLogs.get(planDayId)!.updatedOn)}</p>}
        </div>
      )}
      <ul className="mt-2 space-y-1">
        {day.items.map((item) => {
          const c = plan.completions.get(item.itemId);
          const label = itemLabel(plan, item);
          return (
            <li key={item.itemId} className="flex justify-between gap-2">
              <span className={c ? "text-slate-500 line-through" : ""}>
                {label}
                {item.movedFrom && <span className="text-xs text-slate-500"> (moved)</span>}
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {c ? `✓ ${formatDayMonth(c.completedOn)}${c.completedOn > date ? " (late)" : ""}` : "not done"}
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        to={`/day/${planDayId}`}
        className="mt-3 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-center hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
      >
        Edit day
      </Link>
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

