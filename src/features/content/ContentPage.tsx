import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { contentProblems, matchesContentFilters, type ContentFilters, type ContentProblem } from "../../lib/contentProblems";
import { curriculum } from "../../lib/curriculum";
import { currentWeek, type Plan } from "../../lib/plan";
import { dashboardUrls, diveDeeper, getResources, structureNames, topicGroups, type TopicGroup } from "../../lib/resources";
import type { Topic, TopicKind } from "../../types/content";
import { AddDayButton } from "../calendar/AddDayButton";
import { ProblemLine } from "./ProblemLine";

export const CONTENT_TABS = [
  { id: "problems", label: "Problems" },
  { id: "data-structures", label: "Data Structures" },
  { id: "patterns", label: "Patterns" },
  { id: "concepts", label: "Concepts" },
] as const;
type TabId = (typeof CONTENT_TABS)[number]["id"];

const sel = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950";
const linkBtn = "rounded-md border border-indigo-300 px-3 py-1.5 text-sm text-indigo-800 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-950";

const weekTitle = (week: number) => curriculum.weeks.find((w) => w.week === week)?.title ?? "";

/** Content: one place for the plan's problems, data structures, patterns and concepts, for all weeks or one. */
export function ContentPage() {
  const { plan } = usePlanContext();
  const [params, setParams] = useSearchParams();
  const rawWeek = Number(params.get("week"));
  const week = curriculum.weeks.some((w) => w.week === rawWeek) ? rawWeek : undefined;
  const tab: TabId = CONTENT_TABS.find((t) => t.id === params.get("tab"))?.id ?? "problems";

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v === undefined || v === "" ? next.delete(k) : next.set(k, v));
    setParams(next, { replace: true });
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Content</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label>
          <span className="mr-2">Week</span>
          <select aria-label="Week" className={sel} value={week ?? ""} onChange={(e) => update({ week: e.target.value })}>
            <option value="">All weeks</option>
            {curriculum.weeks.map((w) => (
              <option key={w.week} value={w.week}>Week {w.week} · {w.title}</option>
            ))}
          </select>
        </label>
        <button type="button" className={linkBtn} onClick={() => update({ week: String(currentWeek(plan)) })}>This week</button>
      </div>
      {week !== undefined && (
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-slate-100">Week {week} · {weekTitle(week)}</strong> — {curriculum.weeks.find((w) => w.week === week)!.goal}
        </p>
      )}

      <div role="tablist" aria-label="Content" className="mt-4 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {CONTENT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`content-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="content-panel"
            onClick={() => update({ tab: t.id })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-indigo-600 text-indigo-800 dark:border-indigo-400 dark:text-indigo-200"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="content-panel" aria-labelledby={`content-tab-${tab}`} className="mt-4">
        {tab === "problems" && <ProblemsTab plan={plan} week={week} />}
        {tab === "data-structures" && <StructuresTab plan={plan} week={week} structure={params.get("structure") ?? ""} onPick={(s) => update({ structure: s })} />}
        {tab === "patterns" && <PatternsTab week={week} />}
        {tab === "concepts" && <ConceptsTab week={week} />}
      </div>

      {week !== undefined && (
        <div className="mt-8">
          <AddDayButton week={week} />
        </div>
      )}
    </div>
  );
}

// ── Problems ─────────────────────────────────────────────────────────────────

