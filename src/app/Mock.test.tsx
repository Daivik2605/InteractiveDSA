import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { saveMockSession, startMockRun } from "../lib/actions";
import { curriculum } from "../lib/curriculum";
import { DsaDB } from "../lib/db";
import { buildMockRun, mcqOfAnswers, sectionOfIndex } from "../lib/mock";
import { debugSnippets, practicalTasks } from "../lib/mockContent";
import { bank } from "../lib/questions";
import { mulberry32 } from "../lib/quiz";
import type { MockAnswer, MockSession } from "../types/content";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

function mount(db: DsaDB, today: string, path = "/") {
  return render(
    <PlanProvider db={db} today={today}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
}

async function setup(today: string, path = "/") {
  const db = new DsaDB(`mock-${n++}`);
  dbs.push(db);
  const view = mount(db, today, path);
  await screen.findByRole("navigation", { name: "Main" });
  return { db, user: userEvent.setup(), view };
}

describe("Mock 1 end to end", () => {
  it("runs the MCQs, Program 1 and the extra, saves the session, ticks the Mock row and reloads as saved", async () => {
    const { db, user, view } = await setup("2026-10-26");

    // Today's Mock row offers a start link
    const row = within(screen.getByRole("region", { name: "Today's checklist" }));
    expect(row.getByText(/Diagnostic: your score is the baseline/)).toBeInTheDocument();
    await user.click(row.getByRole("link", { name: "Start mock" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Mock 1/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start mock" }));

    // Part A: 18 questions, first option each time, Enter to continue
    const run = await waitFor(async () => {
      const r = await db.mockRuns.get(1);
      expect(r).toBeTruthy();
      return r!;
    });
    expect(run.questionIds).toHaveLength(18);
    expect(new Set(run.questionIds).size).toBe(18);
    expect(run.questionIds.slice(0, 7).every((id) => id.startsWith("t01-"))).toBe(true);
    expect(run.program2).toBeNull();
    expect(run.extra.kind).toBe("debug");
    for (let i = 0; i < 18; i++) {
      await screen.findByRole("region", { name: "Question" });
      await user.keyboard("1");
      await user.keyboard("{Enter}");
    }
    await waitFor(async () => expect((await db.mockRuns.get(1))?.phase).toBe("B"));
    expect(await db.quizAnswers.count()).toBe(18);
    expect((await db.quizAnswers.toArray()).every((a) => a.mode === "mock" && a.mockNumber === 1)).toBe(true);

    // Part B: log Program 1 as needing a hint
    const p1 = run.program1.problemId!;
    expect(p1).toBeTruthy();
    await user.selectOptions(await screen.findByLabelText("Outcome"), "hint");
    await user.click(screen.getByRole("button", { name: "Save and continue" }));
    await waitFor(async () => expect((await db.mockRuns.get(1))?.phase).toBe("D"));
    const attempts = await db.attempts.toArray();
    expect(attempts).toMatchObject([{ problemId: p1, outcome: "hint", source: "mock" }]);
    expect(await db.completions.count()).toBe(0); // a mock attempt never ticks a plan item
    expect(await db.redos.count()).toBeGreaterThan(0); // but redo scheduling applies

    // Part D: debug extra
    expect(await screen.findByRole("region", { name: "Buggy code" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done" }));

    // End screen: rating, then save
    const results = await screen.findByRole("region", { name: "Mock results" });
    expect(within(results).getByLabelText("Score")).toHaveTextContent("MCQs:");
    const save = screen.getByRole("button", { name: /Save mock/ });
    expect(save).toBeDisabled();
    await user.click(screen.getByLabelText("4"));
    await user.click(save);

    await screen.findByRole("region", { name: "Saved mock" });
    const sessions = await db.mocks.toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ mockNumber: 1, diagnostic: true, rating: 4, date: "2026-10-26", extra: { kind: "debug", done: true } });
    expect(sessions[0]!.mcq.total).toBe(18);
    expect(await db.mockRuns.count()).toBe(0);
    expect(await db.completions.get("w01-d1:learn")).toMatchObject({ planDayId: "w01-d1", completedOn: "2026-10-26" });
    expect((await db.completions.get("w01-d1:learn"))!.attemptId).toBeUndefined();

    // a fresh mount (a reload) shows the saved mock and a ticked row
    view.unmount();
    mount(db, "2026-10-26", "/mock/1");
    expect(await screen.findByRole("region", { name: "Saved mock" })).toBeInTheDocument();
    view.unmount();
  }, 60_000);

  it("shows an unknown mock number as not found", async () => {
    await setup("2026-10-26", "/mock/99");
    expect(await screen.findByText(/There is no such mock/)).toBeInTheDocument();
  });
});

describe("saved mock: result, answer key and retakes", () => {
  const WRONG = 5;

  /** Mock 1 as if it had been taken: the first WRONG questions answered wrongly. */
  async function seedSaved(db: DsaDB) {
    const run = buildMockRun(1, { curriculum, questions: bank.questions, debugSnippets, cards: [], answers: [], attempts: [], sessions: [], today: "2026-10-26", rng: mulberry32(3) })!;
    const answers: MockAnswer[] = run.questionIds.map((id, i) => {
      const q = bank.byId.get(id)!;
      const wrong = i < WRONG;
      return { questionId: id, picked: wrong ? (q.answer + 1) % 4 : q.answer, correct: !wrong, section: sectionOfIndex(i, run.groups) };
    });
    const session: MockSession = {
      mockNumber: 1,
      date: "2026-10-26",
      diagnostic: true,
      mcq: mcqOfAnswers(answers, (id) => bank.byId.get(id)?.type),
      questionIds: run.questionIds,
      answers,
      groups: run.groups,
      programs: [{ part: 1, problemId: run.program1.problemId!, outcome: "alone", minutes: 20 }],
      extra: { kind: "debug", done: true },
      rating: 4,
    };
    await saveMockSession(db, session, { itemId: "w01-d1:learn", planDayId: "w01-d1" });
    await db.cards.put({ questionId: run.questionIds[0]!, box: 1, dueOn: "2026-10-27" });
    return session;
  }

  it("shows the score, the breakdown tables and every question in the answer key", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    await seedSaved(db);
    mount(db, "2026-10-26", "/mock/1");
    expect(await screen.findByLabelText("Score")).toHaveTextContent("MCQs: 13 / 18 (72%)");
    expect(screen.getByRole("table", { name: "By question type" })).toBeInTheDocument();
    const section = within(screen.getByRole("table", { name: "By section" }));
    expect(section.getByText("Python language")).toBeInTheDocument();
    const key = within(screen.getByRole("region", { name: "Answer key" }));
    expect(key.getAllByRole("listitem", { name: /^Question \d+$/ })).toHaveLength(18);
    expect(key.getAllByText("✓ Correct answer")).toHaveLength(18); // one per question
    expect(key.getAllByText("Your answer")).toHaveLength(18);
    expect(key.getAllByText("✗ Wrong")).toHaveLength(WRONG);
  });

  it("filters the answer key to wrong or right only", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    await seedSaved(db);
    const user = userEvent.setup();
    mount(db, "2026-10-26", "/mock/1");
    await screen.findByRole("region", { name: "Answer key" });
    const key = () => within(screen.getByRole("region", { name: "Answer key" }));
    await user.click(key().getByRole("button", { name: "Wrong only" }));
    expect(key().getAllByRole("listitem", { name: /^Question \d+$/ })).toHaveLength(WRONG);
    await user.click(key().getByRole("button", { name: "Right only" }));
    expect(key().getAllByRole("listitem", { name: /^Question \d+$/ })).toHaveLength(18 - WRONG);
    await user.click(key().getByRole("button", { name: "All" }));
    expect(key().getAllByRole("listitem", { name: /^Question \d+$/ })).toHaveLength(18);
  });

  it("a retake saves its own attempt and leaves the session, the tick and Leitner state alone", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    const session = await seedSaved(db);
    const before = { mocks: await db.mocks.toArray(), completions: await db.completions.toArray(), cards: await db.cards.toArray(), answers: await db.quizAnswers.toArray(), redos: await db.redos.toArray() };
    const user = userEvent.setup();
    mount(db, "2026-10-27", "/mock/1");
    await user.click(await screen.findByRole("button", { name: "Retake MCQs" }));
    for (let i = 0; i < 18; i++) {
      await screen.findByRole("region", { name: "Question" });
      await user.keyboard("1");
      await user.keyboard("{Enter}");
    }

    // its own result: the comparison line, two attempts listed, the key for the retake
    expect(await screen.findByRole("note")).toHaveTextContent("First attempt 13/18, this retake");
    const attempts = within(screen.getByRole("list", { name: "Attempts" }));
    expect(attempts.getAllByRole("button")).toHaveLength(2);
    expect(attempts.getByRole("button", { name: /First attempt · 13\/18 · 2026-10-26/ })).toBeInTheDocument();
    expect(attempts.getByRole("button", { name: /Retake 1/ })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Answer key" })).getAllByRole("listitem", { name: /^Question \d+$/ })).toHaveLength(18);

    const retakes = await db.mockRetakes.toArray();
    expect(retakes).toHaveLength(1);
    expect(retakes[0]!.answers).toHaveLength(18);
    expect(new Set(retakes[0]!.answers.map((a) => a.questionId))).toEqual(new Set(session.questionIds));
    expect({ mocks: await db.mocks.toArray(), completions: await db.completions.toArray(), cards: await db.cards.toArray(), answers: await db.quizAnswers.toArray(), redos: await db.redos.toArray() }).toEqual(before);

    // clicking the first attempt shows its official score and key again
    await user.click(attempts.getByRole("button", { name: /First attempt/ }));
    expect(screen.getByLabelText("Score")).toHaveTextContent("MCQs: 13 / 18");
    expect(within(screen.getByRole("region", { name: "Answer key" })).getAllByText("✗ Wrong")).toHaveLength(WRONG);
  }, 60_000);
});

const runInputs = (today: string) => ({ curriculum, questions: bank.questions, debugSnippets, cards: [], answers: [], attempts: [], sessions: [], practicalIds: new Set(practicalTasks.keys()), today, rng: mulberry32(11) });

async function seedRun(db: DsaDB, n: number, today: string, patch: Partial<NonNullable<ReturnType<typeof buildMockRun>>> = {}) {
  const run = { ...buildMockRun(n, runInputs(today))!, ...patch };
  await startMockRun(db, run);
  return run;
}

describe("Mocks page", () => {
  it("is in the nav under Problems and lists all 45 mocks grouped by week", async () => {
    const { user } = await setup("2026-10-26");
    const nav = within(screen.getByRole("navigation", { name: "Main" }));
    const labels = nav.getAllByRole("link").map((a) => a.textContent);
    expect(labels.indexOf("Mocks")).toBe(labels.indexOf("Problems") + 1);
    await user.click(nav.getByRole("link", { name: "Mocks" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mocks" })).toBeInTheDocument();
    expect(await screen.findAllByRole("listitem", { name: /^Mock \d+$/ })).toHaveLength(45);
    expect(screen.getByRole("region", { name: "Week 13" })).toBeInTheDocument();
    const m1 = within(screen.getByRole("listitem", { name: "Mock 1" }));
    expect(m1.getByText("Diagnostic")).toBeInTheDocument();
    expect(m1.getByText("Today")).toBeInTheDocument();
    expect(m1.getByLabelText("Status")).toHaveTextContent("Not taken");
    expect(m1.getByRole("link", { name: "Start" })).toHaveAttribute("href", "/mock/1");
    const m2 = within(screen.getByRole("listitem", { name: "Mock 2" }));
    expect(m2.getByText(/\+ Program 2/)).toBeInTheDocument();
    expect(m2.getByText("Upcoming")).toBeInTheDocument();
    expect(m2.getByRole("link", { name: "Do it earlier" })).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "Mock 45" })).getByText("Final")).toBeInTheDocument();
  });

  it("shows dates from the schedule, shifted by an extension", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    await db.extensions.add({ week: 1, extraDays: 2, createdOn: "2026-10-26" });
    mount(db, "2026-10-26", "/mocks");
    const m5 = await screen.findByRole("listitem", { name: "Mock 5" });
    expect(m5).toHaveTextContent("Thu 5 Nov"); // Week 2 Day 2 moved from Tue 3 Nov to Thu 5 Nov
    expect(m5).toHaveTextContent("Week 2 · Day 9 of 90");
  });

  it("disables Start with 'Content not ready' when the theme or week questions are not written", async () => {
    await setup("2026-10-26", "/mocks");
    const m5 = within(await screen.findByRole("listitem", { name: "Mock 5" }));
    expect(m5.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(m5.getByText(/Content not ready: Python theme 5/)).toBeInTheDocument();
    expect(m5.queryByRole("link")).not.toBeInTheDocument();
  });

  it("opening a not-ready mock directly cannot start it either", async () => {
    await setup("2026-10-26", "/mock/5");
    expect(await screen.findByText(/Content not ready: Python theme 5/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start mock" })).toBeDisabled();
  });

  it("shows status and score for done, in-progress and retaken mocks", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    const run = await seedRun(db, 3, "2026-10-26");
    await db.mocks.add({ mockNumber: 1, date: "2026-10-26", diagnostic: true, mcq: { total: 18, correct: 13, byType: {} }, questionIds: [], programs: [], extra: { kind: "debug", done: true }, rating: 4 });
    await db.mockRetakes.add({ mockNumber: 1, retakeNumber: 1, date: "2026-10-27", mcq: { total: 18, correct: 16, byType: {} }, answers: [] });
    expect(run.mockNumber).toBe(3);
    mount(db, "2026-10-28", "/mocks");
    const m1 = within(await screen.findByRole("listitem", { name: "Mock 1" }));
    expect(m1.getByLabelText("Status")).toHaveTextContent("Done 13/18 · 1 retake");
    expect(m1.getByRole("link", { name: "View result" })).toHaveAttribute("href", "/mock/1");
    expect(m1.queryByText("Overdue")).not.toBeInTheDocument(); // taken, so no date tag
    const m3 = within(screen.getByRole("listitem", { name: "Mock 3" }));
    expect(m3.getByLabelText("Status")).toHaveTextContent("In progress");
    expect(m3.getByRole("link", { name: "Resume" })).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "Mock 2" })).getByText("Today")).toBeInTheDocument();
  });
});

