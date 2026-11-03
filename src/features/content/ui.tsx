import type { ReactNode } from "react";
import type { ResourceLink, Topic } from "../../types/content";

/** Shared look of the Content page: cards, badges, headings, progress, empty states, resource links. */

export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 dark:focus-visible:ring-indigo-400 dark:ring-offset-slate-950";
export const selectClass = `rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 ${focusRing}`;
export const buttonClass = `rounded-md border border-indigo-300 px-3 py-1.5 text-sm text-indigo-800 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-950 ${focusRing}`;
export const primaryButtonClass = `inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 ${focusRing}`;
export const linkClass = `rounded-sm text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300 ${focusRing}`;

export function Card({ children, muted, className = "" }: { children: ReactNode; muted?: boolean; className?: string }) {
  return (
    <li className={`rounded-lg border p-3 ${muted ? "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"} ${className}`}>
      {children}
    </li>
  );
}

const TONES = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
} as const;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">{children}</p>;
}

export const NO_TOPICS = <EmptyState>No topics yet.</EmptyState>;

/** A section heading with an optional right-hand slot. */
export function SectionHeading({ children, aside, level = 2 }: { children: ReactNode; aside?: ReactNode; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
      <H className={level === 2 ? "text-lg font-semibold" : "font-semibold"}>{children}</H>
      {aside}
    </div>
  );
}

/** "N of M <word>" with a bar. `label` names the status region for screen readers and tests. */
export function Progress({ done, total, word, label }: { done: number; total: number; word: string; label: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="mt-3">
      <p className="text-sm text-slate-600 dark:text-slate-400" role="status" aria-label={label}>
        {done} of {total} {word}
      </p>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-indigo-600 transition-[width] dark:bg-indigo-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ResourceLinks({ links, label }: { links: ResourceLink[]; label: string }) {
  if (links.length === 0) return <p className="mt-1 text-xs text-slate-500">Links coming</p>;
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={label}>
      {links.map((r) => (
        <li key={r.url}>
          <a href={r.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {r.site}: {r.title}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export const checkboxClass = `mt-0.5 h-5 w-5 shrink-0 rounded accent-indigo-600 ${focusRing}`;

/** A resources.json topic as a checklist card. */
export function TopicCard({ topic, done, toggle, note }: { topic: Topic; done: boolean; toggle: () => void; note?: string }) {
  return (
    <Card muted={done}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={done} onChange={toggle} aria-label={topic.title} className={checkboxClass} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span>{topic.title}</span>
            {note && <Badge>{note}</Badge>}
          </p>
          <ResourceLinks links={topic.resources} label={`${topic.title} resources`} />
        </div>
      </div>
    </Card>
  );
}
