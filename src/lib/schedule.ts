// Pure scheduling logic: no Dexie, no React, no clock. Callers pass `today` and data in.
//
// Item ids (ItemCompletion.itemId):
//   problem              "w03-d2-p1"
//   learn item           "w03-d2:learn"   (a mock day's "Mock N" row is its learn item)
//   wrap-up item         "w13-d6:wrapup"  (the last day has no learn item or problems; one manual tick)
//   redo slot            "w03-x1:s1", "w03-x1:s2"   (every extension day; plan days have none)
// A day's fallback problem is not an item: it never counts towards status or the catch-up queue.
// Slots are filled at runtime from the redo / catch-up queues (see fillSlots). They count
// towards day status, but are never themselves put in the catch-up queue (they consume it).

import { addDays, compareDates } from "./dates";
import type {
  Curriculum,
  CustomItem,
  DayKind,
  ItemCompletion,
  ItemMove,
  MockSlot,
  Problem,
  ProblemAttempt,
  RedoTask,
  ScheduledDay,
  WeekExtension,
} from "../types/content";

export const MAX_EXTENSION_AT_ONCE = 7;
export const MAX_EXTRA_DAYS_PER_WEEK = 14;
export const SLOT_IDS = ["s1", "s2"] as const;
export const SLOW_SOLVE_MINUTES = 40;
export const MAX_REST_DAYS_PER_WEEK = 1;

export type DayStatus = "done" | "done-late" | "partial" | "missed" | "rest" | "today" | "upcoming";

export interface DayItem {
  itemId: string;
  planDayId: string; // the day the item is on now (after moves)
  kind: "learn" | "problem" | "slot" | "task";
  problem?: Problem;
  custom?: CustomItem; // set for custom problems and tasks
  movedFrom?: string; // plan day id the item was moved from
  /** Learn items only: the curriculum day's kind and mock, copied from its home day so a moved item keeps them. */
  dayKind?: DayKind;
  mock?: MockSlot;
}

/** Edits layered over the curriculum (SPEC 3.13). */
export interface DayEdits {
  customItems?: readonly CustomItem[];
  moves?: readonly ItemMove[];
}

/** A custom problem as a Problem, so the log modal and redo scheduling treat it like a plan problem. */
export function customProblem(c: CustomItem): Problem {
  return {
    id: c.id,
    title: c.title,
    difficulty: c.difficulty ?? "Medium",
    url: c.url ?? "",
    platform: "LeetCode", // only the curriculum's own platforms are typed; a custom item keeps its own `platform` text
    role: "core",
  };
}

export interface EvaluatedDay {
  day: ScheduledDay;
  items: DayItem[];
  status: DayStatus;
}

export interface CatchUpItem {
  item: DayItem;
  planDayId: string;
  week: number;
  fromDate: string; // the original scheduled date, e.g. shown as "from Tue 3 Nov"
}

export type Completions = ReadonlyMap<string, ItemCompletion>;

export type Result<T> = ({ ok: true } & T) | { ok: false; reason: string };

// ── ids ──────────────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, "0");

export const planDayId = (week: number, day: number) => `w${pad2(week)}-d${day}`;
export const extensionDayId = (week: number, n: number) => `w${pad2(week)}-x${n}`;

export function parsePlanDayId(id: string): { week: number; kind: "plan" | "extension"; n: number } {
  const m = /^w(\d{2})-([dx])(\d+)$/.exec(id);
  if (!m) throw new Error(`Invalid plan day id "${id}"`);
  return { week: Number(m[1]), kind: m[2] === "d" ? "plan" : "extension", n: Number(m[3]) };
}

export function indexCompletions(list: readonly ItemCompletion[]): Map<string, ItemCompletion> {
  return new Map(list.map((c) => [c.itemId, c]));
}

// ── schedule ─────────────────────────────────────────────────────────────────

export function extraDaysByWeek(extensions: readonly WeekExtension[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const e of extensions) out.set(e.week, (out.get(e.week) ?? 0) + e.extraDays);
  return out;
}

