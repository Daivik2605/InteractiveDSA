import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DsaDB } from "../lib/db";
import { bank } from "../lib/questions";
import type { Question } from "../types/content";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

async function renderApp(opts: { today: string; path: string; seed?: (db: DsaDB) => Promise<void> }) {
  const db = new DsaDB(`quiz-ui-${n++}`);
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

/** The bank question currently on screen (prompts are unique). */
function onScreen(): Question {
  const text = screen.getByRole("region", { name: "Question" }).textContent!;
  return bank.questions.find((q) => text.includes(q.prompt))!;
}
const optionTexts = () => within(screen.getByRole("group", { name: "Answer options" })).getAllByRole("button").map((b) => b.textContent!.slice(1));

/** Answer the on-screen question with the keyboard, then press Enter. */
async function answer(user: ReturnType<typeof userEvent.setup>, wantCorrect: boolean) {
  const q = onScreen();
  const texts = optionTexts();
  const right = texts.indexOf(q.options[q.answer]!);
  const idx = wantCorrect ? right : texts.findIndex((_, i) => i !== right);
  await user.keyboard(String(idx + 1));
  expect(await screen.findByRole("status")).toHaveTextContent(wantCorrect ? "✓ Correct" : "✗ Incorrect");
  expect(screen.getByRole("status")).toHaveTextContent(q.explanation.slice(0, 30));
  await user.keyboard("{Enter}");
  return q;
}

describe("weekly quiz", () => {
  it("runs end to end by keyboard: saves answers and cards, shows results, retries missed, ticks the learn item once", async () => {
    const { db, user } = await renderApp({ today: "2026-10-27", path: "/quiz/week/1" });
    const total = bank.questions.filter((q) => q.week === 1).length;
    expect(await screen.findByRole("region", { name: "Question" })).toHaveTextContent(`Question 1 of ${total}`);

    const wrongIds: string[] = [];
    for (let i = 0; i < total; i++) {
      const wantCorrect = i >= 2; // miss the first two
      const q = await answer(user, wantCorrect);
      if (!wantCorrect) wrongIds.push(q.id);
    }

    const results = within(await screen.findByRole("region", { name: "Results" }));
    expect(results.getByRole("heading", { level: 2 })).toHaveTextContent(`Week 1 quiz: ${total - 2} / ${total}`);
    expect(results.getByRole("table", { name: "Score by question type" })).toBeInTheDocument();
    expect(results.getByText("Missed questions")).toBeInTheDocument();

    const saved = await db.quizAnswers.toArray();
    expect(saved).toHaveLength(total);
    expect(saved.every((a) => a.mode === "weekly" && !!a.answeredAt)).toBe(true);
    expect(saved.filter((a) => !a.correct).map((a) => a.questionId).sort()).toEqual([...wrongIds].sort());
    expect(await db.cards.count()).toBe(total);
    for (const id of wrongIds) expect((await db.cards.get(id))!.box).toBe(1);
    await waitFor(async () => expect(await db.completions.get("w01-d2:learn")).toMatchObject({ completedOn: "2026-10-27", planDayId: "w01-d2" }));

    // retry missed: only the missed ones, saved too, and nothing else gets ticked
    await user.click(results.getByRole("button", { name: "Retry missed (2)" }));
    expect(await screen.findByRole("region", { name: "Question" })).toHaveTextContent("Question 1 of 2");
    await answer(user, true);
    await answer(user, true);
    expect(await screen.findByRole("heading", { name: /\(retry\): 2 \/ 2/ })).toBeInTheDocument();
    expect(await db.quizAnswers.count()).toBe(total + 2);
    expect(await db.completions.count()).toBe(1);
    expect(screen.queryByRole("button", { name: /Retry missed/ })).not.toBeInTheDocument();
  });

  it("answers by click too, and can't be answered twice", async () => {
    const { db, user } = await renderApp({ today: "2026-10-27", path: "/quiz/week/1" });
    await screen.findByRole("region", { name: "Question" });
    const q = onScreen();
    const buttons = within(screen.getByRole("group", { name: "Answer options" })).getAllByRole("button");
    await user.click(buttons[optionTexts().indexOf(q.options[q.answer]!)]!);
    await screen.findByRole("status");
    await user.keyboard("1");
    expect(await db.quizAnswers.count()).toBe(1);
  });

  it("shows a friendly message for a week with no questions", async () => {
    await renderApp({ today: "2026-10-27", path: "/quiz/week/2" });
    expect(await main().findByText(/No questions for Week 2 yet/)).toBeInTheDocument();
  });

  it("is linked from Today's learn item and the hub", async () => {
    const { user } = await renderApp({ today: "2026-10-27", path: "/" });
    await user.click(within(screen.getByRole("region", { name: "Today's checklist" })).getByRole("link", { name: "Start weekly quiz" }));
    expect(await main().findByRole("heading", { level: 1, name: /Weekly quiz · Week 1/ })).toBeInTheDocument();
  });

  it("hub lists every week at any time: startable ones link to their quiz, others say there are no questions yet", async () => {
    // Day 1 (not the quiz day), Day 5 and before the start: Week 1's quiz is always available.
    for (const today of ["2026-10-26", "2026-10-30", "2026-10-20"]) {
      const { user } = await renderApp({ today, path: "/quiz" });
      const weekly = within(await main().findByRole("region", { name: "Weekly quizzes" }));
      expect(weekly.getAllByRole("listitem")).toHaveLength(13);
      expect(weekly.getByRole("link", { name: /Start.*Week 1 quiz/ })).toHaveAttribute("href", "/quiz/week/1");
      expect(weekly.queryByRole("link", { name: /Week 2 quiz/ })).not.toBeInTheDocument();
      expect(weekly.getAllByRole("listitem")[1]).toHaveTextContent(/Week 2 ·.*no questions yet/);
      await user.click(weekly.getByRole("link", { name: /Start.*Week 1 quiz/ }));
      expect(await screen.findByRole("region", { name: "Question" })).toBeInTheDocument();
      cleanup();
    }
  });

  it("the Quizzes nav link opens the hub", async () => {
    const { user } = await renderApp({ today: "2026-10-26", path: "/" });
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Quizzes" }));
    expect(await main().findByRole("heading", { level: 1, name: "Quizzes & drills" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Quizzes" })).toHaveAttribute("aria-current", "page");
  });

  it("hub lists the number of due cards", async () => {
    const { user } = await renderApp({
      today: "2026-10-27",
      path: "/",
      seed: async (d) => void (await d.cards.bulkPut([{ questionId: "w01-q01", box: 1, dueOn: "2026-10-26" }, { questionId: "w01-q02", box: 2, dueOn: "2026-11-30" }])),
    });
    await user.click(main().getByRole("link", { name: "Quizzes & drills" }));
    expect(await main().findByRole("heading", { level: 1, name: "Quizzes & drills" })).toBeInTheDocument();
    expect(await within(main().getByRole("region", { name: "Weekly quizzes" })).findByRole("link", { name: /Start.*Week 1 quiz/ })).toHaveAttribute("href", "/quiz/week/1");
    expect(await main().findByText("1 card due.")).toBeInTheDocument();
  });
});

describe("review quiz", () => {
  it("asks due cards first, lowest box first", async () => {
    const { user } = await renderApp({
      today: "2026-11-03", // week 2: week 1 is an earlier week
      path: "/quiz/review",
      seed: async (d) => {
        await d.cards.bulkPut([
          { questionId: "w01-q05", box: 3, dueOn: "2026-11-02" },
          { questionId: "w01-q03", box: 1, dueOn: "2026-11-02" },
          { questionId: "w01-q02", box: 4, dueOn: "2027-01-01" }, // not due
        ]);
        await d.quizAnswers.bulkAdd(["w01-q05", "w01-q03", "w01-q02"].map((id) => ({ questionId: id, correct: true, answeredAt: "2026-10-30T10:00:00.000Z", mode: "weekly" as const })));
      },
    });
    await screen.findByRole("region", { name: "Question" });
    expect(onScreen().id).toBe("w01-q03");
    await user.keyboard("{Enter}"); // ignored until answered
    expect(onScreen().id).toBe("w01-q03");
    await answer(user, true);
    expect(onScreen().id).toBe("w01-q05"); // next due card (box 3); q02 isn't due
  });

  it("on week 1 day 7 (no earlier weeks) asks last time's wrong answers first, then ticks the review learn item", async () => {
    const { db, user } = await renderApp({
      today: "2026-11-01", // w01-d7
      path: "/quiz/review",
      seed: async (d) =>
        void (await d.quizAnswers.add({ questionId: "w01-q04", correct: false, answeredAt: "2026-10-28T10:00:00.000Z", mode: "weekly" })),
    });
    await screen.findByRole("region", { name: "Question" });
    expect(onScreen().id).toBe("w01-q04");
    const total = bank.questions.filter((q) => q.week === 1).length;
    for (let i = 0; i < total; i++) await answer(user, true);
    await screen.findByRole("region", { name: "Results" });
    await waitFor(async () => expect(await db.completions.get("w01-d7:learn")).toMatchObject({ completedOn: "2026-11-01" }));
    const modes = new Set((await db.quizAnswers.toArray()).slice(1).map((a) => a.mode));
    expect(modes).toEqual(new Set(["review"]));
    expect((await db.cards.get("w01-q04"))!.box).toBe(1); // right answer from no card starts at box 1
  });
});

describe("pattern drill", () => {
  const prompt = () => screen.getByRole("region", { name: "Drill prompt" });
  /** Correct pattern for the on-screen prompt, from a drill prompt or a pattern question. */
  function correctPattern(): string {
    const text = prompt().textContent!;
    const d = bank.drill.find((x) => text.includes(x.description));
    if (d) return d.answer;
    const q = bank.questions.find((x) => x.type === "pattern" && text.includes(x.prompt))!;
    return q.options[q.answer]!;
  }
  const options = () => within(screen.getByRole("group", { name: "Pattern options" })).getAllByRole("button");

  it("runs ten (here: all available) prompts with six options, records time, shows per-pattern results and ticks the drill item", async () => {
    const { db, user } = await renderApp({ today: "2026-10-28", path: "/quiz/drill" }); // w01-d3 = pattern drill
    const expected = bank.drill.length + bank.questions.filter((q) => q.type === "pattern").length;
    await screen.findByRole("region", { name: "Drill prompt" });
    for (let i = 0; i < expected; i++) {
      const buttons = options();
      expect(buttons).toHaveLength(6);
      expect(screen.getByRole("timer")).toHaveTextContent(/^\d+s$/);
      const idx = buttons.findIndex((b) => b.textContent!.slice(1) === correctPattern());
      await user.keyboard(String(idx + 1));
      expect(await screen.findByRole("status")).toHaveTextContent("✓ Correct");
      await user.keyboard("{Enter}");
    }
    const results = within(await screen.findByRole("region", { name: "Results" }));
    expect(results.getByRole("heading", { level: 2 })).toHaveTextContent(`Drill: ${expected} / ${expected}`);
    expect(results.getByRole("table", { name: "Accuracy and average time per pattern" })).toBeInTheDocument();
    const saved = await db.quizAnswers.toArray();
    expect(saved).toHaveLength(expected);
    expect(saved.every((a) => a.mode === "drill" && typeof a.ms === "number" && a.ms >= 0 && a.ms <= 20000)).toBe(true);
    expect(await db.cards.count()).toBe(0); // drill answers don't move Leitner boxes
    await waitFor(async () => expect(await db.completions.get("w01-d3:learn")).toMatchObject({ completedOn: "2026-10-28" }));
    await user.click(results.getByRole("button", { name: "Drill again" }));
    expect(await screen.findByRole("region", { name: "Drill prompt" })).toBeInTheDocument();
    expect(await db.completions.count()).toBe(1);
  });

  it("running out of time (20 s) counts as wrong and records the full time", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    const { db } = await renderApp({ today: "2026-10-28", path: "/quiz/drill" });
    await screen.findByRole("region", { name: "Drill prompt" });
    expect(screen.getByRole("timer")).toHaveTextContent("20s");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_500);
    });
    expect(await screen.findByRole("status")).toHaveTextContent("✗ Time's up");
    await waitFor(async () => expect(await db.quizAnswers.toArray()).toMatchObject([{ mode: "drill", correct: false, ms: 20000 }]));
  });
});

