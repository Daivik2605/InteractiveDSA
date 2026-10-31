import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addCustomItem,
  addDayToWeek,
  addManualRedo,
  deleteCustomItem,
  homeDayOf,
  logAttempt,
  logFoundProblem,
  moveItem,
  saveDayLog,
  saveProblemEntry,
  tickItemOn,
  untickItem,
} from "./actions";
import { curriculum } from "./curriculum";
import { DsaDB } from "./db";
import { derivePlan, scheduleContext, type Snapshot } from "./plan";
import {
  buildProblemRows,
  filterProblems,
  matchesSearch,
  revealedWeek,
  sortProblems,
} from "./problems";
import {
  addExtension,
  buildSchedule,
  canMoveItem,
  canTickOn,
  catchUpQueue,
  evaluateDays,
  indexCompletions,
  itemsForDay,
  redoDates,
  removeExtension,
} from "./schedule";
import type { CustomItem, ItemMove } from "../types/content";

const START = "2026-10-26";
const day = (n: number, w = 1) => `w${String(w).padStart(2, "0")}-d${n}`;
const custom = (over: Partial<CustomItem>): CustomItem => ({
  id: "c-1",
  planDayId: day(1),
  week: 1,
  kind: "task",
  title: "Watch heap video",
  createdOn: START,
  ...over,
});

describe("itemsForDay with custom items and moves", () => {
  it("appends custom items after plan items and before slots", () => {
    const items = itemsForDay(curriculum, "w01-x1", { customItems: [custom({ planDayId: "w01-x1" })] });
    expect(items.map((i) => i.kind)).toEqual(["task", "slot", "slot"]);
    // plan days have no slots: the custom item simply follows the day's own items
    expect(itemsForDay(curriculum, day(7), { customItems: [custom({ planDayId: day(7) })] }).map((i) => i.kind)).toEqual(["problem", "problem", "review", "review", "task"]);
  });

  it("builds a custom problem as a problem item", () => {
    const c = custom({ kind: "problem", title: "Found it", difficulty: "Hard", url: "https://x.test/p" });
    const item = itemsForDay(curriculum, day(1), { customItems: [c] }).find((i) => i.itemId === "c-1")!;
    expect(item).toMatchObject({ kind: "problem", problem: { id: "c-1", title: "Found it", difficulty: "Hard" } });
  });

  it("moves a plan item off its day and onto another, keeping its id", () => {
    const first = itemsForDay(curriculum, day(1)).find((i) => i.kind === "problem")!;
    const move: ItemMove = { itemId: first.itemId, fromPlanDayId: day(1), toPlanDayId: day(2), movedOn: START };
    expect(itemsForDay(curriculum, day(1), { moves: [move] }).some((i) => i.itemId === first.itemId)).toBe(false);
    const moved = itemsForDay(curriculum, day(2), { moves: [move] }).find((i) => i.itemId === first.itemId)!;
    expect(moved.movedFrom).toBe(day(1));
    expect(moved.planDayId).toBe(day(2));
  });

  it("leaves journal-only found problems out of every day", () => {
    const found = custom({ kind: "problem", planDayId: undefined });
    const all = buildSchedule(curriculum, START).flatMap((d) => itemsForDay(curriculum, d.planDayId, { customItems: [found] }));
    expect(all.some((i) => i.itemId === "c-1")).toBe(false);
  });
});

