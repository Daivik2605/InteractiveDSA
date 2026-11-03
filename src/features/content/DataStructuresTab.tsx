import { Link } from "react-router-dom";
import { cardsForWeek, getDataStructures, patternsInWeeks, structureCards, type StructureCard } from "../../lib/dataStructures";
import type { ContentProblem } from "../../lib/contentProblems";
import type { Plan } from "../../lib/plan";
import { weekOfProblemId } from "../../lib/problems";
import { dashboardUrls, getResources } from "../../lib/resources";
import { useTopicChecks } from "./checks";
import { PlanProblems } from "./PlanProblems";
import { Badge, Card, EmptyState, linkClass, NO_TOPICS, primaryButtonClass, SectionHeading, TopicCard } from "./ui";
import { curriculum } from "../../lib/curriculum";

const weeksText = (weeks: number[]) => (weeks.length === 0 ? "Not taught in a plan week" : `${weeks.length === 1 ? "Week" : "Weeks"} ${weeks.join(", ")}`);

/** The structure list (all of them, or the ones taught in the selected week) or, with `ds` in the URL, one structure's page. */
export function DataStructuresTab({ plan, week, ds, hrefFor }: { plan: Plan; week: number | undefined; ds: string; hrefFor: (patch: Record<string, string | undefined>) => string }) {
  const { done, toggle } = useTopicChecks();
  const res = getResources();
  const cards = structureCards(getDataStructures(), res);
  if (cards.length === 0) return NO_TOPICS;

  const open = cards.find((c) => c.info.name === ds);
  if (open) return <StructurePage plan={plan} card={open} done={done} toggle={toggle} backHref={hrefFor({ ds: undefined })} />;

  const shown = cardsForWeek(cards, week);
  if (shown.length === 0) return <EmptyState>No data structures are taught in Week {week}.</EmptyState>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Data structures">
      {shown.map((c) => {
        const ticked = new Set(c.topics.filter((t) => done.has(t.topic.id)).map((t) => t.topic.id)).size;
        return (
          <Card key={c.info.name} className="relative focus-within:ring-2 focus-within:ring-indigo-500">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={hrefFor({ ds: c.info.name })} className="font-semibold text-indigo-700 after:absolute after:inset-0 hover:underline focus-visible:outline-none dark:text-indigo-300">
                {c.info.name}
              </Link>
              {!c.info.inPlan && <Badge tone="amber">Beyond the plan</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.topics.length === 0 ? "No topics yet" : `${ticked} of ${c.topics.length} ticked`}</p>
            <p className="text-xs text-slate-500">{weeksText(c.weeks)}</p>
          </Card>
        );
      })}
    </ul>
  );
}

function StructurePage({ plan, card, done, toggle, backHref }: { plan: Plan; card: StructureCard; done: Set<string>; toggle: (id: string) => unknown; backHref: string }) {
  const { info, topics, weeks } = card;
  const urls = dashboardUrls(plan.settings);
  const patterns = patternsInWeeks(getResources(), weeks);
  // A spare problem is listed when the week it belongs to teaches this structure. Its week is used only to choose it, never shown.
  const spareFilter = (r: ContentProblem) => weeks.includes(weekOfProblemId(r.problem.id));
  return (
    <div>
      <p className="text-sm"><Link to={backHref} className={linkClass}>← All data structures</Link></p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">{info.name}</h2>
        {!info.inPlan && <Badge tone="amber">Beyond the plan</Badge>}
      </div>
      <p className="text-sm text-slate-500">{weeksText(weeks)}</p>

      <section aria-label="HackerRank" className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
        <h3 className="font-semibold">Practise on HackerRank</h3>
        <p className="mt-2">
          <a href={info.hackerrankUrl} target="_blank" rel="noopener noreferrer" className={primaryButtonClass}>
            Practise on HackerRank<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        <p className="mt-2 text-sm">
          {info.hackerrankSubdomain ? `Open the ${info.hackerrankSubdomain} sub-domain on that page.` : "No sub-domain: practise under Algorithms or the Interview Preparation Kit."}
        </p>
        <p className="mt-1 text-sm">
          <a href={urls.hackerrank} target="_blank" rel="noopener noreferrer" className={linkClass}>
            HackerRank dashboard<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </section>

      <section aria-label="Learn">
        <SectionHeading>Learn</SectionHeading>
        {topics.length === 0 ? (
          <EmptyState>No topics for this structure yet.</EmptyState>
        ) : (
          <ul className="mt-2 space-y-2">{topics.map(({ topic, week }) => <TopicCard key={topic.id} topic={topic} done={done.has(topic.id)} toggle={() => toggle(topic.id)} note={`Week ${week}`} />)}</ul>
        )}
      </section>

      <section aria-label="Problems from my plan">
        <SectionHeading>Problems from my plan</SectionHeading>
        {weeks.length === 0 ? (
          <EmptyState>This structure is not taught in a week of the plan, so there are no plan problems for it.</EmptyState>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              A problem is listed when its week teaches this structure ({weeksText(weeks).toLowerCase()}). That is a match by week, not a promise the problem uses it.
            </p>
            <PlanProblems plan={plan} weeks={weeks.filter((w) => curriculum.weeks.some((x) => x.week === w))} spareFilter={spareFilter} />
          </>
        )}
      </section>

      <section aria-label="Related patterns">
        <SectionHeading>Related patterns</SectionHeading>
        {patterns.length === 0 ? (
          <EmptyState>No patterns listed for these weeks.</EmptyState>
        ) : (
          patterns.map((g) => (
            <div key={g.week} className="mt-3">
              <p className="text-sm font-medium">{g.neetcode} <Badge>Week {g.week}</Badge></p>
              <ul className="mt-2 space-y-2">{g.topics.map((t) => <TopicCard key={t.id} topic={t} done={done.has(t.id)} toggle={() => toggle(t.id)} />)}</ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