/** Every plan day and extension day in order, dated from the start date. */
export function buildSchedule(
  curriculum: Curriculum,
  startDate: string,
  extensions: readonly WeekExtension[] = [],
): ScheduledDay[] {
  const extra = extraDaysByWeek(extensions);
  const out: ScheduledDay[] = [];
  let offset = 0;
  for (const week of curriculum.weeks) {
    for (const d of week.days) {
      out.push({
        planDayId: planDayId(week.week, d.day),
        week: week.week,
        kind: "plan",
        date: addDays(startDate, offset++),
      });
    }
    for (let i = 1; i <= (extra.get(week.week) ?? 0); i++) {
      out.push({
        planDayId: extensionDayId(week.week, i),
        week: week.week,
        kind: "extension",
        date: addDays(startDate, offset++),
      });
    }
  }
  return out;
}

export function finishDate(schedule: readonly ScheduledDay[]): string | null {
  return schedule.at(-1)?.date ?? null;
}

/**
 * Curriculum items of a plan day, before moves: the learn item (when the day has one) + problems.
 * The wrap-up day has neither, so it gets one manual item. Fallbacks are not items. Extension days have none.
 */
function curriculumItems(curriculum: Curriculum, id: string): DayItem[] {
  const { week, kind, n } = parsePlanDayId(id);
  if (kind === "extension") return [];
  const d = curriculum.weeks.find((x) => x.week === week)?.days.find((x) => x.day === n);
  if (!d) throw new Error(`Unknown plan day "${id}"`);
  const learn: DayItem[] = d.learn
    ? [{ itemId: `${id}:learn`, planDayId: id, kind: "learn", dayKind: d.kind, ...(d.mock ? { mock: d.mock } : {}) }]
    : d.kind === "wrap-up"
      ? [{ itemId: `${id}:wrapup`, planDayId: id, kind: "learn", dayKind: d.kind }]
      : [];
  return [
    ...learn,
    ...d.problems.map((p): DayItem => ({ itemId: p.id, planDayId: id, kind: "problem", problem: p })),
  ];
}

const slotItems = (id: string): DayItem[] =>
  SLOT_IDS.map((s) => ({ itemId: `${id}:${s}`, planDayId: id, kind: "slot" }));

/**
 * Items on one day, in order: learn item, problems, items moved here, custom items, then redo
 * slots (extension days only). Items moved away are left out.
 */
export function itemsForDay(curriculum: Curriculum, id: string, edits: DayEdits = {}): DayItem[] {
  const { customItems = [], moves = [] } = edits;
  const { kind } = parsePlanDayId(id);
  const movedAway = new Set(moves.filter((m) => m.fromPlanDayId === id && m.toPlanDayId !== id).map((m) => m.itemId));
  const own = curriculumItems(curriculum, id).filter((i) => !movedAway.has(i.itemId));
  const movedIn = moves
    .filter((m) => m.toPlanDayId === id && m.fromPlanDayId !== id)
    .flatMap((m) =>
      curriculumItems(curriculum, m.fromPlanDayId)
        .filter((i) => i.itemId === m.itemId)
        .map((i): DayItem => ({ ...i, planDayId: id, movedFrom: m.fromPlanDayId })),
    );
  const custom = customItems
    .filter((c) => c.planDayId === id)
    .map(
      (c): DayItem =>
        c.kind === "problem"
          ? { itemId: c.id, planDayId: id, kind: "problem", problem: customProblem(c), custom: c }
          : { itemId: c.id, planDayId: id, kind: "task", custom: c },
    );
  const hasSlots = kind === "extension";
  return [...own, ...movedIn, ...custom, ...(hasSlots ? slotItems(id) : [])];
}

// ── day status ───────────────────────────────────────────────────────────────

export function dayStatus(args: {
  day: ScheduledDay;
  items: readonly DayItem[];
  completions: Completions;
  restDates: ReadonlySet<string>;
  today: string;
}): DayStatus {
  const { day, items, completions, restDates, today } = args;
  const done = items.map((i) => completions.get(i.itemId)).filter((c): c is ItemCompletion => !!c);

  if (items.length > 0 && done.length === items.length) {
    return done.some((c) => compareDates(c.completedOn, day.date) > 0) ? "done-late" : "done";
  }
  if (restDates.has(day.date)) return "rest";
  if (compareDates(day.date, today) > 0) return "upcoming";
  if (day.date === today) return "today";
  return done.length > 0 ? "partial" : "missed";
}

