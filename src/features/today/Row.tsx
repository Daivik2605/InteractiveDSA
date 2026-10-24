import type { ReactNode } from "react";
import type { Problem } from "../../types/content";

export const DIFF_STYLE: Record<Problem["difficulty"], string> = {
  Easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  Hard: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
};

export function Row({ checked, onToggle, label, problem, platform, meta, caption, actions, disabled }: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  problem?: Problem;
  platform?: string; // LeetCode / HackerRank badge
  meta?: string;
  caption?: ReactNode;
  actions?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
        aria-label={label}
        className="mt-1 h-5 w-5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className={`flex flex-wrap items-center gap-2 ${checked ? "text-slate-500 line-through" : ""}`}>
          {problem?.url ? (
            <a href={problem.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
              {label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="font-medium">{label}</span>
          )}
          {problem && <span className={`rounded px-1.5 py-0.5 text-xs ${DIFF_STYLE[problem.difficulty]}`}>{problem.difficulty}</span>}
          {platform && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{platform}</span>}
        </div>
        {(meta || caption) && <p className="mt-0.5 text-xs text-slate-500">{meta}{caption}</p>}
        {actions && <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">{actions}</div>}
      </div>
    </li>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-8" aria-label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
      <ul className="mt-3 space-y-2">{children}</ul>
    </section>
  );
}
