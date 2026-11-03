import { getResources, topicGroups } from "../../lib/resources";
import { useTopicChecks } from "./checks";
import { Badge, NO_TOPICS, Progress, SectionHeading, TopicCard } from "./ui";

/** Pattern topics, one group per week headed by the week's NeetCode topic name. */
export function PatternsTab({ week }: { week: number | undefined }) {
  const { done, toggle } = useTopicChecks();
  const groups = topicGroups(getResources(), "pattern", week);
  if (groups.length === 0) return NO_TOPICS;
  const topics = groups.flatMap((g) => g.topics);
  return (
    <div>
      <Progress done={new Set(topics.filter((t) => done.has(t.id)).map((t) => t.id)).size} total={new Set(topics.map((t) => t.id)).size} word="done" label="Topics done" />
      {groups.map((g) => (
        <section key={g.week} aria-label={`Week ${g.week} patterns`}>
          <SectionHeading aside={<Badge>Week {g.week}</Badge>}>{g.neetcode}</SectionHeading>
          <ul className="mt-2 space-y-2">{g.topics.map((t) => <TopicCard key={t.id} topic={t} done={done.has(t.id)} toggle={() => toggle(t.id)} />)}</ul>
        </section>
      ))}
    </div>
  );
}