export function evaluateDays(args: {
  curriculum: Curriculum;
  schedule: readonly ScheduledDay[];
  completions: Completions;
  restDates: ReadonlySet<string>;
  today: string;
  edits?: DayEdits;
}): EvaluatedDay[] {
  const { curriculum, schedule, completions, restDates, today, edits } = args;
  return schedule.map((day) => {
    const items = itemsForDay(curriculum, day.planDayId, edits);
    return { day, items, status: dayStatus({ day, items, completions, restDates, today }) };
  });
}

// ── catch-up queue, slots ────────────────────────────────────────────────────

/** Unticked learn/problem items from days before today, oldest first. Rest days still count. */
export function catchUpQueue(days: readonly EvaluatedDay[], completions: Completions, today: string): CatchUpItem[] {
  const out: CatchUpItem[] = [];
  for (const { day, items } of days) {
    if (compareDates(day.date, today) >= 0) continue;
    for (const item of items) {
      if (item.kind === "slot" || completions.has(item.itemId)) continue;
      out.push({ item, planDayId: day.planDayId, week: day.week, fromDate: day.date });
    }
  }
  return out;
}

export interface SlotFill {
  slotId: string;
  source: "redo" | "catchup" | "free"; // "free" = "redo any problem from this week"
  problemId?: string;
}

/**
 * Decide what each slot of an extension day holds (plan days have no slots):
 * this week's catch-up first, then redos due, then free.
 * Only problems fill slots (they are coding slots). A problem is used at most once.
 * Ticking a filled slot should also tick the underlying catch-up item / complete the redo.
 */
export function fillSlots(args: {
  day: ScheduledDay;
  slots: readonly DayItem[];
  redoDue: readonly RedoTask[];
  catchUp: readonly CatchUpItem[];
}): SlotFill[] {
  const { day, slots, redoDue, catchUp } = args;
  const redo = redoDue.map((r) => ({ source: "redo" as const, problemId: r.problemId }));
  const catchUpProblems = catchUp
    .filter((c) => c.item.kind === "problem" && c.item.problem)
    .filter((c) => c.week === day.week)
    .map((c) => ({ source: "catchup" as const, problemId: c.item.problem!.id }));

  const candidates = [...catchUpProblems, ...redo];
  const used = new Set<string>();
  const queue = candidates.filter((c) => !used.has(c.problemId) && !!used.add(c.problemId));

  return slots.map((slot, i) => {
    const next = queue[i];
    return next ? { slotId: slot.itemId, ...next } : { slotId: slot.itemId, source: "free" };
  });
}

// ── rest days ────────────────────────────────────────────────────────────────

export function canAddRestDay(
  schedule: readonly ScheduledDay[],
  restDates: ReadonlySet<string>,
  date: string,
): Result<object> {
  const day = schedule.find((d) => d.date === date);
  if (!day) return { ok: false, reason: "That date is not part of the plan." };
  const sameWeek = schedule.filter((d) => d.week === day.week && d.date !== date && restDates.has(d.date));
  if (sameWeek.length >= MAX_REST_DAYS_PER_WEEK) {
    return { ok: false, reason: `Only ${MAX_REST_DAYS_PER_WEEK} rest day per week.` };
  }
  return { ok: true };
}

// ── streaks ──────────────────────────────────────────────────────────────────

/**
 * Streaks count consecutive `done` days. `done-late` and `missed` break a streak; rest days
 * and an unfinished today neither count nor break it.
 */
