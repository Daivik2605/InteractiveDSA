import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
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

async function setup(path: string, seed?: (db: DsaDB) => Promise<void>) {
  const db = new DsaDB(`layout-${n++}`);
  dbs.push(db);
  await seed?.(db);
  render(
    <PlanProvider db={db} today="2026-10-28">
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("navigation", { name: "Main" });
  return { db, user: userEvent.setup() };
}

const sidebar = () => screen.queryByRole("complementary", { name: "Calendar sidebar" });
const gone = () => waitFor(() => expect(sidebar()).not.toBeInTheDocument());
const summaryBar = () => screen.queryByRole("button", { name: "Open calendar sidebar" });

const run = (number: number, patch: Record<string, unknown> = {}) => {
  const base = buildMockRun(number, { curriculum, questions: bank.questions, debugSnippets, cards: [], answers: [], attempts: [], sessions: [], practicalIds: new Set(practicalTasks.keys()), today: "2026-10-28", rng: mulberry32(11) })!;
  return { ...base, ...patch };
};
const saved = (mockNumber: number) => ({ mockNumber, date: "2026-10-28", diagnostic: mockNumber === 1, mcq: { total: 1, correct: 1, byType: {} }, questionIds: ["w01-q05"], answers: [{ questionId: "w01-q05", picked: 0, correct: true }], programs: [], extra: { kind: "debug" as const, done: true }, rating: 4 as const });

describe("calendar sidebar around mocks", () => {
  it("is on the right on ordinary pages, with the narrow-screen summary bar", async () => {
    await setup("/");
    expect(sidebar()).toBeInTheDocument();
    expect(summaryBar()).toBeInTheDocument();
    expect(sidebar()!.className).toContain("lg:block");
  });

  it("shows on the Mocks list", async () => {
    await setup("/mocks");
    expect(sidebar()).toBeInTheDocument();
  });

  it("shows on a mock that has not been started", async () => {
    await setup("/mock/1");
    await screen.findByRole("button", { name: "Start mock" });
    expect(sidebar()).toBeInTheDocument();
  });

  it("is gone while a mock is live (a run exists), together with its summary bar, and the page uses the full width", async () => {
    await setup("/mock/1", async (db) => void (await startMockRun(db, run(1))));
    await screen.findByText(/Question 1 of 18/);
    await gone();
    await waitFor(() => expect(summaryBar()).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1, name: /Mock 1/ }).parentElement).toHaveClass("w-full");
    expect(screen.getByRole("heading", { level: 1, name: /Mock 1/ }).parentElement).not.toHaveClass("max-w-2xl");
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument(); // the main nav stays
  });

  it("goes away when Start mock is pressed and stays away through every part, including the end screen", async () => {
    const { user, db } = await setup("/mock/1");
    await user.click(await screen.findByRole("button", { name: "Start mock" }));
    await waitFor(() => expect(sidebar()).not.toBeInTheDocument());
    for (const phase of ["B", "D", "end"] as const) {
      await db.mockRuns.update(1, { phase, answers: phase === "end" ? (await db.mockRuns.get(1))!.questionIds.map(() => true) : [] });
      await screen.findByRole("region", { name: phase === "end" ? "Mock results" : `Part ${phase}` });
      await gone();
    }
  });

  it("comes back when the live mock is discarded, and on the saved result page", async () => {
    const { user } = await setup("/mock/1", async (db) => void (await startMockRun(db, run(1, { phase: "D" }))));
    await screen.findByRole("region", { name: "Part D" });
    await gone();
    await user.click(screen.getByRole("button", { name: "Discard attempt" }));
    await user.click(screen.getByRole("button", { name: "Yes, discard" }));
    await screen.findByRole("button", { name: "Start mock" });
    expect(sidebar()).toBeInTheDocument();
  });

  it("shows on a saved result page, is hidden during a retake, and returns when the retake is cancelled", async () => {
    const { user } = await setup("/mock/1", async (db) => void (await db.mocks.add(saved(1))));
    await screen.findByRole("region", { name: "Saved mock" });
    expect(sidebar()).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retake MCQs" }));
    await screen.findByRole("region", { name: "Retake" });
    await gone();
    await waitFor(() => expect(summaryBar()).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1, name: /Mock 1/ }).parentElement).toHaveClass("w-full");
    await user.click(screen.getByRole("button", { name: "Cancel retake" }));
    await screen.findByRole("region", { name: "Saved mock" });
    expect(sidebar()).toBeInTheDocument();
  });

  it("returns when you leave a live mock through the nav", async () => {
    const { user } = await setup("/mock/1", async (db) => void (await startMockRun(db, run(1))));
    await screen.findByText(/Question 1 of 18/);
    await gone();
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Mocks" }));
    await screen.findByRole("heading", { level: 1, name: "Mocks" });
    expect(sidebar()).toBeInTheDocument();
    expect(summaryBar()).toBeInTheDocument();
  });
});
