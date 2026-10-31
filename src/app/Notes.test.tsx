import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { startMockRun } from "../lib/actions";
import { curriculum } from "../lib/curriculum";
import { DsaDB, exportAll } from "../lib/db";
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

const TODAY = "2026-10-28";
async function setup(path = "/", seed?: (db: DsaDB) => Promise<void>) {
  const db = new DsaDB(`notes-ui-${n++}`);
  dbs.push(db);
  await seed?.(db);
  const view = render(
    <PlanProvider db={db} today={TODAY}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("navigation", { name: "Main" });
  return { db, view, user: userEvent.setup() };
}
const drawer = () => within(screen.getByRole("dialog", { name: "Notes" }));
const notesButton = () => screen.queryByRole("button", { name: /^Notes/ });
const note = (date: string, text: string, extra: Record<string, unknown> = {}) => ({ date, text, createdAt: `${date}T10:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z`, ...extra });
const liveRun = (number: number, patch: Record<string, unknown> = {}) => ({
  ...buildMockRun(number, { curriculum, questions: bank.questions, debugSnippets, cards: [], answers: [], attempts: [], sessions: [], practicalIds: new Set(practicalTasks.keys()), today: TODAY, rng: mulberry32(11) })!,
  ...patch,
});

describe("Notes button and shortcut", () => {
  it("floats on every page, including a live mock", async () => {
    const first = await setup("/");
    expect(notesButton()).toBeInTheDocument();
    first.view.unmount();
    for (const path of ["/calendar", "/weeks", "/problems", "/mocks", "/dashboard", "/settings"]) {
      const { view } = await setup(path);
      expect(notesButton(), path).toBeInTheDocument();
      view.unmount();
    }
    const { view } = await setup("/mock/1", async (db) => void (await startMockRun(db, liveRun(1))));
    await screen.findByText(/Question 1 of 18/);
    expect(notesButton()).toBeInTheDocument();
    view.unmount();
  });

  it("N opens the drawer on today, Escape closes it, and N is ignored while typing in a field", async () => {
    const { user } = await setup("/settings");
    await user.keyboard("n");
    expect(drawer().getByLabelText("Notes for date")).toHaveValue(TODAY);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Notes" })).not.toBeInTheDocument();
    expect(notesButton()).toBeInTheDocument();

    const field = screen.getByLabelText("Plan starts on");
    await user.click(field);
    expect(field).toHaveFocus();
    await user.keyboard("n");
    expect(screen.queryByRole("dialog", { name: "Notes" })).not.toBeInTheDocument(); // typing in a field
  });

  it("N with a modifier key does not open it", async () => {
    const { user } = await setup("/");
    await user.keyboard("{Control>}n{/Control}");
    expect(screen.queryByRole("dialog", { name: "Notes" })).not.toBeInTheDocument();
  });
});

describe("the drawer", () => {
  it("adds several notes to today, saves as you type, keeps line breaks, and they survive a reload", async () => {
    const { db, user, view } = await setup("/");
    await user.click(notesButton()!);
    await user.click(drawer().getByRole("button", { name: "Add note" }));
    await user.type(await drawer().findByLabelText("Note text"), "first line{Enter}second line");
    await waitFor(async () => expect((await db.dayNotes.toArray())[0]).toMatchObject({ date: TODAY, text: "first line\nsecond line" }), { timeout: 3000 });
    await user.click(drawer().getByRole("button", { name: "Add note" }));
    const boxes = await drawer().findAllByLabelText("Note text");
    expect(boxes).toHaveLength(2);
    await user.type(boxes[1]!, "another note");
    await user.keyboard("{Escape}"); // closing flushes at once
    await waitFor(async () => expect(await db.dayNotes.count()).toBe(2));
    expect((await db.dayNotes.toArray()).map((r) => r.text).sort()).toEqual(["another note", "first line\nsecond line"]);
    expect((await db.dayNotes.toArray()).every((r) => r.mockNumber === undefined)).toBe(true);

    view.unmount();
    render(
      <PlanProvider db={db} today={TODAY}>
        <MemoryRouter><App /></MemoryRouter>
      </PlanProvider>,
    );
    await user.click(await screen.findByRole("button", { name: /^Notes/ }));
    const again = await drawer().findAllByLabelText("Note text");
    expect(again.map((t) => (t as HTMLTextAreaElement).value).sort()).toEqual(["another note", "first line\nsecond line"]);
  });

  it("edits an existing note, and deletes one only after confirming", async () => {
    const { db, user } = await setup("/", async (d) => void (await d.dayNotes.add(note(TODAY, "old text"))));
    await user.click(notesButton()!);
    const box = await drawer().findByLabelText("Note text");
    await user.clear(box);
    await user.type(box, "new text");
    await user.tab();
    await waitFor(async () => expect((await db.dayNotes.toArray())[0]!.text).toBe("new text"));
    expect((await db.dayNotes.toArray())[0]!.updatedAt).not.toBe(`${TODAY}T10:00:00.000Z`);
    expect((await db.dayNotes.toArray())[0]!.createdAt).toBe(`${TODAY}T10:00:00.000Z`);

    await user.click(drawer().getByRole("button", { name: "Delete note" }));
    expect(await db.dayNotes.count()).toBe(1);
    await user.click(drawer().getByRole("button", { name: "Keep it" }));
    expect(await db.dayNotes.count()).toBe(1);
    await user.click(drawer().getByRole("button", { name: "Delete note" }));
    await user.click(drawer().getByRole("button", { name: "Yes, delete" }));
    await waitFor(async () => expect(await db.dayNotes.count()).toBe(0));
    expect(await drawer().findByText("No notes for this day yet.")).toBeInTheDocument();
  });

  it("the date picker shows another day's notes and adds to that day; Today brings you back", async () => {
    const { db, user } = await setup("/", async (d) => {
      await d.dayNotes.bulkAdd([note(TODAY, "today's note"), note("2026-10-20", "older note A"), note("2026-10-20", "older note B")]);
    });
    await user.click(notesButton()!);
    expect((await drawer().findAllByLabelText("Note text")).map((t) => (t as HTMLTextAreaElement).value)).toEqual(["today's note"]);
    const picker = drawer().getByLabelText("Notes for date");
    fireEvent.change(picker, { target: { value: "2026-10-20" } });
    await waitFor(() => expect(drawer().getAllByLabelText("Note text")).toHaveLength(2));
    expect(drawer().getAllByLabelText("Note text").map((t) => (t as HTMLTextAreaElement).value)).toEqual(["older note A", "older note B"]);
    await user.click(drawer().getByRole("button", { name: "Add note" }));
    await user.type((await drawer().findAllByLabelText("Note text"))[2]!, "third");
    await user.tab();
    await waitFor(async () => expect((await db.dayNotes.where("date").equals("2026-10-20").toArray()).map((r) => r.text).sort()).toEqual(["older note A", "older note B", "third"]));
    await user.click(drawer().getByRole("button", { name: "Today" }));
    await waitFor(() => expect(drawer().getAllByLabelText("Note text")).toHaveLength(1));
  });

  it("an 'Add note' that is never typed into is not kept", async () => {
    const { db, user } = await setup("/");
    await user.click(notesButton()!);
    await user.click(drawer().getByRole("button", { name: "Add note" }));
    await drawer().findByLabelText("Note text");
    await user.keyboard("{Escape}");
    await waitFor(async () => expect(await db.dayNotes.count()).toBe(0));
  });
});

describe("notes during a mock", () => {
  it("tags notes written during a mock with its number, and the tag shows in the drawer", async () => {
    const { db, user } = await setup("/mock/3", async (d) => void (await startMockRun(d, liveRun(3))));
    await screen.findByText(/Question 1 of 18/);
    await user.click(notesButton()!);
    await waitFor(async () => expect(true).toBe(true));
    await user.click(drawer().getByRole("button", { name: "Add note" }));
    await user.type(await drawer().findByLabelText("Note text"), "careful with this one");
    await user.tab();
    await waitFor(async () => expect((await db.dayNotes.toArray())[0]).toMatchObject({ text: "careful with this one", mockNumber: 3, date: TODAY }));
    expect(drawer().getByText("Mock 3")).toBeInTheDocument();
  });

  it("typing in the drawer does not answer or advance the mock, which keeps its state", async () => {
    const { db, user } = await setup("/mock/1", async (d) => void (await startMockRun(d, liveRun(1, { answers: [true, false], picks: [0, 1], timer: { phase: "A", elapsedSec: 60, runningSince: null, addedMinutes: 0 } }))));
    await screen.findByText(/Question 3 of 18/);
    await user.click(notesButton()!);
    await user.click(drawer().getByRole("button", { name: "Add note" }));
    await user.type(await drawer().findByLabelText("Note text"), "1234{Enter}12{Enter}1");
    expect((await db.mockRuns.get(1))!.answers).toEqual([true, false]); // nothing was answered
    // Enter and digits on a focused drawer button do nothing either
    drawer().getByRole("button", { name: "Add note" }).focus();
    await user.keyboard("{Enter}1");
    expect((await db.mockRuns.get(1))!.answers).toEqual([true, false]);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Notes" })).not.toBeInTheDocument());
    expect(screen.getByText(/Question 3 of 18/)).toBeInTheDocument(); // same question
    expect(screen.getByLabelText("Timer")).toHaveTextContent("1:00");
    expect((await db.mockRuns.get(1))!.phase).toBe("A");
    // and the shortcuts work again once it is closed
    await user.keyboard("1");
    await waitFor(async () => expect((await db.mockRuns.get(1))!.answers).toHaveLength(3)); // "1" answers question 3 again
  });

  it("typing the letter n in a mock's own text field does not open Notes", async () => {
    const { user } = await setup("/mock/1", async (d) => void (await startMockRun(d, liveRun(1, { phase: "B" }))));
    await user.type(await screen.findByLabelText(/Approach/), "nnn banana");
    expect(screen.queryByRole("dialog", { name: "Notes" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Approach/)).toHaveValue("nnn banana");
  });

  it("a half-typed Program 1 form is untouched by writing a note", async () => {
    const { user } = await setup("/mock/1", async (d) => void (await startMockRun(d, liveRun(1, { phase: "B" }))));
    await user.type(await screen.findByLabelText(/Approach/), "my approach");
    await user.click(notesButton()!);
    await user.click(drawer().getByRole("button", { name: "Add note" }));
    await user.type(await drawer().findByLabelText("Note text"), "n n n 1 2 3");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Notes" })).not.toBeInTheDocument());
    expect(screen.getByLabelText(/Approach/)).toHaveValue("my approach");
  });
});

describe("notes on the Calendar", () => {
  it("day details list that day's notes with line breaks and the mock tag, and open the drawer on that day", async () => {
    const { user } = await setup("/calendar", async (d) => {
      await d.dayNotes.bulkAdd([note("2026-10-27", "line a\nline b"), note("2026-10-27", "from a mock", { mockNumber: 2, createdAt: "2026-10-27T11:00:00.000Z" }), note("2026-10-28", "today only")]);
    });
    const page = within(screen.getByRole("main"));
    await user.click(page.getByRole("gridcell", { name: /Tue 27 Oct/ }));
    const box = within(page.getByLabelText("Day notes"));
    const first = await box.findByText(/line a/);
    expect(first.textContent).toContain("line a\nline b"); // line breaks kept
    expect(first).toHaveClass("whitespace-pre-wrap");
    expect(box.getByText(/from a mock/)).toBeInTheDocument();
    expect(box.getByText("Mock 2")).toBeInTheDocument();
    expect(box.queryByText(/today only/)).not.toBeInTheDocument();
    await user.click(box.getByRole("button", { name: "Edit notes" }));
    expect(drawer().getByLabelText("Notes for date")).toHaveValue("2026-10-27");
    expect(drawer().getAllByLabelText("Note text")).toHaveLength(2);
  });

  it("a day with no notes offers 'Add a note'", async () => {
    const { user } = await setup("/calendar");
    const page = within(screen.getByRole("main"));
    await user.click(page.getByRole("gridcell", { name: /Wed 28 Oct/ }));
    await user.click(within(page.getByLabelText("Day notes")).getByRole("button", { name: "Add a note" }));
    expect(drawer().getByLabelText("Notes for date")).toHaveValue("2026-10-28");
  });

  it("the search finds notes (and study logs), and a hit opens its day", async () => {
    const { user } = await setup("/calendar", async (d) => {
      await d.dayNotes.bulkAdd([note("2026-10-27", "remember the sliding window trick"), note("2026-10-26", "unrelated")]);
    });
    const page = within(screen.getByRole("main"));
    await user.type(page.getByRole("searchbox", { name: "Search study logs" }), "SLIDING");
    const hits = within(await page.findByLabelText("Study log results"));
    const result = hits.getByLabelText("Note result");
    expect(result).toHaveTextContent("Note · Tue 27 Oct");
    expect(result).toHaveTextContent("sliding window trick");
    expect(hits.queryByText(/unrelated/)).not.toBeInTheDocument();
    await user.click(within(result).getByRole("button"));
    expect(drawer().getByLabelText("Notes for date")).toHaveValue("2026-10-27");
    await user.keyboard("{Escape}");
    await user.clear(page.getByRole("searchbox", { name: "Search study logs" }));
    await user.type(page.getByRole("searchbox", { name: "Search study logs" }), "zzzz");
    expect(await page.findByText("No matches.")).toBeInTheDocument();
  });
});

describe("export", () => {
  it("includes the notes", async () => {
    const { db } = await setup("/", async (d) => void (await d.dayNotes.add(note(TODAY, "export me"))));
    expect((await exportAll(db)).dayNotes).toMatchObject([{ text: "export me" }]);
  });
});
