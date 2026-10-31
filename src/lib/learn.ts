import type { DayItem } from "./schedule";

/** What a day's learn item is, read from its curriculum day (never from label text). */
export type LearnKind = "new-topic" | "other";

export function learnKind(item: Pick<DayItem, "kind" | "dayKind">): LearnKind {
  return item.kind === "learn" && item.dayKind === "new-topic" ? "new-topic" : "other";
}
