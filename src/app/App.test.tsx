import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { DsaDB, exportAll } from "../lib/db";
import { App } from "./App";
import { NAV_ITEMS } from "./Layout";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  document.documentElement.classList.remove("dark");
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

async function renderApp(opts: { today: string; path?: string; seed?: (db: DsaDB) => Promise<void> }) {
  const db = new DsaDB(`app-${n++}`);
  dbs.push(db);
  await opts.seed?.(db);
  render(
    <PlanProvider db={db} today={opts.today}>
      <MemoryRouter initialEntries={[opts.path ?? "/"]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("navigation", { name: "Main" });
  return { db, user: userEvent.setup() };
}

const sidebar = () => within(screen.getByRole("complementary", { name: "Calendar sidebar" }));
const checklist = () => within(screen.getByRole("region", { name: "Today's checklist" }));

describe("app shell", () => {
  it("shows the six nav links and the calendar sidebar on every page", async () => {
    await renderApp({ today: "2026-10-27" });
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(Array.from(nav.querySelectorAll("a")).map((a) => a.textContent)).toEqual(["Today", "Calendar", "Weeks", "Problems", "Dashboard", "Settings"]);
    expect(NAV_ITEMS).toHaveLength(6);
    expect(sidebar().getByText("Week 1 · Day 2")).toBeInTheDocument();
  });

  it("keeps the sidebar on other pages and marks the active link", async () => {
    const { user } = await renderApp({ today: "2026-10-27" });
    for (const name of ["Calendar", "Weeks", "Problems", "Dashboard", "Settings"]) {
      await user.click(screen.getByRole("link", { name }));
      expect(screen.getByRole("heading", { level: 1, name })).toBeInTheDocument();
      expect(screen.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
      expect(sidebar().getByText("Week 1 · Day 2")).toBeInTheDocument();
    }
  });

  it("applies the saved theme instead of a hard-coded one", async () => {
    await renderApp({ today: "2026-10-27", seed: async (db) => void (await db.settings.put({ id: "settings", startDate: "2026-10-26", theme: "dark" })) });
    expect(document.documentElement).toHaveClass("dark");
  });
});

describe("sidebar", () => {
  it("shows topic, progress, finish date and missed count", async () => {
    await renderApp({ today: "2026-10-28" });
    const s = sidebar();
    expect(s.getByText("Week 1 · Day 3")).toBeInTheDocument();
    expect(s.getByText("Big-O + Arrays & Strings")).toBeInTheDocument();
    expect(s.getByText("Day 3 of 91")).toBeInTheDocument();
    expect(s.getByText("Sun 24 Jan")).toBeInTheDocument(); // finish date
    expect(s.getByText("Days missed").previousSibling).toHaveTextContent("2");
  });

  it("start date two weeks ago: missed days and a catch-up queue", async () => {
    await renderApp({
      today: "2026-10-26",
      seed: async (db) => void (await db.settings.put({ id: "settings", startDate: "2026-10-12", theme: "system" })),
    });
    expect(sidebar().getByText("Days missed").previousSibling).toHaveTextContent("14");
    const queue = within(screen.getByRole("region", { name: "Catch-up queue" }));
    expect(queue.getAllByRole("checkbox")[0]).toHaveAccessibleName("Visuals + Python templates");
    expect(queue.getAllByText(/from Mon 12 Oct/).length).toBeGreaterThan(0);
  });

  it("top bar summary is available below lg", async () => {
    await renderApp({ today: "2026-10-28" });
    expect(screen.getByRole("button", { name: "Open calendar sidebar" })).toHaveTextContent("Week 1 · Day 3 · 2 missed");
  });
});

describe("week extension dialog", () => {
  it("previews dates, then extending Week 1 by 3 moves Week 2 and the finish date", async () => {
    const { db, user } = await renderApp({ today: "2026-10-26" });
    await user.click(sidebar().getByRole("button", { name: "Need more time on this topic?" }));
    const dialog = within(screen.getByRole("dialog", { name: "Need more time on this topic?" }));
    await user.selectOptions(dialog.getByLabelText("Extra days"), "3");
    expect(dialog.getByText(/Week 2 starts/)).toHaveTextContent("Week 2 starts Thu 5 Nov (was Mon 2 Nov)");
    expect(dialog.getByText(/New finish date/)).toHaveTextContent("New finish date Wed 27 Jan (was Sun 24 Jan)");
    await user.click(dialog.getByRole("button", { name: "Extend Week 1" }));

    await waitFor(async () => expect(await db.extensions.toArray()).toMatchObject([{ week: 1, extraDays: 3 }]));
    await waitFor(() => expect(sidebar().getByText("+3 days vs original plan")).toBeInTheDocument());
    expect(sidebar().getByText("Wed 27 Jan")).toBeInTheDocument();
  });

  it("shows the reason when a change isn't allowed", async () => {
    const { user } = await renderApp({
      today: "2026-11-03",
      seed: async (db) => void (await db.completions.put({ itemId: "w02-d1:learn", planDayId: "w02-d1", completedOn: "2026-11-02" })),
    });
    await user.click(sidebar().getByRole("button", { name: "Need more time on this topic?" }));
    const dialog = within(screen.getByRole("dialog"));
    await user.selectOptions(dialog.getByLabelText("Week to extend"), "1");
    expect(dialog.getByRole("alert")).toHaveTextContent(/Week 2 has ticked items/);
    expect(dialog.getByRole("button", { name: "Extend Week 1" })).toBeDisabled();
  });
});

describe("Today page", () => {
  it("lists the day's learn item and problems with new-tab LeetCode links", async () => {
    await renderApp({ today: "2026-10-26" });
    expect(screen.getByText(/Week 1 · Day 1 · Mon 26 Oct/)).toBeInTheDocument();
    const link = checklist().getByRole("link", { name: /Contains Duplicate/ });
    expect(link).toHaveAttribute("href", "https://leetcode.com/problems/contains-duplicate/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(checklist().getAllByRole("checkbox")).toHaveLength(3);
  });

  it("ticking a problem logs it; unticking undoes the attempt and its redos", async () => {
    const { db, user } = await renderApp({ today: "2026-10-26" });
    await user.click(checklist().getByRole("checkbox", { name: "Contains Duplicate" }));
    const dialog = within(screen.getByRole("dialog", { name: "Log problem" }));
    await user.click(dialog.getByLabelText("Needed hint"));
    await user.clear(dialog.getByLabelText("Minutes taken"));
    await user.type(dialog.getByLabelText("Minutes taken"), "25");
    await user.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(async () => expect(await db.completions.get("w01-d1-p1")).toBeTruthy());
    expect(await db.attempts.toArray()).toMatchObject([{ problemId: "w01-d1-p1", outcome: "hint", minutes: 25, isRedo: false }]);
    expect((await db.redos.toArray()).map((r) => r.dueOn)).toEqual(["2026-10-29"]);
    expect(checklist().getByRole("checkbox", { name: "Contains Duplicate" })).toBeChecked();

    await user.click(checklist().getByRole("checkbox", { name: "Contains Duplicate" }));
    await waitFor(async () => expect(await db.completions.count()).toBe(0));
    expect(await db.attempts.count()).toBe(0);
    expect(await db.redos.count()).toBe(0);
  });

  it("ticks the learn item directly", async () => {
    const { db, user } = await renderApp({ today: "2026-10-26" });
    await user.click(checklist().getByRole("checkbox", { name: "Visuals + Python templates" }));
    await waitFor(async () => expect(await db.completions.get("w01-d1:learn")).toMatchObject({ completedOn: "2026-10-26" }));
  });

  it("catch-up: items from earlier days are ticked late and marked with today's date", async () => {
    const { db, user } = await renderApp({ today: "2026-10-28" });
    const queue = within(screen.getByRole("region", { name: "Catch-up queue" }));
    expect(queue.getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"))).toEqual([
      "Visuals + Python templates",
      "Contains Duplicate",
      "Plus One",
      "Weekly quiz (30+ MCQs)",
      "Merge Sorted Array",
      "Longest Common Prefix",
    ]);
    await user.click(queue.getByRole("checkbox", { name: "Visuals + Python templates" }));
    await waitFor(async () => expect(await db.completions.get("w01-d1:learn")).toMatchObject({ completedOn: "2026-10-28", planDayId: "w01-d1" }));
  });

  it("day 7 slot filled from catch-up: ticking it completes the slot and the original problem; unticking undoes both", async () => {
    const { db, user } = await renderApp({ today: "2026-11-01" });
    const slot = checklist().getByRole("checkbox", { name: "Contains Duplicate" });
    await user.click(slot);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await waitFor(async () => expect(await db.completions.get("w01-d7:s1")).toBeTruthy());
    expect(await db.completions.get("w01-d1-p1")).toMatchObject({ completedOn: "2026-11-01" });

    await user.click(checklist().getByRole("checkbox", { name: /Redo slot 1: Contains Duplicate/ }));
    await waitFor(async () => expect(await db.completions.get("w01-d7:s1")).toBeUndefined());
    expect(await db.completions.get("w01-d1-p1")).toBeUndefined();
  });

  it("redo due: logging a hint closes the old redo as attempted and starts a single new chain", async () => {
    const { db, user } = await renderApp({
      today: "2026-11-01",
      seed: async (d) => void (await d.redos.add({ problemId: "w01-d3-p1", dueOn: "2026-10-31" })),
    });
    const redo = within(screen.getByRole("region", { name: "Redo due" }));
    await user.click(redo.getByRole("button", { name: "Log redo" }));
    const dialog = within(screen.getByRole("dialog"));
    await user.click(dialog.getByLabelText("Needed hint"));
    await user.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(async () => expect((await db.redos.toArray()).length).toBe(2));
    const all = await db.redos.toArray();
    expect(all.filter((r) => r.attemptedOn)).toHaveLength(1);
    expect(all.filter((r) => !r.attemptedOn && !r.doneOn).map((r) => r.dueOn)).toEqual(["2026-11-04"]);
    expect(screen.queryByRole("region", { name: "Redo due" })).not.toBeInTheDocument();
  });

  it("rest day: marks today as rest, allowed once per week, can be undone", async () => {
    const { db, user } = await renderApp({ today: "2026-10-27" });
    await user.click(screen.getByRole("button", { name: "Rest day" }));
    await waitFor(async () => expect(await db.restDays.toArray()).toEqual([{ date: "2026-10-27" }]));
    expect(await screen.findByRole("button", { name: /undo rest day/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /undo rest day/ }));
    await waitFor(async () => expect(await db.restDays.count()).toBe(0));
  });

  it("before the start date: countdown", async () => {
    await renderApp({ today: "2026-10-20" });
    expect(screen.getByText("6 days")).toBeInTheDocument();
  });

  it("after the plan finishes", async () => {
    await renderApp({ today: "2027-02-01" });
    expect(within(screen.getByRole("main")).getByText("Plan complete")).toBeInTheDocument();
  });
});

describe("Calendar page", () => {
  it("shows streaks, status per day and day details with completion dates", async () => {
    const { user } = await renderApp({
      today: "2026-10-28",
      path: "/calendar",
      seed: async (db) => {
        await db.completions.bulkPut([
          { itemId: "w01-d1:learn", planDayId: "w01-d1", completedOn: "2026-10-26" },
          { itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-27" },
          { itemId: "w01-d1-p2", planDayId: "w01-d1", completedOn: "2026-10-27" },
        ]);
      },
    });
    const page = within(screen.getByRole("main"));
    expect(page.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    await user.click(page.getByRole("gridcell", { name: /Mon 26 Oct, Week 1 day 1, Done late/ }));
    const details = within(page.getByLabelText("Day details"));
    expect(details.getAllByText("✓ 27 Oct (late)")).toHaveLength(2); // both problems
    expect(details.getByText("✓ 26 Oct")).toBeInTheDocument(); // learn item, on time
    expect(page.getByText("Longest streak")).toBeInTheDocument();
  });
});

describe("Settings page", () => {
  it("changes the start date, recomputing dates but keeping ticks", async () => {
    const { db, user } = await renderApp({
      today: "2026-10-26",
      path: "/settings",
      seed: async (d) => void (await d.completions.put({ itemId: "w01-d1:learn", planDayId: "w01-d1", completedOn: "2026-10-26" })),
    });
    const start = screen.getByLabelText("Plan starts on");
    await user.clear(start);
    await user.type(start, "2026-10-12");
    await user.click(within(screen.getByRole("region", { name: "Start date" })).getByRole("button", { name: "Save" }));
    await waitFor(async () => expect((await db.settings.get("settings"))!.startDate).toBe("2026-10-12"));
    expect(await db.completions.count()).toBe(1);
    await waitFor(() => expect(sidebar().getByText("Week 3 · Day 1")).toBeInTheDocument());
  });

  it("lists extensions and removes a future one", async () => {
    const { db, user } = await renderApp({
      today: "2026-10-27",
      path: "/settings",
      seed: async (d) => void (await d.extensions.add({ week: 1, extraDays: 2, reason: "arrays", createdOn: "2026-10-26" })),
    });
    const card = within(screen.getByRole("region", { name: "Extensions" }));
    expect(card.getByText(/arrays/)).toBeInTheDocument();
    await user.click(card.getByRole("button", { name: "Remove" }));
    await waitFor(async () => expect(await db.extensions.count()).toBe(0));
  });

  it("refuses to remove extension days that have arrived and says why", async () => {
    const { db, user } = await renderApp({
      today: "2026-11-02",
      path: "/settings",
      seed: async (d) => void (await d.extensions.add({ week: 1, extraDays: 2, createdOn: "2026-10-26" })),
    });
    await user.click(within(screen.getByRole("region", { name: "Extensions" })).getByRole("button", { name: "Remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/already arrived/);
    expect(await db.extensions.count()).toBe(1);
  });

  it("export then import restores everything", async () => {
    const { db, user } = await renderApp({
      today: "2026-10-27",
      path: "/settings",
      seed: async (d) => {
        await d.completions.put({ itemId: "w01-d1:learn", planDayId: "w01-d1", completedOn: "2026-10-26" });
        await d.extensions.add({ week: 2, extraDays: 1, createdOn: "2026-10-26" });
        await d.restDays.put({ date: "2026-10-27" });
      },
    });
    const snapshot = await exportAll(db);
    const file = new File([JSON.stringify(snapshot)], "backup.json", { type: "application/json" });

    // wipe via the UI's typed confirmation
    await user.click(screen.getByRole("button", { name: "Reset progress…" }));
    const reset = within(screen.getByRole("dialog"));
    const go = reset.getByRole("button", { name: "Delete everything" });
    expect(go).toBeDisabled();
    await user.type(reset.getByLabelText("Type RESET to confirm"), "RESET");
    await user.click(go);
    await waitFor(async () => expect(await db.completions.count()).toBe(0));
    expect(await db.extensions.count()).toBe(0);

    await user.upload(screen.getByLabelText(/Import progress/), file);
    const confirm = within(await screen.findByRole("dialog", { name: "Replace all progress?" }));
    await user.click(confirm.getByRole("button", { name: "Replace my progress" }));
    await waitFor(async () => expect(await exportAll(db)).toEqual(snapshot));
  });

  it("rejects a file that isn't an export", async () => {
    const { user } = await renderApp({ today: "2026-10-27", path: "/settings" });
    await user.upload(screen.getByLabelText(/Import progress/), new File(["{\"hello\":1}"], "x.json", { type: "application/json" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/doesn't look like/);
  });
});
