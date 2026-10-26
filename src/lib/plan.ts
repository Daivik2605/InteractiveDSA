// Derives everything the UI shows from a snapshot of the database. Pure: no Dexie, no clock.

import { addDays, diffDays } from "./dates";
import { problemsById } from "./curriculum";
import {
  buildSchedule,
  catchUpQueue,
  evaluateDays,
  finishDate,
  indexCompletions,
  redosDue,
  streaks,
  customProblem,
  type CatchUpItem,
  type EvaluatedDay,
  type ScheduleContext,
} from "./schedule";
import type {
  Curriculum,
  CustomItem,
  DayLog,
  ItemCompletion,
  ItemMove,
  Problem,
  ProblemAttempt,
  ProblemEntry,
  RedoTask,
  RestDay,
  ScheduledDay,
  Settings,
  WeekExtension,
} from "../types/content";

export interface Snapshot {
  settings: Settings;
  completions: ItemCompletion[];
  extensions: WeekExtension[];
  restDays: RestDay[];
  redos: RedoTask[];
  attempts: ProblemAttempt[];
  customItems: CustomItem[];
  moves: ItemMove[];
  dayLogs: DayLog[];
  problemEntries: ProblemEntry[];
}

export interface Plan {
  today: string;
  settings: Settings;
  snapshot: Snapshot;
  schedule: ScheduledDay[];
  days: EvaluatedDay[];
  byDate: ReadonlyMap<string, EvaluatedDay>;
  completions: ReadonlyMap<string, ItemCompletion>;
  restDates: ReadonlySet<string>;
  attemptsById: ReadonlyMap<number, ProblemAttempt>;
  /** Attempts made outside mocks. Anything about a day's problem items (tries, redo labels) reads this, never `snapshot.attempts`. */
  dayAttempts: ProblemAttempt[];
  catchUp: CatchUpItem[];
  redoDue: RedoTask[];
  streak: { current: number; longest: number };
  stats: { missed: number; partial: number; catchUpCount: number };
  phase: "before" | "during" | "after";
  todayDay: EvaluatedDay | null;
  dayNumber: number | null; // 1-based position of today in the schedule
  totalDays: number;
  startDate: string;
  finish: string | null;
  originalFinish: string | null;
  daysAdded: number; // finish date shift caused by extensions
  customById: ReadonlyMap<string, CustomItem>;
  dayLogs: ReadonlyMap<string, DayLog>;
  entries: ReadonlyMap<string, ProblemEntry>;
  /** Plan or custom problem by id (undefined for tasks and unknown ids). */
  problemOf: (id: string) => Problem | undefined;
}

export function derivePlan(curriculum: Curriculum, snapshot: Snapshot, today: string): Plan {
  const { settings } = snapshot;
  const completions = indexCompletions(snapshot.completions);
  const restDates = new Set(snapshot.restDays.map((r) => r.date));
  const schedule = buildSchedule(curriculum, settings.startDate, snapshot.extensions);
  const edits = { customItems: snapshot.customItems, moves: snapshot.moves };
  const days = evaluateDays({ curriculum, schedule, completions, restDates, today, edits });
  const customById = new Map(snapshot.customItems.map((c) => [c.id, c]));
  const catchUp = catchUpQueue(days, completions, today);
  const finish = finishDate(schedule);
  const planOnly = schedule.filter((d) => d.kind === "plan").length;
  const originalFinish = planOnly > 0 ? addDays(settings.startDate, planOnly - 1) : null;
  const todayIndex = days.findIndex((d) => d.day.date === today);

  return {
    today,
    settings,
    snapshot,
    schedule,
    days,
    byDate: new Map(days.map((d) => [d.day.date, d])),
    completions,
    restDates,
    attemptsById: new Map(snapshot.attempts.filter((a) => a.id !== undefined).map((a) => [a.id!, a])),
    dayAttempts: snapshot.attempts.filter((a) => a.source !== "mock"),
    catchUp,
    redoDue: redosDue(snapshot.redos, today),
    streak: streaks(days, today),
    stats: {
      missed: days.filter((d) => d.status === "missed").length,
      partial: days.filter((d) => d.status === "partial").length,
      catchUpCount: catchUp.length,
    },
    phase: today < settings.startDate ? "before" : finish && today > finish ? "after" : "during",
    todayDay: todayIndex >= 0 ? days[todayIndex]! : null,
    dayNumber: todayIndex >= 0 ? todayIndex + 1 : null,
    totalDays: schedule.length,
    startDate: settings.startDate,
    finish,
    originalFinish,
    daysAdded: finish && originalFinish ? diffDays(originalFinish, finish) : 0,
    customById,
    dayLogs: new Map(snapshot.dayLogs.map((l) => [l.planDayId, l])),
    entries: new Map(snapshot.problemEntries.map((e) => [e.problemId, e])),
    problemOf: (id) => {
      const c = customById.get(id);
      return c ? (c.kind === "problem" ? customProblem(c) : undefined) : problemsById.get(id);
    },
  };
}

/** The week "the learner is on": today's week, else Week 1 before the start, else the last week. */
export function currentWeek(plan: Plan): number {
  if (plan.todayDay) return plan.todayDay.day.week;
  return plan.phase === "after" ? (plan.schedule.at(-1)?.week ?? 1) : (plan.schedule[0]?.week ?? 1);
}

/** What the pure extension rules need: start date, extensions, ticks and custom/moved items. */
export function scheduleContext(plan: Plan, curriculum_: Curriculum): ScheduleContext {
  return {
    curriculum: curriculum_,
    startDate: plan.startDate,
    extensions: plan.snapshot.extensions,
    completions: plan.completions,
    today: plan.today,
    edits: { customItems: plan.snapshot.customItems, moves: plan.snapshot.moves },
  };
}
