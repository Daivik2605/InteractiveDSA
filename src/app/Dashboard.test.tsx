import "fake-indexeddb/auto";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { saveMockRetake } from "../lib/actions";
import { DsaDB } from "../lib/db";
import type { MockSession, QuizAnswer } from "../types/content";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

async function open(seed?: (db: DsaDB) => Promise<void>, today = "2026-11-10") {
  const db = new DsaDB(`dash-${n++}`);
  dbs.push(db);
  await seed?.(db);
  render(
    <PlanProvider db={db} today={today}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("heading", { level: 1, name: "Dashboard" });
  return db;
}

const session = (mockNumber: number, correct: number, questionIds: string[] = []): MockSession => ({
  mockNumber, date: `2026-11-0${mockNumber}`, diagnostic: mockNumber === 1,
  mcq: { total: 18, correct, byType: {} }, questionIds, programs: [], extra: { kind: "debug", done: true }, rating: 3,
});
const answer = (questionId: string, correct: boolean, mockNumber: number): QuizAnswer => ({ questionId, correct, mode: "mock", mockNumber, answeredAt: `2026-11-0${mockNumber}T10:00:00.000Z` });

describe("Dashboard", () => {
  it("shows a study summary row of zeros with no data", async () => {
    await open();
    const summary = within(await screen.findByRole("region", { name: "Study summary" }));
    expect(summary.getByText("Days done").nextElementSibling).toHaveTextContent("0");
    expect(summary.getByText("Current streak").nextElementSibling).toHaveTextContent("0 days");
    expect(summary.getByText("Solved alone").nextElementSibling).toHaveTextContent("0");
    expect(summary.getByText("Study time").nextElementSibling).toHaveTextContent("0m");
  });

  it("summarises days done, streak, problems solved alone and study minutes", async () => {
    await open(async (db) => {
      await db.completions.bulkAdd([
        { itemId: "w01-d1:learn", planDayId: "w01-d1", completedOn: "2026-10-26" },
        { itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-26" },
        { itemId: "w01-d2-p1", planDayId: "w01-d2", completedOn: "2026-10-27" },
        { itemId: "w01-d2-p2", planDayId: "w01-d2", completedOn: "2026-10-27" },
        { itemId: "w01-d2-p3", planDayId: "w01-d2", completedOn: "2026-10-27" },
      ]);
      await db.attempts.bulkAdd([
        { problemId: "w01-d2-p1", date: "2026-10-27", outcome: "alone", minutes: 30, isRedo: false },
        { problemId: "w01-d2-p2", date: "2026-10-27", outcome: "hint", minutes: 45, isRedo: false },
      ]);
      await db.mocks.add({ ...session(2, 14), programs: [{ part: 2, problemId: "pt-01", outcome: "alone", minutes: 30, levelsDone: 3 }] });
    }, "2026-10-28");
    const summary = within(await screen.findByRole("region", { name: "Study summary" }));
    expect(summary.getByText("Days done").nextElementSibling).toHaveTextContent("2"); // Day 1 (Mock row + Plus One) and Day 2
    expect(summary.getByText("Current streak").nextElementSibling).toHaveTextContent("2 days");
    expect(summary.getByText("Solved alone").nextElementSibling).toHaveTextContent("1");
    expect(summary.getByText("Study time").nextElementSibling).toHaveTextContent("1h 45m"); // 30 + 45 + 30 Program 2
  });

  it("handles empty data with a note in every section", async () => {
    await open();
    expect(await screen.findByText(/No mocks finished yet/)).toBeInTheDocument();
    expect(screen.getByText(/Not enough answers yet/)).toBeInTheDocument();
    expect(screen.getAllByText(/Shows after you finish a mock other than Mock 1/)).toHaveLength(2);
    expect(screen.getByText("No problem attempts logged yet.")).toBeInTheDocument();
    expect(screen.getByText(/Average minutes per problem shows once you log some minutes/)).toBeInTheDocument();
    expect(screen.queryByRole("figure")).not.toBeInTheDocument();
  });

  it("shows Mock 1 as the baseline only: on the trend, but not in accuracy or weak spots", async () => {
    await open(async (db) => {
      await db.mocks.bulkAdd([session(1, 9, ["t01-q01", "t01-q02", "t01-q03"]), session(2, 14, ["t02-q01", "t02-q02", "t02-q03", "w01-q05", "w01-q06", "w01-q07"])]);
      await db.quizAnswers.bulkAdd([
        answer("t01-q01", false, 1), answer("t01-q02", false, 1), answer("t01-q03", false, 1), // Mock 1: all wrong, must not count
        answer("t02-q01", false, 2), answer("t02-q02", false, 2), answer("t02-q03", true, 2),
        answer("w01-q05", true, 2), answer("w01-q06", false, 2), answer("w01-q07", true, 2),
      ]);
    });
    const trend = await screen.findByRole("figure", { name: "Mock score trend" });
    const rows = within(trend).getAllByRole("row");
    expect(rows[0]).toHaveTextContent("Mock 1 (baseline)");
    expect(rows[0]).toHaveTextContent("9 / 18");
    expect(rows[1]).toHaveTextContent("Mock 2");
    expect(screen.getByText(/Mock 1 is your baseline/)).toBeInTheDocument();

    const themes = screen.getByRole("figure", { name: "Accuracy by Python theme" });
    expect(within(themes).getAllByRole("row")).toHaveLength(1); // theme 2 only; theme 1 came from the baseline
    expect(within(themes).getByRole("row")).toHaveTextContent("1 / 3");
    const typeRows = within(screen.getByRole("figure", { name: "Accuracy by question type" })).getAllByRole("row");
    const answered = typeRows.reduce((sum, r) => sum + Number(/\/ (\d+)/.exec(within(r).getAllByRole("cell")[0]!.textContent ?? "")![1]), 0);
    expect(answered).toBe(6); // Mock 2's six answers; Mock 1's three wrong answers are not counted

    const weak = within(screen.getByRole("list", { name: "Weakest spots" })).getAllByRole("listitem");
    expect(weak.length).toBeGreaterThan(0);
    expect(weak.length).toBeLessThanOrEqual(5);
    expect(weak.some((li) => /Theme 2/.test(li.textContent ?? ""))).toBe(true);
    expect(weak.every((li) => !/Theme 1:/.test(li.textContent ?? ""))).toBe(true);
  });

  it("links each weak spot to a ready, untaken mock with 'Start targeted mock'", async () => {
    await open(async (db) => {
      await db.mocks.bulkAdd([session(1, 9), session(2, 14, ["t02-q01", "t02-q02", "t02-q03"])]);
      await db.quizAnswers.bulkAdd([answer("t02-q01", false, 2), answer("t02-q02", false, 2), answer("t02-q03", false, 2)]);
    });
    const list = await screen.findByRole("list", { name: "Weakest spots" });
    const theme2 = within(list).getByText(/Theme 2/).closest("li")!;
    const link = within(theme2).getByRole("link", { name: "Start targeted mock" });
    // Mock 2 is done, so the next mock that leads with theme 2 is Mock 17 (not ready: no Week 5 content) → the next ready untaken mock
    expect(link.getAttribute("href")).toMatch(/^\/mock\/\d+$|^\/mocks$/);
    expect(link.getAttribute("href")).not.toBe("/mock/2");
    expect(link.getAttribute("href")).not.toBe("/mock/1");
  });

  it("retakes never change the dashboard numbers", async () => {
    const db = await open(async (d) => {
      await d.mocks.bulkAdd([session(2, 14, ["t02-q01"])]);
      await d.quizAnswers.add(answer("t02-q01", false, 2));
    });
    const before = within(await screen.findByRole("figure", { name: "Mock score trend" })).getAllByRole("row").map((r) => r.textContent);
    await saveMockRetake(db, { mockNumber: 2, date: "2026-11-03", mcq: { total: 18, correct: 18, byType: {} }, answers: [{ questionId: "t02-q01", picked: 0, correct: true }] });
    await new Promise((r) => setTimeout(r, 50));
    const after = within(screen.getByRole("figure", { name: "Mock score trend" })).getAllByRole("row").map((r) => r.textContent);
    expect(after).toEqual(before);
    expect(after.join("")).toContain("14 / 18");
    expect(after.join("")).not.toContain("18 / 18");
  });

  it("shows problems by outcome and difficulty and the average minutes", async () => {
    await open(async (db) => {
      await db.attempts.bulkAdd([
        { problemId: "w01-d1-p1", date: "2026-10-26", outcome: "alone", minutes: 20, isRedo: false },
        { problemId: "w01-d2-p1", date: "2026-10-27", outcome: "hint", minutes: 40, isRedo: false },
        { problemId: "w01-d2-p2", date: "2026-10-27", outcome: "failed", minutes: 0, isRedo: false },
      ]);
    });
    const outcome = await screen.findByRole("figure", { name: "Problems by outcome" });
    expect(within(outcome).getByRole("row", { name: /Solved alone/i })).toHaveTextContent("1");
    expect(within(outcome).getByRole("row", { name: /Needed hint/i })).toHaveTextContent("1");
    const diff = within(screen.getByRole("figure", { name: "Problems by difficulty" })).getAllByRole("row");
    expect(diff).toHaveLength(3);
    expect(screen.getByLabelText("Average minutes")).toHaveTextContent("30"); // (20 + 40) / 2; the 0-minute attempt is ignored
  });
});
