import type { ContentProblem } from "../../lib/contentProblems";
import type { Plan } from "../../lib/plan";
import { dashboardUrls } from "../../lib/resources";
import { PlanProblems } from "./PlanProblems";
import { buttonClass } from "./ui";


export function ProblemsTab({ plan, week }: { plan: Plan; week: number | undefined }) {
  const urls = dashboardUrls(plan.settings);
  // Spare problems never say which week they came from: with no week picked they are one flat list; with a week
  // picked only the ones already attempted (whose week is then revealed) for that week are listed.
  const spareFilter = (r: ContentProblem) => week === undefined || r.week === week;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <a href={urls.leetcode} target="_blank" rel="noopener noreferrer" className={buttonClass}>LeetCode dashboard<span className="sr-only"> (opens in a new tab)</span></a>
        <a href={urls.hackerrank} target="_blank" rel="noopener noreferrer" className={buttonClass}>HackerRank dashboard<span className="sr-only"> (opens in a new tab)</span></a>
      </div>
      <PlanProblems plan={plan} weeks={week === undefined ? undefined : [week]} spareFilter={spareFilter} />
    </div>
  );
}