function ProblemsTab({ plan, week }: { plan: Plan; week: number | undefined }) {
  const [filters, setFilters] = useState<ContentFilters>({ platform: "", difficulty: "", status: "" });
  const [showSpare, setShowSpare] = useState(false);
  const urls = dashboardUrls(plan.settings);
  const { byWeek, spare } = contentProblems(plan, curriculum);
  const keep = (r: ContentProblem) => matchesContentFilters(plan, r, filters);

  const weeks = curriculum.weeks.filter((w) => week === undefined || w.week === week);
  // Spare problems never say which week they came from: with no week picked they are one flat list; with a week
  // picked only the ones already attempted (whose week is then revealed) for that week are listed.
  const spareRows = spare.filter((r) => keep(r) && (week === undefined || r.week === week));
  const shown = weeks.reduce((n, w) => n + (byWeek.get(w.week) ?? []).filter(keep).length, 0) + (showSpare ? spareRows.length : 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <a href={urls.leetcode} target="_blank" rel="noopener noreferrer" className={linkBtn}>LeetCode dashboard<span className="sr-only"> (opens in a new tab)</span></a>
        <a href={urls.hackerrank} target="_blank" rel="noopener noreferrer" className={linkBtn}>HackerRank dashboard<span className="sr-only"> (opens in a new tab)</span></a>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select aria-label="Platform" className={sel} value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value as ContentFilters["platform"] })}>
          <option value="">All platforms</option>
          <option value="LeetCode">LeetCode</option>
          <option value="HackerRank">HackerRank</option>
        </select>
        <select aria-label="Difficulty" className={sel} value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as ContentFilters["difficulty"] })}>
          <option value="">All difficulties</option>
          {(["Easy", "Medium", "Hard"] as const).map((d) => <option key={d}>{d}</option>)}
        </select>
        <select aria-label="Status" className={sel} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as ContentFilters["status"] })}>
          <option value="">Any status</option>
          <option value="none">Not attempted</option>
          <option value="alone">Solved alone</option>
          <option value="work">Needs work</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={showSpare} onChange={(e) => setShowSpare(e.target.checked)} /> Show spare problems
        </label>
      </div>
      <p className="mt-3 text-sm text-slate-500" role="status">{shown} problem{shown === 1 ? "" : "s"}</p>

      {weeks.map((w) => {
        const rows = (byWeek.get(w.week) ?? []).filter(keep);
        if (rows.length === 0) return null;
        return (
          <section key={w.week} className="mt-5" aria-label={`Week ${w.week} problems`}>
            <h2 className="text-lg font-semibold">Week {w.week} · {w.title}</h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-900">
              {rows.map((r) => <ProblemLine key={r.problem.id} plan={plan} row={r} />)}
            </ul>
          </section>
        );
      })}

      {showSpare && (
        <section className="mt-5" aria-label="Spare problems">
          <h2 className="text-lg font-semibold">Spare problems</h2>
          <p className="text-sm text-slate-500">Extra problems used by mocks and free practice.</p>
          {spareRows.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No spare problems match.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-900">
              {spareRows.map((r) => <ProblemLine key={r.problem.id} plan={plan} row={r} />)}
            </ul>
          )}
        </section>
      )}
      {shown === 0 && <p className="mt-4 text-sm text-slate-500">No problems match these filters.</p>}
    </div>
  );
}

// ── Topics (Data Structures, Patterns, Concepts) ─────────────────────────────

function useChecks() {
  const { db, plan } = usePlanContext();
  const rows = useLiveQuery(() => db.topicChecks.toArray(), [db]);
  const done = new Set((rows ?? []).map((r) => r.topicId));
  const toggle = (id: string) => (done.has(id) ? db.topicChecks.delete(id) : db.topicChecks.put({ topicId: id, checkedOn: plan.today }));
  return { done, toggle };
}

function Progress({ topics, done }: { topics: Topic[]; done: Set<string> }) {
  const n = new Set(topics.filter((t) => done.has(t.id)).map((t) => t.id)).size;
  const m = new Set(topics.map((t) => t.id)).size;
  return <p className="text-sm text-slate-500" role="status" aria-label="Topics done">{n} of {m} done</p>;
}

const NO_TOPICS = <p className="mt-4 text-sm text-slate-500">No topics yet.</p>;