describe("doing a mock early", () => {
  it("builds from the mock's own week, ticks that plan day's Mock row, and the row shows done when the day arrives", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    const user = userEvent.setup();
    const view = mount(db, "2026-10-26", "/mocks");
    await user.click(await within(await screen.findByRole("listitem", { name: "Mock 3" })).findByRole("link", { name: "Do it earlier" }));
    await user.click(await screen.findByRole("button", { name: "Start mock" }));
    const run = await waitFor(async () => (await db.mockRuns.get(3))!);
    expect(run.questionIds.slice(0, 7).every((id) => id.startsWith("t03-"))).toBe(true);
    for (let i = 0; i < 18; i++) {
      await screen.findByRole("region", { name: "Question" });
      await user.keyboard("1");
      await user.keyboard("{Enter}");
    }
    await user.click(await screen.findByRole("button", { name: "Save and continue" }));
    await user.click(await screen.findByRole("button", { name: "Done" }));
    await user.click(await screen.findByLabelText("3"));
    await user.click(screen.getByRole("button", { name: /Save mock/ }));
    await screen.findByRole("region", { name: "Saved mock" });

    // Mock 3 is Week 1 Day 5: that day's row is ticked, no other
    expect(await db.completions.toArray()).toMatchObject([{ itemId: "w01-d5:learn", planDayId: "w01-d5", completedOn: "2026-10-26" }]);
    expect((await db.mocks.toArray())[0]).toMatchObject({ mockNumber: 3, diagnostic: false });
    view.unmount();
    mount(db, "2026-10-30"); // Day 5 arrives
    const row = within(await screen.findByRole("region", { name: "Today's checklist" }));
    expect(row.getByRole("checkbox", { name: "Mock 3" })).toBeChecked();
    expect(await row.findByRole("link", { name: "View result" })).toBeInTheDocument();
  }, 60_000);

  it("a later mock started early does not block an earlier one", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    await seedRun(db, 3, "2026-10-26"); // Mock 3 in progress
    mount(db, "2026-10-26", "/mock/1");
    expect(await screen.findByRole("button", { name: "Start mock" })).toBeEnabled();
  });
});

