import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addDayNote, deleteBlankNotes, deleteDayNote, updateDayNote } from "./actions";
import { DsaDB } from "./db";

let db: DsaDB;
let n = 0;
beforeEach(() => void (db = new DsaDB(`notes-${n++}`)));
afterEach(async () => db.delete());

describe("day notes", () => {
  it("keeps several notes per day, with their times, and the mock tag only when given", async () => {
    const a = await addDayNote(db, "2026-10-30", "first", "2026-10-30T09:00:00.000Z");
    const b = await addDayNote(db, "2026-10-30", "second", "2026-10-30T10:00:00.000Z", 4);
    await addDayNote(db, "2026-10-31", "other day", "2026-10-31T09:00:00.000Z");
    const rows = await db.dayNotes.where("date").equals("2026-10-30").sortBy("createdAt");
    expect(rows.map((r) => r.id)).toEqual([a, b]);
    expect(rows[0]).toEqual({ id: a, date: "2026-10-30", text: "first", createdAt: "2026-10-30T09:00:00.000Z", updatedAt: "2026-10-30T09:00:00.000Z" });
    expect(rows[0]!.mockNumber).toBeUndefined();
    expect(rows[1]!.mockNumber).toBe(4);
  });

  it("updates only the text and updatedAt, keeping line breaks as typed", async () => {
    const id = await addDayNote(db, "2026-10-30", "", "2026-10-30T09:00:00.000Z", 2);
    await updateDayNote(db, id, "line one\n\nline three  ", "2026-10-30T09:30:00.000Z");
    expect(await db.dayNotes.get(id)).toMatchObject({ text: "line one\n\nline three  ", createdAt: "2026-10-30T09:00:00.000Z", updatedAt: "2026-10-30T09:30:00.000Z", mockNumber: 2 });
  });

  it("updating a deleted note does nothing", async () => {
    const id = await addDayNote(db, "2026-10-30", "x", "t");
    await deleteDayNote(db, id);
    await updateDayNote(db, id, "late save", "t2");
    expect(await db.dayNotes.count()).toBe(0);
  });

  it("deleteBlankNotes removes only blank notes of that day", async () => {
    await addDayNote(db, "2026-10-30", "", "t");
    await addDayNote(db, "2026-10-30", "   \n", "t");
    await addDayNote(db, "2026-10-30", "kept", "t");
    await addDayNote(db, "2026-10-31", "", "t");
    await deleteBlankNotes(db, "2026-10-30");
    expect((await db.dayNotes.toArray()).map((r) => [r.date, r.text])).toEqual([["2026-10-30", "kept"], ["2026-10-31", ""]]);
  });
});
