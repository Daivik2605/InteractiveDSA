import { useState } from "react";
import { buildConceptCards, getConceptLinks, type ConceptCard } from "../../lib/concepts";
import { curriculum } from "../../lib/curriculum";
import { getResources } from "../../lib/resources";
import { useConceptTicks } from "./checks";
import { Badge, Card, checkboxClass, EmptyState, focusRing, Progress, ResourceLinks } from "./ui";

type Filter = "all" | "todo" | "done";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "todo", label: "To read" },
  { id: "done", label: "Done" },
];

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1 text-sm ${focusRing} ${on ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500" : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"}`;

function ConceptRow({ card, done, toggle }: { card: ConceptCard; done: boolean; toggle: () => void }) {
  return (
    <Card muted={done}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={done} onChange={toggle} aria-label={card.title} className={checkboxClass} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span>{card.title}</span>
            {card.core && <Badge tone="indigo">Core reading</Badge>}
            <Badge>Week {card.week}</Badge>
          </p>
          <ResourceLinks links={card.links} label={`${card.title} links`} />
        </div>
      </div>
    </Card>
  );
}

/** The concept checklist: every curriculum concept plus the core-reading topics, with search, filters, progress and per-week bulk marking. */
export function ConceptsTab({ week }: { week: number | undefined }) {
  const ticks = useConceptTicks();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());
  const [lastBulk, setLastBulk] = useState<ReadonlyMap<number, string[]>>(new Map());

  const all = buildConceptCards(curriculum, getResources(), getConceptLinks()).filter((c) => week === undefined || c.week === week);
  const q = query.trim().toLowerCase();
  const matches = (c: ConceptCard) =>
    (filter === "all" || (filter === "done") === ticks.isDone(c)) &&
    (!q || c.title.toLowerCase().includes(q) || c.links.some((l) => `${l.site} ${l.title}`.toLowerCase().includes(q)));
  const visible = all.filter(matches);
  const doneCount = all.filter((c) => ticks.isDone(c)).length;
  const weeks = curriculum.weeks.filter((w) => all.some((c) => c.week === w.week));
  const narrowed = filter !== "all" || q !== "";

  function bulk(w: number) {
    const cards = all.filter((c) => c.week === w);
    if (cards.every((c) => ticks.isDone(c))) {
      const remembered = lastBulk.get(w);
      void ticks.setMany(remembered ? cards.filter((c) => remembered.includes(c.id)) : cards, false); // Undo: only what "Mark all" added, when known
      setLastBulk((m) => new Map([...m].filter(([k]) => k !== w)));
    } else {
      const added = cards.filter((c) => !ticks.isDone(c));
      void ticks.setMany(added, true);
      setLastBulk((m) => new Map(m).set(w, added.map((c) => c.id)));
    }
  }

  return (
    <div>
      <Progress done={doneCount} total={all.length} word="read" label="Concepts read" />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="min-w-0 flex-1 basis-56">
          <span className="sr-only">Search concepts</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search concepts and links"
            className={`w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 ${focusRing}`}
          />
        </label>
        <div role="group" aria-label="Show" className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && <EmptyState>{narrowed ? "No concepts match." : "No concepts yet."}</EmptyState>}

      {weeks.map((w) => {
        const inWeek = all.filter((c) => c.week === w.week);
        const rows = visible.filter((c) => c.week === w.week);
        if (rows.length === 0) return null;
        const weekDone = inWeek.filter((c) => ticks.isDone(c)).length;
        const allDone = weekDone === inWeek.length;
        const isOpen = week !== undefined || !collapsed.has(w.week);
        const toggleOpen = () => setCollapsed((s) => { const n = new Set(s); if (n.has(w.week)) n.delete(w.week); else n.add(w.week); return n; });
        return (
          <section key={w.week} className="mt-5" aria-label={`Week ${w.week} concepts`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {week === undefined ? (
                  <button type="button" aria-expanded={isOpen} aria-controls={`concepts-week-${w.week}`} onClick={toggleOpen} className={`-ml-1 flex items-center gap-2 rounded px-1 text-left ${focusRing}`}>
                    <span aria-hidden className="inline-block w-3 text-slate-500">{isOpen ? "▾" : "▸"}</span>
                    Week {w.week} · {w.title}
                  </button>
                ) : (
                  <>Week {w.week} · {w.title}</>
                )}
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500" aria-label={`Week ${w.week} read`}>{weekDone} of {inWeek.length} read</span>
                <button type="button" onClick={() => bulk(w.week)} aria-label={allDone ? `Undo Week ${w.week}` : `Mark all Week ${w.week} as read`} className={`rounded-md border border-slate-300 px-2.5 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900 ${focusRing}`}>
                  {allDone ? "Undo" : "Mark all as read"}
                </button>
              </div>
            </div>
            {isOpen && (
              <ul id={`concepts-week-${w.week}`} className="mt-2 space-y-2" aria-label={`Week ${w.week} concept cards`}>
                {rows.map((c) => <ConceptRow key={c.id} card={c} done={ticks.isDone(c)} toggle={() => void ticks.toggle(c)} />)}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
