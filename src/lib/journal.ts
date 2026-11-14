// Journal activity: which days have logged problems. Pure, shared by the sidebar, calendar and (later) dashboard.

import { addDays } from "./dates";
import type { ProblemAttempt } from "../types/content";

/** Attempts that count as journal entries: everything except attempts made inside a mock. */
export const journalAttempts = (attempts: readonly ProblemAttempt[]): ProblemAttempt[] => attempts.filter((a) => a.source !== "mock");

export function entriesByDate(attempts: readonly ProblemAttempt[]): Map<string, ProblemAttempt[]> {
  const out = new Map<string, ProblemAttempt[]>();
  for (const a of journalAttempts(attempts)) out.set(a.date, [...(out.get(a.date) ?? []), a]);
  return out;
}

/**
 * Streak = consecutive days with at least one entry. The current streak ends today, or yesterday while
 * today has no entry yet (so it doesn't read 0 every morning).
 */
export function journalStreak(dates: ReadonlySet<string>, today: string): { current: number; longest: number } {
  let current = 0;
  for (let d = dates.has(today) ? today : addDays(today, -1); dates.has(d); d = addDays(d, -1)) current++;
  let longest = 0;
  for (const d of dates) {
    if (dates.has(addDays(d, -1))) continue; // not the start of a run
    let n = 0;
    for (let x = d; dates.has(x); x = addDays(x, 1)) n++;
    longest = Math.max(longest, n);
  }
  return { current, longest };
}
