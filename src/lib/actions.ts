// All database mutations. Each runs in one transaction so the UI never sees half an update.

import type { DsaDB } from "./db";
import { saveSettings } from "./db";
import { isValidDate } from "./dates";
import { canAddRestDay, redoChanges, type Result } from "./schedule";
import type { ItemCompletion, ProblemAttempt, ScheduledDay, WeekExtension } from "../types/content";

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
    };
    const attemptId = (await db.attempts.add(attempt)) as number;

    for (const t of input.completes) {
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
