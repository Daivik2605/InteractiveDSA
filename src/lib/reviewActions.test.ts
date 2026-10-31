import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureDayDraws, logAttempt, rerollDraw, undoAttempt } from "./actions";
import { curriculum } from "./curriculum";
import { DsaDB } from "./db";
import { mulberry32 } from "./quiz";
import { reviewPool } from "./review";

let db: DsaDB;
let n = 0;
beforeEach(() => void (db = new DsaDB(`review-${n++}`)));
afterEach(async () => db.delete());

const DAY = "w01-d5";
const S1 = `${DAY}:review-1`;
const S2 = `${DAY}:review-2`;

describe("ensureDayDraws", () => {
  it("draws two distinct problems from the day's pool and saves them", async () => {
    const drawn = await ensureDayDraws(db, curriculum, DAY, "2026-10-30", mulberry32(5));
    expect(drawn.sort()).toEqual([S1, S2]);
    const rows = await db.dayDraws.toArray();
    const pool = new Set(reviewPool(curriculum, DAY).map((p) => p.id));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => pool.has(r.problemId) && r.planDayId === DAY && r.drawnOn === "2026-10-30" && r.attemptId === undefined)).toBe(true);
    expect(rows[0]!.problemId).not.toBe(rows[1]!.problemId);
  });

  it("never reshuffles: calling it again, even with another rng, changes nothing", async () => {
    await ensureDayDraws(db, curriculum, DAY, "2026-10-30", mulberry32(5));
    const first = await db.dayDraws.toArray();
    expect(await ensureDayDraws(db, curriculum, DAY, "2026-10-31", mulberry32(99))).toEqual([]);
    expect(await db.dayDraws.toArray()).toEqual(first);
  });

  it("two calls at once (a double render) still leave exactly two rows", async () => {
    await Promise.all([ensureDayDraws(db, curriculum, DAY, "2026-10-30"), ensureDayDraws(db, curriculum, DAY, "2026-10-30")]);
    expect(await db.dayDraws.count()).toBe(2);
  });

  it("fills only the missing slot", async () => {
    await db.dayDraws.add({ slotId: S2, planDayId: DAY, problemId: "w01-d1-p1", drawnOn: "2026-10-30" });
    expect(await ensureDayDraws(db, curriculum, DAY, "2026-10-31", mulberry32(1))).toEqual([S1]);
    expect((await db.dayDraws.get(S2))!.problemId).toBe("w01-d1-p1");
    expect((await db.dayDraws.get(S1))!.problemId).not.toBe("w01-d1-p1"); // distinct from its sibling
  });

  it("draws nothing for plan days 1-4, the wrap-up day, extension days and unknown days", async () => {
    for (const id of ["w01-d1", "w01-d4", "w13-d6", "w02-x1", "w99-d1", "bogus"]) expect(await ensureDayDraws(db, curriculum, id, "2026-10-30")).toEqual([]);
    expect(await db.dayDraws.count()).toBe(0);
  });
});

describe("rerollDraw", () => {
  it("replaces the problem while nothing is logged for the slot", async () => {
    await ensureDayDraws(db, curriculum, DAY, "2026-10-30", mulberry32(5));
    const before = await db.dayDraws.toArray();
    const r = await rerollDraw(db, curriculum, S1, mulberry32(11));
    expect(r).toEqual({ ok: true });
    const after = await db.dayDraws.get(S1);
    expect(after!.problemId).not.toBe(before.find((d) => d.slotId === S1)!.problemId);
    expect(after!.problemId).not.toBe(before.find((d) => d.slotId === S2)!.problemId); // not the sibling either
    expect((await db.dayDraws.get(S2))!.problemId).toBe(before.find((d) => d.slotId === S2)!.problemId);
  });

  it("is refused once an attempt is logged for the slot, and works again after that attempt is undone", async () => {
    await ensureDayDraws(db, curriculum, DAY, "2026-10-30", mulberry32(5));
    const drawn = (await db.dayDraws.get(S1))!;
    const attemptId = await logAttempt(db, { problemId: drawn.problemId, date: "2026-10-30", outcome: "alone", minutes: 15, isRedo: false, completes: [{ itemId: S1, planDayId: DAY }] });
    expect(await db.dayDraws.get(S1)).toMatchObject({ attemptId });
    const refused = await rerollDraw(db, curriculum, S1, mulberry32(2));
    expect(refused).toMatchObject({ ok: false, reason: expect.stringMatching(/already logged/) });
    expect((await db.dayDraws.get(S1))!.problemId).toBe(drawn.problemId);

    await undoAttempt(db, attemptId);
    expect((await db.dayDraws.get(S1))!.attemptId).toBeUndefined();
    expect(await rerollDraw(db, curriculum, S1, mulberry32(2))).toEqual({ ok: true });
  });

  it("is refused for a slot that was ticked without an attempt, and for a slot with no draw", async () => {
    await ensureDayDraws(db, curriculum, DAY, "2026-10-30", mulberry32(5));
    await db.completions.put({ itemId: S2, planDayId: DAY, completedOn: "2026-10-30" });
    expect(await rerollDraw(db, curriculum, S2)).toMatchObject({ ok: false });
    expect(await rerollDraw(db, curriculum, "w01-d6:review-1")).toMatchObject({ ok: false, reason: expect.stringMatching(/Nothing has been drawn/) });
  });
});

describe("logging a review slot", () => {
  it("completes only that slot (not the problem's own item), keeps normal attempt and redo rules, and undo removes just that", async () => {
    await db.dayDraws.add({ slotId: S1, planDayId: DAY, problemId: "w01-d1-p1", drawnOn: "2026-10-30" }); // Plus One, also a day-1 problem
    const attemptId = await logAttempt(db, { problemId: "w01-d1-p1", date: "2026-10-30", outcome: "hint", minutes: 25, isRedo: false, completes: [{ itemId: S1, planDayId: DAY }] });
    expect((await db.completions.toArray()).map((c) => c.itemId)).toEqual([S1]); // w01-d1-p1 itself stays unticked
    expect(await db.attempts.toArray()).toMatchObject([{ problemId: "w01-d1-p1", outcome: "hint", minutes: 25, isRedo: false }]);
    expect((await db.redos.toArray()).length).toBeGreaterThan(0); // a hint schedules redos like any problem
    await undoAttempt(db, attemptId);
    expect(await db.completions.count()).toBe(0);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.redos.count()).toBe(0);
  });

  it("can repeat a problem that was already solved: the second attempt completes its own slot only", async () => {
    await db.dayDraws.bulkAdd([
      { slotId: S1, planDayId: DAY, problemId: "w01-d1-p1", drawnOn: "2026-10-30" },
      { slotId: "w01-d6:review-1", planDayId: "w01-d6", problemId: "w01-d1-p1", drawnOn: "2026-10-31" }, // same problem a day later
    ]);
    await logAttempt(db, { problemId: "w01-d1-p1", date: "2026-10-30", outcome: "alone", minutes: 10, isRedo: false, completes: [{ itemId: S1, planDayId: DAY }] });
    await logAttempt(db, { problemId: "w01-d1-p1", date: "2026-10-31", outcome: "alone", minutes: 8, isRedo: false, completes: [{ itemId: "w01-d6:review-1", planDayId: "w01-d6" }] });
    expect((await db.completions.toArray()).map((c) => c.itemId).sort()).toEqual([S1, "w01-d6:review-1"]);
    expect(await db.attempts.count()).toBe(2);
    expect((await db.dayDraws.get("w01-d6:review-1"))!.attemptId).toBeDefined();
  });
});
