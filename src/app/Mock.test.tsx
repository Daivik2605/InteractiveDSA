import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { DsaDB } from "../lib/db";
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