describe("status and catch-up with edits", () => {
  const schedule = buildSchedule(curriculum, START);
  const today = "2026-10-28";

  it("a custom item counts toward status: unticked keeps a finished day partial, then missed days feed catch-up", () => {
    const edits = { customItems: [custom({ planDayId: day(1) })] };
    const all = itemsForDay(curriculum, day(1), edits).filter((i) => i.kind !== "slot");
    const completions = indexCompletions(all.filter((i) => i.itemId !== "c-1").map((i) => ({ itemId: i.itemId, planDayId: day(1), completedOn: START })));
    const days = evaluateDays({ curriculum, schedule, completions, restDates: new Set(), today, edits });
    expect(days[0]!.status).toBe("partial");
    expect(catchUpQueue(days, completions, today).map((c) => c.item.itemId)).toContain("c-1");
  });

  it("a moved item counts on its new day and is dated by it in the catch-up queue", () => {
    const first = itemsForDay(curriculum, day(1)).find((i) => i.kind === "problem")!;
    const edits = { moves: [{ itemId: first.itemId, fromPlanDayId: day(1), toPlanDayId: day(3), movedOn: START }] };
    const days = evaluateDays({ curriculum, schedule, completions: new Map(), restDates: new Set(), today: "2026-11-02", edits });
    const item = catchUpQueue(days, new Map(), "2026-11-02").find((c) => c.item.itemId === first.itemId)!;
    expect(item.fromDate).toBe("2026-10-28"); // day 3
    expect(item.item.movedFrom).toBe(day(1));
  });

  it("ticking with the day's own date keeps the day done, not done-late", () => {
    const edits = {};
    const items = itemsForDay(curriculum, day(1), edits);
    const completions = indexCompletions(items.map((i) => ({ itemId: i.itemId, planDayId: day(1), completedOn: START })));
    const days = evaluateDays({ curriculum, schedule, completions, restDates: new Set(), today, edits });
    expect(days[0]!.status).toBe("done");
  });
});

describe("canMoveItem / canTickOn", () => {
  const schedule = buildSchedule(curriculum, START, [{ id: 1, week: 1, extraDays: 1, createdOn: START }]);
  const item = itemsForDay(curriculum, day(1)).find((i) => i.kind === "problem")!;
  const base = { schedule, item, completions: new Map() };

  it("allows moves within the week and its extension days", () => {
    expect(canMoveItem({ ...base, toPlanDayId: day(2) }).ok).toBe(true);
    expect(canMoveItem({ ...base, toPlanDayId: "w01-x1" }).ok).toBe(true);
  });
  it("rejects other weeks, the same day, slots and ticked items", () => {
    expect(canMoveItem({ ...base, toPlanDayId: day(1, 2) }).ok).toBe(false);
    expect(canMoveItem({ ...base, toPlanDayId: day(1) }).ok).toBe(false);
    const slot = itemsForDay(curriculum, "w01-x1").find((i) => i.kind === "slot")!;
    expect(canMoveItem({ ...base, item: slot, toPlanDayId: day(2) }).ok).toBe(false);
    const ticked = indexCompletions([{ itemId: item.itemId, planDayId: day(1), completedOn: START }]);
    expect(canMoveItem({ ...base, completions: ticked, toPlanDayId: day(2) }).ok).toBe(false);
  });
  it("lets a tick be dated from the day's date up to today only", () => {
    const d = schedule[1]!; // 2026-10-27
    expect(canTickOn(d, "2026-10-27", "2026-10-29").ok).toBe(true);
    expect(canTickOn(d, "2026-10-29", "2026-10-29").ok).toBe(true);
    expect(canTickOn(d, "2026-10-26", "2026-10-29").ok).toBe(false);
    expect(canTickOn(d, "2026-10-30", "2026-10-29").ok).toBe(false);
  });
});

describe("extension guard with custom and moved items", () => {
  const ctx = (edits: object) => ({
    curriculum,
    startDate: START,
    extensions: [{ id: 1, week: 1, extraDays: 1, createdOn: START }],
    completions: new Map(),
    today: "2026-10-26",
    edits,
  });
  it("blocks removing an extension day that holds a custom item", () => {
    const r = removeExtension(ctx({ customItems: [custom({ planDayId: "w01-x1" })] }), 1);
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.reason).toMatch(/custom or moved/);
  });
  it("blocks removing an extension day that holds a moved item", () => {
    const moves = [{ itemId: "w01-d1-p1", fromPlanDayId: day(1), toPlanDayId: "w01-x1", movedOn: START }];
    expect(removeExtension(ctx({ moves }), 1).ok).toBe(false);
  });
  it("allows it once nothing is on the day", () => {
    expect(removeExtension(ctx({}), 1).ok).toBe(true);
  });
});

