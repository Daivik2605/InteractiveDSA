// The Concepts tab's cards: every curriculum concept string (id from week and position, src/lib/conceptIds.ts) plus the
// "concept" topics of resources.json, which show as "Core reading" at the top of their week.

import type { Curriculum, ConceptLinksFile, ResourceLink, ResourcesFile } from "../types/content";
import { curriculumConcepts } from "./conceptIds";

const files = import.meta.glob("../../content/concept-links.json", { eager: true, import: "default" }) as Record<string, ConceptLinksFile>;

/** content/concept-links.json, or undefined while it does not exist. Tests replace this. */
export const getConceptLinks = (): ConceptLinksFile | undefined => Object.values(files)[0];

export interface ConceptCard {
  /** "w03-c2" for a numbered concept; the topic id (e.g. "w01-bigo") for core reading. */
  id: string;
  week: number;
  title: string;
  /** true = a "concept" topic from resources.json ("Core reading"). Its tick lives in topicChecks, numbered ones in conceptChecks. */
  core: boolean;
  links: ResourceLink[];
}

/** All cards, in week order; within a week the core-reading cards come first. */
export function buildConceptCards(curriculum: Pick<Curriculum, "weeks">, res: ResourcesFile | undefined, links: ConceptLinksFile | undefined): ConceptCard[] {
  const numbered = curriculumConcepts(curriculum.weeks).map((c) => ({ id: c.id, week: c.week, title: c.text, core: false, links: links?.concepts[c.id] ?? [] }));
  const core = (res?.weeks ?? []).flatMap((w) => w.topics.filter((t) => t.kind === "concept").map((t) => ({ id: t.id, week: w.week, title: t.title, core: true, links: t.resources })));
  return curriculum.weeks.flatMap((w) => [...core.filter((c) => c.week === w.week), ...numbered.filter((c) => c.week === w.week)]);
}
