// All database mutations. Each runs in one transaction so the UI never sees half an update.

import type { DsaDB } from "./db";
import { saveSettings } from "./db";
import { nextCard } from "./quiz";
import { isValidDate } from "./dates";
import {
  addExtension,
  canAddRestDay,
  canAttach,
  canTickOn,
  extensionDayId,
  extraDaysByWeek,
  redoChanges,
  type Result,
  type ScheduleContext,
} from "./schedule";
import type {
  CustomItem,
  Difficulty,
  ItemCompletion,
  ProblemAttempt,
  ProblemEntry,
  MockRun,
  MockSession,
  QuizAnswer,
  ScheduledDay,
  WeekExtension,
} from "../types/content";

export interface CompletionTarget {
  itemId: string;
  planDayId: string;
}

export interface LogInput {
  problemId: string;
  date: string;
  outcome: ProblemAttempt["outcome"];
  minutes: number;
  note?: string;
  isRedo: boolean;
  /** "mock": the attempt belongs to a mock. It never completes a plan item, whatever `completes` says. */
  source?: "mock";
  /** Plan items this attempt completes: a problem, a slot, or both (slot filled from catch-up). */
  completes: CompletionTarget[];
}

/**
 * Records an attempt, completes the given items (completedOn = `date`, so late work shows as late)
 * and updates the redo queue: schedules redos, closes redos as completed (re-solved alone) or as
 * attempted (a new chain replaced them). Returns the attempt id.
 */
export async function logAttempt(db: DsaDB, input: LogInput): Promise<number> {
  return db.transaction("rw", [db.attempts, db.completions, db.redos], async () => {
    const attempt: ProblemAttempt = {
      problemId: input.problemId,
      date: input.date,
      outcome: input.outcome,
      minutes: input.minutes,
      isRedo: input.isRedo,
      ...(input.note ? { note: input.note } : {}),
      ...(input.source ? { source: input.source } : {}),
    };
    const attemptId = (await db.attempts.add(attempt)) as number;

    for (const t of input.source === "mock" ? [] : input.completes) {
      if (await db.completions.get(t.itemId)) continue; // never overwrite an earlier completion
      await db.completions.put({ itemId: t.itemId, planDayId: t.planDayId, completedOn: input.date, attemptId });
    }

    const pending = await db.redos.where("problemId").equals(input.problemId).toArray();
    const changes = redoChanges(pending, attempt);
    for (const { task, as } of changes.close) {
      await db.redos.update(task.id!, {
        ...(as === "completed" ? { doneOn: input.date } : { attemptedOn: input.date }),
        closedByAttemptId: attemptId,
      });
    }
    for (const r of changes.create) await db.redos.add({ ...r, createdByAttemptId: attemptId });
    return attemptId;
  });
}

/**
 * Undo one attempt: remove it, the completions it produced, and the redo tasks it created that
 * aren't done yet; reopen redo tasks it closed. Earlier attempts stay in history.
 */
export async function undoAttempt(db: DsaDB, attemptId: number): Promise<void> {
  await db.transaction("rw", [db.attempts, db.completions, db.redos], async () => {
    const completions = await db.completions.toArray();
    await db.completions.bulkDelete(completions.filter((c) => c.attemptId === attemptId).map((c) => c.itemId));

    const redos = await db.redos.toArray();
    const created = redos.filter((r) => r.createdByAttemptId === attemptId && !r.doneOn && !r.attemptedOn);
    await db.redos.bulkDelete(created.map((r) => r.id!));
    for (const r of redos.filter((x) => x.closedByAttemptId === attemptId)) {
      await db.redos.update(r.id!, { doneOn: undefined, attemptedOn: undefined, closedByAttemptId: undefined });
    }
    await db.attempts.delete(attemptId);
  });
}

/** Learn items (and anything without an attempt) are ticked directly. */
export async function tickItem(db: DsaDB, target: CompletionTarget, date: string): Promise<void> {
  const completion: ItemCompletion = { ...target, completedOn: date };
  await db.completions.put(completion);
}