describe("old-topic and pool problems hide their topic", () => {
  const all = curriculum.weeks.flatMap((w) => w.days.flatMap((d) => d.problems));
  const old = all.find((p) => p.role === "old-topic")!;
  const pool = curriculum.weeks[0]!.pool[0]!;
  it("reveals the origin week only once attempted", () => {
    expect(revealedWeek(old, false)).toBeUndefined();
    expect(revealedWeek(old, true)).toBe(old.fromWeek);
    expect(revealedWeek(pool, false)).toBeUndefined();
    expect(revealedWeek(pool, true)).toBe(1);
    expect(revealedWeek(all[0]!, false)).toBe(1); // core problems always carry their week
  });
  it("lists a pool problem only after it has been attempted, still without a week", async () => {
    expect(buildProblemRows(await planAt("2026-10-28")).some((r) => r.id === pool.id)).toBe(false);
    await logAttempt(db, { problemId: pool.id, date: "2026-10-28", outcome: "alone", minutes: 20, isRedo: false, completes: [] });
    const row = buildProblemRows(await planAt("2026-10-28")).find((r) => r.id === pool.id);
    expect(row).toMatchObject({ attempts: 1, week: undefined });
  });
});

describe("redo due and fallback logging (v2: redos and fallbacks are not day items)", () => {
  const statusAndQueue = async (today: string) => {
    const plan = await planAt(today);
    return { status: plan.days.map((d) => d.status), queue: plan.catchUp.map((c) => c.item.itemId), completions: plan.completions.size };
  };

  it("logging a redo from the Redo due list closes that task and applies the outcome rules", async () => {
    await db.redos.add({ problemId: "w01-d3-p1", dueOn: "2026-10-31" });
    await db.redos.add({ problemId: "w01-d3-p1", dueOn: "2026-11-04" }); // the same chain's second redo stays pending
    const before = await statusAndQueue("2026-11-01");
    expect((await planAt("2026-11-01")).redoDue).toHaveLength(1);

    await logAttempt(db, { problemId: "w01-d3-p1", date: "2026-11-01", outcome: "alone", minutes: 20, isRedo: true, completes: [] });
    const redos = await db.redos.orderBy("dueOn").toArray();
    expect(redos[0]).toMatchObject({ dueOn: "2026-10-31", doneOn: "2026-11-01", closedByAttemptId: expect.any(Number) }); // closed as completed
    expect(redos[1]).toMatchObject({ dueOn: "2026-11-04" }); // not due yet: only due redos complete
    expect(redos[1]!.doneOn).toBeUndefined();
    expect((await planAt("2026-11-01")).redoDue).toHaveLength(0);
    expect(await statusAndQueue("2026-11-01")).toEqual(before); // no day item, status or catch-up changed

    // a hint instead: closes as attempted and starts one fresh chain (3 days)
    await db.redos.clear();
    await db.redos.add({ problemId: "w01-d3-p1", dueOn: "2026-10-31" });
    await logAttempt(db, { problemId: "w01-d3-p1", date: "2026-11-01", outcome: "hint", minutes: 20, isRedo: true, completes: [] });
    const after = await db.redos.toArray();
    expect(after.filter((r) => r.attemptedOn === "2026-11-01")).toHaveLength(1);
    expect(after.filter((r) => !r.attemptedOn && !r.doneOn).map((r) => r.dueOn)).toEqual(["2026-11-04"]);
  });

  it("logging the fallback saves a normal attempt (Problems page, journal) but never changes day status or catch-up", async () => {
    const before = await statusAndQueue("2026-11-01");
    const fb = "w01-d7-fb";
    const attemptId = await logAttempt(db, { problemId: fb, date: "2026-11-01", outcome: "hint", minutes: 25, isRedo: false, completes: [] });

    expect(await db.attempts.get(attemptId)).toMatchObject({ problemId: fb, outcome: "hint", minutes: 25 });
    expect(await db.completions.count()).toBe(0);
    expect(await statusAndQueue("2026-11-01")).toEqual(before);
    expect((await db.redos.toArray()).map((r) => [r.problemId, r.dueOn])).toEqual([[fb, "2026-11-04"]]); // normal redo rules

    const plan = await planAt("2026-11-01");
    expect(plan.problemOf(fb)).toMatchObject({ title: "Set Matrix Zeroes", role: "fallback" }); // resolves for the journal and redo list
    const row = buildProblemRows(plan).find((r) => r.id === fb)!;
    expect(row).toMatchObject({ attempts: 1, week: 1, title: "Set Matrix Zeroes" });
    await saveProblemEntry(db, { problemId: fb, approach: "use first row/col as markers", tags: ["Matrix"] }, "2026-11-01");
    expect(buildProblemRows(await planAt("2026-11-01")).find((r) => r.id === fb)!.tags).toEqual(["Matrix"]);
    expect(await statusAndQueue("2026-11-01")).toEqual(before);
  });
});

