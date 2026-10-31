import "fake-indexeddb/auto";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { startMockRun } from "../lib/actions";
import { curriculum } from "../lib/curriculum";
import { DsaDB } from "../lib/db";
import { buildMockRun } from "../lib/mock";
import { debugSnippets, practicalTasks } from "../lib/mockContent";
import { bank } from "../lib/questions";
import { mulberry32 } from "../lib/quiz";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

const mount = (db: DsaDB, today: string, path: string) =>
  render(
    <PlanProvider db={db} today={today}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );

const newDb = () => {
  const db = new DsaDB(`resume-${n++}`);
  dbs.push(db);
  return db;
};

async function seedRun(db: DsaDB, number: number, patch: Record<string, unknown> = {}) {
  const base = buildMockRun(number, { curriculum, questions: bank.questions, debugSnippets, cards: [], answers: [], attempts: [], sessions: [], practicalIds: new Set(practicalTasks.keys()), today: "2026-10-20", rng: mulberry32(11) })!;
  const run = { ...base, ...patch };
  await startMockRun(db, run);
  return run;
}

/** Unmounting and mounting again is what closing the tab and coming back does to the page. */
async function reopen(view: { unmount: () => void }, db: DsaDB, today: string, path: string) {
  view.unmount();
  return mount(db, today, path);
}

const LATER = "2026-11-12"; // days after the run was started (2026-10-20)

describe("Today's Mocks prompt", () => {
  it("suggests the next untaken mock with its week, linking to it", async () => {
    const db = newDb();
    mount(db, "2026-10-26", "/");
    const section = within(await screen.findByRole("region", { name: "Mocks" }));
    expect(section.getByText("Mock 1 is suggested after Week 1.")).toBeInTheDocument();
    expect(section.getByRole("link", { name: "Mock 1" })).toHaveAttribute("href", "/mock/1");
  });

  it("moves on to the next mock once one is saved, and shows no Mock row in the checklist", async () => {
    const db = newDb();
    await db.mocks.add({ mockNumber: 1, date: "2026-10-26", diagnostic: true, mcq: { total: 18, correct: 12, byType: {} }, questionIds: [], programs: [], extra: { kind: "debug", done: true }, rating: 4 });
    mount(db, "2026-10-26", "/");
    const section = within(await screen.findByRole("region", { name: "Mocks" }));
    expect(section.getByText("Mock 2 is suggested after Week 1.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Today's checklist" })).queryByText(/Mock/)).not.toBeInTheDocument();
  });

  it("shows a Resume link for every open mock, and suggests a different one next", async () => {
    const db = newDb();
    await seedRun(db, 3);
    await seedRun(db, 1);
    mount(db, LATER, "/");
    const section = within(await screen.findByRole("region", { name: "Mocks" }));
    expect(await section.findByText("Mock 1 is in progress.")).toBeInTheDocument();
    expect(section.getByRole("link", { name: "Resume mock 1" })).toHaveAttribute("href", "/mock/1");
    expect(section.getByRole("link", { name: "Resume mock 3" })).toHaveAttribute("href", "/mock/3");
    expect(section.getByText("Mock 2 is suggested after Week 1.")).toBeInTheDocument();
  });

  it("also appears when every mock is done", async () => {
    const db = newDb();
    await db.mocks.bulkAdd(curriculum.mocks.map((m) => ({ mockNumber: m.number, date: "2026-10-26", diagnostic: m.diagnostic, mcq: { total: 18, correct: 12, byType: {} }, questionIds: [], programs: [], extra: { kind: "debug" as const, done: true }, rating: 3 as const })));
    mount(db, "2026-10-26", "/");
    expect(await screen.findByText("All 26 mocks are done.")).toBeInTheDocument();
  });
});