describe("markdown and code highlighting", () => {
  it("renders markdown in the problem journal (no raw HTML) and highlights solution code with Shiki", async () => {
    await renderApp({
      today: "2026-10-27",
      path: "/problems/w01-d1-p1",
      seed: async (d) =>
        void (await d.problemEntries.put({
          problemId: "w01-d1-p1",
          description: "Find **any duplicate** with a `set`.\n\n- first\n- second\n\n[docs](https://example.com/d)\n\n<b id=\"raw\">raw html</b>",
          approach: "1. loop\n2. check",
          code: "def f(nums):\n    return len(set(nums)) != len(nums)",
          insight: "_sets_ dedupe",
          comments: "> a quote",
          tags: [],
          updatedOn: "2026-10-27",
        })),
    });
    const journal = within(await screen.findByRole("region", { name: "Journal entry" }));
    expect(journal.getByText("any duplicate").tagName).toBe("STRONG");
    expect(journal.getByText("set", { selector: "code" })).toBeInTheDocument();
    expect(journal.getAllByRole("listitem")).toHaveLength(2 + 2); // bullet list + numbered list
    expect(journal.getByRole("link", { name: "docs" })).toHaveAttribute("target", "_blank");
    expect(journal.getByText("sets", { exact: false }).tagName).toBe("EM");
    expect(document.querySelector("#raw")).toBeNull();
    // Shiki output replaces the plain fallback
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Solution" })).getByText("def").closest(".shiki")).not.toBeNull());
    expect(screen.getByRole("region", { name: "Solution" }).textContent).toContain("return len(set(nums)) != len(nums)");
  });

  it("edit mode previews the code with highlighting and returns to the rendered view after saving", async () => {
    const { db, user } = await renderApp({ today: "2026-10-27", path: "/problems/w01-d1-p1" });
    const form = within(await screen.findByRole("form", { name: "Journal" })); // empty entry opens in edit mode
    await user.type(form.getByLabelText(/Problem description/), "Use a **set**");
    await user.type(form.getByLabelText(/My solution/), "x = 1");
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Solution preview" })).getByText("x").closest(".shiki")).not.toBeNull());
    await user.click(form.getByRole("button", { name: "Save journal" }));
    const view = within(await screen.findByRole("region", { name: "Journal entry" }));
    expect(view.getByText("set").tagName).toBe("STRONG");
    expect(await db.problemEntries.get("w01-d1-p1")).toMatchObject({ description: "Use a **set**", code: "x = 1" });
    await user.click(view.getByRole("button", { name: "Edit journal" }));
    expect(await screen.findByRole("form", { name: "Journal" })).toBeInTheDocument();
  });

  it("renders study-log notes as markdown on Edit day and in the Calendar day details", async () => {
    const seed = async (d: DsaDB) => void (await d.dayLogs.put({ planDayId: "w01-d2", notes: "Read about **heaps**", minutes: 10, links: [], updatedOn: "2026-10-27" }));
    const { user } = await renderApp({ today: "2026-10-28", path: "/day/w01-d2", seed });
    const log = within(await screen.findByRole("region", { name: "Study log" }));
    expect(log.getByText("heaps").tagName).toBe("STRONG");
    await user.click(log.getByRole("button", { name: "Edit log" }));
    expect(log.getByLabelText(/Notes/)).toHaveValue("Read about **heaps**");
  });

  it("renders study-log notes as markdown in the Calendar day details", async () => {
    const { user } = await renderApp({
      today: "2026-10-28",
      path: "/calendar",
      seed: async (d) => void (await d.dayLogs.put({ planDayId: "w01-d2", notes: "Read about **heaps**", minutes: 10, links: [], updatedOn: "2026-10-27" })),
    });
    await user.click(main().getByRole("gridcell", { name: /Tue 27 Oct/ }));
    expect(within(main().getByLabelText("Day details")).getByText("heaps").tagName).toBe("STRONG");
  });
});