/** Untick = undo: if an attempt produced this completion, the whole attempt is undone. */
export async function untickItem(db: DsaDB, itemId: string): Promise<void> {
  const completion = await db.completions.get(itemId);
  if (!completion) return;
  if (completion.attemptId !== undefined) await undoAttempt(db, completion.attemptId);
  else await db.completions.delete(itemId);
}

export async function setRestDay(
  db: DsaDB,
  schedule: readonly ScheduledDay[],
  restDates: ReadonlySet<string>,
  date: string,
  on: boolean,
): Promise<Result<object>> {
  if (!on) {
    await db.restDays.delete(date);
    return { ok: true };
  }
  const check = canAddRestDay(schedule, restDates, date);
  if (check.ok) await db.restDays.put({ date });
  return check;
}

/** Replace all extensions with a list produced (and validated) by addExtension/shortenExtension/removeExtension. */
export async function saveExtensions(db: DsaDB, extensions: readonly WeekExtension[]): Promise<void> {
  await db.transaction("rw", db.extensions, async () => {
    await db.extensions.clear();
    await db.extensions.bulkAdd(extensions.map((e) => ({ ...e })));
  });
}

/** Changing the start date only re-dates the plan: completions belong to items, so none are touched. */
export async function setStartDate(db: DsaDB, date: string, defaultStartDate: string): Promise<Result<object>> {
  if (!isValidDate(date)) return { ok: false, reason: "Enter a valid date." };
  await saveSettings(db, { startDate: date }, defaultStartDate);
  return { ok: true };
}

// ── editing a day (SPEC 3.13) ────────────────────────────────────────────────

/** Tick an item for a chosen date (a forgotten tick), refusing future dates and dates before the day. */
export async function tickItemOn(
  db: DsaDB,
  target: CompletionTarget,
  date: string,
  day: ScheduledDay,
  today: string,
): Promise<Result<object>> {
  const check = canTickOn(day, date, today);
  if (check.ok) await tickItem(db, target, date);
  return check;
}

export interface CustomItemInput {
  planDayId?: string;
  week: number;
  kind: CustomItem["kind"];
  platform?: string;
  title: string;
  difficulty?: Difficulty;
  url?: string;
}

const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "")) as T;

/** Returns the new item's id ("c-<uuid>"). */
export async function addCustomItem(db: DsaDB, input: CustomItemInput, today: string): Promise<string> {
  const id = `c-${crypto.randomUUID()}`;
  await db.customItems.add(clean({ ...input, id, createdOn: today }) as CustomItem);
  return id;
}

export async function editCustomItem(
  db: DsaDB,
  id: string,
  patch: Partial<Pick<CustomItem, "title" | "difficulty" | "url" | "platform" | "planDayId">>,
): Promise<void> {
  await db.customItems.update(id, patch);
}

/** Removes the item, its completion, its pending redos and its journal entry. Attempt history stays. */
export async function deleteCustomItem(db: DsaDB, id: string): Promise<void> {
  await db.transaction("rw", [db.customItems, db.completions, db.redos, db.problemEntries], async () => {
    await db.completions.delete(id);
    const pending = (await db.redos.where("problemId").equals(id).toArray()).filter((r) => !r.doneOn && !r.attemptedOn);
    await db.redos.bulkDelete(pending.map((r) => r.id!));
    await db.problemEntries.delete(id);
    await db.customItems.delete(id);
  });
}

/** The day a curriculum item belongs to before any move: "w03-d2-p1" and "w03-d2:learn" → "w03-d2". */
export const homeDayOf = (itemId: string): string => itemId.split(/[:]|-p\d+$/)[0]!;

/**
 * Move an item to another day of its week. Custom items just change day; plan items get an ItemMove
 * (keeping the original day), and moving one back home removes the move.
 */
export async function moveItem(
  db: DsaDB,
  item: { itemId: string; custom: boolean },
  toPlanDayId: string,
  today: string,
): Promise<void> {
  if (item.custom) return void (await db.customItems.update(item.itemId, { planDayId: toPlanDayId }));
  await db.transaction("rw", db.itemMoves, async () => {
    const from = (await db.itemMoves.get(item.itemId))?.fromPlanDayId ?? homeDayOf(item.itemId);
    if (from === toPlanDayId) await db.itemMoves.delete(item.itemId);
    else await db.itemMoves.put({ itemId: item.itemId, fromPlanDayId: from, toPlanDayId, movedOn: today });
  });
}

