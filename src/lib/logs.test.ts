import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCustomItem, deleteLog, logAttempt, saveDayLog, saveMockRetake, saveMockSession, setRestDay, tickItem, type LogRemoval } from "./actions";
import { DsaDB } from "./db";
import { buildLogs, describeRemoval, groupByDate, type LogData, type LogEntry, type LogNames } from "./logs";
import { buildSchedule } from "./schedule";
import { curriculum } from "./curriculum";
import type { MockSession } from "../types/content";

const empty: LogData = { attempts: [], completions: [], mocks: [], retakes: [], dayNotes: [], dayLogs: [], topicChecks: [], conceptChecks: [], restDays: [], missedReasons: [], customItems: [], journal: [], extensions: [] };
const names: LogNames = {
  problem: (id) => (id === "p1" ? "Plus One" : id),
  topic: (id) => (id === "t1" ? "Sliding window" : undefined),
  concept: (id) => (id === "w01-c1" ? "How cost grows" : undefined),
  custom: (id) => (id === "c-1" ? { id: "c-1", week: 1, kind: "task", title: "Read paper", createdOn: "2026-10-26" } : undefined),
  planDay: (id) => `plan ${id}`,
};

describe("buildLogs", () => {
  it("turns each kind of record into a dated entry with a removal", () => {
    const logs = buildLogs(
      {
        ...empty,
        attempts: [
          { id: 1, problemId: "p1", date: "2026-10-26", outcome: "alone", minutes: 20, isRedo: false, at: "2026-10-26T14:00:00.000Z" },
          { id: 2, problemId: "p1", date: "2026-10-26", outcome: "failed", minutes: 5, isRedo: true },
          { id: 3, problemId: "p1", date: "2026-10-26", outcome: "hint", minutes: 9, isRedo: false, source: "mock" },
        ],
        completions: [
          { itemId: "w01-d1:learn", planDayId: "w01-d1", completedOn: "2026-10-26" },
          { itemId: "p1", planDayId: "w01-d1", completedOn: "2026-10-26", attemptId: 1 }, // produced by attempt 1: not listed twice
          { itemId: "c-1", planDayId: "w01-d1", completedOn: "2026-10-26" },
        ],
        topicChecks: [{ topicId: "t1", checkedOn: "2026-10-26" }, { topicId: "gone", checkedOn: "2026-10-26" }],
        conceptChecks: [{ conceptId: "w01-c1", checkedOn: "2026-10-26" }],
        restDays: [{ date: "2026-10-27" }],
        extensions: [{ id: 1, week: 2, extraDays: 1, createdOn: "2026-10-26", reason: "slow" }],
      },
      names,
    );
    const titles = logs.map((l) => l.title);
    expect(titles).toContain("Solved alone: Plus One");
    expect(titles).toContain("Attempted: Plus One");
    expect(titles).toContain("Mock problem · Solved with a hint: Plus One");
    expect(titles).toContain("Learned a topic");
    expect(titles).toContain("Done: Read paper");
    expect(titles).toContain("Read: Sliding window");
    expect(titles).toContain("Read: gone"); // an unknown id still shows
    expect(titles).toContain("Read concept: How cost grows");
    expect(titles).toContain("Rest day");
    expect(titles).toContain("Added 1 day to Week 2");
    expect(titles.filter((t) => t.startsWith("Ticked"))).toHaveLength(0);
    expect(logs.find((l) => l.key === "attempt:3")!.kind).toBe("mock");
    expect(logs.find((l) => l.key === "attempt:2")!.detail).toBe("5 min · redo");
    expect(new Set(logs.map((l) => l.key)).size).toBe(logs.length);
    expect(logs.find((l) => l.key === "extension:1")).toMatchObject({ note: "Manage extensions in Settings" });
    expect(logs.find((l) => l.key === "extension:1")!.removal).toBeUndefined();
    expect(logs.filter((l) => l.key !== "extension:1").every((l) => !!l.removal)).toBe(true);
  });

  it("carries the recorded moment, and leaves it off rows saved before the Logs page", () => {
    const logs = buildLogs({ ...empty, attempts: [{ id: 1, problemId: "p1", date: "2026-10-26", outcome: "alone", minutes: 1, isRedo: false, at: "2026-10-26T14:00:00.000Z" }, { id: 2, problemId: "p1", date: "2026-10-26", outcome: "alone", minutes: 1, isRedo: false }] }, names);
    expect(logs.find((l) => l.key === "attempt:1")!.at).toBe("2026-10-26T14:00:00.000Z");
    expect("at" in logs.find((l) => l.key === "attempt:2")!).toBe(false);
  });

  it("lists notes with their timestamp, mocks and retakes", () => {
    const logs = buildLogs(
      {
        ...empty,
        dayNotes: [{ id: 5, date: "2026-10-26", text: "  a\n\nb  ", createdAt: "2026-10-26T09:00:00.000Z", updatedAt: "2026-10-26T09:05:00.000Z", mockNumber: 2 }],
        dayLogs: [{ planDayId: "w01-d1", notes: "arrays", minutes: 30, links: ["https://x.test"], updatedOn: "2026-10-26" }],
        mocks: [{ id: 7, mockNumber: 1, date: "2026-10-27", diagnostic: true, mcq: { total: 18, correct: 13, byType: {} }, questionIds: [], programs: [], extra: { kind: "debug", done: false }, rating: 3 } as MockSession],
        retakes: [{ id: 8, mockNumber: 1, retakeNumber: 1, date: "2026-10-28", mcq: { total: 18, correct: 15, byType: {} }, answers: [], missedOnly: true }],
      },
      names,
    );
    expect(logs.find((l) => l.key === "note:5")).toMatchObject({ title: "Note during Mock 2", detail: "a b", at: "2026-10-26T09:00:00.000Z" });
    expect(logs.find((l) => l.key === "daylog:w01-d1")).toMatchObject({ title: "Study notes · plan w01-d1", detail: "arrays · 30 min · 1 link" });
    expect(logs.find((l) => l.key === "mock:7")).toMatchObject({ title: "Mock 1 finished", detail: "MCQ 13/18 · baseline · rated 3/5" });
    expect(logs.find((l) => l.key === "retake:8")).toMatchObject({ title: "Mock 1 retake 1", detail: "MCQ 15/18 · missed questions only" });
  });
});

