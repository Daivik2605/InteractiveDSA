import { monthGrid, parseDate, formatShort } from "../../lib/dates";

const HEADS = ["M", "T", "W", "T", "F", "S", "S"];

/** Month grid for Journal mode: each day shows how many problems were logged. Stage 4 colours the counts by result. */
export function JournalMonthGrid({
  y,
  m,
  today,
  counts,
  selected,
  onSelect,
  size = "mini",
}: {
  y: number;
  m: number;
  today: string;
  counts: ReadonlyMap<string, number>;
  selected: string | null;
  onSelect: (date: string) => void;
  size?: "mini" | "full";
}) {
  const full = size === "full";
  return (
    <div role="grid" aria-label="Calendar" className={`grid grid-cols-7 ${full ? "gap-1.5" : "gap-1"}`}>
      {HEADS.map((h, i) => (
        <div key={i} role="columnheader" className="text-center text-[10px] font-medium uppercase text-slate-500">{h}</div>
      ))}
      {monthGrid(y, m).flat().map((date, i) => {
        if (!date) return <div key={`pad-${i}`} role="gridcell" aria-hidden />;
        const n = counts.get(date) ?? 0;
        const label = `${formatShort(date)}, ${n === 0 ? "nothing logged" : `${n} problem${n === 1 ? "" : "s"} logged`}`;
        return (
          <button
            key={date}
            type="button"
            role="gridcell"
            aria-label={label}
            aria-selected={selected === date}
            onClick={() => onSelect(date)}
            className={`relative flex flex-col items-center justify-center rounded-md ${full ? "min-h-16 p-1 text-sm" : "aspect-square text-xs"} ${n > 0 ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"} ${date === today ? "ring-2 ring-indigo-600 ring-offset-1 dark:ring-offset-slate-950" : ""} ${selected === date ? "outline-2 outline-offset-1 outline-slate-900 dark:outline-white" : ""}`}
          >
            <span className="font-medium">{parseDate(date).d}</span>
            {n > 0 && <span className={full ? "text-xs" : "text-[9px] leading-none"}>{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
