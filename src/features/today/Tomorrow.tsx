import { useEffect, useState } from "react";
import { usePlanContext } from "../../app/PlanContext";
import { saveDayLog } from "../../lib/actions";
import { curriculumDay, DAY_KIND_LABEL } from "../../lib/curriculum";
import { addDays, formatShort } from "../../lib/dates";
import { itemLabel, platformOf } from "../../lib/labels";
import type { Plan } from "../../lib/plan";
import { DIFF_STYLE, Section } from "./Row";

/** "What did you learn?" on the learn item: saved as the day's study-log notes (the same notes Edit day shows). */
export function LearnRecord({ planDayId }: { planDayId: string }) {
  const { plan, db } = usePlanContext();
  const log = plan.dayLogs.get(planDayId);
  const saved = log?.notes ?? "";
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [saved]); // follows the stored note (e.g. after Edit day changes it)
  const dirty = text.trim() !== saved;
  return (
    <form
      className="w-full"
      onSubmit={async (e) => {
        e.preventDefault();
        await saveDayLog(db, { planDayId, notes: text, minutes: log?.minutes ?? 0, links: log?.links ?? [] }, plan.today);
      }}
    >
      <label className="block text-xs text-slate-500">
        What did you learn? (optional)
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <button type="submit" disabled={!dirty} className="mt-1 rounded-md border border-slate-300 px-2.5 py-1 text-sm disabled:opacity-40 dark:border-slate-700">
        Save
      </button>
      {!dirty && saved && <span className="ml-2 text-xs text-slate-500">Saved</span>}
    </form>
  );
}

/** Tomorrow's day laid out as a read-only list: what to learn, the programs (problems), review and redo slots. */
export function TomorrowChecklist({ plan }: { plan: Plan }) {
  const tomorrow = addDays(plan.today, 1);
  const day = plan.byDate.get(tomorrow);
  const title = "Tomorrow's checklist";
  if (!day) {
    return (
      <Section title={title}>
        <li className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-800">Nothing is scheduled for tomorrow ({formatShort(tomorrow)}).</li>
      </Section>
    );
  }
  const { planDayId, week, kind } = day.day;
  const n = Number(planDayId.split(/[dx]/)[1]);
  const cur = kind === "plan" ? curriculumDay(planDayId) : undefined;
  const reviews = day.items.filter((i) => i.kind === "review");
  const rest = plan.restDates.has(tomorrow);
  const mark = <span aria-hidden className="mt-1 inline-block h-4 w-4 shrink-0 rounded border border-slate-300 dark:border-slate-600" />;
  const row = "flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800";
  return (
    <Section
      title={title}
      hint={`${kind === "extension" ? `Week ${week} · Extension day ${n}` : `Week ${week} · Day ${n}`} · ${formatShort(tomorrow)}${cur ? ` · ${DAY_KIND_LABEL[cur.kind]}${cur.timedMinutes ? ` · ${cur.timedMinutes} min per problem` : ""}` : ""}`}
    >
      {rest && <li className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-800">Tomorrow is marked as a rest day; its items go to the catch-up queue.</li>}
      {day.items.filter((i) => i.kind !== "review").map((item) =>
        item.kind === "problem" ? (
          <li key={item.itemId} className={row}>
            {mark}
            <div className="flex flex-wrap items-center gap-2">
              {item.problem!.url ? (
                <a href={item.problem!.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">
                  {item.problem!.title}<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className="font-medium">{item.problem!.title}</span>
              )}
              <span className={`rounded px-1.5 py-0.5 text-xs ${DIFF_STYLE[item.problem!.difficulty]}`}>{item.problem!.difficulty}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{platformOf(plan, item.problem!)}</span>
            </div>
          </li>
        ) : (
          <li key={item.itemId} className={row}>
            {mark}
            <span className="font-medium">
              {item.kind === "slot" ? "Redo a problem from your queue" : item.kind === "task" ? item.custom!.title : itemLabel(plan, item)}
            </span>
          </li>
        ),
      )}
      {reviews.length > 0 && (
        <li className={row}>
          {mark}
          <span>{reviews.length} review problems, drawn when you open the day.</span>
        </li>
      )}
      {day.items.length === 0 && <li className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-800">Nothing planned for tomorrow.</li>}
    </Section>
  );
}
