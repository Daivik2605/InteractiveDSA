import { monthGrid, parseDate, formatShort } from "../../lib/dates";
import type { Plan } from "../../lib/plan";
import { curriculum } from "../../lib/curriculum";
import { STATUS_META, weekHue } from "./status";

const HEADS = ["M", "T", "W", "T", "F", "S", "S"];

export function MonthGrid({
  plan,
  y,
  m,
  selected,
  onSelect,
  size = "mini",
}: {
  plan: Plan;
  y: number;
  m: number;
  selected: string | null;
  onSelect: (date: string) => void;
  size?: "mini" | "full";
}) {
  const full = size === "full";
  const topic = (week: number) => curriculum.weeks.find((w) => w.week === week)?.title ?? "";
  return (
    <div role="grid" aria-label="Calendar" className={`grid grid-cols-7 ${full ? "gap-1.5" : "gap-1"}`}>
      {HEADS.map((h, i) => (
        <div key={i} role="columnheader" className="text-center text-[10px] font-medium uppercase text-slate-500">
          {h}
        </div>
      ))}
      {monthGrid(y, m).flat().map((date, i) => {
        if (!date) return <div key={`pad-${i}`} role="gridcell" aria-hidden />;
        const day = plan.byDate.get(date);
        const isToday = date === plan.today;
        const base = `relative flex flex-col items-center justify-center rounded-md ${full ? "min-h-16 p-1 text-sm" : "aspect-square text-xs"}`;
        if (!day) {
          return (
            <div key={date} role="gridcell" className={`${base} text-slate-400 ${isToday ? "ring-2 ring-indigo-500" : ""}`}>
              {parseDate(date).d}
            </div>
          );
        }
        const meta = STATUS_META[day.status];
        const isExt = day.day.kind === "extension";
        const dayNo = Number(day.day.planDayId.split(/[dx]/)[1]);
        const label = `${formatShort(date)}, Week ${day.day.week} ${isExt ? `extension day ${dayNo}` : `day ${dayNo}`}, ${meta.label}`;
        return (
          <button
            key={date}
            type="button"
            role="gridcell"
            aria-label={label}
            title={`${label} — ${topic(day.day.week)}`}
            aria-selected={selected === date}
            onClick={() => onSelect(date)}
            className={`${base} ${meta.cell} ${isToday ? "ring-2 ring-indigo-600 ring-offset-1 dark:ring-offset-slate-950" : ""} ${selected === date ? "outline-2 outline-offset-1 outline-slate-900 dark:outline-white" : ""}`}
          >
            <span className="font-medium">{parseDate(date).d}</span>
            {full ? <span className="text-xs">{meta.glyph}{isExt ? " +" : ""}</span> : <span className="text-[9px] leading-none">{meta.glyph}</span>}
            {!full && isExt && <span className="absolute right-0.5 top-0 text-[9px] font-bold">+</span>}
            <span
              aria-hidden
              className="absolute inset-x-1 bottom-0.5 h-0.5 rounded"
              style={{ backgroundColor: `hsl(${weekHue(day.day.week)} 65% 50%)` }}
            />
          </button>
        );
      })}
    </div>
  );
}
