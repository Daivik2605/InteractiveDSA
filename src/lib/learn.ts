import type { DayItem } from "./schedule";

/** What a day's learn item is, read from its curriculum day (never from label text). */
export type LearnKind = "mock" | "new-topic" | "other";

export function learnKind(item: Pick<DayItem, "kind" | "mock" | "dayKind">): LearnKind {
  if (item.kind !== "learn") return "other";
  if (item.mock) return "mock";
  return item.dayKind === "new-topic" ? "new-topic" : "other";
}
