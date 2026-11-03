import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DsaDB, exportAll, importAll, resetAll, saveSettings } from "../lib/db";
import { curriculum } from "../lib/curriculum";
import type { ConceptLinksFile, DataStructuresFile, ResourcesFile } from "../types/content";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const state = vi.hoisted(() => ({ res: undefined as unknown, ds: undefined as unknown, links: undefined as unknown }));
vi.mock("../lib/resources", async (orig) => ({ ...(await orig<typeof import("../lib/resources")>()), getResources: () => state.res }));
vi.mock("../lib/dataStructures", async (orig) => ({ ...(await orig<typeof import("../lib/dataStructures")>()), getDataStructures: () => state.ds }));
vi.mock("../lib/concepts", async (orig) => ({ ...(await orig<typeof import("../lib/concepts")>()), getConceptLinks: () => state.links }));

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

const HR = "https://www.hackerrank.com/domains/data-structures";
const DS_FIXTURE: DataStructuresFile = {
  version: 1,
  checkedOn: "2026-11-02",
  note: "fixture",
  hackerrank: { title: "HackerRank: Data Structures", url: HR, dashboard: "https://www.hackerrank.com/dashboard" },
  structures: [
    { name: "Array / list", hackerrankSubdomain: "Arrays", inPlan: true, hackerrankUrl: HR },
    { name: "Hash table (dict, set)", hackerrankSubdomain: null, inPlan: true, hackerrankUrl: HR },
    { name: "Matrix", hackerrankSubdomain: "Arrays", inPlan: true, hackerrankUrl: HR }, // in the plan, but no topics in the fixture
    { name: "Balanced trees", hackerrankSubdomain: "Balanced Trees", inPlan: false, hackerrankUrl: HR },
  ],
};
const LINKS_FIXTURE: ConceptLinksFile = {
  version: 1,
  concepts: { "w01-c1": [{ site: "Docs", title: "First", url: "https://example.com/c1a" }, { site: "Blog", title: "Second", url: "https://example.com/c1b" }] },
};

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  state.ds = undefined;
  state.links = undefined;
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

describe("Content page: without the optional files", () => {
  it("Data Structures and Patterns say 'No topics yet' and nothing breaks", async () => {
    const { user } = await renderContent("/content?tab=data-structures");
    expect(panel().getByText("No topics yet.")).toBeInTheDocument();
    await user.click(tab("Patterns"));
    expect(panel().getByText("No topics yet.")).toBeInTheDocument();
  });

  it("Concepts still lists every curriculum concept, each with a quiet 'Links coming' note", async () => {
    await renderContent("/content?tab=concepts");
    expect(panel().getAllByRole("checkbox")).toHaveLength(80);
    expect(panel().getAllByText("Links coming")).toHaveLength(80);
    expect(panel().queryByText("Core reading")).not.toBeInTheDocument();
  });
});

