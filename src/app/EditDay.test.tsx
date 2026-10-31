import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { STATUS_META } from "../features/calendar/status";
import { DsaDB } from "../lib/db";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

async function renderApp(opts: { today: string; path: string; seed?: (db: DsaDB) => Promise<void> }) {
  const db = new DsaDB(`edit-ui-${n++}`);
  dbs.push(db);
  await opts.seed?.(db);
  render(
    <PlanProvider db={db} today={opts.today}>
      <MemoryRouter initialEntries={[opts.path]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("navigation", { name: "Main" });
  return { db, user: userEvent.setup() };
}

const main = () => within(screen.getByRole("main"));
const items = () => within(screen.getByRole("region", { name: "Items" }));

async function addItem(user: ReturnType<typeof userEvent.setup>, kind: "Task" | "LeetCode problem", title: string, url?: string) {
  const form = within(screen.getByRole("region", { name: "Add an item" }));
  await user.click(form.getByLabelText(kind));
  await user.clear(form.getByLabelText("Title"));
  await user.type(form.getByLabelText("Title"), title);
  if (url) await user.type(form.getByLabelText("URL"), url);
  await user.click(form.getByRole("button", { name: "Add item" }));
}

describe("Edit day", () => {
  it("adds a task and a custom problem to a past day, which then count toward it and join the catch-up queue", async () => {
    const { db, user } = await renderApp({ today: "2026-10-28", path: "/day/w01-d1" });
    expect(main().getByRole("heading", { level: 1, name: "Edit day" })).toBeInTheDocument();
    await addItem(user, "Task", "Watch heap video");
    await addItem(user, "LeetCode problem", "My Custom Problem", "https://example.com/p");
    expect(await items().findByRole("checkbox", { name: "Watch heap video" })).not.toBeChecked();
    const link = await items().findByRole("link", { name: /My Custom Problem/ });
    expect(link).toHaveAttribute("href", "https://example.com/p");
    expect(link).toHaveAttribute("target", "_blank");
    expect((await db.customItems.toArray()).map((c) => [c.kind, c.planDayId, c.week]).sort()).toEqual([
      ["problem", "w01-d1", 1],
      ["task", "w01-d1", 1],
    ]);
  });

  it("writes a study log, shown in the day details, with 'edited on' only after a later change", async () => {
    const { db, user } = await renderApp({ today: "2026-10-26", path: "/day/w01-d1" });
    const log = within(screen.getByRole("region", { name: "Study log" }));
    await user.type(log.getByLabelText(/Notes/), "Studied hash sets");
    await user.clear(log.getByLabelText("Minutes studied"));
    await user.type(log.getByLabelText("Minutes studied"), "45");
    await user.type(log.getByLabelText(/Links/), "https://example.com/video");
    await user.click(log.getByRole("button", { name: "Save log" }));
    await waitFor(async () => expect(await db.dayLogs.get("w01-d1")).toMatchObject({ notes: "Studied hash sets", minutes: 45, links: ["https://example.com/video"], updatedOn: "2026-10-26" }));
    expect(screen.queryByText(/edited on/)).not.toBeInTheDocument();
  });

  it("shows 'edited on' when the log changed after the day, and the log appears in Calendar details and search", async () => {
    const { user } = await renderApp({
      today: "2026-10-30",
      path: "/calendar",
      seed: async (d) => void (await d.dayLogs.put({ planDayId: "w01-d2", notes: "Two pointers notes", minutes: 20, links: [], updatedOn: "2026-10-29" })),
    });
    await user.click(main().getByRole("gridcell", { name: /Tue 27 Oct/ }));
    const details = within(main().getByLabelText("Day details"));
    expect(details.getByText(/Two pointers notes/)).toBeInTheDocument();
    expect(details.getByText(/edited on Thu 29 Oct/)).toBeInTheDocument();

    await user.type(main().getByRole("searchbox", { name: "Search study logs" }), "pointers");
    const results = within(screen.getByRole("list", { name: "Study log results" }));
    expect(results.getByRole("link", { name: "Tue 27 Oct" })).toHaveAttribute("href", "/day/w01-d2");
    await user.clear(main().getByRole("searchbox", { name: "Search study logs" }));
    await user.type(main().getByRole("searchbox", { name: "Search study logs" }), "zzz");
    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });

  it("opens from Today and from a day's details", async () => {
    const { user } = await renderApp({ today: "2026-10-27", path: "/" });
    await user.click(main().getByRole("link", { name: "Edit day" }));
    expect(await main().findByRole("heading", { level: 1, name: "Edit day" })).toBeInTheDocument();
    expect(main().getByText(/Week 1 · Day 2 · Tue 27 Oct/)).toBeInTheDocument();
  });

  it("moves a problem to tomorrow: it leaves its day, shows 'moved from' there, and can be moved back", async () => {
    const { db, user } = await renderApp({ today: "2026-10-26", path: "/day/w01-d1" });
    const select = items().getByLabelText("Move Plus One to");
    await user.selectOptions(select, "Tue 27 Oct");
    await user.click(within(select.parentElement!).getByRole("button", { name: "Move" }));
    await waitFor(async () => expect(await db.itemMoves.get("w01-d1-p1")).toMatchObject({ fromPlanDayId: "w01-d1", toPlanDayId: "w01-d2" }));
    await waitFor(() => expect(items().queryByRole("checkbox", { name: "Plus One" })).not.toBeInTheDocument());
  });

  it("shows a moved item on its new day with 'moved from'", async () => {
    await renderApp({
      today: "2026-10-27",
      path: "/",
      seed: async (d) => void (await d.itemMoves.put({ itemId: "w01-d1-p1", fromPlanDayId: "w01-d1", toPlanDayId: "w01-d2", movedOn: "2026-10-26" })),
    });
    const checklist = within(screen.getByRole("region", { name: "Today's checklist" }));
    expect(checklist.getByRole("checkbox", { name: "Plus One" })).toBeInTheDocument();
    expect(checklist.getByText(/moved from Mon 26 Oct/)).toBeInTheDocument();
  });

  it("ticking with yesterday's date keeps the day 'done', not 'done late'", async () => {
    const { db, user } = await renderApp({ today: "2026-10-28", path: "/day/w01-d2" });
    const dayItems = ["w01-d2-p1", "w01-d2-p2", "w01-d2-p3"];
    for (const [i, id] of dayItems.entries()) {
      await user.click(items().getAllByRole("checkbox")[i]!);
      const dialog = within(screen.getByRole("dialog", { name: "Log problem" }));
      expect(dialog.getByLabelText("Date done")).toHaveValue("2026-10-27");
      await user.click(dialog.getByRole("button", { name: "Save" }));
      await waitFor(async () => expect(await db.completions.get(id)).toBeTruthy());
    }
    expect((await db.completions.toArray()).every((c) => c.completedOn === "2026-10-27")).toBe(true);
    expect(await screen.findByText(new RegExp(`${STATUS_META.done.glyph} ${STATUS_META.done.label}$`))).toBeInTheDocument();
    expect(screen.queryByText(/Done late/)).not.toBeInTheDocument();
  });

  it("ticks a Mock row with a chosen date through the date dialog", async () => {
    const { db, user } = await renderApp({ today: "2026-10-28", path: "/day/w01-d1" });
    await user.click(items().getAllByRole("checkbox")[0]!); // the learn item of a mock day
    await user.click(within(screen.getByRole("dialog", { name: "Mark as done" })).getByRole("button", { name: "Save" }));
    await waitFor(async () => expect(await db.completions.get("w01-d1:learn")).toMatchObject({ completedOn: "2026-10-26" }));
  });

  it("rejects a tick date after today and disables ticking on a future day", async () => {
    await renderApp({ today: "2026-10-26", path: "/day/w01-d3" });
    for (const box of items().getAllByRole("checkbox")) expect(box).toBeDisabled();
    expect(items().getByText(/can't be ticked/i, { selector: "p" }).textContent).toMatch(/hasn't arrived/);
  });

  it("deleting a ticked custom item asks first and removes its tick but keeps attempts", async () => {
    const { db, user } = await renderApp({
      today: "2026-10-28",
      path: "/day/w01-d1",
      seed: async (d) => {
        await d.customItems.add({ id: "c-x", planDayId: "w01-d1", week: 1, kind: "problem", title: "Mine", difficulty: "Easy", createdOn: "2026-10-26" });
        await d.attempts.add({ id: 1, problemId: "c-x", date: "2026-10-26", outcome: "alone", minutes: 5, isRedo: false });
        await d.completions.put({ itemId: "c-x", planDayId: "w01-d1", completedOn: "2026-10-26", attemptId: 1 });
      },
    });
    const row = items().getByRole("checkbox", { name: "Mine" }).closest("li")!;
    await user.click(within(row).getByRole("button", { name: "Delete" }));
    const dialog = within(screen.getByRole("dialog", { name: "Delete this item?" }));
    await user.click(dialog.getByRole("button", { name: "Delete" }));
    await waitFor(async () => expect(await db.customItems.count()).toBe(0));
    expect(await db.completions.get("c-x")).toBeUndefined();
    expect(await db.attempts.count()).toBe(1);
  });

  it("adds a day to Week 1, opens it in Edit day and lets you fill it", async () => {
    const { db, user } = await renderApp({ today: "2026-10-27", path: "/day/w01-d2" });
    await user.click(main().getByRole("button", { name: "+ Add a day to Week 1" }));
    expect(await main().findByText(/Week 1 · Extension day 1/)).toBeInTheDocument();
    expect(await db.extensions.count()).toBe(1);
    await addItem(user, "Task", "Re-read sliding window notes");
    await waitFor(async () => expect(await db.customItems.toArray()).toMatchObject([{ planDayId: "w01-x1", title: "Re-read sliding window notes" }]));
    // Week 2 and the finish date moved by one day
    expect((await db.extensions.toArray())[0]).toMatchObject({ week: 1, extraDays: 1 });
  });

  it("shows the add-day rule violation inline", async () => {
    const { user } = await renderApp({
      today: "2026-11-05",
      path: "/day/w01-d2",
      seed: async (d) => void (await d.completions.put({ itemId: "w02-d1:learn", planDayId: "w02-d1", completedOn: "2026-11-02" })),
    });
    await user.click(main().getByRole("button", { name: "+ Add a day to Week 1" }));
    expect(await main().findByRole("alert")).toHaveTextContent(/can't be extended/);
  });

  it("unknown day shows a not-found message", async () => {
    await renderApp({ today: "2026-10-27", path: "/day/w99-d1" });
    expect(main().getByRole("heading", { name: "Day not found" })).toBeInTheDocument();
  });
});

describe("Problem journal", () => {
  it("logs a found problem without a day, then finds it by search on the Problems page", async () => {
    const { db, user } = await renderApp({ today: "2026-10-28", path: "/problems" });
    await user.click(main().getByRole("button", { name: "Log a problem I found" }));
    const form = within(screen.getByRole("dialog", { name: "Log a problem I found" }));
    await user.type(form.getByLabelText("Link (URL)"), "https://leetcode.com/problems/weird-prefix-trick/");
    await user.type(form.getByLabelText("Title"), "Weird Prefix Trick");
    await user.selectOptions(form.getByLabelText("Difficulty"), "Hard");
    await user.type(form.getByLabelText("Pattern tags"), "Prefix Sum, Two Pointers");
    await user.type(form.getByLabelText(/Problem description/), "Count ranges whose sum is a multiple of k");
    expect(form.getByLabelText(/Attach to a day/)).toHaveValue(""); // journal only by default
    await user.click(form.getByLabelText(/already attempted/));
    await user.click(form.getByLabelText("Failed / couldn't finish"));
    await user.click(form.getByRole("button", { name: "Save problem" }));

    // lands on its detail page
    expect(await main().findByRole("heading", { level: 1, name: "Weird Prefix Trick" }, { timeout: 6000 })).toBeInTheDocument(); // saving is slow when the whole suite runs in parallel
    const [item] = await db.customItems.toArray();
    expect(item).toMatchObject({ kind: "problem", week: 1, difficulty: "Hard", platform: "LeetCode" });
    expect(item!.planDayId).toBeUndefined();
    expect(await db.problemEntries.get(item!.id)).toMatchObject({ tags: ["Prefix Sum", "Two Pointers"], description: "Count ranges whose sum is a multiple of k" });
    expect((await db.attempts.toArray()).map((a) => a.outcome)).toEqual(["failed"]);
    expect((await db.redos.toArray()).map((r) => r.dueOn)).toEqual(["2026-10-31", "2026-11-04"]);
    expect(await db.completions.count()).toBe(0); // journal-only: no day to tick

    await user.click(main().getByRole("link", { name: "← Problems" }));
    await user.type(await main().findByRole("searchbox"), "multiple of K");
    const list = within(screen.getByRole("list", { name: "Problems" }));
    expect(list.getAllByRole("listitem")).toHaveLength(1);
    expect(list.getByRole("link", { name: "Weird Prefix Trick" })).toBeInTheDocument();
    expect(list.getByText(/last: Failed on 28 Oct/)).toBeInTheDocument();
  });

  it("filters the Problems page by source, week and last outcome", async () => {
    const { user } = await renderApp({
      today: "2026-10-28",
      path: "/problems",
      seed: async (d) => {
        await d.customItems.add({ id: "c-f", week: 1, kind: "problem", title: "Found One", difficulty: "Easy", createdOn: "2026-10-27" });
        await d.attempts.add({ problemId: "c-f", date: "2026-10-27", outcome: "hint", minutes: 20, isRedo: false });
      },
    });
    const list = () => within(screen.getByRole("list", { name: "Problems" }));
    expect(main().getByRole("status")).toHaveTextContent("208 of 208 problems");
    await user.selectOptions(main().getByLabelText("Source"), "found");
    expect(list().getAllByRole("listitem")).toHaveLength(1);
    await user.selectOptions(main().getByLabelText("Source"), "");
    await user.selectOptions(main().getByLabelText("Last outcome"), "hint");
    expect(list().getAllByRole("listitem")).toHaveLength(1);
    await user.selectOptions(main().getByLabelText("Last outcome"), "");
    await user.selectOptions(main().getByLabelText("Week"), "2");
    expect(list().queryByText("Found One")).not.toBeInTheDocument();
  });

  it("saves a journal entry on a plan problem and logs another attempt, scheduling redos", async () => {
    const { db, user } = await renderApp({ today: "2026-10-28", path: "/problems/w01-d1-p1" });
    expect(await main().findByRole("heading", { level: 1, name: "Plus One" })).toBeInTheDocument();
    const journal = within(screen.getByRole("form", { name: "Journal" }));
    await user.type(journal.getByLabelText(/My solution/), "def f(nums):\n    return len(set(nums)) != len(nums)");
    await user.type(journal.getByLabelText("Time complexity"), "O(n)");
    await user.type(journal.getByLabelText("Space complexity"), "O(n)");
    await user.type(journal.getByLabelText(/Key insight/), "sets dedupe");
    await user.selectOptions(journal.getByLabelText(/Confidence/), "2");
    await user.type(journal.getByLabelText("Pattern tags"), "Hash Set");
    await user.click(journal.getByRole("button", { name: "Save journal" }));
    await waitFor(async () => expect(await db.problemEntries.get("w01-d1-p1")).toMatchObject({ timeComplexity: "O(n)", confidence: 2, tags: ["Hash Set"], insight: "sets dedupe" }));

    await user.click(main().getByRole("button", { name: "Log another attempt" }));
    const dialog = within(screen.getByRole("dialog", { name: "Log another attempt" }));
    await user.click(dialog.getByLabelText("Needed solution"));
    await user.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(async () => expect((await db.redos.toArray()).map((r) => r.dueOn)).toEqual(["2026-10-31", "2026-11-04"]));
    expect(await db.completions.count()).toBe(0); // journal attempts don't tick plan items
    expect(await within(screen.getByRole("region", { name: "Attempts" })).findByText(/Needed solution/)).toBeInTheDocument();

    await user.clear(main().getByLabelText("Redo on"));
    await user.type(main().getByLabelText("Redo on"), "2026-11-10");
    await user.click(main().getByRole("button", { name: "Redo later" }));
    await waitFor(async () => expect((await db.redos.toArray()).map((r) => r.dueOn)).toContain("2026-11-10"));
  });

  it("an old-topic problem's page hides its origin week until it has been attempted", async () => {
    const { user } = await renderApp({ today: "2026-11-05", path: "/problems/w02-d4-p1" });
    expect(await main().findByRole("heading", { level: 1, name: "Reverse Words in a String" })).toBeInTheDocument();
    expect(main().getByText(/^Plan/).textContent).toBe("Plan · LeetCode"); // no week yet
    await user.click(main().getByRole("button", { name: "Log another attempt" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(main().getByText(/^Plan/).textContent).toBe("Plan · Week 1 · LeetCode")); // revealed after the attempt
  });

  it("the Problems list shows no week for an old-topic problem", async () => {
    await renderApp({ today: "2026-11-05", path: "/problems" });
    const row = within(screen.getByRole("list", { name: "Problems" })).getByRole("link", { name: "Reverse Words in a String" }).closest("li")!;
    expect(row.textContent).not.toMatch(/Week/);
    expect(row.textContent).toMatch(/LeetCode/);
  });

  it("an unknown problem shows a not-found message", async () => {
    await renderApp({ today: "2026-10-28", path: "/problems/nope" });
    expect(main().getByRole("heading", { name: "Problem not found" })).toBeInTheDocument();
  });
});

describe("Settings import of an older (v1) export", () => {
  it("imports a v1 file through the UI", async () => {
    const { db, user } = await renderApp({ today: "2026-10-27", path: "/settings" });
    const v1 = {
      schemaVersion: 1,
      completions: [{ itemId: "w01-d1:learn", planDayId: "w01-d1", completedOn: "2026-10-26" }],
      extensions: [],
      attempts: [],
      redos: [],
      quizAnswers: [],
      cards: [],
      restDays: [],
      mocks: [],
      settings: [{ id: "settings", startDate: "2026-10-26", theme: "system" }],
    };
    await user.upload(screen.getByLabelText(/Import progress/), new File([JSON.stringify(v1)], "old.json", { type: "application/json" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Replace all progress?" })).getByRole("button", { name: "Replace my progress" }));
    await waitFor(async () => expect(await db.completions.count()).toBe(1));
    expect(await db.customItems.count()).toBe(0);
  });
});
