import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { curriculum } from "../lib/curriculum";
import { addDays } from "../lib/dates";
import { DsaDB } from "../lib/db";
import { itemsForDay } from "../lib/schedule";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

async function setup(today: string, path = "/", seed?: (db: DsaDB) => Promise<void>) {
  const db = new DsaDB(`progress-${n++}`);
  dbs.push(db);
  await seed?.(db);
  render(
    <PlanProvider db={db} today={today}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("navigation", { name: "Main" });
  return { db, user: userEvent.setup() };
}

const sidebar = () => within(screen.getByRole("complementary", { name: "Calendar sidebar" }));
/** Ticks every item of the given plan days on their planned dates (Week 1 starts 2026-10-26). */
const tickDays = async (db: DsaDB, days: string[], date?: (i: number) => string) => {
  for (const [i, id] of days.entries()) {
    for (const it of itemsForDay(curriculum, id)) await db.completions.put({ itemId: it.itemId, planDayId: id, completedOn: date ? date(i) : addDays("2026-10-26", i) });
  }
};
const week1 = ["w01-d1", "w01-d2", "w01-d3", "w01-d4", "w01-d5", "w01-d6", "w01-d7"];
const mockRow = (n: number) => ({ mockNumber: n, date: "2026-11-01", diagnostic: n === 1, mcq: { total: 18, correct: 12, byType: {} }, questionIds: [], programs: [], extra: { kind: "debug" as const, done: true }, rating: 3 as const });

describe("days complete", () => {
  it("counts only days whose every item is ticked, and ignores a day with one item left", async () => {
    await setup("2026-10-30", "/", async (db) => {
      await tickDays(db, ["w01-d1", "w01-d2"]);
      for (const it of itemsForDay(curriculum, "w01-d4").slice(1)) await db.completions.put({ itemId: it.itemId, planDayId: "w01-d4", completedOn: "2026-10-29" }); // one item left
    });
    expect(sidebar().getByText("2 of 90 days complete")).toBeInTheDocument();
    expect(screen.getByLabelText("Days complete")).toHaveTextContent("2 of 90 days complete");
  });

  it("an incomplete past day is yellow 'Incomplete'; a day with nothing ticked is red 'Missed'; both are not counted", async () => {
    const { user } = await setup("2026-10-30", "/calendar", async (db) => {
      await db.completions.put({ itemId: "w01-d3-p1", planDayId: "w01-d3", completedOn: "2026-10-28" }); // day 3, its only item... done
      await db.completions.put({ itemId: "w01-d2-p1", planDayId: "w01-d2", completedOn: "2026-10-27" }); // day 2: 1 of 3
    });
    const page = within(screen.getByRole("main"));
    expect(page.getByRole("gridcell", { name: /Tue 27 Oct, Week 1 day 2, Incomplete/ })).toHaveClass("bg-amber-100");
    expect(page.getByRole("gridcell", { name: /Mon 26 Oct, Week 1 day 1, Missed/ })).toHaveClass("bg-rose-100");
    expect(page.getByRole("gridcell", { name: /Wed 28 Oct, Week 1 day 3, Done/ })).toBeInTheDocument();
    await user.click(page.getByRole("gridcell", { name: /Tue 27 Oct/ }));
    expect(page.getByLabelText("Day details")).toHaveTextContent("2 item(s) still to do");
    expect(sidebar().getByText("1 of 90 days complete")).toBeInTheDocument();
  });

  it("a day finished late counts as complete once its last item is ticked", async () => {
    await setup("2026-10-30", "/", async (db) => {
      await tickDays(db, ["w01-d1"], () => "2026-10-29"); // done late
    });
    expect(sidebar().getByText("1 of 90 days complete")).toBeInTheDocument();
  });
});

describe("days online", () => {
  it("counts the distinct dates on which at least one item was ticked", async () => {
    await setup("2026-10-30", "/", async (db) => {
      await db.completions.bulkPut([
        { itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-26" },
        { itemId: "w01-d2-p1", planDayId: "w01-d2", completedOn: "2026-10-26" }, // same date
        { itemId: "w01-d2-p2", planDayId: "w01-d2", completedOn: "2026-10-28" },
      ]);
    });
    const box = sidebar().getByText("Days online").parentElement!;
    expect(box).toHaveTextContent("2");
  });
});

describe("week complete", () => {
  it("is complete only when every day is done and both of its mocks are taken", async () => {
    await setup("2026-11-01", "/", async (db) => {
      await tickDays(db, week1);
      await db.mocks.bulkAdd([mockRow(1)]);
    });
    expect(sidebar().getByLabelText("Week progress")).toHaveTextContent("Week 1: 7 of 7 days · 1 of 2 mocks");
  });

  it("shows 'Week 1 complete' once the second mock is saved too (and in the Calendar's week list)", async () => {
    const { user } = await setup("2026-11-01", "/calendar", async (db) => {
      await tickDays(db, week1);
      await db.mocks.bulkAdd([mockRow(1), mockRow(2)]);
    });
    expect(sidebar().getByLabelText("Week progress")).toHaveTextContent("Week 1 complete ✓");
    expect(within(screen.getByRole("main")).getByLabelText("Week 1 progress")).toHaveTextContent("✓ complete");
    expect(within(screen.getByRole("main")).getByLabelText("Week 2 progress")).toHaveTextContent("0/7 days · 0/2 mocks");
    expect(user).toBeTruthy();
  });

  it("is not complete with a day missing, however many mocks are done", async () => {
    await setup("2026-11-02", "/calendar", async (db) => {
      await tickDays(db, week1.slice(0, 6));
      await db.mocks.bulkAdd([mockRow(1), mockRow(2)]);
    });
    expect(within(screen.getByRole("main")).getByLabelText("Week 1 progress")).toHaveTextContent("6/7 days · 2/2 mocks");
  });
});

describe("Incomplete page", () => {
  it("lists unfinished items by the date they were planned for, and they stay until ticked", async () => {
    const { db } = await setup("2026-10-30", "/incomplete", async (db) => {
      await db.completions.put({ itemId: "w01-d2-p1", planDayId: "w01-d2", completedOn: "2026-10-27" });
    });
    const tasks = within(screen.getByRole("region", { name: "Incomplete tasks" }));
    const day2 = within(tasks.getByLabelText(/Planned Tue 27 Oct/));
    expect(day2.getByText("Remove Duplicates from Sorted Array")).toBeInTheDocument();
    expect(day2.queryByText("Merge Sorted Array")).not.toBeInTheDocument(); // ticked
    expect(day2.getByRole("link", { name: "Open day" })).toHaveAttribute("href", "/day/w01-d2");
    const day1 = within(tasks.getByLabelText(/Planned Mon 26 Oct/));
    expect(day1.getByRole("link", { name: /Plus One/ })).toHaveAttribute("href", "https://leetcode.com/problems/plus-one/");
    // ticking one removes just that one
    await db.completions.put({ itemId: "w01-d2-p2", planDayId: "w01-d2", completedOn: "2026-10-30" });
    await waitFor(() => expect(within(screen.getByLabelText(/Planned Tue 27 Oct/)).queryByText("Remove Duplicates from Sorted Array")).not.toBeInTheDocument());
    expect(within(screen.getByLabelText(/Planned Tue 27 Oct/)).getByText("Longest Common Prefix")).toBeInTheDocument();
  });

  it("is opened from the sidebar's Incomplete tasks and Days missed counters", async () => {
    const { user } = await setup("2026-10-30");
    await user.click(sidebar().getByText("Incomplete tasks"));
    expect(await screen.findByRole("heading", { level: 1, name: "Incomplete" })).toBeInTheDocument();
    expect(sidebar().getByText("Days missed").closest("a")).toHaveAttribute("href", "/incomplete");
  });

  it("lists review slots too, once their problems are drawn", async () => {
    await setup("2026-11-03", "/incomplete");
    const tasks = within(screen.getByRole("region", { name: "Incomplete tasks" }));
    await waitFor(() => expect(tasks.getByLabelText(/Planned Fri 30 Oct/)).toBeInTheDocument());
    await waitFor(() => expect(within(tasks.getByLabelText(/Planned Fri 30 Oct/)).queryAllByText(/Review problem \d/)).toHaveLength(0)); // drawn, so real titles
    expect(within(tasks.getByLabelText(/Planned Fri 30 Oct/)).getAllByRole("listitem")).toHaveLength(4); // 2 core + 2 review
  });

  it("lists mocks of a finished week that were not taken, and drops them once taken", async () => {
    const { db } = await setup("2026-11-03", "/incomplete", async (db) => {
      await db.mocks.add(mockRow(1));
    });
    const mocks = within(screen.getByRole("region", { name: "Mocks not taken" }));
    expect(mocks.getByText(/^Mock 2/)).toBeInTheDocument();
    expect(mocks.queryByText(/^Mock 1/)).not.toBeInTheDocument();
    expect(mocks.queryByText(/^Mock 3/)).not.toBeInTheDocument(); // Week 2 has not ended
    expect(mocks.getByRole("link", { name: "Open Mock 2" })).toHaveAttribute("href", "/mock/2");
    await db.mocks.add(mockRow(2));
    await waitFor(() => expect(screen.getByText("Every mock for a finished week is done.")).toBeInTheDocument());
  });
});

describe("missed days and reasons", () => {
  it("counts a day with nothing ticked as missed, in red, and logs an optional reason", async () => {
    const { db, user } = await setup("2026-10-28", "/incomplete");
    const missed = within(screen.getByRole("region", { name: "Days missed" }));
    expect(missed.getAllByRole("listitem")).toHaveLength(2); // Oct 26 and 27
    expect(sidebar().getByText("Days missed").previousSibling).toHaveTextContent("2");
    expect(sidebar().getByText("Days missed").previousSibling).toHaveClass("text-rose-700");
    const row = within(missed.getByLabelText(/Missed Mon 26 Oct/));
    await user.type(row.getByRole("textbox", { name: /Reason/ }), "Flu");
    await user.click(row.getByRole("button", { name: "Save reason" }));
    await waitFor(async () => expect(await db.missedReasons.get("w01-d1")).toMatchObject({ reason: "Flu", loggedOn: "2026-10-28" }));
    expect(await within(missed.getByLabelText(/Missed Mon 26 Oct/)).findByRole("button", { name: "Update reason" })).toBeDisabled();
    // clearing it removes the reason
    await user.clear(within(missed.getByLabelText(/Missed Mon 26 Oct/)).getByRole("textbox", { name: /Reason/ }));
    await user.click(within(missed.getByLabelText(/Missed Mon 26 Oct/)).getByRole("button", { name: "Update reason" }));
    await waitFor(async () => expect(await db.missedReasons.count()).toBe(0));
  });

  it("the reason can also be written from the Calendar day details, and shows there afterwards", async () => {
    const { user } = await setup("2026-10-28", "/calendar", async (db) => {
      await db.missedReasons.add({ planDayId: "w01-d2", reason: "Exam week", loggedOn: "2026-10-28" });
    });
    const page = within(screen.getByRole("main"));
    await user.click(page.getByRole("gridcell", { name: /Tue 27 Oct/ }));
    const details = within(page.getByLabelText("Day details"));
    expect(details.getByText(/Missed: nothing was ticked/)).toBeInTheDocument();
    expect(details.getByRole("textbox", { name: /Reason/ })).toHaveValue("Exam week");
  });

  it("a day that is only part-done is not 'missed' and has no reason box", async () => {
    await setup("2026-10-28", "/incomplete", async (db) => {
      await db.completions.put({ itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-26" });
    });
    const missed = within(screen.getByRole("region", { name: "Days missed" }));
    expect(missed.getAllByRole("listitem")).toHaveLength(1); // only Oct 27
    expect(missed.queryByLabelText(/Missed Mon 26 Oct/)).not.toBeInTheDocument();
  });
});
