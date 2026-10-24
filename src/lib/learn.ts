import { itemLabel } from "./labels";
import type { Plan } from "./plan";

/** What a learn item asks the learner to do, read from its curriculum label. */
export type LearnKind = "weekly-quiz" | "drill" | "review" | "other";

export function learnKind(label: string): LearnKind {
  if (/^weekly quiz/i.test(label)) return "weekly-quiz";
  if (/^pattern drill/i.test(label)) return "drill";
  if (/^review quiz/i.test(label)) return "review";
  return "other";
}

/**
 * The learn item to tick when a quiz/drill is finished: today's matching item if it is still open,
 * otherwise the oldest matching item in the catch-up queue. A weekly quiz only matches its own week.
 */
export function learnItemToTick(plan: Plan, kind: LearnKind, week?: number): { itemId: string; planDayId: string } | null {
  if (plan.phase !== "during") return null;
  const weekOk = (w: number) => kind !== "weekly-quiz" || week === undefined || w === week;

  const today = plan.todayDay;
  const open = today?.items.find(
    (i) => i.kind === "learn" && !plan.completions.has(i.itemId) && learnKind(itemLabel(plan, i)) === kind && weekOk(today.day.week),
  );
  if (open) return { itemId: open.itemId, planDayId: open.planDayId };

  const late = plan.catchUp.find((c) => c.item.kind === "learn" && learnKind(itemLabel(plan, c.item)) === kind && weekOk(c.week));
  return late ? { itemId: late.item.itemId, planDayId: late.planDayId } : null;
}