describe("failed outcome", () => {
  it("schedules redos in 3 and 7 days, like needing the solution", () => {
    expect(redoDates("failed", 30, "2026-10-26")).toEqual(["2026-10-29", "2026-11-02"]);
    expect(redoDates("failed", 30, "2026-10-26")).toEqual(redoDates("solution", 30, "2026-10-26"));
  });
});

// ── actions ──────────────────────────────────────────────────────────────────

let db: DsaDB;
let n = 0;
beforeEach(() => void (db = new DsaDB(`edit-${n++}`)));
afterEach(async () => db.delete());

async function planAt(today: string) {
  const snap: Snapshot = {
    settings: { id: "settings", startDate: START, theme: "system" },
    completions: await db.completions.toArray(),
    extensions: await db.extensions.toArray(),
    restDays: await db.restDays.toArray(),
    redos: await db.redos.toArray(),
    attempts: await db.attempts.toArray(),
    customItems: await db.customItems.toArray(),
    moves: await db.itemMoves.toArray(),
    dayLogs: await db.dayLogs.toArray(),
    problemEntries: await db.problemEntries.toArray(),
    draws: await db.dayDraws.toArray(),
    mocksDone: [],
    missedReasons: await db.missedReasons.toArray(),
  };
  return derivePlan(curriculum, snap, today);
}