function TopicRow({ topic, done, toggle, note }: { topic: Topic; done: boolean; toggle: () => void; note?: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <input type="checkbox" checked={done} onChange={toggle} aria-label={topic.title} className="mt-1 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? "text-slate-500 line-through" : ""}`}>
          {topic.title}
          {note && <span className="ml-2 text-xs font-normal text-slate-500">{note}</span>}
        </p>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={`${topic.title} resources`}>
          {topic.resources.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
                {r.site}: {r.title}<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function Group({ heading, children }: { heading: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="text-lg font-semibold">{heading}</h2>
      <ul className="mt-2 space-y-2">{children}</ul>
    </section>
  );
}

function PatternsTab({ week }: { week: number | undefined }) {
  const { done, toggle } = useChecks();
  const groups = topicGroups(getResources(), "pattern", week);
  if (groups.length === 0) return NO_TOPICS;
  return (
    <div>
      <Progress topics={groups.flatMap((g) => g.topics)} done={done} />
      {groups.map((g) => (
        <Group key={g.week} heading={<>{g.neetcode} <span className="text-sm font-normal text-slate-500">· Week {g.week}</span></>}>
          {g.topics.map((t) => <TopicRow key={t.id} topic={t} done={done.has(t.id)} toggle={() => toggle(t.id)} />)}
        </Group>
      ))}
    </div>
  );
}

function ConceptsTab({ week }: { week: number | undefined }) {
  const { done, toggle } = useChecks();
  const groups = topicGroups(getResources(), "concept", week);
  const weeks = curriculum.weeks.filter((w) => week === undefined || w.week === week);
  const topics = groups.flatMap((g) => g.topics);
  return (
    <div>
      {topics.length > 0 && <Progress topics={topics} done={done} />}
      {weeks.map((w) => {
        const g = groups.find((x) => x.week === w.week);
        return (
          <Group key={w.week} heading={<>Week {w.week} · {w.title}</>}>
            <li className="list-none">
              <ul className="list-disc pl-5 text-sm" aria-label={`Week ${w.week} concepts`}>
                {w.concepts.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </li>
            {g?.topics.map((t) => <TopicRow key={t.id} topic={t} done={done.has(t.id)} toggle={() => toggle(t.id)} />)}
          </Group>
        );
      })}
      {topics.length === 0 && NO_TOPICS}
    </div>
  );
}

function StructuresTab({ plan, week, structure, onPick }: { plan: Plan; week: number | undefined; structure: string; onPick: (s: string) => void }) {
  const { done, toggle } = useChecks();
  const res = getResources();
  const names = structureNames(res);
  if (names.length === 0) return NO_TOPICS;
  const picked = names.includes(structure) ? structure : "";

  const picker = (
    <label className="text-sm">
      <span className="mr-2">Structure</span>
      <select aria-label="Structure" className={sel} value={picked} onChange={(e) => onPick(e.target.value)}>
        <option value="">All structures</option>
        {names.map((n) => <option key={n}>{n}</option>)}
      </select>
    </label>
  );

  if (picked) return <Dive plan={plan} name={picked} picker={picker} done={done} toggle={toggle} />;

  const groups = topicGroups(res, "data-structure", week);
  const topics = groups.flatMap((g) => g.topics);
  const byStructure = new Map<string, { topic: Topic; week: number }[]>();
  for (const g of groups) for (const t of g.topics) byStructure.set(t.structure!, [...(byStructure.get(t.structure!) ?? []), { topic: t, week: g.week }]);
  return (
    <div>
      {picker}
      {topics.length === 0 ? NO_TOPICS : (
        <>
          <div className="mt-3"><Progress topics={topics} done={done} /></div>
          {[...byStructure.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, items]) => (
            <Group key={name} heading={name}>
              {items.map(({ topic, week: w }) => <TopicRow key={topic.id} topic={topic} done={done.has(topic.id)} toggle={() => toggle(topic.id)} note={`Week ${w}`} />)}
            </Group>
          ))}
        </>
      )}
    </div>
  );
}

/** "Dive deeper": a structure's topics and resources, the weeks it appears in, the patterns taught in them, and their plan problems. */
function Dive({ plan, name, picker, done, toggle }: { plan: Plan; name: string; picker: React.ReactNode; done: Set<string>; toggle: (id: string) => unknown }) {
  const dive = diveDeeper(getResources(), name);
  const topics = dive.groups.flatMap((g) => g.topics);
  const { byWeek } = contentProblems(plan, curriculum);
  const inWeeks = new Set(dive.weeks.map((w) => w.week));
  const problems = curriculum.weeks.filter((w) => inWeeks.has(w.week)).map((w) => ({ week: w, rows: byWeek.get(w.week) ?? [] }));
  const row = (g: TopicGroup, t: Topic) => <TopicRow key={t.id} topic={t} done={done.has(t.id)} toggle={() => toggle(t.id)} note={`Week ${g.week}`} />;
  return (
    <div>
      {picker}
      <section aria-label={`Dive deeper: ${name}`}>
        <h2 className="mt-4 text-xl font-semibold">Dive deeper: {name}</h2>
        <Progress topics={topics} done={done} />
        <ul className="mt-2 space-y-2">{dive.groups.flatMap((g) => g.topics.map((t) => row(g, t)))}</ul>

        <h3 className="mt-6 font-semibold">Appears in</h3>
        <ul className="list-disc pl-5 text-sm" aria-label="Weeks">
          {dive.weeks.map((w) => <li key={w.week}>Week {w.week} · {w.title}</li>)}
        </ul>

        <h3 className="mt-6 font-semibold">Patterns taught in those weeks</h3>
        {dive.patterns.length === 0 ? (
          <p className="text-sm text-slate-500">No patterns listed.</p>
        ) : (
          <ul className="mt-2 space-y-2" aria-label="Patterns">{dive.patterns.flatMap((g) => g.topics.map((t) => row(g, t)))}</ul>
        )}

        <h3 className="mt-6 font-semibold">Plan problems from those weeks</h3>
        {problems.map(({ week: w, rows }) => (
          <div key={w.week} className="mt-2" aria-label={`Week ${w.week} problems`} role="group">
            <p className="text-sm font-medium">Week {w.week} · {w.title}</p>
            <ul className="divide-y divide-slate-100 dark:divide-slate-900">{rows.map((r) => <ProblemLine key={r.problem.id} plan={plan} row={r} />)}</ul>
          </div>
        ))}
      </section>
    </div>
  );
}

export type { TopicKind };
