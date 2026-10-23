import raw from "../../content/curriculum.json";
import type { Curriculum, Problem } from "../types/content";

// Validated by `npm run validate`; the JSON's inferred types are wider than ours, hence the cast.
export const curriculum = raw as unknown as Curriculum;

export const problemsById: ReadonlyMap<string, Problem> = new Map(
  curriculum.weeks.flatMap((w) => w.days.flatMap((d) => d.problems)).map((p) => [p.id, p]),
);

export const weekOf = (week: number) => curriculum.weeks.find((w) => w.week === week);

/** Problems from weeks 1..`week` (or just `week` when `onlyThisWeek`). */
export function problemsUpTo(week: number, onlyThisWeek = false): Problem[] {
  return curriculum.weeks
    .filter((w) => (onlyThisWeek ? w.week === week : w.week <= week))
    .flatMap((w) => w.days.flatMap((d) => d.problems));
}
