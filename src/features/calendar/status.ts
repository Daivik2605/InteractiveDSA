import type { DayStatus } from "../../lib/schedule";

// Colour is never the only signal: every status also has a glyph and a text label.
export const STATUS_META: Record<DayStatus, { label: string; glyph: string; cell: string; dot: string }> = {
  done: { label: "Done", glyph: "✓", cell: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100", dot: "bg-emerald-500" },
  "done-late": { label: "Done late", glyph: "✓L", cell: "bg-lime-100 text-lime-900 dark:bg-lime-900/40 dark:text-lime-100", dot: "bg-lime-500" },
  partial: { label: "Incomplete", glyph: "◐", cell: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100", dot: "bg-amber-500" },
  missed: { label: "Missed", glyph: "✕", cell: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100", dot: "bg-rose-500" },
  rest: { label: "Rest day", glyph: "R", cell: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100", dot: "bg-sky-500" },
  today: { label: "Today", glyph: "●", cell: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-100", dot: "bg-indigo-500" },
  upcoming: { label: "Upcoming", glyph: "", cell: "bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300", dot: "bg-slate-400" },
};

export const weekHue = (week: number) => (week * 47) % 360;