describe("Content page: Patterns", () => {
  it("is headed by the NeetCode name, links open in a new tab, 'N of M done' counts", async () => {
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
});

describe("Content page: Data Structures list", () => {
  const cards = () => within(panel().getByRole("list", { name: "Data structures" }));
  const card = (name: string) => cards().getByRole("link", { name }).closest("li")!;

  it("lists every structure in the file, with or without topics, with counts, weeks and the 'Beyond the plan' badge", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    await renderContent("/content?tab=data-structures");
    expect(cards().getAllByRole("listitem")).toHaveLength(4);
    expect(card("Array / list")).toHaveTextContent("0 of 1 ticked");
    expect(card("Array / list")).toHaveTextContent("Week 1");
    expect(card("Hash table (dict, set)")).toHaveTextContent("0 of 2 ticked");
    expect(card("Hash table (dict, set)")).toHaveTextContent("Weeks 1, 2");
    expect(card("Matrix")).toHaveTextContent("No topics yet");
    expect(card("Matrix")).not.toHaveTextContent("Beyond the plan");
    expect(card("Balanced trees")).toHaveTextContent("Beyond the plan");
    expect(card("Balanced trees")).toHaveTextContent("Not taught in a plan week");
  });

  it("counts ticked topics on the card", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    const { user } = await renderContent("/content?tab=data-structures&ds=Hash%20table%20(dict%2C%20set)");
    await user.click(panel().getByLabelText("Hash basics"));
    await user.click(panel().getByRole("link", { name: /All data structures/ }));
    await waitFor(() => expect(card("Hash table (dict, set)")).toHaveTextContent("1 of 2 ticked"));
  });

  it("respects the week selector: only structures taught that week", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    const { user } = await renderContent("/content?tab=data-structures");
    await user.selectOptions(screen.getByLabelText("Week"), "2");
    expect(cards().getAllByRole("listitem")).toHaveLength(1);
    expect(cards().getByRole("link", { name: "Hash table (dict, set)" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Week"), "1");
    expect(cards().getAllByRole("listitem")).toHaveLength(2); // Array / list and Hash table
    await user.selectOptions(screen.getByLabelText("Week"), "3");
    expect(panel().getByText("No data structures are taught in Week 3.")).toBeInTheDocument();
  });

  it("clicking a structure puts it in the URL, and the back link returns to the list", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    const { user } = await renderContent("/content?tab=data-structures");
    await user.click(cards().getByRole("link", { name: "Array / list" }));
    expect(where()).toBe("/content?tab=data-structures&ds=Array+%2F+list");
    expect(panel().getByRole("heading", { level: 2, name: "Array / list" })).toBeInTheDocument();
    await user.click(panel().getByRole("link", { name: /All data structures/ }));
    expect(where()).toBe("/content?tab=data-structures");
    expect(panel().getByRole("list", { name: "Data structures" })).toBeInTheDocument();
  });
});

describe("Content page: a structure's page", () => {
  const open = (name: string) => renderContent(`/content?tab=data-structures&ds=${encodeURIComponent(name)}`);
  const within_ = (name: string) => within(panel().getByRole("region", { name }));

  it("starts with the HackerRank block: the button, the sub-domain to open, and the dashboard from Settings", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    const { db } = await open("Array / list");
    const block = within_("HackerRank");
    const button = block.getByRole("link", { name: /Practise on HackerRank/ });
    expect(button).toHaveAttribute("href", HR);
    expect(button).toHaveAttribute("target", "_blank");
    expect(block.getByText("Open the Arrays sub-domain on that page.")).toBeInTheDocument();
    expect(block.getByRole("link", { name: /HackerRank dashboard/ })).toHaveAttribute("href", "https://www.hackerrank.com/dashboard");
    await saveSettings(db, { hackerrankUrl: "https://www.hackerrank.com/profile/me" }, "2026-10-26");
    await waitFor(() => expect(block.getByRole("link", { name: /HackerRank dashboard/ })).toHaveAttribute("href", "https://www.hackerrank.com/profile/me"));
    // the block comes before Learn, Problems and Related patterns
    const order = ["HackerRank", "Learn", "Problems from my plan", "Related patterns"];
    const regions = order.map((name) => panel().getByRole("region", { name }));
    regions.slice(1).forEach((r, i) => expect(regions[i]!.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
  });

  it("says plainly when a structure has no HackerRank sub-domain", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    await open("Hash table (dict, set)");
    expect(within_("HackerRank").getByText("No sub-domain: practise under Algorithms or the Interview Preparation Kit.")).toBeInTheDocument();
  });

  it("Learn lists the structure's topics with checkboxes and links; ticks persist", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    const { db, user } = await open("Hash table (dict, set)");
    const learn = within_("Learn");
    expect(learn.getByLabelText("Hash basics")).toBeInTheDocument();
    expect(learn.getByLabelText("Hash collisions")).toBeInTheDocument();
    expect(learn.queryByLabelText("Arrays")).not.toBeInTheDocument();
    expect(learn.getByRole("link", { name: /Site9: Guide 9/ })).toHaveAttribute("target", "_blank");
    await user.click(learn.getByLabelText("Hash collisions"));
    await waitFor(async () => expect(await db.topicChecks.toArray()).toMatchObject([{ topicId: "ds-hash-2" }]));
  });

  it("lists plan problems only from the weeks that teach it, grouped by week, and says why", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    await open("Array / list"); // taught in week 1 only
    const problems = within_("Problems from my plan");
    expect(problems.getByText(/A problem is listed when its week teaches this structure/)).toBeInTheDocument();
    expect(problems.getByRole("region", { name: "Week 1 problems" })).toBeInTheDocument();
    expect(problems.queryByRole("region", { name: "Week 2 problems" })).not.toBeInTheDocument();
    expect(problems.getByText("Plus One")).toBeInTheDocument();
    expect(problems.getByText("Set Matrix Zeroes")).toBeInTheDocument(); // a fallback
    expect(problems.queryByText("Two Sum")).not.toBeInTheDocument();
  });

  it("a structure taught in two weeks lists both, and old-topic problems keep their origin hidden", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    await open("Hash table (dict, set)");
    const problems = within_("Problems from my plan");
    expect(problems.getByRole("region", { name: "Week 1 problems" })).toBeInTheDocument();
    expect(problems.getByRole("region", { name: "Week 2 problems" })).toBeInTheDocument();
    const old = problems.getByRole("link", { name: "Reverse Words in a String" }).closest("li")!;
    expect(old).toHaveTextContent("Day 4");
    expect(old.textContent).not.toMatch(/week/i);
  });

  it("filters the problems like the Problems tab", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    const { user } = await open("Array / list");
    const problems = () => within_("Problems from my plan");
    await user.selectOptions(problems().getByLabelText("Platform"), "HackerRank");
    expect(problems().getByText("Nested Lists")).toBeInTheDocument();
    expect(problems().queryByText("Plus One")).not.toBeInTheDocument();
    await user.selectOptions(problems().getByLabelText("Platform"), "");
    await user.selectOptions(problems().getByLabelText("Difficulty"), "Hard");
    expect(problems().getByText("No problems match these filters.")).toBeInTheDocument();
    await user.selectOptions(problems().getByLabelText("Difficulty"), "");
    await user.selectOptions(problems().getByLabelText("Status"), "none");
    expect(problems().getByText("Plus One")).toBeInTheDocument();
  });

  it("spare problems are hidden until the toggle, and then only those from the teaching weeks, with no week shown", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    const { user } = await open("Array / list");
    const week1Spare = curriculum.weeks[0]!.pool[0]!.title;
    const week2Spare = curriculum.weeks[1]!.pool[0]!.title;
    const problems = () => within_("Problems from my plan");
    expect(problems().queryByText(week1Spare)).not.toBeInTheDocument();
    await user.click(problems().getByLabelText("Show spare problems"));
    const spare = within(problems().getByRole("region", { name: "Spare problems" }));
    const row = spare.getByRole("link", { name: week1Spare }).closest("li")!;
    expect(row.textContent).not.toMatch(/week/i);
    expect(spare.queryByText(week2Spare)).not.toBeInTheDocument();
  });

  it("Related patterns: the pattern topics of those weeks only", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    await open("Array / list");
    expect(within_("Related patterns").getByLabelText("Sliding window")).toBeInTheDocument();
    expect(within_("Related patterns").queryByLabelText("Prefix sums")).not.toBeInTheDocument();
  });

  it("a beyond-the-plan structure shows the badge, its HackerRank block, and clear empty states", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    await open("Balanced trees");
    expect(panel().getByText("Beyond the plan")).toBeInTheDocument();
    expect(within_("HackerRank").getByText("Open the Balanced Trees sub-domain on that page.")).toBeInTheDocument();
    expect(within_("Learn").getByText("No topics for this structure yet.")).toBeInTheDocument();
    expect(within_("Problems from my plan").getByText(/not taught in a week of the plan/)).toBeInTheDocument();
    expect(within_("Related patterns").getByText("No patterns listed for these weeks.")).toBeInTheDocument();
  });
});

