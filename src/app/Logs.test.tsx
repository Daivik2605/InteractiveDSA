import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { logAttempt } from "../lib/actions";
import { DsaDB } from "../lib/db";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

/** A local-time moment as an ISO string, so the displayed HH:MM is the same in any time zone. */
const at = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi).toISOString();

async function renderLogs(opts: { today?: string; path?: string; seed?: (db: DsaDB) => Promise<void> } = {}) {
  const db = new DsaDB(`logs-ui-${n++}`);
  dbs.push(db);
  await opts.seed?.(db);
  render(
    <PlanProvider db={db} today={opts.today ?? "2026-10-28"}>
      <MemoryRouter initialEntries={[opts.path ?? "/logs"]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("heading", { level: 1, name: opts.path && opts.path !== "/logs" ? /.+/ : "Logs" });
  return { db, user: userEvent.setup() };
}

const page = () => within(screen.getByRole("main"));
const day = (date: string) => within(page().getByRole("region", { name: date }));

async function seedMixed(db: DsaDB) {
  await db.attempts.bulkAdd([
    { problemId: "w01-d1-p1", date: "2026-10-26", outcome: "alone", minutes: 20, isRedo: false, at: at(2026, 10, 26, 14, 32) },
    { problemId: "w01-d2-p1", date: "2026-10-26", outcome: "failed", minutes: 15, isRedo: false, at: at(2026, 10, 26, 18, 5) },
    { problemId: "w01-d3-p1", date: "2026-10-27", outcome: "hint", minutes: 25, isRedo: false }, // saved before timestamps existed
  ]);
  await db.completions.put({ itemId: "w01-d1:learn", planDayId: "w01-d1", completedOn: "2026-10-26", at: at(2026, 10, 26, 9, 0) });
  await db.dayNotes.add({ date: "2026-10-27", text: "remember the sentinel trick", createdAt: at(2026, 10, 27, 21, 10), updatedAt: at(2026, 10, 27, 21, 10) });
  await db.conceptChecks.put({ conceptId: "w01-c1", checkedOn: "2026-10-26", at: at(2026, 10, 26, 10, 15) });
  await db.mocks.add({ mockNumber: 1, date: "2026-10-27", diagnostic: true, mcq: { total: 18, correct: 13, byType: {} }, questionIds: [], programs: [], extra: { kind: "debug", done: false }, rating: 3, savedAt: at(2026, 10, 27, 16, 45) });
}

describe("Logs page", () => {
  it("is in the nav", async () => {
    await renderLogs();
    expect(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Logs" })).toHaveAttribute("href", "/logs");
  });

  it("says so when nothing has been logged", async () => {
    await renderLogs();
    expect(await page().findByText(/Nothing logged yet/)).toBeInTheDocument();
  });

  it("lists everything under its date with the plan day and the time it was recorded, newest first", async () => {
    await renderLogs({ seed: seedMixed });
    await page().findByRole("region", { name: "2026-10-26" });
    const headings = page().getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toHaveLength(2); // newest date first, each with its plan day
    expect(headings[0]).toMatch(/27 Oct.*Week 1 · Day 2/);
    expect(headings[1]).toMatch(/26 Oct.*Week 1 · Day 1/);

    const first = day("2026-10-26").getAllByRole("listitem");
    expect(first.map((li) => li.textContent)).toEqual([
      expect.stringContaining("Attempted: Merge Sorted Array"), // 18:05
      expect.stringContaining("Solved alone: Plus One"), // 14:32
      expect.stringContaining("Read concept: How cost grows"), // 10:15
      expect.stringContaining("Learned a topic"), // 09:00
    ]);
    expect(first[0]).toHaveTextContent("18:05");
    expect(first[1]).toHaveTextContent("14:32");
    expect(first[1]).toHaveTextContent("20 min");
    expect(first[3]).toHaveTextContent("Week 1 · Day 1");

    const second = day("2026-10-27").getAllByRole("listitem");
    expect(second[0]).toHaveTextContent("remember the sentinel trick"); // 21:10
    expect(second[0]).toHaveTextContent("21:10");
    expect(second[1]).toHaveTextContent("Mock 1 finished"); // 16:45
    expect(second[1]).toHaveTextContent("MCQ 13/18 · baseline");
    expect(second[1]).toHaveTextContent("16:45");
    expect(day("2026-10-27").getByText(/Solved with a hint: Best Time to Buy/).closest("li")).toHaveTextContent("time not recorded"); // old row
  });

  it("filters by kind and searches", async () => {
    const { user } = await renderLogs({ seed: seedMixed });
    await page().findByRole("region", { name: "2026-10-26" });
    expect(page().getByRole("status")).toHaveTextContent("7 logs");
    await user.click(page().getByRole("button", { name: "Mocks" }));
    expect(page().getByRole("status")).toHaveTextContent("1 log");
    expect(page().queryByRole("region", { name: "2026-10-26" })).not.toBeInTheDocument();
    await user.click(page().getByRole("button", { name: "Problems" }));
    expect(page().getByRole("status")).toHaveTextContent("3 logs");
    await user.click(page().getByRole("button", { name: "All" }));
    await user.type(page().getByRole("searchbox", { name: "Search logs" }), "sentinel");
    expect(page().getByRole("status")).toHaveTextContent("1 log");
    await user.clear(page().getByRole("searchbox", { name: "Search logs" }));
    await user.type(page().getByRole("searchbox", { name: "Search logs" }), "zzzz");
    expect(page().getByText("No logs match.")).toBeInTheDocument();
  });

  it("deleting asks first; Cancel changes nothing", async () => {
    const { db, user } = await renderLogs({ seed: seedMixed });
    await user.click(await page().findByRole("button", { name: "Delete log: Solved alone: Plus One" }));
    const dialog = within(screen.getByRole("dialog", { name: "Delete this log?" }));
    expect(dialog.getByText("Solved alone: Plus One")).toBeInTheDocument();
    expect(dialog.getByText(/cannot be undone/)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await db.attempts.count()).toBe(3);
  });

  it("deleting an attempt removes it from the list, its plan tick and its redos", async () => {
    const { db, user } = await renderLogs({
      seed: async (d) => {
        await logAttempt(d, { problemId: "w01-d1-p1", date: "2026-10-26", outcome: "solution", minutes: 10, isRedo: false, completes: [{ itemId: "w01-d1-p1", planDayId: "w01-d1" }] });
      },
    });
    expect(await db.completions.count()).toBe(1);
    expect(await db.redos.count()).toBe(2);
    await user.click(await page().findByRole("button", { name: /Delete log: Solved after seeing the solution: Plus One/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete log" }));
    await waitFor(async () => expect(await db.attempts.count()).toBe(0));
    expect(await db.completions.count()).toBe(0);
    expect(await db.redos.count()).toBe(0);
    expect(await page().findByText(/Nothing logged yet/)).toBeInTheDocument();
  });

  it("deletes a note, a tick, a reading tick and a mock result", async () => {
    const { db, user } = await renderLogs({ seed: seedMixed });
    for (const name of [/Delete log: Note/, /Delete log: Learned a topic/, /Delete log: Read concept/, /Delete log: Mock 1 finished/]) {
      await user.click(await page().findByRole("button", { name }));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete log" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    }
    await waitFor(async () => {
      expect(await db.dayNotes.count()).toBe(0);
      expect(await db.completions.count()).toBe(0);
      expect(await db.conceptChecks.count()).toBe(0);
      expect(await db.mocks.count()).toBe(0);
    });
    expect(await db.attempts.count()).toBe(3); // problems untouched
    expect(page().getByRole("status")).toHaveTextContent("3 logs");
  });

  it("an extension is listed but not deletable here", async () => {
    await renderLogs({
      seed: async (d) => {
        await d.extensions.add({ week: 1, extraDays: 2, reason: "slow week", createdOn: "2026-10-27" });
      },
    });
    const li = (await page().findByText("Added 2 days to Week 1")).closest("li")!;
    expect(li).toHaveTextContent("slow week");
    expect(li).toHaveTextContent("Manage extensions in Settings");
    expect(within(li).queryByRole("button")).not.toBeInTheDocument();
  });

  it("a problem logged on Today shows up here with the time it was recorded", async () => {
    const { db, user } = await renderLogs({ today: "2026-10-26", path: "/" });
    await user.click(await screen.findByRole("checkbox", { name: "Plus One" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Save" }));
    await waitFor(async () => expect(await db.attempts.count()).toBe(1));
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Logs" }));
    const li = (await page().findByText("Solved alone: Plus One")).closest("li")!;
    expect(li).toHaveTextContent(/\d\d:\d\d/);
    expect(li).not.toHaveTextContent("time not recorded");
  });
});
