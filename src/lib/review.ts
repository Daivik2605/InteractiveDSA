// Review slots: two problems a day, drawn at random from earlier plan days. Pure: no Dexie, no clock, no Math.random.
// The draw is stored (db.dayDraws) the first time a day is opened, so reloading never reshuffles it.

import type { Rng } from "./quiz";
import { parsePlanDayId } from "./schedule";
import type { Curriculum, Difficulty, Problem } from "../types/content";

export const REVIEW_MAX_DIFFICULTY: Difficulty = "Medium";

export const reviewSlotId = (planDayId: string, n: number) => `${planDayId}:review-${n}`;

/** "w03-d6:review-2" → { planDayId: "w03-d6", n: 2 }; undefined for any other item id. */
export function parseReviewSlotId(itemId: string): { planDayId: string; n: number } | undefined {
  const m = /^(w\d{2}-d[1-7]):review-(\d+)$/.exec(itemId);
  return m ? { planDayId: m[1]!, n: Number(m[2]) } : undefined;
}

const RANK: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };
const planDayOf = (curriculum: Curriculum, planDayId: string): { week: number; planDay: number } | undefined => {
  const { week, kind, n } = parsePlanDayId(planDayId);
  if (kind === "extension") return undefined;
  const d = curriculum.weeks.find((w) => w.week === week)?.days.find((x) => x.day === n);
  return d ? { week, planDay: d.planDay } : undefined;
};

/**
 * What a day's review slots can draw: core problems of earlier plan days and the pools of earlier weeks, up to Medium.
 * Old-topic problems and fallbacks are left out. Where a problem came from is never shown.
 */
export function reviewPool(curriculum: Curriculum, planDayId: string): Problem[] {
  const here = planDayOf(curriculum, planDayId);
  if (!here) return [];
  const ok = (p: Problem) => RANK[p.difficulty] <= RANK[REVIEW_MAX_DIFFICULTY];
  const core = curriculum.weeks.flatMap((w) => w.days).filter((d) => d.planDay < here.planDay).flatMap((d) => d.problems).filter((p) => p.role === "core");
  const pools = curriculum.weeks.filter((w) => w.week < here.week).flatMap((w) => w.pool);
  return [...core, ...pools].filter(ok);
}

/**
 * Picks `count` problems at random. Repetition across days is fine; within one draw they are distinct while the pool
 * allows it. `avoid` (a slot's current problem on a re-roll) is skipped when anything else is available.
 */
export function drawReview(pool: readonly Problem[], count: number, rng: Rng, avoid: ReadonlySet<string> = new Set()): Problem[] {
  const out: Problem[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < count; i++) {
    let candidates = pool.filter((p) => !taken.has(p.id) && !avoid.has(p.id));
    if (candidates.length === 0) candidates = pool.filter((p) => !taken.has(p.id));
    if (candidates.length === 0) candidates = [...pool];
    if (candidates.length === 0) break;
    const pick = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))]!;
    out.push(pick);
    taken.add(pick.id);
  }
  return out;
}