describe("Program 2", () => {
  it("shows one level at a time, and saves how many levels were finished without making an attempt", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    const user = userEvent.setup();
    await seedRun(db, 6, "2026-11-04", { phase: "C", program2: { taskId: "pt-01" }, programs: [{ part: 1, problemId: "w01-pool-01", outcome: "alone", minutes: 20 }] });
    mount(db, "2026-11-04", "/mock/6");
    const level1 = await screen.findByRole("region", { name: "Level 1" });
    expect(within(level1).getByText(/Level 1 of 3: Count words in a text/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Level 2" })).not.toBeInTheDocument();
    expect(within(level1).getByRole("region", { name: "Expected output" })).toHaveTextContent("'the': 4");

    await user.click(within(level1).getByRole("button", { name: /Level 1 done/ }));
    const level2 = await screen.findByRole("region", { name: "Level 2" });
    expect(within(level2).getByText(/Top k words ignoring stopwords/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Finished levels" })).toHaveTextContent("Level 1");
    expect((await db.mockRuns.get(6))!.program2).toEqual({ taskId: "pt-01", levelsDone: 1 }); // saved as you go

    await user.click(within(level2).getByRole("button", { name: "Stop here and log it" }));
    const form = await screen.findByRole("form", { name: "Log Program 2" });
    expect(within(form).getByLabelText("Levels completed")).toHaveValue("1");
    await user.selectOptions(within(form).getByLabelText("Outcome"), "hint");
    await user.click(within(form).getByRole("button", { name: "Save and continue" }));
    await waitFor(async () => expect((await db.mockRuns.get(6))?.phase).toBe("D"));
    const programs = (await db.mockRuns.get(6))!.programs;
    expect(programs[1]).toMatchObject({ part: 2, problemId: "pt-01", outcome: "hint", levelsDone: 1 });
    expect(await db.attempts.count()).toBe(0); // a practical task is not a problem: no attempt, no redo
    expect(await db.redos.count()).toBe(0);
  });

  it("goes straight to logging after level 3", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    await seedRun(db, 6, "2026-11-04", { phase: "C", program2: { taskId: "pt-02", levelsDone: 3 } });
    mount(db, "2026-11-04", "/mock/6");
    expect(await screen.findByText(/All three levels done/)).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Finished levels" })).getAllByRole("listitem")).toHaveLength(3);
  });

  it("with no task unlocked (Week 1) points to the Interview Preparation Kit and logs a free program", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    const user = userEvent.setup();
    const run = await seedRun(db, 2, "2026-10-28", { phase: "C" });
    expect(run.program2).toEqual({ taskId: null });
    mount(db, "2026-10-28", "/mock/2");
    expect(await screen.findByText(/No practical task is unlocked/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Interview Preparation Kit/ })).toHaveAttribute("href", expect.stringContaining("interview-preparation-kit"));
    await user.click(screen.getByRole("button", { name: "Save and continue" }));
    await waitFor(async () => expect((await db.mockRuns.get(2))?.phase).toBe("D"));
    expect((await db.mockRuns.get(2))!.programs[0]).toMatchObject({ part: 2, problemId: "ipk-free" });
  });

  it("Skip this part records a skipped program and moves on", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    const user = userEvent.setup();
    await seedRun(db, 6, "2026-11-04", { phase: "C", program2: { taskId: "pt-03" } });
    mount(db, "2026-11-04", "/mock/6");
    await user.click(await screen.findByRole("button", { name: "Skip this part" }));
    await waitFor(async () => expect((await db.mockRuns.get(6))?.phase).toBe("D"));
    expect((await db.mockRuns.get(6))!.programs[0]).toMatchObject({ part: 2, problemId: "pt-03", skipped: true });
  });
});