describe("Content page: Concepts", () => {
  const cardsOf = () => panel().getAllByRole("checkbox");
  const week2Ids = () => curriculum.weeks[1]!.concepts.map((_, i) => `w02-c${i + 1}`);

  it("renders a card for each of the 80 curriculum concepts, plus 'Core reading' cards first in their week", async () => {
    state.res = FIXTURE;
    state.links = LINKS_FIXTURE;
    await renderContent("/content?tab=concepts");
    expect(cardsOf()).toHaveLength(81); // 80 numbered + 1 core reading in the fixture
    expect(panel().getAllByText("Core reading")).toHaveLength(1);
    const week1 = within(panel().getByRole("list", { name: "Week 1 concept cards" }));
    expect(week1.getAllByRole("checkbox")[0]).toHaveAccessibleName("Big-O reading"); // core reading first
    expect(week1.getAllByRole("checkbox")[1]).toHaveAccessibleName(curriculum.weeks[0]!.concepts[0]!);
    expect(week1.getAllByText("Core reading")).toHaveLength(1);
  });

  it("shows each concept's links from concept-links.json, and a quiet note where there are none", async () => {
    state.res = FIXTURE;
    state.links = LINKS_FIXTURE;
    await renderContent("/content?tab=concepts");
    const card = within(panel().getByLabelText(curriculum.weeks[0]!.concepts[0]!).closest("li")!);
    const first = card.getByRole("link", { name: /Docs: First/ });
    expect(first).toHaveAttribute("href", "https://example.com/c1a");
    expect(first).toHaveAttribute("target", "_blank");
    expect(card.getByRole("link", { name: /Blog: Second/ })).toBeInTheDocument();
    expect(panel().getAllByText("Links coming")).toHaveLength(79); // every numbered concept but w01-c1; core reading has its own links
    expect(within(panel().getByLabelText("Big-O reading").closest("li")!).getByRole("link", { name: /Site7: Guide 7/ })).toBeInTheDocument();
  });

  it("the week selector narrows the cards to that week", async () => {
    state.res = FIXTURE;
    const { user } = await renderContent("/content?tab=concepts");
    await user.selectOptions(screen.getByLabelText("Week"), "2");
    expect(cardsOf()).toHaveLength(curriculum.weeks[1]!.concepts.length);
    expect(panel().queryByRole("button", { name: /^Week 2/ })).not.toBeInTheDocument(); // one week: no collapsing
    expect(panel().getByRole("status", { name: "Concepts read" })).toHaveTextContent(`0 of ${curriculum.weeks[1]!.concepts.length} read`);
  });

  it("ticking a concept saves it once under its id, shows progress, and survives a reload", async () => {
    const first = await renderContent("/content?tab=concepts");
    const title = curriculum.weeks[2]!.concepts[1]!; // w03-c2
    await first.user.click(panel().getByLabelText(title));
    await waitFor(async () => expect(await first.db.conceptChecks.toArray()).toMatchObject([{ conceptId: "w03-c2", checkedOn: "2026-10-27" }]));
    expect(panel().getByRole("status", { name: "Concepts read" })).toHaveTextContent("1 of 80 read");
    expect(panel().getByRole("progressbar", { name: "Concepts read" })).toHaveAttribute("aria-valuenow", "1");
    first.view.unmount();
    await renderContent("/content?tab=concepts", { db: first.db });
    await waitFor(() => expect(panel().getByLabelText(title)).toBeChecked());
    await first.user.click(panel().getByLabelText(title)); // unticking removes it
    await waitFor(async () => expect(await first.db.conceptChecks.count()).toBe(0));
  });

  it("a core-reading card keeps its tick with the other topics", async () => {
    state.res = FIXTURE;
    const { db, user } = await renderContent("/content?tab=concepts");
    await user.click(panel().getByLabelText("Big-O reading"));
    await waitFor(async () => expect(await db.topicChecks.toArray()).toMatchObject([{ topicId: "c-bigo" }]));
    expect(await db.conceptChecks.count()).toBe(0);
    expect(panel().getByRole("status", { name: "Concepts read" })).toHaveTextContent("1 of 81 read");
  });

  it("'Mark all as read' ticks a whole week, 'Undo' removes only what it added, and the week count follows", async () => {
    const { db, user } = await renderContent("/content?tab=concepts", {
      seed: async (d) => {
        await d.conceptChecks.put({ conceptId: "w02-c1", checkedOn: "2026-10-26" }); // already read before
      },
    });
    const total = curriculum.weeks[1]!.concepts.length;
    const section = () => within(panel().getByRole("region", { name: "Week 2 concepts" }));
    expect(section().getByLabelText("Week 2 read")).toHaveTextContent(`1 of ${total} read`);
    await user.click(section().getByRole("button", { name: "Mark all Week 2 as read" }));
    await waitFor(async () => expect((await db.conceptChecks.toArray()).map((c) => c.conceptId).sort()).toEqual(week2Ids().sort()));
    expect(section().getByLabelText("Week 2 read")).toHaveTextContent(`${total} of ${total} read`);
    await user.click(section().getByRole("button", { name: "Undo Week 2" }));
    await waitFor(async () => expect((await db.conceptChecks.toArray()).map((c) => c.conceptId)).toEqual(["w02-c1"]));
    expect(section().getByRole("button", { name: "Mark all Week 2 as read" })).toHaveTextContent("Mark all as read");
  });

  it("weeks collapse and expand with All weeks selected", async () => {
    const { user } = await renderContent("/content?tab=concepts");
    const toggle = () => panel().getByRole("button", { name: /^Week 3 ·/ });
    expect(panel().getByRole("list", { name: "Week 3 concept cards" })).toBeInTheDocument();
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(panel().queryByRole("list", { name: "Week 3 concept cards" })).not.toBeInTheDocument();
    expect(panel().getByRole("region", { name: "Week 3 concepts" })).toHaveTextContent("read"); // the count stays visible
    await user.click(toggle());
    expect(panel().getByRole("list", { name: "Week 3 concept cards" })).toBeInTheDocument();
  });

  it("search narrows the cards by concept text, and says so when nothing matches", async () => {
    const { user } = await renderContent("/content?tab=concepts");
    await user.type(panel().getByRole("searchbox", { name: "Search concepts" }), curriculum.weeks[1]!.concepts[0]!);
    expect(cardsOf().length).toBeGreaterThan(0);
    expect(cardsOf().length).toBeLessThan(80);
    expect(panel().getByLabelText(curriculum.weeks[1]!.concepts[0]!)).toBeInTheDocument();
    await user.clear(panel().getByRole("searchbox", { name: "Search concepts" }));
    await user.type(panel().getByRole("searchbox", { name: "Search concepts" }), "zzzz no such concept");
    expect(panel().getByText("No concepts match.")).toBeInTheDocument();
  });

  it("the All / To read / Done filters split the cards by tick", async () => {
    const title = curriculum.weeks[0]!.concepts[0]!;
    const { user } = await renderContent("/content?tab=concepts", {
      seed: async (d) => {
        await d.conceptChecks.put({ conceptId: "w01-c1", checkedOn: "2026-10-26" });
      },
    });
    await waitFor(() => expect(panel().getByLabelText(title)).toBeChecked());
    await user.click(panel().getByRole("button", { name: "Done" }));
    expect(cardsOf()).toHaveLength(1);
    expect(panel().getByLabelText(title)).toBeInTheDocument();
    await user.click(panel().getByRole("button", { name: "To read" }));
    expect(cardsOf()).toHaveLength(79);
    expect(panel().queryByLabelText(title)).not.toBeInTheDocument();
    await user.click(panel().getByRole("button", { name: "All" }));
    expect(cardsOf()).toHaveLength(80);
  });

  it("is in the dashboard's summary row as 'Concepts: N of 80'", async () => {
    const db = new DsaDB(`content-${n++}`);
    dbs.push(db);
    await db.conceptChecks.bulkPut([{ conceptId: "w01-c1", checkedOn: "2026-10-26" }, { conceptId: "w04-c2", checkedOn: "2026-10-26" }, { conceptId: "w99-c9", checkedOn: "2026-10-26" }]);
    mount(db, "2026-10-27", "/dashboard");
    const summary = within(await screen.findByRole("region", { name: "Study summary" }));
    expect(summary.getByText("Concepts").nextElementSibling).toHaveTextContent("2"); // the stale id does not count
    expect(summary.getByText("Concepts").nextElementSibling!.nextElementSibling).toHaveTextContent("of 80 read");
  });
});

describe("Content page: export and import", () => {
  it("topic and concept ticks are in the export and come back after an import", async () => {
    state.res = FIXTURE;
    state.ds = DS_FIXTURE;
    const { db, user } = await renderContent("/content?tab=data-structures&ds=Hash%20table%20(dict%2C%20set)");
    await user.click(panel().getByLabelText("Hash basics"));
    await db.conceptChecks.put({ conceptId: "w05-c3", checkedOn: "2026-10-27" });
    await waitFor(async () => expect(await db.topicChecks.count()).toBe(1));
    const snapshot = JSON.parse(JSON.stringify(await exportAll(db)));
    expect(snapshot.topicChecks).toMatchObject([{ topicId: "ds-hash-1" }]);
    expect(snapshot.conceptChecks).toMatchObject([{ conceptId: "w05-c3" }]);
    await resetAll(db);
    expect(await db.topicChecks.count()).toBe(0);
    await importAll(db, snapshot);
    expect(await db.topicChecks.toArray()).toMatchObject([{ topicId: "ds-hash-1" }]);
    expect(await db.conceptChecks.toArray()).toMatchObject([{ conceptId: "w05-c3" }]);
  });
});
