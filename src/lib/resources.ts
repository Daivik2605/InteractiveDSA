// Reads content/resources.json (optional: the app works without it) and answers the Content page's questions about it.
// Pure helpers take the file as an argument so tests can pass a fixture.

import type { ResourcesFile, ResourceWeek, Settings, Topic, TopicKind } from "../types/content";

export const DEFAULT_LEETCODE_URL = "https://leetcode.com/problemset/";
export const DEFAULT_HACKERRANK_URL = "https://www.hackerrank.com/dashboard";

/** True for a well-formed https URL (the only kind Settings accepts). */
export function isHttpsUrl(text: string): boolean {
  try {
    return new URL(text).protocol === "https:";
  } catch {
    return false;
  }
}

/** The saved URL when it is a valid https URL, else the default (empty, missing or hand-edited imports). */
export const dashboardUrl = (saved: string | undefined, fallback: string): string => (saved && isHttpsUrl(saved.trim()) ? saved.trim() : fallback);

export const dashboardUrls = (s: Pick<Settings, "leetcodeUrl" | "hackerrankUrl">) => ({
  leetcode: dashboardUrl(s.leetcodeUrl, DEFAULT_LEETCODE_URL),
  hackerrank: dashboardUrl(s.hackerrankUrl, DEFAULT_HACKERRANK_URL),
});

const files = import.meta.glob("../../content/resources.json", { eager: true, import: "default" }) as Record<string, ResourcesFile>;

/** The resources file, or undefined while content/resources.json does not exist. Tests replace this. */
export const getResources = (): ResourcesFile | undefined => Object.values(files)[0];

export interface TopicGroup {
  week: number;
  title: string;
  neetcode: string;
  topics: Topic[];
}

/** Topics of one kind, grouped by week (all weeks, or just `week`). Weeks with no such topic are left out. */
export function topicGroups(res: ResourcesFile | undefined, kind: TopicKind, week?: number): TopicGroup[] {
  return (res?.weeks ?? [])
    .filter((w) => week === undefined || w.week === week)
    .map((w: ResourceWeek) => ({ week: w.week, title: w.title, neetcode: w.neetcode, topics: w.topics.filter((t) => t.kind === kind) }))
    .filter((g) => g.topics.length > 0)
    .sort((a, b) => a.week - b.week);
}

/** Every structure name, sorted. */
export const structureNames = (res: ResourcesFile | undefined): string[] =>
  [...new Set((res?.weeks ?? []).flatMap((w) => w.topics.map((t) => t.structure).filter((s): s is string => !!s)))].sort((a, b) => a.localeCompare(b));

export interface StructureDive {
  name: string;
  groups: TopicGroup[]; // the structure's topics by week
  weeks: { week: number; title: string }[];
  patterns: TopicGroup[]; // pattern topics taught in those weeks
}

/** Everything about one structure, across all weeks. */
export function diveDeeper(res: ResourcesFile | undefined, name: string): StructureDive {
  const groups = (res?.weeks ?? [])
    .map((w) => ({ week: w.week, title: w.title, neetcode: w.neetcode, topics: w.topics.filter((t) => t.kind === "data-structure" && t.structure === name) }))
    .filter((g) => g.topics.length > 0)
    .sort((a, b) => a.week - b.week);
  const weeks = groups.map((g) => ({ week: g.week, title: g.title }));
  const patterns = (res?.weeks ?? [])
    .filter((w) => weeks.some((x) => x.week === w.week))
    .map((w) => ({ week: w.week, title: w.title, neetcode: w.neetcode, topics: w.topics.filter((t) => t.kind === "pattern") }))
    .filter((g) => g.topics.length > 0)
    .sort((a, b) => a.week - b.week);
  return { name, groups, weeks, patterns };
}