describe("actions", () => {
  it("homeDayOf reads the day from a plan item id", () => {
    expect(homeDayOf("w03-d2-p1")).toBe("w03-d2");
    expect(homeDayOf("w03-d2:learn")).toBe("w03-d2");
  });

  it("a failed attempt ticks the item, records the outcome and schedules +3/+7 redos (one chain)", async () => {
    await logAttempt(db, { problemId: "w01-d1-p1", date: "2026-10-26", outcome: "hint", minutes: 20, isRedo: false, completes: [] });
    const id = await logAttempt(db, {
      problemId: "w01-d1-p1",
      date: "2026-10-27",
      outcome: "failed",
      minutes: 45,
      isRedo: true,
      completes: [{ itemId: "w01-d1-p1", planDayId: day(1) }],
    });
    expect(await db.completions.get("w01-d1-p1")).toMatchObject({ completedOn: "2026-10-27", attemptId: id });
    expect((await db.attempts.get(id))!.outcome).toBe("failed");
    const pending = (await db.redos.toArray()).filter((r) => !r.doneOn && !r.attemptedOn);
    expect(pending.map((r) => r.dueOn)).toEqual(["2026-10-30", "2026-11-03"]);
    const plan = await planAt("2026-10-29");
    expect(plan.catchUp.some((c) => c.item.itemId === "w01-d1-p1")).toBe(false);
  });

  it("adds, moves, ticks with a past date and deletes a custom item", async () => {
    const id = await addCustomItem(db, { planDayId: day(1), week: 1, kind: "task", title: "Re-read notes" }, "2026-10-28");
    expect(id).toMatch(/^c-/);
    let plan = await planAt("2026-10-28");
    expect(plan.days[0]!.items.some((i) => i.itemId === id)).toBe(true);
    expect(plan.catchUp.map((c) => c.item.itemId)).toContain(id);

    await moveItem(db, { itemId: id, custom: true }, day(3), "2026-10-28");
    plan = await planAt("2026-10-28");
    expect(plan.days[2]!.items.some((i) => i.itemId === id)).toBe(true);

    const r = await tickItemOn(db, { itemId: id, planDayId: day(3) }, "2026-10-28", plan.days[2]!.day, "2026-10-28");
    expect(r.ok).toBe(true);
    expect(await db.completions.get(id)).toMatchObject({ completedOn: "2026-10-28" });
    expect((await tickItemOn(db, { itemId: id, planDayId: day(3) }, "2026-10-29", plan.days[2]!.day, "2026-10-28")).ok).toBe(false);

    await deleteCustomItem(db, id);
    expect(await db.customItems.count()).toBe(0);
    expect(await db.completions.get(id)).toBeUndefined();
  });

  it("moves a plan item with an ItemMove, and moving it home removes the move", async () => {
    await moveItem(db, { itemId: "w01-d1-p1", custom: false }, day(2), "2026-10-26");
    expect(await db.itemMoves.get("w01-d1-p1")).toMatchObject({ fromPlanDayId: day(1), toPlanDayId: day(2) });
    await moveItem(db, { itemId: "w01-d1-p1", custom: false }, day(4), "2026-10-27");
    expect(await db.itemMoves.get("w01-d1-p1")).toMatchObject({ fromPlanDayId: day(1), toPlanDayId: day(4) });
    await moveItem(db, { itemId: "w01-d1-p1", custom: false }, day(1), "2026-10-27");
    expect(await db.itemMoves.count()).toBe(0);
  });

  it("deleting a custom problem removes pending redos and its journal but keeps attempts", async () => {
    const id = await logFoundProblem(
      db,
      { week: 1, title: "Found", tags: ["Two Pointers"], description: "d", firstAttempt: { outcome: "hint", minutes: 20, date: "2026-10-26" } },
      "2026-10-26",
    );
    expect(await db.redos.count()).toBe(1);
    expect(await db.problemEntries.get(id)).toMatchObject({ tags: ["Two Pointers"], description: "d" });
    await deleteCustomItem(db, id);
    expect(await db.redos.count()).toBe(0);
    expect(await db.problemEntries.get(id)).toBeUndefined();
    expect(await db.attempts.count()).toBe(1);
  });

  it("a found problem with no day never affects status or catch-up; attached, it ticks with its first attempt", async () => {
    const loose = await logFoundProblem(db, { week: 1, title: "Loose", tags: [] }, "2026-10-28");
    let plan = await planAt("2026-11-10");
    expect(plan.catchUp.some((c) => c.item.itemId === loose)).toBe(false);
    expect(plan.days.flatMap((d) => d.items).some((i) => i.itemId === loose)).toBe(false);

    const attached = await logFoundProblem(
      db,
      { week: 1, title: "Attached", planDayId: day(2), tags: [], firstAttempt: { outcome: "alone", minutes: 10, date: "2026-10-28" } },
      "2026-10-28",
    );
    plan = await planAt("2026-10-28");
    expect(plan.completions.get(attached)).toMatchObject({ planDayId: day(2), completedOn: "2026-10-28" });
    await untickItem(db, attached);
    expect(await db.attempts.where("problemId").equals(attached).count()).toBe(0);
  });

  it("saves, edits and clears a day log", async () => {
    await saveDayLog(db, { planDayId: day(1), notes: " heaps ", minutes: 30, links: ["https://a.test", " "] }, "2026-10-26");
    expect(await db.dayLogs.get(day(1))).toEqual({ planDayId: day(1), notes: "heaps", minutes: 30, links: ["https://a.test"], updatedOn: "2026-10-26" });
    await saveDayLog(db, { planDayId: day(1), notes: "heaps", minutes: 30, links: ["https://a.test"] }, "2026-10-30");
    expect((await db.dayLogs.get(day(1)))!.updatedOn).toBe("2026-10-26"); // unchanged: not "edited"
    await saveDayLog(db, { planDayId: day(1), notes: "heaps + tries", minutes: 30, links: ["https://a.test"] }, "2026-10-30");
    expect((await db.dayLogs.get(day(1)))!.updatedOn).toBe("2026-10-30");
    await saveDayLog(db, { planDayId: day(1), notes: "", minutes: 0, links: [] }, "2026-10-31");
    expect(await db.dayLogs.count()).toBe(0);
  });

  it("adds a day to a week using the extension rules and returns the new day id", async () => {
    const plan = await planAt("2026-10-27");
    const r = await addDayToWeek(db, scheduleContext(plan, curriculum), 1);
    expect(r).toEqual({ ok: true, planDayId: "w01-x1" });
    const again = await addDayToWeek(db, scheduleContext(await planAt("2026-10-27"), curriculum), 1);
    expect(again).toEqual({ ok: true, planDayId: "w01-x2" });
    expect((await planAt("2026-10-27")).schedule.filter((d) => d.week === 1)).toHaveLength(9);
  });

  it("add-a-day follows the rules (passed week with a ticked next week is refused)", async () => {
    await db.completions.put({ itemId: "w02-d1:learn", planDayId: "w02-d1", completedOn: "2026-11-02" });
    const plan = await planAt("2026-11-05");
    expect((await addDayToWeek(db, scheduleContext(plan, curriculum), 1)).ok).toBe(false);
    expect(addExtension(scheduleContext(plan, curriculum), { week: 2, extraDays: 1 }).ok).toBe(true);
  });

  it("saves a problem journal entry, dropping empty ones, and adds a manual redo", async () => {
    await saveProblemEntry(db, { problemId: "w01-d1-p1", code: "def f(): pass", confidence: 3, tags: ["Hash Map"] }, "2026-10-26");
    expect(await db.problemEntries.get("w01-d1-p1")).toMatchObject({ code: "def f(): pass", confidence: 3, tags: ["Hash Map"], updatedOn: "2026-10-26" });
    await saveProblemEntry(db, { problemId: "w01-d1-p1", code: " ", tags: [] }, "2026-10-27");
    expect(await db.problemEntries.count()).toBe(0);
    await addManualRedo(db, "w01-d1-p1", "2026-11-05");
    expect(await db.redos.toArray()).toMatchObject([{ problemId: "w01-d1-p1", dueOn: "2026-11-05" }]);
  });
});

