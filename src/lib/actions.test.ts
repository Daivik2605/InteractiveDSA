import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  logAttempt,
  saveExtensions,
  setRestDay,
  setStartDate,
  tickItem,
  undoAttempt,
  untickItem,
  type LogInput,
} from "./actions";
import { DsaDB, getSettings } from "./db";
import { buildSchedule } from "./schedule";
import { curriculum } from "./curriculum";

let db: DsaDB;
let n = 0;
beforeEach(() => {
  db = new DsaDB(`actions-${n++}`);
});
afterEach(() => db.delete());

const P = "w01-d1-p1";
const attempt = (over: Partial<LogInput> = {}): LogInput => ({
  problemId: P,
  date: "2026-10-26",
  outcome: "alone",
  minutes: 20,
  isRedo: false,
  completes: [{ itemId: P, planDayId: "w01-d1" }],
  ...over,
});
const pendingRedos = async (problemId = P) =>
  (await db.redos.where("problemId").equals(problemId).toArray()).filter((r) => !r.doneOn && !r.attemptedOn);

describe("logAttempt", () => {
  it("records the attempt and a completion dated to the actual day", async () => {
    const id = await logAttempt(db, attempt({ date: "2026-10-30" }));
    expect(await db.attempts.get(id)).toMatchObject({ problemId: P, outcome: "alone", isRedo: false });
    expect(await db.completions.get(P)).toEqual({ itemId: P, planDayId: "w01-d1", completedOn: "2026-10-30", attemptId: id });
    expect(await db.redos.count()).toBe(0);
  });

  it("schedules redos from the outcome", async () => {
    await logAttempt(db, attempt({ outcome: "solution" }));
    expect((await db.redos.toArray()).map((r) => r.dueOn)).toEqual(["2026-10-29", "2026-11-02"]);
  });

  it("does not overwrite an existing completion", async () => {
    await tickItem(db, { itemId: P, planDayId: "w01-d1" }, "2026-10-26");
    await logAttempt(db, attempt({ date: "2026-10-28" }));
    expect((await db.completions.get(P))!.completedOn).toBe("2026-10-26");
  });

  it("a catch-up problem in a slot completes both the slot and the original item", async () => {
    const id = await logAttempt(
      db,
      attempt({
        completes: [
          { itemId: "w01-d7:s1", planDayId: "w01-d7" },
          { itemId: P, planDayId: "w01-d1" },
        ],
      }),
    );
    expect((await db.completions.toArray()).map((c) => [c.itemId, c.attemptId]).sort()).toEqual([
      [P, id],
      ["w01-d7:s1", id],
    ]);
  });

  it("redo slot solved alone: ticks the slot and completes the due redo", async () => {
    await logAttempt(db, attempt({ outcome: "hint" })); // redo due 2026-10-29
    const id = await logAttempt(
      db,
      attempt({ date: "2026-11-01", isRedo: true, completes: [{ itemId: "w01-d7:s1", planDayId: "w01-d7" }] }),
    );
    expect(await db.completions.get("w01-d7:s1")).toBeTruthy();
    expect(await db.redos.toArray()).toMatchObject([{ doneOn: "2026-11-01", closedByAttemptId: id }]);
    expect(await pendingRedos()).toEqual([]);
  });

  it("redo slot with hint/solution: old redo closed as attempted, one new chain, slot still ticked", async () => {
    await logAttempt(db, attempt({ outcome: "solution" })); // chain: 10-29, 11-02
    const id = await logAttempt(
      db,
      attempt({ date: "2026-11-01", outcome: "hint", isRedo: true, completes: [{ itemId: "w01-d7:s1", planDayId: "w01-d7" }] }),
    );
    const all = await db.redos.toArray();
    expect(all.filter((r) => r.attemptedOn === "2026-11-01")).toHaveLength(2);
    expect(all.filter((r) => r.doneOn)).toHaveLength(0);
    const pending = await pendingRedos();
    expect(pending.map((r) => [r.dueOn, r.createdByAttemptId])).toEqual([["2026-11-04", id]]);
    expect(await db.completions.get("w01-d7:s1")).toBeTruthy();
  });

  it("never leaves more than one pending chain, however many times it is retried", async () => {
    await logAttempt(db, attempt({ outcome: "solution" }));
    for (const d of ["2026-11-01", "2026-11-05", "2026-11-09"]) {
      await logAttempt(db, attempt({ date: d, outcome: "solution", isRedo: true, completes: [] }));
      expect(await pendingRedos()).toHaveLength(2);
    }
  });
});

