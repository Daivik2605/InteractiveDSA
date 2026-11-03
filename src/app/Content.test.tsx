import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DsaDB, exportAll, importAll, resetAll, saveSettings } from "../lib/db";
import type { ResourcesFile } from "../types/content";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const state = vi.hoisted(() => ({ res: undefined as unknown }));
vi.mock("../lib/resources", async (orig) => ({ ...(await orig<typeof import("../lib/resources")>()), getResources: () => state.res }));

const link = (n: number) => ({ site: `Site${n}`, title: `Guide ${n}`, url: `https://example.com/${n}` });
const FIXTURE: ResourcesFile = {
  version: 1,
  checkedOn: "2026-11-01",
  note: "fixture",
  roadmap: { title: "Roadmap", url: "https://neetcode.io/roadmap" },
  weeks: [
    {
      week: 1,
      title: "Python toolkit",
      neetcode: "Arrays & Hashing",
      topics: [
        { id: "ds-array", title: "Arrays", kind: "data-structure", structure: "Array / list", resources: [link(1), link(2)] },
        { id: "ds-hash-1", title: "Hash basics", kind: "data-structure", structure: "Hash table (dict, set)", resources: [link(3), link(4)] },
        { id: "p-sliding", title: "Sliding window", kind: "pattern", resources: [link(5), link(6)] },
        { id: "c-bigo", title: "Big-O reading", kind: "concept", resources: [link(7), link(8)] },
      ],
    },
    {
      week: 2,
      title: "Hashing",
      neetcode: "Hashing and Prefix",
      topics: [
        { id: "ds-hash-2", title: "Hash collisions", kind: "data-structure", structure: "Hash table (dict, set)", resources: [link(9), link(10)] },
        { id: "p-prefix", title: "Prefix sums", kind: "pattern", resources: [link(11), link(12)] },
      ],
    },
  ],
};

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  state.res = undefined;
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

function Probe() {
  const l = useLocation();
  return <output aria-label="location">{l.pathname + l.search}</output>;
}

function mount(db: DsaDB, today: string, path: string) {
  return render(
    <PlanProvider db={db} today={today}>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <Probe />
      </MemoryRouter>
    </PlanProvider>,
  );
}

async function renderContent(path = "/content", opts: { today?: string; seed?: (db: DsaDB) => Promise<void>; db?: DsaDB } = {}) {
  const db = opts.db ?? new DsaDB(`content-${n++}`);
  if (!opts.db) dbs.push(db);
  await opts.seed?.(db);
  const view = mount(db, opts.today ?? "2026-10-27", path);
  await screen.findByRole("heading", { level: 1, name: path.startsWith("/settings") ? "Settings" : "Content" });
  return { db, user: userEvent.setup(), view };
}

const panel = () => within(screen.getByRole("tabpanel"));
const where = () => screen.getByLabelText("location").textContent;
const tab = (name: string) => screen.getByRole("tab", { name });

describe("Content page: navigation and URL", () => {
  it("the nav says Content, and /weeks redirects to /content", async () => {
    await renderContent("/weeks");
    const nav = within(screen.getByRole("navigation", { name: "Main" }));
    expect(nav.getByRole("link", { name: "Content" })).toHaveAttribute("href", "/content");
    expect(nav.queryByRole("link", { name: "Weeks" })).not.toBeInTheDocument();
    expect(where()).toBe("/content");
  });

  it("has exactly the four tabs, in order, opening on Problems", async () => {
    await renderContent();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Problems", "Data Structures", "Patterns", "Concepts"]);
    expect(tab("Problems")).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the week and tab in the URL, and restores them from it", async () => {
    const { user } = await renderContent();
    await user.selectOptions(screen.getByLabelText("Week"), "3");
    await user.click(tab("Patterns"));
    expect(where()).toBe("/content?week=3&tab=patterns");
  });

  it("opens straight onto the week and tab in the URL", async () => {
    await renderContent("/content?week=2&tab=concepts");
    expect(screen.getByLabelText("Week")).toHaveValue("2");
    expect(tab("Concepts")).toHaveAttribute("aria-selected", "true");
  });

  it("'This week' picks the current week", async () => {
    const { user } = await renderContent("/content", { today: "2026-11-05" });
    expect(screen.getByLabelText("Week")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "This week" }));
    expect(screen.getByLabelText("Week")).toHaveValue("2");
    expect(where()).toBe("/content?week=2");
  });
});

