import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { ensureDayDraws, logAttempt, rerollDraw, setRestDay, tickItem, undoAttempt, untickItem, type LogInput } from "../../lib/actions";
import { curriculum, curriculumDay, DAY_KIND_LABEL, problemsUpTo } from "../../lib/curriculum";
import { diffDays, formatDayMonth, formatShort } from "../../lib/dates";
import { itemLabel, platformOf } from "../../lib/labels";
import type { Plan } from "../../lib/plan";
import { parseReviewSlotId } from "../../lib/review";
import { canAddRestDay, fillSlots, type DayItem } from "../../lib/schedule";
import type { Problem } from "../../types/content";
import { STATUS_META } from "../calendar/status";
import { FoundProblemModal } from "../problems/FoundProblemModal";
import { LogModal, type LogValues } from "./LogModal";
import { Row, Section } from "./Row";

interface Logging {
  title: string;
  problem?: Problem;
  choices?: Problem[];
  build: (v: LogValues) => LogInput;
}

export function TodayPage() {
  const { plan } = usePlanContext();
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Today</h1>
      {plan.phase === "before" && <BeforeStart plan={plan} />}
      {plan.phase === "after" && <PlanComplete />}
      {plan.phase === "during" && plan.todayDay && <TodayBody />}
    </div>
  );
}

/** A learn item (a new-topic day's lesson, or the wrap-up): its text, with where it was moved from. */
function learnRow(plan: Plan, item: DayItem): { label: string; meta: string } {
  const text = itemLabel(plan, item);
  const moved = item.movedFrom ? ` · moved from ${movedLabel(plan, item.movedFrom)}` : "";
  return { label: text, meta: `${item.dayKind === "wrap-up" ? "Wrap-up" : "Learn"}${moved}` };
}

/** Mocks are on demand: the next one to take, and a Resume link for any that is open. */
function MocksPrompt() {
  const { db } = usePlanContext();
  const sessions = useLiveQuery(() => db.mocks.toArray(), [db]);
  const runs = useLiveQuery(() => db.mockRuns.toArray(), [db]);
  if (!sessions || !runs) return null;
  const done = new Set(sessions.map((m) => m.mockNumber));
  const open = [...runs].sort((a, b) => a.mockNumber - b.mockNumber);
  const next = curriculum.mocks.find((m) => !done.has(m.number) && !open.some((r) => r.mockNumber === m.number));
  const link = "rounded-md border border-indigo-600 px-2 py-0.5 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-950";
  return (
    <Section title="Mocks" hint="Take a mock whenever you like, in any order.">
      {open.map((r) => (
        <li key={r.mockNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
          <span>Mock {r.mockNumber} is in progress.</span>
          <Link to={`/mock/${r.mockNumber}`} className={link}>Resume mock {r.mockNumber}</Link>
        </li>
      ))}
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
        {next ? (
          <>
            <span>Mock {next.number} is suggested after Week {next.suggestedAfterWeek}.</span>
            <Link to={`/mock/${next.number}`} className={link}>Mock {next.number}</Link>
          </>
        ) : (
          <>
            <span>{open.length > 0 ? "Every other mock is done." : "All 26 mocks are done."}</span>
            <Link to="/mocks" className={link}>All mocks</Link>
          </>
        )}
      </li>
    </Section>
  );
}

function movedLabel(plan: Plan, planDayId: string) {
  const d = plan.schedule.find((x) => x.planDayId === planDayId);
  return d ? formatShort(d.date) : planDayId;
}

function BeforeStart({ plan }: { plan: Plan }) {
  const n = diffDays(plan.today, plan.startDate);
  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-3xl font-semibold tabular-nums">{n} day{n === 1 ? "" : "s"}</p>
      <p className="text-slate-600 dark:text-slate-400">until the plan starts on {formatShort(plan.startDate)}.</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <Link to="/weeks" className="text-indigo-700 underline dark:text-indigo-300">
          Preview the Week 1 lesson
        </Link>
      </div>
    </div>
  );
}

function PlanComplete() {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xl font-semibold">Plan complete</p>
      <p className="text-slate-600 dark:text-slate-400">You finished all 13 weeks. Keep going in free practice mode.</p>
      <Link to="/problems" className="mt-3 inline-block text-indigo-700 underline dark:text-indigo-300">
        Browse all problems
      </Link>
    </div>
  );
}