describe("undo", () => {
  it("unticking removes the completion, the attempt and the redos it created; earlier attempts stay", async () => {
    const first = await logAttempt(db, attempt({ date: "2026-10-26", outcome: "hint" }));
    const second = await logAttempt(
      db,
      attempt({ date: "2026-11-01", outcome: "hint", isRedo: true, completes: [{ itemId: "w01-d7:s1", planDayId: "w01-d7" }] }),
    );
    await untickItem(db, "w01-d7:s1");

    expect(await db.completions.get("w01-d7:s1")).toBeUndefined();
    expect(await db.attempts.get(second)).toBeUndefined();
    expect(await db.attempts.get(first)).toBeTruthy();
    expect(await db.completions.get(P)).toBeTruthy();
    // redo created by `second` is gone; the one `second` closed is pending again
    const pending = await pendingRedos();
    expect(pending.map((r) => [r.dueOn, r.createdByAttemptId])).toEqual([["2026-10-29", first]]);
    expect(pending[0]!.closedByAttemptId).toBeUndefined();
  });

  it("reopens a redo that the undone attempt completed", async () => {
    await logAttempt(db, attempt({ outcome: "hint" }));
    const redo = await logAttempt(db, attempt({ date: "2026-11-01", isRedo: true, completes: [] }));
    expect(await pendingRedos()).toHaveLength(0);
    await undoAttempt(db, redo);
    expect((await pendingRedos()).map((r) => r.dueOn)).toEqual(["2026-10-29"]);
  });

  it("unticking a slot filled from catch-up also unticks the original item", async () => {
    await logAttempt(
      db,
      attempt({ completes: [{ itemId: "w01-d7:s1", planDayId: "w01-d7" }, { itemId: P, planDayId: "w01-d1" }] }),
    );
    await untickItem(db, "w01-d7:s1");
    expect(await db.completions.count()).toBe(0);
    expect(await db.attempts.count()).toBe(0);
  });

  it("unticking a learn item just removes it", async () => {
    await tickItem(db, { itemId: "w01-d1:learn", planDayId: "w01-d1" }, "2026-10-26");
    await untickItem(db, "w01-d1:learn");
    expect(await db.completions.count()).toBe(0);
  });

  it("does not delete a redo created by the attempt if it has already been completed", async () => {
    const first = await logAttempt(db, attempt({ outcome: "hint" }));
    await logAttempt(db, attempt({ date: "2026-11-01", isRedo: true, completes: [] }));
    await undoAttempt(db, first);
    expect((await db.redos.toArray()).filter((r) => r.createdByAttemptId === first)).toHaveLength(1);
  });
});

describe("rest days, extensions, start date", () => {
  const schedule = buildSchedule(curriculum, "2026-10-26");

  it("allows one rest day per week and can undo it", async () => {
    expect((await setRestDay(db, schedule, new Set(), "2026-10-27", true)).ok).toBe(true);
    expect((await setRestDay(db, schedule, new Set(["2026-10-27"]), "2026-10-28", true)).ok).toBe(false);
    expect(await db.restDays.count()).toBe(1);
    await setRestDay(db, schedule, new Set(["2026-10-27"]), "2026-10-27", false);
    expect(await db.restDays.count()).toBe(0);
  });

  it("saves extensions with their ids", async () => {
    await saveExtensions(db, [{ id: 4, week: 1, extraDays: 3, createdOn: "2026-10-28" }]);
    await saveExtensions(db, [{ id: 4, week: 1, extraDays: 2, createdOn: "2026-10-28" }, { id: 5, week: 3, extraDays: 1, createdOn: "2026-10-28" }]);
    expect((await db.extensions.toArray()).map((e) => [e.id, e.extraDays])).toEqual([[4, 2], [5, 1]]);
  });

  it("changing the start date leaves completions untouched", async () => {
    await tickItem(db, { itemId: P, planDayId: "w01-d1" }, "2026-10-26");
    expect((await setStartDate(db, "2026-10-12", "2026-10-26")).ok).toBe(true);
    expect((await getSettings(db, "2026-10-26")).startDate).toBe("2026-10-12");
    expect(await db.completions.count()).toBe(1);
    expect((await setStartDate(db, "2026-13-40", "2026-10-26")).ok).toBe(false);
  });
});