describe("attach or detach a found problem", () => {
  const found = { id: "c-f", week: 1, kind: "problem" as const, title: "Found One", difficulty: "Easy" as const, createdOn: "2026-10-26" };
  const day = () => within(screen.getByRole("region", { name: "Day" }));

  it("attaches to a day of its week, then detaches back to journal only", async () => {
    const { db, user } = await renderApp({ today: "2026-10-27", path: "/problems/c-f", seed: async (d) => void (await d.customItems.add(found)) });
    expect(await day().findByText(/Journal only: it never/)).toBeInTheDocument();
    const select = day().getByLabelText(/Attach to a day in Week 1/);
    const labels = within(select).getAllByRole("option").map((o) => o.textContent);
    expect(labels).toEqual(expect.arrayContaining(["Journal only (no day)", "Wed 28 Oct · Day 3"]));
    expect(labels.some((l) => l!.includes("2 Nov"))).toBe(false); // week 2 days aren't offered
    expect(day().getByRole("button", { name: "Detach" })).toBeDisabled(); // nothing changed yet

    await user.selectOptions(select, "Wed 28 Oct · Day 3");
    await user.click(day().getByRole("button", { name: "Attach" }));
    await waitFor(async () => expect((await db.customItems.get("c-f"))!.planDayId).toBe("w01-d3"));
    expect(await day().findByText(/counts toward that day/)).toBeInTheDocument();

    await user.selectOptions(day().getByLabelText(/Attach to a day in Week 1/), "Journal only (no day)");
    await user.click(day().getByRole("button", { name: "Detach" }));
    await waitFor(async () => expect("planDayId" in (await db.customItems.get("c-f"))!).toBe(false));
    expect(await day().findByText(/Journal only: it never affects/)).toBeInTheDocument();
  });

  it("is locked while the problem is ticked", async () => {
    await renderApp({
      today: "2026-10-27",
      path: "/problems/c-f",
      seed: async (d) => {
        await d.customItems.add({ ...found, planDayId: "w01-d1" });
        await d.completions.put({ itemId: "c-f", planDayId: "w01-d1", completedOn: "2026-10-26" });
      },
    });
    expect(await day().findByLabelText(/Attach to a day in Week 1/)).toBeDisabled();
    expect(day().getByText("Untick it before changing its day.")).toBeInTheDocument();
  });

  it("isn't offered for plan problems", async () => {
    await renderApp({ today: "2026-10-27", path: "/problems/w01-d1-p1" });
    await screen.findByRole("heading", { level: 1, name: "Contains Duplicate" });
    expect(screen.queryByRole("region", { name: "Day" })).not.toBeInTheDocument();
  });
});
