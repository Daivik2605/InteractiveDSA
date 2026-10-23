import { curriculum, problemsById } from "./curriculum";
import type { Plan } from "./plan";
import type { DayItem } from "./schedule";
import { parsePlanDayId } from "./schedule";

/** Human label for a plan item; a ticked slot shows the problem that was done in it. */
export function itemLabel(plan: Plan, item: DayItem): string {
  if (item.kind === "problem") return item.problem!.title;
  if (item.kind === "learn") {
    const { week, n } = parsePlanDayId(item.planDayId);
    return curriculum.weeks.find((w) => w.week === week)?.days.find((d) => d.day === n)?.learn ?? "Learn";
  }
  const slotNo = item.itemId.endsWith(":s1") ? 1 : 2;
  const c = plan.completions.get(item.itemId);
  const attempt = c?.attemptId !== undefined ? plan.attemptsById.get(c.attemptId) : undefined;
  return `Redo slot ${slotNo}${attempt ? `: ${problemsById.get(attempt.problemId)?.title ?? attempt.problemId}` : ""}`;
}
