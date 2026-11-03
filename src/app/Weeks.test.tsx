import "fake-indexeddb/auto";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { curriculum } from "../lib/curriculum";
import { DsaDB } from "../lib/db";
import { WeeksPage } from "../features/weeks/WeeksPage";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

async function renderWeeks(today: string, seed?: (db: DsaDB) => Promise<void>) {
  const db = new DsaDB(`weeks-${n++}`);
  dbs.push(db);
  await seed?.(db);
  render(
    <PlanProvider db={db} today={today}>
      <MemoryRouter initialEntries={["/weeks"]}>
        <Routes>
          <Route path="*" element={<WeeksPage />} />
        </Routes>
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("heading", { level: 1, name: "Weeks" });
  return { db, user: userEvent.setup() };
}

const panel = () => within(screen.getByRole("tabpanel"));

// The old Weeks page is no longer routed (the Content page replaced it) but its code is kept, so its tests are too.
describe("Weeks page (legacy, unrouted)", () => {
  it("opens on the current week with Concepts, Templates and Problems tabs (no Visuals yet)", async () => {
    await renderWeeks("2026-10-27");
    expect(screen.getByLabelText("Week")).toHaveValue("1");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Concepts", "Visuals", "Templates", "Problems"]);
    expect(screen.getByRole("tab", { name: "Concepts" })).toHaveAttribute("aria-selected", "true");
  });

  it("Concepts: one card per concept in the curriculum, with a worked Python example each", async () => {
    await renderWeeks("2026-10-27");
    const concepts = curriculum.weeks[0]!.concepts;
    for (const c of concepts) expect(panel().getByRole("heading", { name: c })).toBeInTheDocument();
    expect(panel().getAllByRole("region", { name: "Python code" })).toHaveLength(concepts.length);
    expect(panel().getByText(/O\(1\) average, O\(n\) worst case/)).toBeInTheDocument(); // the cost table
  });

  it("Templates: the four templates, each a heading, a Python block and a 'Use when' note", async () => {
    const { user } = await renderWeeks("2026-10-27");
    await user.click(screen.getByRole("tab", { name: "Templates" }));
    const templates = curriculum.weeks[0]!.templates;
    expect(templates).toHaveLength(4);
    for (const t of templates) expect(panel().getByRole("heading", { name: t })).toBeInTheDocument();
    expect(panel().getAllByRole("region", { name: "Python code" })).toHaveLength(4);
    expect(panel().getAllByText(/Use when/)).toHaveLength(4);
  });

  it("Problems: the week's days with kinds, mocks, problems, the fallback and attempt status", async () => {
    const { user } = await renderWeeks("2026-10-27", async (db) => {
      await db.attempts.add({ problemId: "w01-d1-p1", date: "2026-10-26", outcome: "hint", minutes: 20, isRedo: false });
    });
    await user.click(screen.getByRole("tab", { name: "Problems" }));
    const days = within(panel().getByRole("list", { name: "Week 1 days" }));
    expect(days.getAllByRole("heading", { level: 3 })).toHaveLength(7);
    expect(days.getByText(/Day 1/).closest("li")!).not.toHaveTextContent(/Mock/); // mocks are not on any day
    expect(days.getByText(/Day 5/).closest("li")!).toHaveTextContent("+ 2 review problems, drawn when you open the day.");
    expect(days.getByRole("link", { name: "Plus One" })).toHaveAttribute("href", "/problems/w01-d1-p1");
    expect(days.getByText("Needed hint")).toBeInTheDocument();
    expect(days.getByRole("link", { name: "Set Matrix Zeroes" }).closest("li")).toHaveTextContent("fallback if no redos are due");
    expect(days.getAllByText("HackerRank").length).toBeGreaterThan(0); // Python fluency day
  });

  it("switching week shows that week; a week with no lesson files says so", async () => {
    const { user } = await renderWeeks("2026-10-27");
    await user.selectOptions(screen.getByLabelText("Week"), "5"); // Week 5 has no lesson files yet
    expect(panel().getByText("No concept notes written for Week 5 yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Templates" }));
    expect(panel().getByText("No templates written for Week 5 yet.")).toBeInTheDocument();
  });

  it("Visuals tab lists the week's planned visuals as clear 'not built yet' placeholders, with a coming note", async () => {
    const { user } = await renderWeeks("2026-10-27");
    await user.click(screen.getByRole("tab", { name: "Visuals" }));
    const list = within(panel().getByRole("list", { name: "Week 1 visuals" }));
    expect(list.getAllByRole("listitem")).toHaveLength(4);
    expect(list.getByRole("listitem", { name: "Growth-rate race: O(1) … O(n!)" })).toHaveTextContent("Not built yet");
    expect(list.getAllByText(/Not built yet/)).toHaveLength(4);
    expect(panel().getByRole("note")).toHaveTextContent(/Coming/);
    expect(panel().queryByRole("img")).not.toBeInTheDocument(); // no fake diagrams
    await user.selectOptions(screen.getByLabelText("Week"), "2");
    expect(within(panel().getByRole("list", { name: "Week 2 visuals" })).getAllByRole("listitem")).toHaveLength(2);
  });

  it("old-topic problems are listed without any source week", async () => {
    const { user } = await renderWeeks("2026-11-05");
    expect(screen.getByLabelText("Week")).toHaveValue("2");
    await user.click(screen.getByRole("tab", { name: "Problems" }));
    const row = within(panel().getByRole("list", { name: "Week 2 days" })).getByRole("link", { name: "Reverse Words in a String" }).closest("li")!;
    expect(row.textContent).not.toMatch(/week/i);
    expect(panel().getByRole("list", { name: "Week 2 days" }).textContent).not.toMatch(/Week 1\b/);
  });
});
