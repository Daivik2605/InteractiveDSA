import "fake-indexeddb/auto";
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
    expect(snapshot.schemaVersion).toBe(2);

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
});
