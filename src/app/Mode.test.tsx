import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { addDays } from "../lib/dates";
import { DsaDB, exportAll, importAll } from "../lib/db";
import { journalStreak } from "../lib/journal";
import { modeOf } from "../lib/mode";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  cleanup();
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

const TODAY = "2026-10-27";
const START = { id: "settings" as const, startDate: "2026-10-26", theme: "system" as const };

async function renderApp(opts: { path?: string; mode?: "guided" | "journal"; seed?: (db: DsaDB) => Promise<void> } = {}) {
  const db = new DsaDB(`mode-${n++}`);
  dbs.push(db);
  await db.settings.put(opts.mode ? { ...START, mode: opts.mode } : START);
  await opts.seed?.(db);
  render(
    <PlanProvider db={db} today={TODAY}>
      <MemoryRouter initialEntries={[opts.path ?? "/"]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("navigation", { name: "Main" });
  return { db, user: userEvent.setup() };
}

const navLabels = () => Array.from(screen.getByRole("navigation", { name: "Main" }).querySelectorAll("a")).map((a) => a.textContent);
const sidebar = () => within(screen.getByRole("complementary", { name: "Calendar sidebar" }));

/** A device with something in many tables, to prove a mode switch touches none of it. */
async function populate(db: DsaDB) {
  await db.completions.put({ itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-26" });
  await db.attempts.add({ problemId: "p1", date: "2026-10-26", outcome: "hint", minutes: 20, isRedo: false });
  await db.redos.add({ problemId: "p1", dueOn: "2026-10-29" });
  await db.dayNotes.add({ date: "2026-10-26", text: "learned two pointers", createdAt: "2026-10-26T10:00:00Z", updatedAt: "2026-10-26T10:00:00Z" });
  await db.extensions.add({ week: 1, extraDays: 1, createdOn: "2026-10-26" });
}

describe("mode setting", () => {
  it("defaults to Guided plan when settings have no mode", () => {
    expect(modeOf({})).toBe("guided");
    expect(modeOf({ mode: "journal" })).toBe("journal");
  });

  it("existing installs (no mode saved) show the unchanged Guided plan nav", async () => {
    await renderApp();
    expect(navLabels()).toEqual(["Today", "Calendar", "Content", "Problems", "Mocks", "Logs", "Dashboard", "Settings"]);
    expect(sidebar().getByText("Week 1 · Day 2")).toBeInTheDocument();
  });

  it("Settings offers both modes with a line of explanation, Guided selected by default", async () => {
    const { user } = await renderApp({ path: "/settings" });
    const group = screen.getByRole("radiogroup", { name: "How do you want to use the app?" });
    expect(within(group).getByRole("radio", { name: /Guided plan/ })).toBeChecked();
    expect(within(group).getByRole("radio", { name: /Journal/ })).not.toBeChecked();
    expect(within(group).getByText(/Follow the 90-day plan/)).toBeInTheDocument();
    expect(within(group).getByText(/Log what you solve and learn each day/)).toBeInTheDocument();
    await user.click(within(group).getByRole("radio", { name: /Journal/ }));
    await waitFor(() => expect(navLabels()).toContain("Journal"));
  });
});

describe("navigation by mode", () => {
  it("Journal mode shows Journal, Calendar, Problems, Mocks, Content, Dashboard, Settings only", async () => {
    await renderApp({ mode: "journal" });
    expect(navLabels()).toEqual(["Journal", "Calendar", "Problems", "Mocks", "Content", "Dashboard", "Settings"]);
    expect(screen.getByRole("heading", { level: 1, name: "Journal" })).toBeInTheDocument();
  });

  it("Journal mode hides plan-day labels, missed counters and the catch-up queue", async () => {
    await renderApp({ mode: "journal", seed: populate });
    const s = sidebar();
    expect(s.queryByText(/Week 1 · Day/)).toBeNull();
    expect(s.queryByText(/Days missed/)).toBeNull();
    expect(s.queryByText(/Incomplete tasks/)).toBeNull();
    expect(s.queryByText(/Finish date/)).toBeNull();
    expect(s.getByText(/logged today/)).toBeInTheDocument();
  });

  it("Today and Incomplete redirect to the Journal home in Journal mode", async () => {
    await renderApp({ mode: "journal", path: "/incomplete" });
    expect(await screen.findByRole("heading", { level: 1, name: "Journal" })).toBeInTheDocument();
    cleanup();
    await renderApp({ mode: "journal", path: "/day/w01-d1" });
    expect(await screen.findByRole("heading", { level: 1, name: "Journal" })).toBeInTheDocument();
  });

  it("Guided plan still serves Incomplete", async () => {
    await renderApp({ path: "/incomplete" });
    expect(screen.queryByRole("heading", { level: 1, name: "Journal" })).toBeNull();
  });

  it("the Journal sidebar shows today's logged problems and the streak from the attempts", async () => {
    await renderApp({
      mode: "journal",
      seed: async (db) => {
        await db.attempts.add({ problemId: "p1", date: TODAY, outcome: "alone", minutes: 10, isRedo: false });
        await db.attempts.add({ problemId: "p2", date: addDays(TODAY, -1), outcome: "alone", minutes: 10, isRedo: false });
        await db.attempts.add({ problemId: "p3", date: TODAY, outcome: "alone", minutes: 10, isRedo: false, source: "mock" });
      },
    });
    expect(sidebar().getByText("1 logged today · 2 day streak")).toBeInTheDocument();
    expect(sidebar().getByRole("gridcell", { name: /27 Oct.*1 problem logged/ })).toBeInTheDocument();
  });
});

describe("switching modes keeps all data", () => {
  it("Guided → Journal → Guided changes only settings.mode", async () => {
    const { db, user } = await renderApp({ path: "/settings", seed: populate });
    const before = await exportAll(db);
    const radio = (name: RegExp) => within(screen.getByRole("radiogroup", { name: "How do you want to use the app?" })).getByRole("radio", { name });

    await user.click(radio(/Journal/));
    await waitFor(async () => expect((await db.settings.get("settings"))?.mode).toBe("journal"));
    const mid = await exportAll(db);
    expect({ ...mid, settings: [] }).toEqual({ ...before, settings: [] });

    await user.click(radio(/Guided plan/));
    await waitFor(async () => expect((await db.settings.get("settings"))?.mode).toBe("guided"));
    const after = await exportAll(db);
    expect({ ...after, settings: [] }).toEqual({ ...before, settings: [] });
    expect(navLabels()).toContain("Today"); // plan resumes: nav and sidebar are back
    expect(sidebar().getByText("Week 1 · Day 2")).toBeInTheDocument();
  });

  it("the mode survives export and import, and an older export (no mode) imports as Guided plan", async () => {
    const db = new DsaDB(`mode-${n++}`);
    dbs.push(db);
    await db.settings.put({ ...START, mode: "journal" });
    const exported = await exportAll(db);
    expect((exported.settings[0] as { mode?: string }).mode).toBe("journal");

    const other = new DsaDB(`mode-${n++}`);
    dbs.push(other);
    await importAll(other, JSON.parse(JSON.stringify(exported)));
    expect(modeOf((await other.settings.get("settings"))!)).toBe("journal");

    await importAll(other, { ...JSON.parse(JSON.stringify(exported)), settings: [START] });
    expect(modeOf((await other.settings.get("settings"))!)).toBe("guided");
  });
});

describe("journalStreak", () => {
  const set = (...d: string[]) => new Set(d);
  it("counts consecutive days ending today, or yesterday while today is empty", () => {
    expect(journalStreak(set(), TODAY)).toEqual({ current: 0, longest: 0 });
    expect(journalStreak(set(TODAY, "2026-10-26", "2026-10-25"), TODAY).current).toBe(3);
    expect(journalStreak(set("2026-10-26", "2026-10-25"), TODAY).current).toBe(2);
    expect(journalStreak(set("2026-10-24"), TODAY).current).toBe(0);
  });
  it("tracks the longest run", () => {
    expect(journalStreak(set("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-20"), TODAY)).toEqual({ current: 0, longest: 3 });
  });
});