const sameStrings = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Saves the study log for a day; an empty log removes the row. */
export async function saveDayLog(
  db: DsaDB,
  input: { planDayId: string; notes: string; minutes: number; links: string[] },
  today: string,
): Promise<void> {
  const notes = input.notes.trim();
  const links = input.links.map((l) => l.trim()).filter(Boolean);
  if (!notes && input.minutes === 0 && links.length === 0) return void (await db.dayLogs.delete(input.planDayId));
  const prev = await db.dayLogs.get(input.planDayId);
  if (prev && prev.notes === notes && prev.minutes === input.minutes && sameStrings(prev.links, links)) return;
  await db.dayLogs.put({ planDayId: input.planDayId, notes, minutes: input.minutes, links, updatedOn: today });
}

/** "+ Add a day to Week N": a +1 extension that follows the same rules. Returns the new day's id. */
export async function addDayToWeek(
  db: DsaDB,
  ctx: ScheduleContext,
  week: number,
): Promise<Result<{ planDayId: string }>> {
  const r = addExtension(ctx, { week, extraDays: 1 });
  if (!r.ok) return r;
  await saveExtensions(db, r.extensions);
  return { ok: true, planDayId: extensionDayId(week, extraDaysByWeek(r.extensions).get(week) ?? 1) };
}

// ── problem journal (SPEC 3.14) ──────────────────────────────────────────────

const ENTRY_TEXT = ["description", "approach", "code", "timeComplexity", "spaceComplexity", "insight", "comments"] as const;

/** Upserts a journal entry; an entry with nothing in it is removed. */
export async function saveProblemEntry(db: DsaDB, entry: Omit<ProblemEntry, "updatedOn">, today: string): Promise<void> {
  const text = Object.fromEntries(ENTRY_TEXT.map((k) => [k, entry[k]?.trim() || undefined]));
  const empty = ENTRY_TEXT.every((k) => !text[k]) && !entry.confidence && entry.tags.length === 0;
  if (empty) return void (await db.problemEntries.delete(entry.problemId));
  await db.problemEntries.put(
    clean({ problemId: entry.problemId, ...text, confidence: entry.confidence, tags: entry.tags, updatedOn: today }) as ProblemEntry,
  );
}

/** A manual "redo later" task on a date the learner picks. It does not touch other pending redos. */
export async function addManualRedo(db: DsaDB, problemId: string, dueOn: string): Promise<void> {
  await db.redos.add({ problemId, dueOn });
}

export interface FoundProblemInput extends Omit<CustomItemInput, "kind"> {
  description?: string;
  tags: string[];
  firstAttempt?: { outcome: ProblemAttempt["outcome"]; minutes: number; date: string; note?: string };
}

/**
 * "Log a problem I found": a custom problem (journal-only unless attached to a day), its journal
 * entry, and an optional first attempt. Returns the new problem id.
 */
export async function logFoundProblem(db: DsaDB, input: FoundProblemInput, today: string): Promise<string> {
  const { description, tags, firstAttempt, ...item } = input;
  return db.transaction(
    "rw",
    [db.customItems, db.problemEntries, db.attempts, db.completions, db.redos],
    async () => {
      const id = await addCustomItem(db, { ...item, kind: "problem" }, today);
      await saveProblemEntry(db, { problemId: id, tags, ...(description ? { description } : {}) }, today);
      if (firstAttempt) {
        await logAttempt(db, {
          problemId: id,
          ...firstAttempt,
          isRedo: false,
          completes: item.planDayId ? [{ itemId: id, planDayId: item.planDayId }] : [],
        });
      }
      return id;
    },
  );
}

