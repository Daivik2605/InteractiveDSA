import { useMemo } from "react";
import { usePlan } from "../../app/PlanContext";
import { entriesByDate, journalStreak } from "../../lib/journal";

/** Journal activity derived from the attempts the plan already loaded. */
export function useJournal() {
  const plan = usePlan();
  return useMemo(() => {
    const byDate = entriesByDate(plan.snapshot.attempts);
    const counts = new Map([...byDate].map(([d, list]) => [d, list.length]));
    return { today: plan.today, byDate, counts, streak: journalStreak(new Set(byDate.keys()), plan.today) };
  }, [plan]);
}
