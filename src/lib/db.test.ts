import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DsaDB, exportAll, getSettings, importAll, resetAll, saveSettings } from "./db";

let db: DsaDB;
let n = 0;

beforeEach(() => {
  db = new DsaDB(`test-${n++}`);
});
afterEach(async () => {
  await db.delete();
});

async function seed(d: DsaDB) {
  await d.completions.put({ itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-26" });
  await d.extensions.add({ week: 1, extraDays: 2, createdOn: "2026-10-28" });
  await d.attempts.add({ problemId: "w01-d1-p1", date: "2026-10-26", outcome: "hint", minutes: 30, isRedo: false });
  await d.redos.add({ problemId: "w01-d1-p1", dueOn: "2026-10-29" });
  await d.restDays.put({ date: "2026-10-27" });
  await d.cards.put({ questionId: "w01-q01", box: 2, dueOn: "2026-10-30" });
  await d.quizAnswers.add({ questionId: "w01-q01", correct: true, answeredAt: "2026-10-26T10:00:00.000Z", mode: "weekly" });
}

describe("db", () => {
  it("creates default settings once and saves changes", async () => {
    expect(await getSettings(db, "2026-10-26")).toEqual({ id: "settings", startDate: "2026-10-26", theme: "system" });
    await saveSettings(db, { startDate: "2026-10-12", theme: "dark" }, "2026-10-26");
    expect(await getSettings(db, "2026-10-26")).toEqual({ id: "settings", startDate: "2026-10-12", theme: "dark" });
  });

  it("export then import restores every table", async () => {
    await seed(db);
    await saveSettings(db, { theme: "dark" }, "2026-10-26");
    const snapshot = await exportAll(db);
    expect(snapshot.schemaVersion).toBe(7);

    await resetAll(db);
    expect(await db.completions.count()).toBe(0);

    await importAll(db, JSON.parse(JSON.stringify(snapshot)));
    expect(await exportAll(db)).toEqual(snapshot);
  });

  it("rejects bad imports without touching existing data", async () => {
    await seed(db);
    await expect(importAll(db, { schemaVersion: 99 })).rejects.toThrow(/schemaVersion/);
    await expect(importAll(db, "nope")).rejects.toThrow();
    await expect(importAll(db, { schemaVersion: 1, completions: [] })).rejects.toThrow(/missing/);
    expect(await db.completions.count()).toBe(1);
  });

  it("rolls back a failed import", async () => {
    await seed(db);
    const snapshot = await exportAll(db);
    const bad = { ...snapshot, completions: [...snapshot.completions, ...snapshot.completions] }; // duplicate key
    await expect(importAll(db, bad)).rejects.toThrow();
    expect(await db.completions.count()).toBe(1);
    expect(await db.extensions.count()).toBe(1);
  });
});

describe("schema v2 (SPEC 3.13, 3.14)", () => {
  it("opening an existing v1 database as v2 keeps every row and adds empty new tables", async () => {
    const name = `migrate-${n++}`;
    const { default: Dexie } = await import("dexie");
    const v1 = new Dexie(name);
    v1.version(1).stores({
      completions: "itemId, planDayId, completedOn",
      extensions: "++id, week",
      attempts: "++id, problemId, date",
      redos: "++id, problemId, dueOn",
      quizAnswers: "++id, questionId, answeredAt, mode",
      cards: "questionId, dueOn",
      restDays: "date",
      mocks: "++id, date",
      settings: "id",
    });
    await v1.table("completions").put({ itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-26" });
    await v1.table("attempts").add({ problemId: "w01-d1-p1", date: "2026-10-26", outcome: "alone", minutes: 10, isRedo: false });
    await v1.table("settings").put({ id: "settings", startDate: "2026-10-12", theme: "dark" });
    v1.close();

    const v2 = new DsaDB(name);
    try {
      expect(await v2.completions.count()).toBe(1);
      expect(await v2.attempts.count()).toBe(1);
      expect(await v2.settings.get("settings")).toMatchObject({ startDate: "2026-10-12", theme: "dark" });
      expect(await v2.customItems.count()).toBe(0);
      expect(await v2.itemMoves.count()).toBe(0);
      expect(await v2.dayLogs.count()).toBe(0);
      expect(await v2.problemEntries.count()).toBe(0);
    } finally {
      await v2.delete();
    }
  });

  it("round-trips the new tables through export and import", async () => {
    await seed(db);
    await db.customItems.add({ id: "c-1", planDayId: "w01-d1", week: 1, kind: "task", title: "T", createdOn: "2026-10-26" });
    await db.itemMoves.put({ itemId: "w01-d1-p1", fromPlanDayId: "w01-d1", toPlanDayId: "w01-d2", movedOn: "2026-10-26" });
    await db.dayLogs.put({ planDayId: "w01-d1", notes: "n", minutes: 5, links: [], updatedOn: "2026-10-26" });
    await db.problemEntries.put({ problemId: "w01-d1-p1", tags: ["x"], updatedOn: "2026-10-26" });
    const snapshot = await exportAll(db);
    await resetAll(db);
    await importAll(db, snapshot);
    expect(await exportAll(db)).toEqual(snapshot);
  });

  it("still imports a v1 export (new tables come in empty, existing ones are replaced)", async () => {
    await db.customItems.add({ id: "c-9", week: 1, kind: "problem", title: "old", createdOn: "2026-10-26" });
    const v1 = {
      schemaVersion: 1,
      completions: [{ itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-26" }],
      extensions: [{ week: 1, extraDays: 2, createdOn: "2026-10-28" }],
      attempts: [],
      redos: [],
      quizAnswers: [],
      cards: [],
      restDays: [],
      mocks: [],
      settings: [{ id: "settings", startDate: "2026-10-12", theme: "light" }],
    };
    await importAll(db, v1);
    expect(await db.completions.count()).toBe(1);
    expect(await db.extensions.count()).toBe(1);
    expect(await db.customItems.count()).toBe(0);
    expect((await getSettings(db, "2026-10-26")).theme).toBe("light");
  });

  it("rejects a v2 file that is missing a new table", async () => {
    const full = await exportAll(db);
    const { dayLogs: _omit, ...partial } = full;
    await expect(importAll(db, partial)).rejects.toThrow(/dayLogs/);
  });

  it("exports and re-imports mock sessions, runs and retakes", async () => {
    const mcq = { total: 1, correct: 1, byType: { bug: { total: 1, correct: 1 } } };
    const answers = [{ questionId: "w01-q05", picked: 0, correct: true, section: "current" as const }];
    await db.mocks.add({ mockNumber: 1, date: "2026-10-26", diagnostic: true, mcq, questionIds: ["w01-q05"], answers, programs: [], extra: { kind: "debug", done: true }, rating: 4 });
    await db.mockRetakes.add({ mockNumber: 1, retakeNumber: 1, date: "2026-10-27", mcq, answers });
    const snapshot = await exportAll(db);
    expect(snapshot.mockRetakes).toHaveLength(1);
    await resetAll(db);
    await importAll(db, JSON.parse(JSON.stringify(snapshot)));
    expect(await db.mockRetakes.toArray()).toMatchObject([{ mockNumber: 1, retakeNumber: 1 }]);
    expect(await exportAll(db)).toEqual(snapshot);
  });

  it("still imports a v3 export that has no mockRetakes table", async () => {
    await db.mockRetakes.add({ mockNumber: 9, retakeNumber: 1, date: "2026-10-27", mcq: { total: 0, correct: 0, byType: {} }, answers: [] });
    const { mockRetakes: _omit, ...v3 } = await exportAll(db);
    await importAll(db, { ...v3, schemaVersion: 3 });
    expect(await db.mockRetakes.count()).toBe(0); // comes in empty
    await expect(importAll(db, { ...v3, schemaVersion: 4 })).rejects.toThrow(/mockRetakes/);
  });

  it("exports and re-imports the review draws", async () => {
    await db.dayDraws.bulkAdd([
      { slotId: "w01-d5:review-1", planDayId: "w01-d5", problemId: "w01-d1-p1", drawnOn: "2026-10-30" },
      { slotId: "w01-d5:review-2", planDayId: "w01-d5", problemId: "w01-d2-p1", drawnOn: "2026-10-30", attemptId: 7 },
    ]);
    const snapshot = await exportAll(db);
    expect(snapshot.schemaVersion).toBe(7);
    expect(snapshot.dayDraws).toHaveLength(2);
    await resetAll(db);
    expect(await db.dayDraws.count()).toBe(0);
    await importAll(db, JSON.parse(JSON.stringify(snapshot)));
    expect(await db.dayDraws.get("w01-d5:review-2")).toMatchObject({ problemId: "w01-d2-p1", attemptId: 7 });
    expect(await exportAll(db)).toEqual(snapshot);
  });

  it("still imports a v4 export that has no dayDraws table, and rejects a v5 file without it", async () => {
    await db.dayDraws.add({ slotId: "w01-d5:review-1", planDayId: "w01-d5", problemId: "w01-d1-p1", drawnOn: "2026-10-30" });
    const { dayDraws: _omit, ...v4 } = await exportAll(db);
    await importAll(db, { ...v4, schemaVersion: 4 });
    expect(await db.dayDraws.count()).toBe(0); // comes in empty
    await expect(importAll(db, { ...v4, schemaVersion: 5 })).rejects.toThrow(/dayDraws/);
  });

  it("upgrades a v4 database without touching its rows (a saved Mock 1 and 2, ticks, a mock run)", async () => {
    const name = `upgrade-${n++}`;
    const old = new Dexie(name);
    old.version(1).stores({ completions: "itemId, planDayId, completedOn", extensions: "++id, week", attempts: "++id, problemId, date", redos: "++id, problemId, dueOn", quizAnswers: "++id, questionId, answeredAt, mode", cards: "questionId, dueOn", restDays: "date", mocks: "++id, date", settings: "id" });
    old.version(2).stores({ customItems: "id, planDayId, week", itemMoves: "itemId, toPlanDayId", dayLogs: "planDayId", problemEntries: "problemId" });
    old.version(3).stores({ mocks: "++id, date, mockNumber", mockRuns: "mockNumber" });
    old.version(4).stores({ mockRetakes: "++id, mockNumber, date" });
    const mcq = { total: 18, correct: 13, byType: {} };
    await old.table("mocks").bulkAdd([
      { mockNumber: 1, date: "2026-10-26", diagnostic: true, mcq, questionIds: [], programs: [], extra: { kind: "debug", done: true }, rating: 4 },
      { mockNumber: 2, date: "2026-10-28", diagnostic: false, mcq, questionIds: [], programs: [], extra: { kind: "explain-aloud", done: true }, rating: 3 },
    ]);
    await old.table("completions").bulkAdd([
      { itemId: "w01-d1:learn", planDayId: "w01-d1", completedOn: "2026-10-26" }, // Mock 1's old row: stays, harmless
      { itemId: "w01-d3:learn", planDayId: "w01-d3", completedOn: "2026-10-28" }, // Mock 2's old row
      { itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-26" },
    ]);
    await old.table("mockRuns").add({ mockNumber: 3, startedOn: "2026-10-29", questionIds: [], groups: { theme: 7, current: 6, review: 5 }, program1: { problemId: null }, program2: null, extra: { kind: "complexity-check" }, answers: [true], phase: "A", programs: [], extraDone: false });
    old.close();

    const upgraded = new DsaDB(name);
    try {
      expect(await upgraded.mocks.count()).toBe(2);
      expect((await upgraded.mocks.where("mockNumber").equals(2).first())!.mcq.correct).toBe(13);
      expect((await upgraded.completions.toArray()).map((c) => c.itemId).sort()).toEqual(["w01-d1-p1", "w01-d1:learn", "w01-d3:learn"]);
      expect(await upgraded.mockRuns.get(3)).toMatchObject({ phase: "A", answers: [true] });
      expect(await upgraded.dayDraws.count()).toBe(0);
    } finally {
      await upgraded.delete();
    }
  });

  it("exports and re-imports missed-day reasons, and a v5 export without them still imports", async () => {
    await db.missedReasons.add({ planDayId: "w01-d6", reason: "Travel", loggedOn: "2026-11-01" });
    const snapshot = await exportAll(db);
    expect(snapshot.missedReasons).toHaveLength(1);
    await resetAll(db);
    await importAll(db, JSON.parse(JSON.stringify(snapshot)));
    expect(await db.missedReasons.get("w01-d6")).toMatchObject({ reason: "Travel" });
    const { missedReasons: _omit, ...v5 } = snapshot;
    await importAll(db, { ...v5, schemaVersion: 5 });
    expect(await db.missedReasons.count()).toBe(0); // comes in empty
    await expect(importAll(db, { ...v5, schemaVersion: 6 })).rejects.toThrow(/missedReasons/);
  });

  it("exports and re-imports day notes, and a v6 export without them still imports", async () => {
    await db.dayNotes.bulkAdd([
      { date: "2026-10-30", text: "line one\nline two", createdAt: "2026-10-30T10:00:00.000Z", updatedAt: "2026-10-30T10:05:00.000Z" },
      { date: "2026-10-30", text: "during a mock", createdAt: "2026-10-30T11:00:00.000Z", updatedAt: "2026-10-30T11:00:00.000Z", mockNumber: 3 },
    ]);
    const snapshot = await exportAll(db);
    expect(snapshot.schemaVersion).toBe(7);
    expect(snapshot.dayNotes).toHaveLength(2);
    await resetAll(db);
    expect(await db.dayNotes.count()).toBe(0);
    await importAll(db, JSON.parse(JSON.stringify(snapshot)));
    expect((await db.dayNotes.toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((n) => [n.text, n.mockNumber])).toEqual([["line one\nline two", undefined], ["during a mock", 3]]);
    const { dayNotes: _omit, ...v6 } = snapshot;
    await importAll(db, { ...v6, schemaVersion: 6 });
    expect(await db.dayNotes.count()).toBe(0); // comes in empty
    await expect(importAll(db, { ...v6, schemaVersion: 7 })).rejects.toThrow(/dayNotes/);
  });
});