export function streaks(days: readonly EvaluatedDay[], today: string): { current: number; longest: number } {
  const considered = days.filter(
    (d) =>
      d.status !== "rest" && (compareDates(d.day.date, today) < 0 || (d.day.date === today && d.status === "done")),
  );
  let longest = 0;
  let run = 0;
  for (const d of considered) {
    run = d.status === "done" ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { current: run, longest };
}

// ── redo dates ───────────────────────────────────────────────────────────────

/** SPEC 3.4: hint → +3d; solution or failed → +3d and +7d; solved alone but over 40 min → +7d. */
export function redoDates(outcome: ProblemAttempt["outcome"], minutes: number, date: string): string[] {
  if (outcome === "hint") return [addDays(date, 3)];
  if (outcome === "solution" || outcome === "failed") return [addDays(date, 3), addDays(date, 7)];
  return minutes > SLOW_SOLVE_MINUTES ? [addDays(date, 7)] : [];
}

const isPending = (r: RedoTask) => !r.doneOn && !r.attemptedOn;

export function redosDue(redos: readonly RedoTask[], today: string): RedoTask[] {
  return redos
    .filter((r) => isPending(r) && compareDates(r.dueOn, today) <= 0)
    .sort((a, b) => compareDates(a.dueOn, b.dueOn));
}

export interface RedoChanges {
  close: { task: RedoTask; as: "completed" | "attempted" }[];
  create: { problemId: string; dueOn: string }[];
}

/**
 * What a new attempt does to the redo queue, so a problem never has more than one pending chain:
 *  - re-solved alone as a redo → its due tasks are closed as completed;
 *  - any attempt that earns new redo dates (hint / solution / slow) → every other pending task for
 *    that problem is closed as attempted and a fresh chain is created from this attempt.
 */
export function redoChanges(pending: readonly RedoTask[], attempt: ProblemAttempt): RedoChanges {
  const mine = pending.filter((r) => r.problemId === attempt.problemId && isPending(r));
  const close: RedoChanges["close"] = [];
  const completing =
    attempt.isRedo && attempt.outcome === "alone" ? mine.filter((r) => compareDates(r.dueOn, attempt.date) <= 0) : [];
  for (const task of completing) close.push({ task, as: "completed" });

  const dates = redoDates(attempt.outcome, attempt.minutes, attempt.date);
  if (dates.length > 0) {
    for (const task of mine) if (!completing.includes(task)) close.push({ task, as: "attempted" });
  }
  return { close, create: dates.map((dueOn) => ({ problemId: attempt.problemId, dueOn })) };
}

// ── week extensions ──────────────────────────────────────────────────────────

export interface ScheduleContext {
  curriculum: Curriculum;
  startDate: string;
  extensions: readonly WeekExtension[];
  completions: Completions;
  today: string;
  edits?: DayEdits;
}

type ExtensionResult = Result<{ extensions: WeekExtension[] }>;

function checkChange(ctx: ScheduleContext, proposed: readonly WeekExtension[]): Result<object> {
  const before = extraDaysByWeek(ctx.extensions);
  const after = extraDaysByWeek(proposed);
  const schedule = buildSchedule(ctx.curriculum, ctx.startDate, ctx.extensions);
  const weeks = new Set([...before.keys(), ...after.keys()]);

  for (const week of [...weeks].sort((a, b) => a - b)) {
    const was = before.get(week) ?? 0;
    const now = after.get(week) ?? 0;
    const weekDays = schedule.filter((d) => d.week === week);
    if (weekDays.length === 0) return { ok: false, reason: `Week ${week} does not exist.` };

    if (now > was) {
      if (now > MAX_EXTRA_DAYS_PER_WEEK) {
        return { ok: false, reason: `Week ${week} can have at most ${MAX_EXTRA_DAYS_PER_WEEK} extra days.` };
      }
      const lastDate = weekDays[weekDays.length - 1]!.date;
      if (compareDates(lastDate, ctx.today) < 0) {
        const nextWeekTicked = [...ctx.completions.values()].some(
          (c) => parsePlanDayId(c.planDayId).week === week + 1,
        );
        if (nextWeekTicked) {
          return {
            ok: false,
            reason: `Week ${week} has already passed and Week ${week + 1} has ticked items, so it can't be extended.`,
          };
        }
      }
    } else if (now < was) {
      const removed = weekDays.filter((d) => d.kind === "extension").slice(-(was - now));
      if (removed.some((d) => compareDates(d.date, ctx.today) <= 0)) {
        return { ok: false, reason: "Extension days that have already arrived can't be removed." };
      }
      const removedIds = new Set(removed.map((d) => d.planDayId));
      if ([...ctx.completions.values()].some((c) => removedIds.has(c.planDayId))) {
        return { ok: false, reason: "Some of those extension days already have ticked items." };
      }
      const { customItems = [], moves = [] } = ctx.edits ?? {};
      const hasEdits =
        customItems.some((c) => c.planDayId && removedIds.has(c.planDayId)) ||
        moves.some((m) => removedIds.has(m.toPlanDayId));
      if (hasEdits) {
        return { ok: false, reason: "Some of those extension days hold custom or moved items. Move or delete them first." };
      }
    }
  }
  return { ok: true };
}

/** Adds an extension (new ids are max + 1; persisting code may drop `id` and let Dexie assign it). */
export function addExtension(
  ctx: ScheduleContext,
  input: { week: number; extraDays: number; reason?: string },
): ExtensionResult {
  if (!Number.isInteger(input.extraDays) || input.extraDays < 1 || input.extraDays > MAX_EXTENSION_AT_ONCE) {
    return { ok: false, reason: `Choose between 1 and ${MAX_EXTENSION_AT_ONCE} extra days.` };
  }
  const next: WeekExtension = {
    id: Math.max(0, ...ctx.extensions.map((e) => e.id ?? 0)) + 1,
    week: input.week,
    extraDays: input.extraDays,
    createdOn: ctx.today,
    ...(input.reason ? { reason: input.reason } : {}),
  };
  const proposed = [...ctx.extensions, next];
  const check = checkChange(ctx, proposed);
  return check.ok ? { ok: true, extensions: proposed } : check;
}

/** Shorten an extension to `extraDays` (use removeExtension for 0). */
export function shortenExtension(ctx: ScheduleContext, id: number, extraDays: number): ExtensionResult {
  const target = ctx.extensions.find((e) => e.id === id);
  if (!target) return { ok: false, reason: "Extension not found." };
  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays >= target.extraDays) {
    return { ok: false, reason: `Choose between 1 and ${target.extraDays - 1} days, or remove it.` };
  }
  const proposed = ctx.extensions.map((e) => (e.id === id ? { ...e, extraDays } : e));
  const check = checkChange(ctx, proposed);
  return check.ok ? { ok: true, extensions: proposed } : check;
}