/** Attach/detach a custom problem to/from a day (same rules as at creation; see canAttach). */
export async function setCustomItemDay(
  db: DsaDB,
  args: { itemId: string; planDayId: string | undefined; schedule: readonly ScheduledDay[] },
): Promise<Result<object>> {
  return db.transaction("rw", [db.customItems, db.completions], async () => {
    const item = await db.customItems.get(args.itemId);
    if (!item) return { ok: false as const, reason: "Problem not found." };
    const completions = new Map((await db.completions.toArray()).map((c) => [c.itemId, c]));
    const check = canAttach({ schedule: args.schedule, item, planDayId: args.planDayId, completions });
    if (!check.ok) return check;
    if (args.planDayId === undefined) {
      const { planDayId: _drop, ...rest } = item;
      await db.customItems.put(rest);
    } else {
      await db.customItems.update(args.itemId, { planDayId: args.planDayId });
    }
    return { ok: true as const };
  });
}

// ── quizzes (SPEC 3.6–3.8) ───────────────────────────────────────────────────

/**
 * Saves one answer. Weekly, review and targeted answers also move the question's Leitner card
 * (wrong → box 1, right → one up); drill answers are only recorded.
 */
export async function recordAnswer(
  db: DsaDB,
  input: { questionId: string; correct: boolean; mode: QuizAnswer["mode"]; ms?: number; mockNumber?: number },
  answeredAt: string,
  today: string,
): Promise<void> {
  await db.transaction("rw", [db.quizAnswers, db.cards], async () => {
    await db.quizAnswers.add({
      questionId: input.questionId,
      correct: input.correct,
      mode: input.mode,
      answeredAt,
      ...(input.ms !== undefined ? { ms: input.ms } : {}),
      ...(input.mockNumber !== undefined ? { mockNumber: input.mockNumber } : {}),
    });
    if (input.mode !== "drill") {
      const prev = await db.cards.get(input.questionId);
      await db.cards.put(nextCard(input.questionId, prev, input.correct, today));
    }
  });
}

// ── mocks (Phase B) ──────────────────────────────────────────────────────────

/** Saves the picks for a started mock, so a reload shows the same questions and programs. */
export async function startMockRun(db: DsaDB, run: MockRun): Promise<void> {
  await db.mockRuns.put(run);
}

export async function updateMockRun(db: DsaDB, mockNumber: number, patch: Partial<Omit<MockRun, "mockNumber">>): Promise<void> {
  await db.mockRuns.update(mockNumber, patch);
}

/**
 * Logs a Program 1 attempt. It goes through `logAttempt` so redo dates apply, but with source "mock" it never
 * completes a plan item. An approach and code, when given, are merged into the problem's journal entry.
 */
export async function logMockProgram(
  db: DsaDB,
  input: { problemId: string; date: string; outcome: ProblemAttempt["outcome"]; minutes: number; approach?: string; code?: string },
): Promise<number> {
  const attemptId = await logAttempt(db, {
    problemId: input.problemId,
    date: input.date,
    outcome: input.outcome,
    minutes: input.minutes,
    isRedo: false,
    source: "mock",
    completes: [],
    ...(input.approach ? { note: input.approach } : {}),
  });
  if (input.approach || input.code) {
    const prev = await db.problemEntries.get(input.problemId);
    await db.problemEntries.put({
      tags: [],
      ...prev,
      problemId: input.problemId,
      ...(input.approach ? { approach: input.approach } : {}),
      ...(input.code ? { code: input.code } : {}),
      updatedOn: input.date,
    });
  }
  return attemptId;
}

/**
 * Saves a finished mock and, in the same transaction, ticks its "Mock N" row (when given) and drops the run.
 * The tick carries no attemptId, so unticking the row never undoes a program attempt.
 */
export async function saveMockSession(db: DsaDB, session: MockSession, tick: CompletionTarget | null): Promise<number> {
  return db.transaction("rw", [db.mocks, db.mockRuns, db.completions], async () => {
    const id = (await db.mocks.add(session)) as number;
    await db.mockRuns.delete(session.mockNumber);
    if (tick && !(await db.completions.get(tick.itemId))) {
      await db.completions.put({ itemId: tick.itemId, planDayId: tick.planDayId, completedOn: session.date });
    }
    return id;
  });
}

/** Appends one MCQ result to a run. `modify` makes two quick answers safe. */
export async function appendMockAnswer(db: DsaDB, mockNumber: number, correct: boolean): Promise<void> {
  await db.mockRuns.where("mockNumber").equals(mockNumber).modify((r) => void r.answers.push(correct));
}