describe("groupByDate", () => {
  const e = (key: string, date: string, at?: string): LogEntry => ({ key, kind: "plan", date, ...(at ? { at } : {}), title: key });
  it("newest day first; inside a day newest time first, entries without a time last", () => {
    const g = groupByDate([e("a", "2026-10-26", "2026-10-26T08:00:00Z"), e("b", "2026-10-27"), e("c", "2026-10-26", "2026-10-26T20:00:00Z"), e("d", "2026-10-26"), e("e", "2026-10-26")]);
    expect(g.map((x) => x.date)).toEqual(["2026-10-27", "2026-10-26"]);
    expect(g[1]!.entries.map((x) => x.key)).toEqual(["c", "a", "d", "e"]);
  });
});

describe("describeRemoval", () => {
  it("explains every kind of deletion", () => {
    const all: LogRemoval[] = [
      { type: "attempt", id: 1 }, { type: "completion", itemId: "x" }, { type: "mock", id: 1, mockNumber: 4 }, { type: "retake", id: 1 }, { type: "dayNote", id: 1 }, { type: "dayLog", planDayId: "w01-d1" },
      { type: "topicCheck", id: "t" }, { type: "conceptCheck", id: "c" }, { type: "restDay", date: "2026-10-26" }, { type: "missedReason", planDayId: "w01-d1" }, { type: "customItem", id: "c-1" }, { type: "journal", id: "p" },
    ];
    for (const r of all) expect(describeRemoval(r).length).toBeGreaterThan(10);
    expect(describeRemoval({ type: "mock", id: 1, mockNumber: 4 })).toContain("Mock 4");
  });
});