describe("resuming mid-MCQ", () => {
  it("days later, returns to the next unanswered question with the same questions and the saved timer", async () => {
    const db = newDb();
    const run = await seedRun(db, 1, { answers: [true, false, true], picks: [0, 1, 2], timer: { phase: "A", elapsedSec: 300, runningSince: null, addedMinutes: 10 } });
    mount(db, LATER, "/mock/1");
    expect(await screen.findByText(/Question 4 of 18/)).toBeInTheDocument();
    expect(screen.getByLabelText("Timer")).toHaveTextContent("5:00 of 30:00");
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect((await db.mockRuns.get(1))!.questionIds).toEqual(run.questionIds);
  });
});

describe("resuming Program 1 (Part B)", () => {
  const typeIn = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.selectOptions(await screen.findByLabelText("Outcome"), "hint");
    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "41");
    await user.type(screen.getByLabelText(/Approach/), "two pointers, then shrink");
    await user.type(screen.getByLabelText(/Code/), "def f(x):\n  return x");
  };
  const expectRestored = () => {
    expect(screen.getByLabelText("Outcome")).toHaveValue("hint");
    expect(screen.getByLabelText("Minutes")).toHaveValue(41);
    expect(screen.getByLabelText(/Approach/)).toHaveValue("two pointers, then shrink");
    expect(screen.getByLabelText(/Code/)).toHaveValue("def f(x):\n  return x");
  };

  it("keeps outcome, minutes, approach and code after blur, a reload and days later; the timer too", async () => {
    const db = newDb();
    const user = userEvent.setup();
    await seedRun(db, 1, { phase: "B", timer: { phase: "B", elapsedSec: 90, runningSince: null, addedMinutes: 0 } });
    const view = mount(db, "2026-10-20", "/mock/1");
    await typeIn(user);
    await user.tab(); // blur flushes at once
    await waitFor(async () => expect((await db.mockRuns.get(1))!.drafts?.b).toMatchObject({ outcome: "hint", minutes: "41", approach: "two pointers, then shrink" }));
    await reopen(view, db, LATER, "/mock/1");
    await screen.findByLabelText("Outcome");
    expectRestored();
    expect(screen.getByLabelText("Timer")).toHaveTextContent("1:30 of 25:00");
  });

  it("flushes when the page is hidden or closed, without any blur", async () => {
    const db = newDb();
    const user = userEvent.setup();
    await seedRun(db, 1, { phase: "B" });
    mount(db, "2026-10-20", "/mock/1");
    await user.type(await screen.findByLabelText(/Approach/), "typed just before closing");
    act(() => void window.dispatchEvent(new Event("pagehide")));
    await waitFor(async () => expect((await db.mockRuns.get(1))!.drafts?.b?.approach).toBe("typed just before closing"));
    await user.type(screen.getByLabelText(/Approach/), " and more");
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    await waitFor(async () => expect((await db.mockRuns.get(1))!.drafts?.b?.approach).toBe("typed just before closing and more"));
  });

  it("flushes on leaving the part (unmount) even if the debounce has not fired", async () => {
    const db = newDb();
    const user = userEvent.setup();
    await seedRun(db, 1, { phase: "B" });
    const view = mount(db, "2026-10-20", "/mock/1");
    await user.type(await screen.findByLabelText(/Approach/), "last words");
    view.unmount();
    await waitFor(async () => expect((await db.mockRuns.get(1))!.drafts?.b?.approach).toBe("last words"));
  });
});