function TodayBody() {
  const { plan, db } = usePlanContext();
  const today = plan.today;
  const day = plan.todayDay!;
  const { planDayId, week, kind } = day.day;
  const n = Number(planDayId.split(/[dx]/)[1]);
  const [logging, setLogging] = useState<Logging | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);

  const done = (item: DayItem) => plan.completions.get(item.itemId);
  const meta = STATUS_META[day.status];

  // The first time a day is opened its review problems are drawn and saved; catch-up days with an undrawn review slot too.
  const needDraw = [...new Set([planDayId, ...plan.catchUp.filter((c) => c.item.kind === "review" && !c.item.problem).map((c) => c.planDayId)])];
  const needDrawKey = needDraw.join(",");
  useEffect(() => {
    // A failed draw (e.g. the database closing) is harmless: the next render of the day tries again.
    for (const id of needDraw) void ensureDayDraws(db, curriculum, id, today).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, today, needDrawKey]);
  const drawOf = (slotId: string) => plan.snapshot.draws.find((d) => d.slotId === slotId);
  const canReroll = (item: DayItem) => !done(item) && !!item.problem && drawOf(item.itemId)?.attemptId === undefined;

  const toggleSimple = (item: DayItem, target = { itemId: item.itemId, planDayId: item.planDayId }) =>
    done(item) ? untickItem(db, item.itemId) : tickItem(db, target, today);

  const base = (problem: Problem, over: Partial<LogInput>) => (v: LogValues): LogInput => ({
    problemId: problem.id,
    date: today,
    outcome: v.outcome,
    minutes: v.minutes,
    note: v.note,
    isRedo: false,
    completes: [],
    ...over,
  });

  function askProblem(item: DayItem, label = "Log problem") {
    if (done(item)) return void untickItem(db, item.itemId);
    const problem = item.problem!;
    setLogging({ title: label, problem, build: base(problem, { completes: [{ itemId: item.itemId, planDayId: item.planDayId }] }) });
  }

  // Slots still to do. Filling only the unticked ones keeps a slot's fill stable as the others are ticked.
  const openSlots = day.items.filter((i) => i.kind === "slot" && !done(i));
  const fills = fillSlots({ day: day.day, slots: openSlots, redoDue: plan.redoDue, catchUp: plan.catchUp });
  const fillOf = (slotId: string) => fills.find((f) => f.slotId === slotId);
  const freeChoices = problemsUpTo(week, kind === "extension");

  function askSlot(item: DayItem) {
    if (done(item)) return void untickItem(db, item.itemId);
    const fill = fillOf(item.itemId);
    const slot = { itemId: item.itemId, planDayId: item.planDayId };
    if (!fill || fill.source === "free") {
      setLogging({
        title: "Log a redo",
        choices: freeChoices,
        build: (v) => ({ ...base(plan.problemOf(v.problemId)!, { isRedo: true, completes: [slot] })(v), problemId: v.problemId }),
      });
      return;
    }
    const problem = plan.problemOf(fill.problemId!)!;
    if (fill.source === "redo") {
      setLogging({ title: "Log your redo", problem, build: base(problem, { isRedo: true, completes: [slot] }) });
    } else {
      const original = plan.catchUp.find((c) => c.item.itemId === problem.id)!;
      setLogging({
        title: "Log catch-up problem",
        problem,
        build: base(problem, { completes: [slot, { itemId: problem.id, planDayId: original.planDayId }] }),
      });
    }
  }

  const slotCaption = (item: DayItem) => {
    if (done(item)) return "Ticked";
    const f = fillOf(item.itemId);
    return f?.source === "redo" ? "Redo from your queue" : f?.source === "catchup" ? "Catch-up problem" : `Redo any problem from ${kind === "extension" ? "this week" : "your list"}`;
  };
  const slotLabel = (item: DayItem) => {
    if (done(item)) return itemLabel(plan, item);
    const f = fillOf(item.itemId);
    return f?.problemId ? (plan.problemOf(f.problemId)?.title ?? f.problemId) : `Redo slot ${item.itemId.endsWith(":s1") ? 1 : 2}`;
  };

  // Things done today that aren't on today's checklist (catch-up ticks, standalone redos): keep them undoable.
  const todayItemIds = new Set(day.items.map((i) => i.itemId));
  const todayAttemptIds = new Set(day.items.map((i) => plan.completions.get(i.itemId)?.attemptId).filter((x) => x !== undefined));
  const doneElsewhere = [...plan.completions.values()].filter(
    (c) => c.completedOn === today && !todayItemIds.has(c.itemId) && !c.itemId.includes(":s") && !(c.attemptId !== undefined && todayAttemptIds.has(c.attemptId)),
  );
  const standaloneRedos = plan.dayAttempts.filter(
    (a) => a.date === today && a.isRedo && a.id !== undefined && ![...plan.completions.values()].some((c) => c.attemptId === a.id),
  );

  const reviewTitle = (itemId: string) => {
    const slot = parseReviewSlotId(itemId);
    const drawn = slot ? drawOf(itemId) : undefined;
    return slot ? `Review: ${(drawn && plan.problemOf(drawn.problemId)?.title) ?? `problem ${slot.n}`}` : undefined;
  };

  const redoProblems = [...new Map(plan.redoDue.map((r) => [r.problemId, r])).values()];
  const curDay = kind === "plan" ? curriculumDay(planDayId) : undefined;
  const fallback = curDay?.fallback && plan.redoDue.length === 0 ? curDay.fallback : null;
  const fallbackTries = fallback ? plan.dayAttempts.filter((a) => a.problemId === fallback.id).length : 0;
  const restOn = plan.restDates.has(today);
  const restCheck = canAddRestDay(plan.schedule, plan.restDates, today);

  return (
    <>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        {kind === "extension" ? `Week ${week} · Extension day ${n}` : `Week ${week} · Day ${n}`} · {formatShort(today)}
        <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{meta.glyph} {meta.label}</span>
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400" aria-label="Days complete">{plan.completedDays} of {curriculum.totalPlanDays} days complete</p>
      {(curDay || kind === "extension") && (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400" aria-label="Day type">
          {curDay ? DAY_KIND_LABEL[curDay.kind] : "Extension day"}
          {curDay?.timedMinutes ? ` · ${curDay.timedMinutes} min per problem` : ""}
        </p>
      )}
      {curDay?.codingNote && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{curDay.codingNote}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

      <Section title="Today's checklist">
        {day.items.map((item) =>
          item.kind === "learn" ? (
            <Row key={item.itemId} checked={!!done(item)} onToggle={() => toggleSimple(item)} {...learnRow(plan, item)} />
          ) : item.kind === "task" ? (
            <Row key={item.itemId} checked={!!done(item)} onToggle={() => toggleSimple(item)} label={item.custom!.title} meta="Task" />
          ) : item.kind === "review" ? (
            <Row
              key={item.itemId}
              checked={!!done(item)}
              onToggle={() => (item.problem ? askProblem(item, "Log review problem") : undefined)}
              disabled={!item.problem && !done(item)}
              label={itemLabel(plan, item)}
              problem={item.problem}
              platform={item.problem ? platformOf(plan, item.problem) : undefined}
              meta={item.problem ? "Review: a quick repeat" : "Review: drawing a problem…"}
              actions={
                canReroll(item) ? (
                  <button type="button" className="text-indigo-700 underline dark:text-indigo-300" onClick={async () => { const r = await rerollDraw(db, curriculum, item.itemId); setError(r.ok ? null : r.reason); }}>
                    Re-roll
                  </button>
                ) : undefined
              }
            />
          ) : item.kind === "problem" ? (
            <Row
              key={item.itemId}
              checked={!!done(item)}
              onToggle={() => askProblem(item)}
              label={item.problem!.title}
              problem={item.problem}
              platform={platformOf(plan, item.problem!)}
              meta={item.movedFrom ? `moved from ${movedLabel(plan, item.movedFrom)}` : item.custom ? "Added by you" : undefined}
            />
          ) : (
            <Row
              key={item.itemId}
              checked={!!done(item)}
              onToggle={() => askSlot(item)}
              label={slotLabel(item)}
              problem={!done(item) && fillOf(item.itemId)?.problemId ? plan.problemOf(fillOf(item.itemId)!.problemId!) : undefined}
              meta={slotCaption(item)}
            />
          ),
        )}
      </Section>

      <MocksPrompt />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link to={`/day/${planDayId}`} className="text-sm text-indigo-700 underline dark:text-indigo-300">Edit day</Link>
        <button type="button" onClick={() => setFinding(true)} className="text-sm text-indigo-700 underline dark:text-indigo-300">Log a problem I found</button>
        {restOn ? (
          <button type="button" className="text-sm text-indigo-700 underline dark:text-indigo-300" onClick={() => setRestDay(db, plan.schedule, plan.restDates, today, false)}>
            Resting today — undo rest day
          </button>
        ) : (
          <button
            type="button"
            disabled={!restCheck.ok}
            title={restCheck.ok ? "Skip today on purpose; unticked items go to the catch-up queue" : restCheck.reason}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-700"
            onClick={async () => {
              const r = await setRestDay(db, plan.schedule, plan.restDates, today, true);
              setError(r.ok ? null : r.reason);
            }}
          >
            Rest day
          </button>
        )}
      </div>

      {redoProblems.length > 0 && (
        <Section title="Redo due" hint="Re-solve these alone to close them.">
          {redoProblems.map((r) => {
            const p = plan.problemOf(r.problemId)!;
            return (
              <li key={r.problemId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">{p.title}</a>
                  <p className="text-xs text-slate-500">due {formatDayMonth(r.dueOn)}</p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
                  onClick={() => setLogging({ title: "Log your redo", problem: p, build: base(p, { isRedo: true }) })}
                >
                  Log redo
                </button>
              </li>
            );
          })}
        </Section>
      )}

      {fallback && (
        <Section title="Try this instead" hint="No redos are due. This is logged as a normal attempt, but it never counts toward today's checklist or the catch-up queue.">
          <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div>
              <a href={fallback.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">{fallback.title}<span className="sr-only"> (opens in a new tab)</span></a>
              <p className="text-xs text-slate-500">{fallback.difficulty} · {fallback.platform}{fallbackTries > 0 ? ` · ${fallbackTries} attempt${fallbackTries === 1 ? "" : "s"} logged` : ""}</p>
            </div>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
              onClick={() => setLogging({ title: "Log fallback problem", problem: fallback, build: base(fallback, {}) })}
            >
              Log attempt
            </button>
          </li>
        </Section>
      )}

      {plan.catchUp.length > 0 && (
        <Section title="Catch-up queue" hint="Unfinished items from earlier days, oldest first.">
          {plan.catchUp.map((c) => (
            <Row
              key={c.item.itemId}
              checked={false}
              disabled={c.item.kind === "review" && !c.item.problem}
              onToggle={() => (c.item.kind === "problem" || c.item.kind === "review" ? (c.item.problem ? askProblem(c.item, "Log catch-up problem") : undefined) : tickItem(db, { itemId: c.item.itemId, planDayId: c.planDayId }, today))}
              label={c.item.kind === "learn" ? learnRow(plan, c.item).label : itemLabel(plan, c.item)}
              problem={c.item.problem}
              platform={c.item.problem ? platformOf(plan, c.item.problem) : undefined}
              meta={`from ${formatShort(c.fromDate)}${c.item.movedFrom ? ` · moved from ${movedLabel(plan, c.item.movedFrom)}` : ""}`}
            />
          ))}
        </Section>
      )}

      {(doneElsewhere.length > 0 || standaloneRedos.length > 0) && (
        <Section title="Also done today" hint="Catch-up and redo work. Undo removes the log entry and any redos it created.">
          {doneElsewhere.map((c) => (
            <li key={c.itemId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
              <span>{plan.problemOf(c.itemId)?.title ?? plan.customById.get(c.itemId)?.title ?? reviewTitle(c.itemId) ?? c.itemId.replace(":learn", " — learn item")}</span>
              <button type="button" className="text-indigo-700 underline dark:text-indigo-300" onClick={() => untickItem(db, c.itemId)}>Undo</button>
            </li>
          ))}
          {standaloneRedos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
              <span>Redo: {plan.problemOf(a.problemId)?.title}</span>
              <button type="button" className="text-indigo-700 underline dark:text-indigo-300" onClick={() => undoAttempt(db, a.id!)}>Undo</button>
            </li>
          ))}
        </Section>
      )}

      {finding && <FoundProblemModal defaultPlanDayId={planDayId} onClose={() => setFinding(false)} />}
      {logging && (
        <LogModal
          title={logging.title}
          problem={logging.problem}
          platform={logging.problem ? platformOf(plan, logging.problem) : undefined}
          choices={logging.choices}
          onCancel={() => setLogging(null)}
          onSubmit={async (v) => {
            await logAttempt(db, logging.build(v));
            setLogging(null);
          }}
        />
      )}
    </>
  );
}