describe("recording the moment, and deleting a log", () => {
  let db: DsaDB;
  let n = 0;
  beforeEach(() => {
    db = new DsaDB(`logs-${n++}`);
  });
  afterEach(() => db.delete());
  const P = "w01-d1-p1";
  const isMoment = (s: string | undefined) => !!s && !Number.isNaN(Date.parse(s));

  it("new records carry an ISO moment", async () => {
    const id = await logAttempt(db, { problemId: P, date: "2026-10-26", outcome: "alone", minutes: 5, isRedo: false, completes: [{ itemId: P, planDayId: "w01-d1" }] });
    expect(isMoment((await db.attempts.get(id))!.at)).toBe(true);
    await tickItem(db, { itemId: "w01-d1:learn", planDayId: "w01-d1" }, "2026-10-26");
    expect(isMoment((await db.completions.get("w01-d1:learn"))!.at)).toBe(true);
    await saveDayLog(db, { planDayId: "w01-d1", notes: "x", minutes: 0, links: [] }, "2026-10-26");
    expect(isMoment((await db.dayLogs.get("w01-d1"))!.updatedAt)).toBe(true);
    const schedule = buildSchedule(curriculum, "2026-10-26", []);
    await setRestDay(db, schedule, new Set(), "2026-10-27", true);
    expect(isMoment((await db.restDays.get("2026-10-27"))!.at)).toBe(true);
    const cid = await addCustomItem(db, { kind: "task", week: 1, title: "t" }, "2026-10-26");
    expect(isMoment((await db.customItems.get(cid))!.createdAt)).toBe(true);
  });

  it("deleting an attempt also removes its tick and the redo reminders it made", async () => {
    const id = await logAttempt(db, { problemId: P, date: "2026-10-26", outcome: "solution", minutes: 5, isRedo: false, completes: [{ itemId: P, planDayId: "w01-d1" }] });
    expect(await db.redos.count()).toBe(2);
    await deleteLog(db, { type: "attempt", id });
    expect(await db.attempts.count()).toBe(0);
    expect(await db.completions.count()).toBe(0);
    expect(await db.redos.count()).toBe(0);
  });

  it("deleting a tick, a note, a study log, a reading tick and a rest day removes just that row", async () => {
    await tickItem(db, { itemId: "w01-d1:learn", planDayId: "w01-d1" }, "2026-10-26");
    await db.dayNotes.add({ date: "2026-10-26", text: "n", createdAt: "x", updatedAt: "x" });
    await db.dayLogs.put({ planDayId: "w01-d1", notes: "n", minutes: 0, links: [], updatedOn: "2026-10-26" });
    await db.topicChecks.put({ topicId: "t", checkedOn: "2026-10-26" });
    await db.conceptChecks.put({ conceptId: "w01-c1", checkedOn: "2026-10-26" });
    await db.restDays.put({ date: "2026-10-27" });
    const note = (await db.dayNotes.toArray())[0]!;
    for (const r of [
      { type: "completion", itemId: "w01-d1:learn" }, { type: "dayNote", id: note.id! }, { type: "dayLog", planDayId: "w01-d1" },
      { type: "topicCheck", id: "t" }, { type: "conceptCheck", id: "w01-c1" }, { type: "restDay", date: "2026-10-27" },
    ] as LogRemoval[]) await deleteLog(db, r);
    for (const t of [db.completions, db.dayNotes, db.dayLogs, db.topicChecks, db.conceptChecks, db.restDays]) expect(await t.count()).toBe(0);
  });

  it("deleting a mock result takes its retakes and answers with it, but leaves other mocks alone", async () => {
    const session = (mockNumber: number): MockSession => ({ mockNumber, date: "2026-10-27", diagnostic: false, mcq: { total: 2, correct: 1, byType: {} }, questionIds: [], programs: [], extra: { kind: "debug", done: false }, rating: 3 });
    const a = await saveMockSession(db, session(1));
    await saveMockSession(db, session(2));
    expect(isMoment((await db.mocks.get(a))!.savedAt)).toBe(true);
    await saveMockRetake(db, { mockNumber: 1, date: "2026-10-28", mcq: { total: 2, correct: 2, byType: {} }, answers: [] });
    await saveMockRetake(db, { mockNumber: 2, date: "2026-10-28", mcq: { total: 2, correct: 2, byType: {} }, answers: [] });
    await db.quizAnswers.bulkAdd([
      { questionId: "q", correct: true, answeredAt: "x", mode: "mock", mockNumber: 1 },
      { questionId: "q", correct: true, answeredAt: "x", mode: "mock", mockNumber: 2 },
    ]);
    await deleteLog(db, { type: "mock", id: a, mockNumber: 1 });
    expect((await db.mocks.toArray()).map((m) => m.mockNumber)).toEqual([2]);
    expect((await db.mockRetakes.toArray()).map((r) => r.mockNumber)).toEqual([2]);
    expect((await db.quizAnswers.toArray()).map((q) => q.mockNumber)).toEqual([2]);
    const retake = (await db.mockRetakes.toArray())[0]!;
    await deleteLog(db, { type: "retake", id: retake.id! });
    expect(await db.mockRetakes.count()).toBe(0);
    expect(await db.mocks.count()).toBe(1); // the official result is untouched
  });

  it("deleting an added task removes it and its tick; attempts stay", async () => {
    const cid = await addCustomItem(db, { kind: "problem", week: 1, title: "Mine", difficulty: "Easy" }, "2026-10-26");
    await logAttempt(db, { problemId: cid, date: "2026-10-26", outcome: "alone", minutes: 5, isRedo: false, completes: [] });
    await deleteLog(db, { type: "customItem", id: cid });
    expect(await db.customItems.count()).toBe(0);
    expect(await db.attempts.count()).toBe(1);
  });
});