describe("resuming Program 2 (Part C)", () => {
  it("keeps the finished levels, and the form after 'Stop here' with its outcome, minutes, levels and notes", async () => {
    const db = newDb();
    const user = userEvent.setup();
    await seedRun(db, 6, { phase: "C", program2: { taskId: "pt-01", levelsDone: 1 }, programs: [{ part: 1, problemId: "w01-pool-01", outcome: "alone", minutes: 20 }] });
    const view = mount(db, "2026-10-20", "/mock/6");
    const level2 = await screen.findByRole("region", { name: "Level 2" });
    await user.click(within(level2).getByRole("button", { name: "Stop here and log it" }));
    const form = await screen.findByRole("form", { name: "Log Program 2" });
    await user.selectOptions(within(form).getByLabelText("Outcome"), "solution");
    await user.clear(within(form).getByLabelText("Minutes"));
    await user.type(within(form).getByLabelText("Minutes"), "37");
    await user.type(within(form).getByLabelText(/How far/), "got level 1 only");
    await user.tab();
    await waitFor(async () => expect((await db.mockRuns.get(6))!.drafts).toMatchObject({ cStopped: true, c: { outcome: "solution", minutes: "37", notes: "got level 1 only" } }));

    await reopen(view, db, LATER, "/mock/6");
    const again = await screen.findByRole("form", { name: "Log Program 2" });
    expect(within(again).getByLabelText("Outcome")).toHaveValue("solution");
    expect(within(again).getByLabelText("Minutes")).toHaveValue(37);
    expect(within(again).getByLabelText("Levels completed")).toHaveValue("1");
    expect(within(again).getByLabelText(/How far/)).toHaveValue("got level 1 only");
    expect(screen.getByRole("list", { name: "Finished levels" })).toHaveTextContent("Level 1");
  });

  it("with no unlocked task, keeps the Interview Preparation Kit form", async () => {
    const db = newDb();
    const user = userEvent.setup();
    await seedRun(db, 2, { phase: "C" });
    const view = mount(db, "2026-10-20", "/mock/2");
    await user.type(await screen.findByLabelText(/How far/), "solved it in an hour");
    view.unmount();
    mount(db, LATER, "/mock/2");
    expect(await screen.findByLabelText(/How far/)).toHaveValue("solved it in an hour");
  });
});

describe("resuming the extra (Part D) and the end screen", () => {
  it("keeps the debug guess and whether the answer was revealed", async () => {
    const db = newDb();
    const user = userEvent.setup();
    const run = await seedRun(db, 1, { phase: "D" });
    expect(run.extra.kind).toBe("debug");
    const view = mount(db, "2026-10-20", "/mock/1");
    await user.type(await screen.findByLabelText("Buggy line"), "3");
    await user.click(screen.getByRole("button", { name: "Show the answer" }));
    await waitFor(async () => expect((await db.mockRuns.get(1))!.drafts?.d).toEqual({ guess: "3", revealed: true }));
    await reopen(view, db, LATER, "/mock/1");
    expect(await screen.findByRole("status")).toHaveTextContent(/The bug is on line|You found the line/);
    expect(screen.queryByRole("button", { name: "Show the answer" })).not.toBeInTheDocument();
  });

  it("keeps a typed guess that was not revealed yet", async () => {
    const db = newDb();
    const user = userEvent.setup();
    await seedRun(db, 1, { phase: "D" });
    const view = mount(db, "2026-10-20", "/mock/1");
    await user.type(await screen.findByLabelText("Buggy line"), "2");
    await user.tab();
    await reopen(view, db, LATER, "/mock/1");
    expect(await screen.findByLabelText("Buggy line")).toHaveValue(2);
  });

  it("keeps the rating and notes on the end screen", async () => {
    const db = newDb();
    const user = userEvent.setup();
    const base = buildMockRun(1, { curriculum, questions: bank.questions, debugSnippets, cards: [], answers: [], attempts: [], sessions: [], today: "2026-10-20", rng: mulberry32(11) })!;
    await seedRun(db, 1, { phase: "end", answers: base.questionIds.map(() => true), picks: base.questionIds.map(() => 0), extraDone: true });
    const view = mount(db, "2026-10-20", "/mock/1");
    await user.click(await screen.findByLabelText("4"));
    await user.type(screen.getByLabelText(/Notes/), "felt fine");
    await user.tab();
    await reopen(view, db, LATER, "/mock/1");
    expect(await screen.findByLabelText("4")).toBeChecked();
    expect(screen.getByLabelText(/Notes/)).toHaveValue("felt fine");
    expect(screen.getByRole("button", { name: /Save mock/ })).toBeEnabled();
  });
});
