import { Link } from "react-router-dom";
import { platformOf } from "../../lib/labels";
import type { ContentProblem } from "../../lib/contentProblems";
import { latestAttempt } from "../../lib/contentProblems";
import { formatShort } from "../../lib/dates";
import type { Plan } from "../../lib/plan";
import { OUTCOME_LABEL } from "../../lib/problems";
import { DIFF_STYLE } from "../today/Row";

/** One plan problem: title (to its journal page), difficulty, platform, external link, the day it's on, my latest outcome. */
export function ProblemLine({ plan, row }: { plan: Plan; row: ContentProblem }) {
  const { problem } = row;
  const last = latestAttempt(plan, problem.id);
  const where = row.spare ? "Spare problem" : `Day ${row.day}${row.date ? ` · ${formatShort(row.date)}` : ""}${row.fallback ? " · fallback" : ""}`;
  return (
    <li className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
      <Link to={`/problems/${encodeURIComponent(problem.id)}`} className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">
        {problem.title}
      </Link>
      <span className={`rounded px-1.5 py-0.5 text-xs ${DIFF_STYLE[problem.difficulty]}`}>{problem.difficulty}</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{platformOf(plan, problem)}</span>
      {problem.url && (
        <a href={problem.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${problem.title} (new tab)`} className="text-xs text-indigo-700 underline dark:text-indigo-300">
          Open
        </a>
      )}
      <span className="text-xs text-slate-500">{where}</span>
      <span className="text-xs text-slate-500">{last ? OUTCOME_LABEL[last.outcome] : "not attempted"}</span>
    </li>
  );
}
