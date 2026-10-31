import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { curriculum } from "../lib/curriculum";
import { DsaDB } from "../lib/db";
import { reviewPool } from "../lib/review";
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

async function setup(today: string, seed?: (db: DsaDB) => Promise<void>) {
  const db = new DsaDB(`review-ui-${n++}`);
  dbs.push(db);
  await seed?.(db);
  const view = mount(db, today);
  await screen.findByRole("navigation", { name: "Main" });
  return { db, view, user: userEvent.setup() };
}

const checklist = () => within(screen.getByRole("region", { name: "Today's checklist" }));
const reviewRows = () => checklist().getAllByRole("listitem").filter((li) => /Review: a quick repeat/.test(li.textContent ?? ""));
const titleOf = (id: string) => curriculum.weeks.flatMap((w) => [...w.days.flatMap((d) => d.problems), ...w.pool]).find((p) => p.id === id)!.title;

describe("review slots on Today", () => {
  it("draws two review problems the first time the day opens, from earlier plan days, and shows them with Re-roll", async () => {
    const { db } = await setup("2026-10-30"); // Week 1 Day 5
    await waitFor(async () => expect(await db.dayDraws.count()).toBe(2));
    await waitFor(() => expect(reviewRows()).toHaveLength(2));
    const pool = new Set(reviewPool(curriculum, "w01-d5").map((p) => titleOf(p.id)));
    const drawn = await db.dayDraws.toArray();
    for (const d of drawn) expect(pool.has(titleOf(d.problemId))).toBe(true);
    expect(checklist().getAllByRole("checkbox")).toHaveLength(4); // 2 core + 2 review
    expect(within(reviewRows()[0]!).getByRole("link", { name: new RegExp(titleOf(drawn.find((d) => d.slotId.endsWith("review-1"))!.problemId).replace(/[()]/g, "\\$&")) })).toBeInTheDocument();
    expect(checklist().getAllByRole("button", { name: "Re-roll" })).toHaveLength(2);
  });

  it("never shows which week or topic a review problem came from", async () => {
    await setup("2026-11-12"); // a later day, so the pool spans several weeks
    await waitFor(() => expect(reviewRows()).toHaveLength(2));
    for (const row of reviewRows()) {
      expect(row.textContent).not.toMatch(/week \d|wk \d|from week|day \d|topic/i);
    }
  });

  it("keeps the same draw after a reload", async () => {
    const { db, view } = await setup("2026-10-30");
    await waitFor(() => expect(reviewRows()).toHaveLength(2));
    const before = (await db.dayDraws.orderBy("slotId").toArray()).map((d) => d.problemId);
    const labels = reviewRows().map((r) => r.querySelector("a")?.textContent);
    view.unmount();
    mount(db, "2026-10-30");
    await screen.findByRole("region", { name: "Today's checklist" });
    await waitFor(() => expect(reviewRows()).toHaveLength(2));
    expect((await db.dayDraws.orderBy("slotId").toArray()).map((d) => d.problemId)).toEqual(before);
    expect(reviewRows().map((r) => r.querySelector("a")?.textContent)).toEqual(labels);
    expect(await db.dayDraws.count()).toBe(2);
  });

  it("Re-roll replaces just that slot's problem", async () => {
    const { db, user } = await setup("2026-10-30");
    await waitFor(() => expect(reviewRows()).toHaveLength(2));
    const before = Object.fromEntries((await db.dayDraws.toArray()).map((d) => [d.slotId, d.problemId]));
    await user.click(within(reviewRows()[0]!).getByRole("button", { name: "Re-roll" }));
    await waitFor(async () => expect((await db.dayDraws.get("w01-d5:review-1"))!.problemId).not.toBe(before["w01-d5:review-1"]));
    expect((await db.dayDraws.get("w01-d5:review-2"))!.problemId).toBe(before["w01-d5:review-2"]);
    const now = await await_ids(db);
    await waitFor(() => expect(reviewRows()[0]!.querySelector("a")?.textContent).toContain(titleOf(now["w01-d5:review-1"]!)));
  });

  it("logging a review problem completes only that slot and removes its Re-roll; the other slot can still be re-rolled", async () => {
    const { db, user } = await setup("2026-10-30");
    await waitFor(() => expect(reviewRows()).toHaveLength(2));
    const drawn = (await db.dayDraws.get("w01-d5:review-1"))!;
    await user.click(within(reviewRows()[0]!).getByRole("checkbox"));
    const dialog = within(await screen.findByRole("dialog", { name: "Log review problem" }));
    await user.click(dialog.getByLabelText("Needed hint"));
    await user.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(async () => expect(await db.completions.get("w01-d5:review-1")).toMatchObject({ planDayId: "w01-d5" }));
    expect((await db.completions.toArray()).map((c) => c.itemId)).toEqual(["w01-d5:review-1"]); // only the slot
    expect(await db.attempts.toArray()).toMatchObject([{ problemId: drawn.problemId, outcome: "hint", isRedo: false }]);
    expect((await db.dayDraws.get("w01-d5:review-1"))!.attemptId).toBeDefined();
    await waitFor(() => expect(within(reviewRows()[0]!).queryByRole("button", { name: "Re-roll" })).not.toBeInTheDocument());
    expect(within(reviewRows()[1]!).getByRole("button", { name: "Re-roll" })).toBeInTheDocument();
    expect(within(reviewRows()[0]!).getByRole("checkbox")).toBeChecked();

    // unticking undoes the attempt and the lock: Re-roll is back
    await user.click(within(reviewRows()[0]!).getByRole("checkbox"));
    await waitFor(async () => expect(await db.completions.count()).toBe(0));
    expect(await db.attempts.count()).toBe(0);
    await waitFor(() => expect(within(reviewRows()[0]!).getByRole("button", { name: "Re-roll" })).toBeInTheDocument());
  });

  it("a review problem solved before is repeated like any other: a second attempt on the same problem", async () => {
    const { db, user } = await setup("2026-10-30", async (d) => {
      await d.dayDraws.bulkAdd([
        { slotId: "w01-d5:review-1", planDayId: "w01-d5", problemId: "w01-d1-p1", drawnOn: "2026-10-30" },
        { slotId: "w01-d5:review-2", planDayId: "w01-d5", problemId: "w01-d2-p1", drawnOn: "2026-10-30" },
      ]);
      await d.completions.put({ itemId: "w01-d1-p1", planDayId: "w01-d1", completedOn: "2026-10-26", attemptId: 1 });
      await d.attempts.add({ id: 1, problemId: "w01-d1-p1", date: "2026-10-26", outcome: "alone", minutes: 10, isRedo: false });
    });
    await waitFor(() => expect(reviewRows()).toHaveLength(2));
    expect(within(reviewRows()[0]!).getByRole("link", { name: /Plus One/ })).toBeInTheDocument(); // drawn though already solved
    await user.click(within(reviewRows()[0]!).getByRole("checkbox"));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Save" }));
    await waitFor(async () => expect(await db.attempts.count()).toBe(2));
    expect(await db.completions.get("w01-d1-p1")).toMatchObject({ completedOn: "2026-10-26" }); // untouched
    expect(await db.completions.get("w01-d5:review-1")).toBeTruthy();
  });

  it("plan days 1-4 and the wrap-up have no review slots", async () => {
    const { db } = await setup("2026-10-29"); // Week 1 Day 4
    await new Promise((r) => setTimeout(r, 60)); // give a (wrong) draw time to happen
    expect(checklist().queryByText(/Review/)).not.toBeInTheDocument();
    expect(await db.dayDraws.count()).toBe(0);
  });

  it("missed days' review problems show in the catch-up queue once drawn, and ticking one completes only that slot", async () => {
    const { db, user } = await setup("2026-11-01"); // Week 1 Day 7; Days 5 and 6 were missed
    await waitFor(async () => expect(await db.dayDraws.count()).toBe(6)); // today's two + days 5 and 6
    const queue = () => within(screen.getByRole("region", { name: "Catch-up queue" }));
    const slot = (await db.dayDraws.get("w01-d5:review-1"))!;
    const row = await waitFor(() => {
      const li = queue().getAllByRole("listitem").find((x) => x.textContent?.includes(titleOf(slot.problemId)) && x.textContent?.includes("from Fri 30 Oct"));
      expect(li).toBeTruthy();
      return li!;
    });
    await user.click(within(row).getByRole("checkbox"));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Save" }));
    await waitFor(async () => expect(await db.completions.get("w01-d5:review-1")).toMatchObject({ completedOn: "2026-11-01", planDayId: "w01-d5" }));
    expect(await db.completions.get(slot.problemId)).toBeUndefined();
  });
});

// helper kept below the tests so they read top-down
async function await_ids(db: DsaDB) {
  return Object.fromEntries((await db.dayDraws.toArray()).map((d) => [d.slotId, d.problemId])) as Record<string, string>;
}