export function removeExtension(ctx: ScheduleContext, id: number): ExtensionResult {
  if (!ctx.extensions.some((e) => e.id === id)) return { ok: false, reason: "Extension not found." };
  const proposed = ctx.extensions.filter((e) => e.id !== id);
  const check = checkChange(ctx, proposed);
  return check.ok ? { ok: true, extensions: proposed } : check;
}

// ── editing a day (SPEC 3.13) ────────────────────────────────────────────────

/**
 * Can this item be moved to another day of its week (or that week's extension days)?
 * Slots and ticked items stay put: moving a ticked item would silently change a day's status.
 */
export function canMoveItem(args: {
  schedule: readonly ScheduledDay[];
  item: DayItem;
  toPlanDayId: string;
  completions: Completions;
}): Result<object> {
  const { schedule, item, toPlanDayId, completions } = args;
  if (item.kind === "slot") return { ok: false, reason: "Redo slots can't be moved." };
  if (completions.has(item.itemId)) return { ok: false, reason: "Untick it before moving it." };
  const from = schedule.find((d) => d.planDayId === item.planDayId);
  const to = schedule.find((d) => d.planDayId === toPlanDayId);
  if (!from || !to) return { ok: false, reason: "That day is not part of the plan." };
  if (from.planDayId === to.planDayId) return { ok: false, reason: "It is already on that day." };
  if (from.week !== to.week) return { ok: false, reason: "Items can only move within their own week." };
  return { ok: true };
}

/** A forgotten tick may be dated from the day's planned date up to today; never in the future. */
export function canTickOn(day: ScheduledDay, date: string, today: string): Result<object> {
  if (compareDates(date, today) > 0) return { ok: false, reason: "You can't tick an item for a future date." };
  if (compareDates(date, day.date) < 0) return { ok: false, reason: `Choose a date on or after the day's planned date.` };
  return { ok: true };
}

/**
 * Attach a custom problem to a day of its own week (extension days included), or detach it
 * (`planDayId` undefined) so it becomes journal-only. Blocked while ticked: changing days would
 * silently change a day's status.
 */
export function canAttach(args: {
  schedule: readonly ScheduledDay[];
  item: CustomItem;
  planDayId: string | undefined;
  completions: Completions;
}): Result<object> {
  const { schedule, item, planDayId, completions } = args;
  if (item.kind !== "problem") return { ok: false, reason: "Only problems can be attached or detached." };
  if (completions.has(item.id)) return { ok: false, reason: "Untick it before changing its day." };
  if (planDayId === undefined) return { ok: true };
  const day = schedule.find((d) => d.planDayId === planDayId);
  if (!day) return { ok: false, reason: "That day is not part of the plan." };
  if (day.week !== item.week) return { ok: false, reason: `Choose a day in Week ${item.week}, the problem's topic week.` };
  return { ok: true };
}
