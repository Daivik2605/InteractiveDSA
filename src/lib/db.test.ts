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
    expect(snapshot.schemaVersion).toBe(1);

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