describe("resume", () => {
  it("returns to the next unanswered question with the same questions", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    const run = await seedRun(db, 1, "2026-10-26", { answers: [true, false, true, true, false], picks: [0, 1, 2, 3, 0] });
    mount(db, "2026-10-26", "/mock/1");
    expect(await screen.findByText(/Question 6 of 18/)).toBeInTheDocument();
    expect(await db.mockRuns.get(1)).toMatchObject({ questionIds: run.questionIds });
  });

  it("resumes at the saved part", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    await seedRun(db, 1, "2026-10-26", { phase: "D" });
    mount(db, "2026-10-26", "/mock/1");
    expect(await screen.findByRole("region", { name: "Part D" })).toBeInTheDocument();
  });

  it("discard needs a second click and removes the run", async () => {
    const db = new DsaDB(`mock-${n++}`);
    dbs.push(db);
    const user = userEvent.setup();
    await seedRun(db, 1, "2026-10-26", { phase: "D" });
    mount(db, "2026-10-26", "/mock/1");
    await user.click(await screen.findByRole("button", { name: "Discard attempt" }));
    expect(await db.mockRuns.count()).toBe(1);
    await user.click(screen.getByRole("button", { name: "Yes, discard" }));
    await waitFor(async () => expect(await db.mockRuns.count()).toBe(0));
    expect(await screen.findByRole("button", { name: "Start mock" })).toBeInTheDocument();
  });
});
