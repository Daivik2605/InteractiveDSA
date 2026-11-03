// content/data-structures.json (optional) joined with content/resources.json: one card per structure for the Content page.

import type { DataStructuresFile, ResourcesFile, StructureInfo, Topic } from "../types/content";
import type { TopicGroup } from "./resources";

const files = import.meta.glob("../../content/data-structures.json", { eager: true, import: "default" }) as Record<string, DataStructuresFile>;

/** The data-structures file, or undefined while it does not exist. Tests replace this. */
export const getDataStructures = (): DataStructuresFile | undefined => Object.values(files)[0];

export interface StructureCard {
  info: StructureInfo;
  /** Every data-structure topic for it, with the week that teaches it. */
  topics: { topic: Topic; week: number }[];
  /** Weeks that teach it (a data-structure topic for it sits in the week), ascending. */
  weeks: number[];
}

export function structureCards(ds: DataStructuresFile | undefined, res: ResourcesFile | undefined): StructureCard[] {
  return (ds?.structures ?? []).map((info) => {
    const topics = (res?.weeks ?? []).flatMap((w) => w.topics.filter((t) => t.kind === "data-structure" && t.structure === info.name).map((topic) => ({ topic, week: w.week })));
    return { info, topics, weeks: [...new Set(topics.map((t) => t.week))].sort((a, b) => a - b) };
  });
}

/** The cards for a week: the structures taught that week (all of them when no week is selected). */
export const cardsForWeek = (cards: StructureCard[], week: number | undefined): StructureCard[] => (week === undefined ? cards : cards.filter((c) => c.weeks.includes(week)));

/** Pattern topics from the given weeks, grouped by week. */
export function patternsInWeeks(res: ResourcesFile | undefined, weeks: readonly number[]): TopicGroup[] {
  return (res?.weeks ?? [])
    .filter((w) => weeks.includes(w.week))
    .map((w) => ({ week: w.week, title: w.title, neetcode: w.neetcode, topics: w.topics.filter((t) => t.kind === "pattern") }))
    .filter((g) => g.topics.length > 0)
    .sort((a, b) => a.week - b.week);
}