describe("Content page: All weeks vs one week", () => {
  it("All weeks groups problems by week with headings; one week shows only that week", async () => {
    const { user } = await renderContent();
    expect(panel().getByRole("heading", { name: /^Week 1 ·/ })).toBeInTheDocument();
    expect(panel().getByRole("heading", { name: /^Week 13 ·/ })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Week"), "2");
    expect(panel().getByRole("heading", { name: /^Week 2 ·/ })).toBeInTheDocument();
    expect(panel().queryByRole("heading", { name: /^Week 1 ·/ })).not.toBeInTheDocument();
    expect(panel().getByText("Two Sum")).toBeInTheDocument();
    expect(panel().queryByText("Plus One")).not.toBeInTheDocument();
  });

  it("'Add a day to Week N' shows only with a week selected, and still adds a day", async () => {
    const { db, user } = await renderContent();
    const main = () => within(screen.getByRole("main"));
    expect(main().queryByRole("button", { name: /Add a day to Week/ })).not.toBeInTheDocument(); // (the sidebar has its own)
    await user.selectOptions(screen.getByLabelText("Week"), "3");
    await user.click(main().getByRole("button", { name: "+ Add a day to Week 3" }));
    await waitFor(async () => expect(await db.extensions.toArray()).toMatchObject([{ week: 3, extraDays: 1 }]));
    expect(await screen.findByRole("heading", { level: 1, name: "Edit day" })).toBeInTheDocument();
  });
});

describe("Content page: Problems tab", () => {
  it("lists a plan problem with difficulty, platform, link, its day and my latest outcome", async () => {
    await renderContent("/content?week=1", {
      seed: async (db) => {
        await db.attempts.add({ problemId: "w01-d1-p1", date: "2026-10-26", outcome: "hint", minutes: 20, isRedo: false });
      },
    });
    const row = panel().getByRole("link", { name: "Plus One" }).closest("li")!;
    expect(row).toHaveTextContent("Easy");
    expect(row).toHaveTextContent("LeetCode");
    expect(row).toHaveTextContent("Day 1 · Mon 26 Oct");
    expect(row).toHaveTextContent("Needed hint");
    expect(within(row).getByRole("link", { name: /Open Plus One/ })).toHaveAttribute("target", "_blank");
    expect(panel().getByRole("link", { name: "Set Matrix Zeroes" }).closest("li")).toHaveTextContent("fallback"); // fallbacks are listed
  });

  it("filters by platform, difficulty and status", async () => {
    const { user } = await renderContent("/content?week=1", {
      seed: async (db) => {
        await db.attempts.bulkAdd([
          { problemId: "w01-d1-p1", date: "2026-10-26", outcome: "alone", minutes: 10, isRedo: false },
          { problemId: "w01-d2-p1", date: "2026-10-27", outcome: "solution", minutes: 30, isRedo: false },
        ]);
      },
    });
    await user.selectOptions(screen.getByLabelText("Platform"), "HackerRank");
    expect(panel().getByText("Nested Lists")).toBeInTheDocument();
    expect(panel().queryByText("Plus One")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Platform"), "");
    await user.selectOptions(screen.getByLabelText("Difficulty"), "Medium");
    expect(panel().getByText("Rotate Image")).toBeInTheDocument();
    expect(panel().queryByText("Plus One")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Difficulty"), "");
    await user.selectOptions(screen.getByLabelText("Status"), "alone");
    expect(panel().getAllByRole("listitem")).toHaveLength(1);
    expect(panel().getByText("Plus One")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Status"), "work");
    expect(panel().getAllByRole("listitem")).toHaveLength(1);
    expect(panel().getByText("Merge Sorted Array")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Status"), "none");
    expect(panel().queryByText("Plus One")).not.toBeInTheDocument();
    expect(panel().queryByText("Merge Sorted Array")).not.toBeInTheDocument();
    expect(panel().getByText("Nested Lists")).toBeInTheDocument();
  });

  it("old-topic problems are listed under their scheduled day with no origin week or topic", async () => {
    await renderContent("/content?week=2");
    const row = panel().getByRole("link", { name: "Reverse Words in a String" }).closest("li")!;
    expect(row).toHaveTextContent("Day 4");
    expect(row.textContent).not.toMatch(/week/i);
    const section = panel().getByRole("region", { name: "Week 2 problems" });
    expect(section.textContent).not.toMatch(/Week 1\b/);
  });

  it("hides spare problems until 'Show spare problems' is ticked, and then lists them with no week", async () => {
    const { user } = await renderContent();
    expect(panel().queryByRole("region", { name: "Spare problems" })).not.toBeInTheDocument();
    expect(panel().queryByText("Move Zeroes")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Show spare problems"));
    const spare = within(panel().getByRole("region", { name: "Spare problems" }));
    const row = spare.getByRole("link", { name: "Move Zeroes" }).closest("li")!;
    expect(row.textContent).not.toMatch(/week/i);
  });

  it("with a week selected, a spare problem appears only once attempted (which reveals its week)", async () => {
    const { user } = await renderContent("/content?week=1", {
      seed: async (db) => {
        await db.attempts.add({ problemId: "w01-pool-01", date: "2026-10-26", outcome: "alone", minutes: 5, isRedo: false });
      },
    });
    await user.click(screen.getByLabelText("Show spare problems"));
    const spare = within(panel().getByRole("region", { name: "Spare problems" }));
    expect(spare.getAllByRole("listitem")).toHaveLength(1);
    expect(spare.getByText("Move Zeroes")).toBeInTheDocument();
  });

  it("dashboard buttons open the defaults in a new tab, use saved https links, and fall back when empty or invalid", async () => {
    const { db } = await renderContent();
    const lc = () => panel().getByRole("link", { name: /LeetCode dashboard/ });
    const hr = () => panel().getByRole("link", { name: /HackerRank dashboard/ });
    expect(lc()).toHaveAttribute("href", "https://leetcode.com/problemset/");
    expect(hr()).toHaveAttribute("href", "https://www.hackerrank.com/dashboard");
    expect(lc()).toHaveAttribute("target", "_blank");
    await saveSettings(db, { leetcodeUrl: "https://leetcode.com/u/me/", hackerrankUrl: "" }, "2026-10-26");
    await waitFor(() => expect(lc()).toHaveAttribute("href", "https://leetcode.com/u/me/"));
    expect(hr()).toHaveAttribute("href", "https://www.hackerrank.com/dashboard"); // empty -> default
    await saveSettings(db, { hackerrankUrl: "http://insecure.example/me" }, "2026-10-26"); // hand-edited import
    await waitFor(() => expect(hr()).toHaveAttribute("href", "https://www.hackerrank.com/dashboard"));
  });
});

describe("Settings: dashboard links", () => {
  it("accepts https links, rejects anything else, falls back to the defaults when empty, and exports them", async () => {
    const { db, user } = await renderContent("/settings");
    const card = within(screen.getByRole("region", { name: "Practice dashboards" }));
    const lc = card.getByLabelText("LeetCode dashboard link");
    await user.type(lc, "http://leetcode.com/u/me");
    await user.click(card.getByRole("button", { name: "Save links" }));
    expect(await card.findByRole("alert")).toHaveTextContent("https");
    expect((await db.settings.get("settings"))?.leetcodeUrl).toBeUndefined();

    await user.clear(lc);
    await user.type(lc, "https://leetcode.com/u/me/");
    await user.click(card.getByRole("button", { name: "Save links" }));
    await waitFor(async () => expect((await db.settings.get("settings"))?.leetcodeUrl).toBe("https://leetcode.com/u/me/"));
    expect((await exportAll(db)).settings).toMatchObject([{ leetcodeUrl: "https://leetcode.com/u/me/" }]);

    await user.clear(lc); // empty -> default again
    await user.click(card.getByRole("button", { name: "Save links" }));
    await waitFor(async () => expect((await db.settings.get("settings"))?.leetcodeUrl).toBeUndefined());
  });
});

describe("Content page: topics without resources.json", () => {
  it("every resource tab says 'No topics yet' and nothing breaks; Concepts still lists the curriculum's", async () => {
    const { user } = await renderContent("/content?tab=data-structures");
    expect(panel().getByText("No topics yet.")).toBeInTheDocument();
    await user.click(tab("Patterns"));
    expect(panel().getByText("No topics yet.")).toBeInTheDocument();
    await user.click(tab("Concepts"));
    expect(panel().getByText("No topics yet.")).toBeInTheDocument();
    expect(panel().getByRole("list", { name: "Week 1 concepts" })).toHaveTextContent("How cost grows");
  });
});

describe("Content page: topics from resources.json", () => {
  it("Patterns: headed by the NeetCode name, resources open in a new tab, 'N of M done' counts", async () => {
    state.res = FIXTURE;
    const { user } = await renderContent("/content?tab=patterns");
    expect(panel().getByRole("heading", { name: /Arrays & Hashing/ })).toBeInTheDocument();
    expect(panel().getByRole("heading", { name: /Hashing and Prefix/ })).toBeInTheDocument();
    const link5 = panel().getByRole("link", { name: /Site5: Guide 5/ });
    expect(link5).toHaveAttribute("href", "https://example.com/5");
    expect(link5).toHaveAttribute("target", "_blank");
    expect(panel().getByRole("status", { name: "Topics done" })).toHaveTextContent("0 of 2 done");
    await user.click(panel().getByLabelText("Sliding window"));
    expect(panel().getByRole("status", { name: "Topics done" })).toHaveTextContent("1 of 2 done");
    await user.selectOptions(screen.getByLabelText("Week"), "2");
    expect(panel().queryByText("Sliding window")).not.toBeInTheDocument();
    expect(panel().getByRole("status", { name: "Topics done" })).toHaveTextContent("0 of 1 done");
  });

  it("Concepts: the week's curriculum concepts as plain text above the concept topics", async () => {
    state.res = FIXTURE;
    await renderContent("/content?week=1&tab=concepts");
    expect(panel().getByRole("list", { name: "Week 1 concepts" })).toHaveTextContent("What every operation costs");
    expect(panel().getByLabelText("Big-O reading")).toBeInTheDocument();
  });

  it("Data Structures: the picker lists every structure; 'All structures' groups them", async () => {
    state.res = FIXTURE;
    await renderContent("/content?tab=data-structures");
    const options = within(screen.getByLabelText("Structure")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["All structures", "Array / list", "Hash table (dict, set)"]);
    expect(panel().getByRole("heading", { name: "Hash table (dict, set)" })).toBeInTheDocument();
    expect(panel().getByLabelText("Hash collisions")).toBeInTheDocument();
    expect(panel().getByLabelText("Arrays")).toBeInTheDocument();
  });

  it("Dive deeper: topics, weeks, patterns of those weeks and their plan problems (old-topic rule kept)", async () => {
    state.res = FIXTURE;
    const { user } = await renderContent("/content?tab=data-structures");
    await user.selectOptions(screen.getByLabelText("Structure"), "Hash table (dict, set)");
    expect(where()).toContain("structure=");
    const dive = within(panel().getByRole("region", { name: "Dive deeper: Hash table (dict, set)" }));
    expect(dive.getByLabelText("Hash basics")).toBeInTheDocument();
    expect(dive.getByLabelText("Hash collisions")).toBeInTheDocument();
    expect(dive.queryByLabelText("Arrays")).not.toBeInTheDocument();
    expect(dive.getByRole("list", { name: "Weeks" })).toHaveTextContent("Week 1 · Python toolkit");
    expect(dive.getByRole("list", { name: "Weeks" })).toHaveTextContent("Week 2 · Hashing");
    const patterns = within(dive.getByRole("list", { name: "Patterns" }));
    expect(patterns.getByLabelText("Sliding window")).toBeInTheDocument();
    expect(patterns.getByLabelText("Prefix sums")).toBeInTheDocument();
    expect(dive.getByText("Plus One")).toBeInTheDocument();
    expect(dive.getByText("Two Sum")).toBeInTheDocument();
    expect(dive.queryByText("Move Zeroes")).not.toBeInTheDocument(); // spare problems stay out
    const old = dive.getByRole("link", { name: "Reverse Words in a String" }).closest("li")!;
    expect(old.textContent).not.toMatch(/week/i);
  });

  it("ticking a topic persists and survives a reload", async () => {
    state.res = FIXTURE;
    const first = await renderContent("/content?tab=patterns");
    await first.user.click(panel().getByLabelText("Prefix sums"));
    await waitFor(async () => expect(await first.db.topicChecks.toArray()).toMatchObject([{ topicId: "p-prefix", checkedOn: "2026-10-27" }]));
    first.view.unmount();
    await renderContent("/content?tab=patterns", { db: first.db });
    await waitFor(() => expect(panel().getByLabelText("Prefix sums")).toBeChecked());
    expect(panel().getByLabelText("Sliding window")).not.toBeChecked();
    await first.user.click(panel().getByLabelText("Prefix sums")); // unticking removes it
    await waitFor(async () => expect(await first.db.topicChecks.count()).toBe(0));
  });

  it("a tick is shared wherever the topic appears, and is in the export and back in after an import", async () => {
    state.res = FIXTURE;
    const { db, user } = await renderContent("/content?tab=data-structures");
    await user.click(panel().getByLabelText("Hash basics"));
    await waitFor(async () => expect(await db.topicChecks.count()).toBe(1));
    const snapshot = JSON.parse(JSON.stringify(await exportAll(db)));
    expect(snapshot.topicChecks).toMatchObject([{ topicId: "ds-hash-1" }]);
    await resetAll(db);
    expect(await db.topicChecks.count()).toBe(0);
    await importAll(db, snapshot);
    expect(await db.topicChecks.toArray()).toMatchObject([{ topicId: "ds-hash-1" }]);
  });
});
