import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { DsaDB, TABLE_NAMES, resetAll } from "../lib/db";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  document.documentElement.classList.remove("dark");
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

const TODAY = "2026-10-30";

/** A device that has been used for a while: something in every table, a custom start date and the dark theme. */
async function usedDevice(db: DsaDB) {
  await db.settings.put({ id: "settings", startDate: "2026-10-12", theme: "dark" });
  await db.completions.bulkPut([
    { itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-12", attemptId: 1 },
    { itemId: "w01-d2-p1", planDayId: "w01-d2", completedOn: "2026-10-14" },
  ]);
  await db.attempts.add({ id: 1, problemId: "w01-d1-p1", date: "2026-10-12", outcome: "hint", minutes: 45, isRedo: false });
  await db.redos.add({ problemId: "w01-d1-p1", dueOn: "2026-10-15" });
  await db.extensions.add({ week: 1, extraDays: 2, createdOn: "2026-10-20" });
  await db.restDays.put({ date: "2026-10-13" });
  await db.dayLogs.put({ planDayId: "w01-d1", notes: "studied", minutes: 90, links: [], updatedOn: "2026-10-12" } as never);
  await db.dayNotes.add({ date: TODAY, text: "a note", createdAt: "2026-10-30T10:00:00.000Z", updatedAt: "2026-10-30T10:00:00.000Z" });
  await db.missedReasons.add({ planDayId: "w01-d3", reason: "ill", loggedOn: "2026-10-20" });
  await db.dayDraws.add({ slotId: "w01-d5:review-1", planDayId: "w01-d5", problemId: "w01-d1-p1", drawnOn: "2026-10-16" });
  await db.cards.put({ questionId: "w01-q01", box: 2, dueOn: "2026-10-30" });
  await db.quizAnswers.add({ questionId: "w01-q01", correct: true, answeredAt: "2026-10-12T10:00:00.000Z", mode: "mock" });
  await db.mocks.add({ mockNumber: 1, date: "2026-10-13", diagnostic: true, mcq: { total: 18, correct: 12, byType: {} }, questionIds: [], programs: [{ part: 1, problemId: "w01-pool-01", outcome: "alone", minutes: 30 }], extra: { kind: "debug", done: true }, rating: 4 });
  await db.mockRuns.add({ mockNumber: 2, startedOn: "2026-10-14", questionIds: [], groups: { theme: 7, current: 6, review: 5 }, program1: { problemId: null }, program2: null, extra: { kind: "debug" }, answers: [], phase: "A", programs: [], extraDone: false });
  await db.mockRetakes.add({ mockNumber: 1, retakeNumber: 1, date: "2026-10-14", mcq: { total: 1, correct: 1, byType: {} }, answers: [] });
  await db.customItems.add({ id: "c1", week: 1, kind: "task", title: "mine", createdOn: "2026-10-12" } as never);
  await db.itemMoves.put({ itemId: "w01-d1-p1", fromPlanDayId: "w01-d1", toPlanDayId: "w01-d2" } as never);
  await db.problemEntries.put({ problemId: "w01-d1-p1", tags: [], updatedOn: "2026-10-12" } as never);
}

async function setup(path = "/settings") {
  const db = new DsaDB(`reset-${n++}`);
  dbs.push(db);
  await usedDevice(db);
  render(
    <PlanProvider db={db} today={TODAY}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("navigation", { name: "Main" });
  return { db, user: userEvent.setup() };
}

const sidebar = () => within(screen.getByRole("complementary", { name: "Calendar sidebar" }));
const statValue = (label: string) => sidebar().getByText(label).previousSibling!.textContent;

async function openReset(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Reset progress…" }));
  return within(screen.getByRole("dialog", { name: "Reset all progress?" }));
}
async function confirmReset(user: ReturnType<typeof userEvent.setup>, dialog: ReturnType<typeof within>) {
  await user.type(dialog.getByLabelText("Type RESET to confirm"), "RESET");
  await user.click(dialog.getByRole("button", { name: "Delete everything" }));
}

describe("reset dialog", () => {
  it("asks which day is Day 1 (default today) and shows the expected last day, updating as you change it", async () => {
    const { user } = await setup();
    const dialog = await openReset(user);
    expect(dialog.getByLabelText("Day 1 after the reset")).toHaveValue(TODAY);
    expect(dialog.getByLabelText("Expected last day")).toHaveTextContent("Expected last day: Wed 27 Jan 2027 (90 days, with no extensions).");
    fireEvent.change(dialog.getByLabelText("Day 1 after the reset"), { target: { value: "2026-11-09" } });
    expect(dialog.getByLabelText("Expected last day")).toHaveTextContent("Expected last day: Sat 6 Feb 2027");
    fireEvent.change(dialog.getByLabelText("Day 1 after the reset"), { target: { value: "" } });
    expect(dialog.getByLabelText("Expected last day")).toHaveTextContent("Choose a valid date for Day 1.");
    await user.type(dialog.getByLabelText("Type RESET to confirm"), "RESET");
    expect(dialog.getByRole("button", { name: "Delete everything" })).toBeDisabled(); // no valid Day 1
  });

  it("still needs RESET typed, and Cancel changes nothing", async () => {
    const { db, user } = await setup();
    const dialog = await openReset(user);
    expect(dialog.getByRole("button", { name: "Delete everything" })).toBeDisabled();
    await user.click(dialog.getByRole("button", { name: "Cancel" }));
    expect(await db.completions.count()).toBe(2);
    expect((await db.settings.get("settings"))!.startDate).toBe("2026-10-12");
  });
});

describe("after a reset", () => {
  it("every table is empty except the fresh settings: the chosen day is Day 1 and the theme is the default", async () => {
    const { db, user } = await setup();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await confirmReset(user, await openReset(user));
    await waitFor(async () => expect(await db.completions.count()).toBe(0));
    for (const name of TABLE_NAMES) {
      if (name === "settings") continue;
      expect(await db.table(name).count(), name).toBe(0);
    }
    expect(await db.settings.toArray()).toEqual([{ id: "settings", startDate: TODAY, theme: "system" }]);
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(false));
  });

  it("looks like a first use: Day 1 today, nothing missed, nothing incomplete, no days online, no minutes, nothing complete", async () => {
    const { user } = await setup();
    // before the reset the sidebar shows the old history
    expect(Number(statValue("Days missed"))).toBeGreaterThan(0);
    expect(statValue("Days online")).toBe("2");
    await confirmReset(user, await openReset(user));

    expect(await screen.findByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument(); // taken back to Today
    await waitFor(() => expect(sidebar().getByText("0 of 90 days complete")).toBeInTheDocument());
    expect(statValue("Days missed")).toBe("0");
    expect(statValue("Incomplete tasks")).toBe("0");
    expect(statValue("Days online")).toBe("0");
    expect(statValue("Current streak")).toBe("0");
    expect(sidebar().getByText("Week 1 · Day 1")).toBeInTheDocument();
    expect(sidebar().getByLabelText("Week progress")).toHaveTextContent("Week 1: 0 of 7 days · 0 of 2 mocks");
    expect(sidebar().getByLabelText("Finish date")).toHaveTextContent("Wed 27 Jan");
    expect(screen.getByText(/Week 1 · Day 1 · Fri 30 Oct/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Catch-up queue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Redo due" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Mocks" })).getByText("Mock 1 is suggested after Week 1.")).toBeInTheDocument();
    expect(sidebar().queryByText(/vs original plan/)).not.toBeInTheDocument(); // no extension days left
  });

  it("the dashboard shows no logged minutes, solved problems, mocks or streak", async () => {
    const { user } = await setup();
    await confirmReset(user, await openReset(user));
    await screen.findByRole("heading", { level: 1, name: "Today" });
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Dashboard" }));
    const summary = within(await screen.findByRole("region", { name: "Study summary" }));
    await waitFor(() => expect(summary.getByText("Study time").nextElementSibling).toHaveTextContent("0m"));
    expect(summary.getByText("Days done").nextElementSibling).toHaveTextContent("0");
    expect(summary.getByText("Solved alone").nextElementSibling).toHaveTextContent("0");
    expect(summary.getByText("Current streak").nextElementSibling).toHaveTextContent("0 days");
  });

  it("the Settings start-date field shows the new Day 1, and the calendar's first day is that date", async () => {
    const { user } = await setup();
    const dialog = await openReset(user);
    fireEvent.change(dialog.getByLabelText("Day 1 after the reset"), { target: { value: "2026-11-09" } });
    await confirmReset(user, dialog);
    await screen.findByRole("heading", { level: 1, name: "Today" });
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Settings" }));
    expect(await screen.findByLabelText("Plan starts on")).toHaveValue("2026-11-09");
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Calendar" }));
    const page = within(await screen.findByRole("main"));
    expect(await page.findByRole("gridcell", { name: /Mon 9 Nov, Week 1 day 1, Upcoming/ })).toBeInTheDocument();
  });

  it("a Day 1 in the future shows the countdown; the finish date follows the chosen day", async () => {
    const { user } = await setup();
    const dialog = await openReset(user);
    fireEvent.change(dialog.getByLabelText("Day 1 after the reset"), { target: { value: "2026-11-09" } });
    await confirmReset(user, dialog);
    expect(await screen.findByText("10 days")).toBeInTheDocument();
    expect(screen.getByText(/until the plan starts on Mon 9 Nov/)).toBeInTheDocument();
    expect(sidebar().getByLabelText("Finish date")).toHaveTextContent("Sat 6 Feb");
    expect(statValue("Days missed")).toBe("0");
  });

  it("resetAll(db, date) is the same as a reset in the UI; without a date it just clears everything as before", async () => {
    const db = new DsaDB(`reset-${n++}`);
    dbs.push(db);
    await usedDevice(db);
    await resetAll(db, "2027-01-04");
    expect(await db.settings.toArray()).toEqual([{ id: "settings", startDate: "2027-01-04", theme: "system" }]);
    expect(await db.dayNotes.count()).toBe(0);
    await usedDevice(db);
    await resetAll(db);
    expect(await db.settings.count()).toBe(0);
  });
});
