import { curriculumDay } from "./curriculum";
import type { Plan } from "./plan";
import type { DayItem } from "./schedule";
import type { Problem } from "../types/content";

const homeDay = (itemId: string) => curriculumDay(itemId.split(":")[0]!);

/** Platform to badge a problem with: a custom problem keeps its own text, a curriculum problem its typed platform. */
export const platformOf = (plan: Plan, problem: Problem): string | undefined =>
  plan.customById.has(problem.id) ? plan.customById.get(problem.id)!.platform : problem.platform;

/** Human label for a plan item; a ticked slot shows the problem that was done in it. */
export function itemLabel(plan: Plan, item: DayItem): string {
  if (item.kind === "problem") return item.problem!.title;
  if (item.kind === "task") return item.custom!.title;
  if (item.kind === "learn") {
    const home = homeDay(item.itemId);
    if (item.itemId.endsWith(":wrapup")) return home?.codingNote ?? "Wrap-up";
    return home?.learn ?? "Learn";
  }
  if (item.kind === "review") return item.problem?.title ?? `Review problem ${item.reviewSlot}`;
  const slotNo = item.itemId.endsWith(":s1") ? 1 : 2;
  const c = plan.completions.get(item.itemId);
  const attempt = c?.attemptId !== undefined ? plan.attemptsById.get(c.attemptId) : undefined;
  return `Redo slot ${slotNo}${attempt ? `: ${plan.problemOf(attempt.problemId)?.title ?? attempt.problemId}` : ""}`;
}