// ── problems list ────────────────────────────────────────────────────────────

describe("problems list", () => {
  it("includes plan, custom and found problems and filters/searches/sorts them", async () => {
    await logFoundProblem(
      db,
      {
        week: 1,
        title: "Weird Prefix Trick",
        difficulty: "Medium",
        description: "Count subarrays with a given sum",
        tags: ["Prefix Sum"],
        firstAttempt: { outcome: "solution", minutes: 40, date: "2026-10-27" },
      },
      "2026-10-27",
    );
    await addCustomItem(db, { planDayId: day(1), week: 1, kind: "problem", title: "Custom One", difficulty: "Easy" }, "2026-10-27");
    await addCustomItem(db, { planDayId: day(1), week: 1, kind: "task", title: "A task" }, "2026-10-27");
    await saveProblemEntry(db, { problemId: "w01-d1-p1", code: "seen = set()  # my Solution", comments: "Tricky TLE", confidence: 2, tags: ["Hash Set"] }, "2026-10-27");
    const rows = buildProblemRows(await planAt("2026-10-28"));
    expect(rows.filter((r) => r.source === "plan")).toHaveLength(160 + 41 + 6); // core + old-topic + fallbacks; pool is hidden
    expect(rows.filter((r) => r.source === "plan" && r.week === undefined)).toHaveLength(41); // old-topic: no week label
    expect(rows.find((r) => r.id === "w01-d7-fb")).toMatchObject({ week: 1, platform: "LeetCode" });
    expect(rows.filter((r) => r.source === "found")).toHaveLength(1);
    expect(rows.filter((r) => r.source === "custom")).toHaveLength(1); // the task is not a problem

    expect(filterProblems(rows, { source: "found" }).map((r) => r.title)).toEqual(["Weird Prefix Trick"]);
    expect(filterProblems(rows, { tag: "Prefix Sum" })).toHaveLength(1);
    expect(filterProblems(rows, { outcome: "solution" })).toHaveLength(1);
    expect(filterProblems(rows, { outcome: "none", source: "custom" })).toHaveLength(1);
    expect(filterProblems(rows, { difficulty: "Easy", source: "custom" })).toHaveLength(1);
    expect(filterProblems(rows, { maxConfidence: 2 }).map((r) => r.id)).toEqual(["w01-d1-p1"]);
    expect(filterProblems(rows, { week: 2, source: "found" })).toHaveLength(0);

    // search: title, description, comments and code, case-insensitive substring
    expect(filterProblems(rows, { search: "WEIRD PREFIX" })).toHaveLength(1);
    expect(filterProblems(rows, { search: "given sum" }).map((r) => r.source)).toEqual(["found"]);
    expect(filterProblems(rows, { search: "tle" }).map((r) => r.id)).toEqual(["w01-d1-p1"]);
    expect(filterProblems(rows, { search: "set()" }).map((r) => r.id)).toEqual(["w01-d1-p1"]);
    expect(filterProblems(rows, { search: "no such text" })).toHaveLength(0);
    expect(matchesSearch(rows[0]!, "  ")).toBe(true);

    expect(sortProblems(rows, "last")[0]!.title).toBe("Weird Prefix Trick");
    expect(sortProblems(rows, "confidence")[0]!.id).toBe("w01-d1-p1");
    expect(sortProblems(rows, "attempts")[0]!.attempts).toBe(1);
  });
});
