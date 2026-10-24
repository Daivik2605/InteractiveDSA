import raw from "../../content/curriculum.json";
import type { Curriculum, DayKind, MockSlot, Problem } from "../types/content";

// Validated by `npm run validate`; the JSON's inferred types are wider than ours, hence the cast.
export const curriculum = raw as unknown as Curriculum;

/** Every curriculum problem: day problems, fallbacks and pools, so attempts on any of them resolve a title. */
export const problemsById: ReadonlyMap<string, Problem> = new Map(
  curriculum.weeks
    .flatMap((w) => [...w.days.flatMap((d) => [...d.problems, ...(d.fallback ? [d.fallback] : [])]), ...w.pool])
    .map((p) => [p.id, p]),
);

export const weekOf = (week: number) => curriculum.weeks.find((w) => w.week === week);

/** The curriculum day behind a plan day id ("w03-d2"); undefined for extension days. */
export const curriculumDay = (planDayId: string) => {
  const m = /^w(\d{2})-d(\d+)$/.exec(planDayId);
  return m ? weekOf(Number(m[1]))?.days.find((d) => d.day === Number(m[2])) : undefined;
};

export const mockOfDay = (planDayId: string): MockSlot | null => curriculumDay(planDayId)?.mock ?? null;

/** The week's own-topic problems from weeks 1..`week` (or just `week` when `onlyThisWeek`); never old-topic ones. */
export function problemsUpTo(week: number, onlyThisWeek = false): Problem[] {
  return curriculum.weeks
    .filter((w) => (onlyThisWeek ? w.week === week : w.week <= week))
    .flatMap((w) => w.days.flatMap((d) => d.problems))
    .filter((p) => p.role === "core");
}

export const DAY_KIND_LABEL: Record<DayKind, string> = {
  "new-topic": "New topic",
  topic: "Topic practice",
  "python-fluency": "Python fluency",
  "old-topics": "Old topics (mixed)",
  timed: "Timed practice",
  redo: "Redo day",
  "wrap-up": "Wrap-up",
};
