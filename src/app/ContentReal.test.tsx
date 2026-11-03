// The Content page against the real content/resources.json (no fixture): every tab, All weeks and Week 2, and the structure picker.
import "fake-indexeddb/auto";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { DsaDB } from "../lib/db";
import { curriculum } from "../lib/curriculum";
import { getDataStructures } from "../lib/dataStructures";
import { getResources } from "../lib/resources";
import { App } from "./App";
import { PlanProvider } from "./PlanContext";

const dbs: DsaDB[] = [];
let n = 0;
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()));
});

async function open(path: string) {
  const db = new DsaDB(`real-${n++}`);
  dbs.push(db);
  render(
    <PlanProvider db={db} today="2026-10-27">
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </PlanProvider>,
  );
  await screen.findByRole("heading", { level: 1, name: "Content" });
  return userEvent.setup();
}

const panel = () => within(screen.getByRole("tabpanel"));
const res = getResources()!;
const topics = (week?: number) => res.weeks.filter((w) => week === undefined || w.week === week).flatMap((w) => w.topics);
const count = (kind: string, week?: number) => topics(week).filter((t) => t.kind === kind).length;

/** Every resource link in the panel is https and opens in a new tab. */
function expectSafeLinks() {
  const links = within(screen.getByRole("tabpanel")).getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("http"));
  expect(links.length).toBeGreaterThan(0);
  for (const a of links) {
    expect(a.getAttribute("href")).toMatch(/^https:\/\//);
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", expect.stringContaining("noopener"));
  }
}

describe("Content page with the real resources.json", () => {
  it("the file loads: 41 topics, 139 links", () => {
    expect(topics()).toHaveLength(41);
    expect(topics().reduce((s, t) => s + t.resources.length, 0)).toBe(139);
  });

  for (const [tabId, kind] of [["patterns", "pattern"]] as const) {
    it(`${tabId}: All weeks shows every ${kind} topic with safe links, and Week 2 only that week's`, async () => {
      await open(`/content?tab=${tabId}`);
      expect(panel().getByRole("status", { name: "Topics done" })).toHaveTextContent(`0 of ${count(kind)} done`);
      for (const t of topics().filter((x) => x.kind === kind)) expect(panel().getByLabelText(t.title)).toBeInTheDocument();
      expectSafeLinks();
    });

    it(`${tabId}: Week 2`, async () => {
      await open(`/content?week=2&tab=${tabId}`);
      expect(screen.getByLabelText("Week")).toHaveValue("2");
      const mine = topics(2).filter((x) => x.kind === kind);
      if (mine.length === 0) {
        expect(panel().queryByRole("status", { name: "Topics done" })).not.toBeInTheDocument();
        expect(panel().queryByRole("checkbox")).not.toBeInTheDocument();
      } else {
        expect(panel().getByRole("status", { name: "Topics done" })).toHaveTextContent(`0 of ${mine.length} done`);
        for (const t of mine) expect(panel().getByLabelText(t.title)).toBeInTheDocument();
        for (const t of topics().filter((x) => x.kind === kind && !mine.includes(x))) expect(panel().queryByLabelText(t.title)).not.toBeInTheDocument();
        expectSafeLinks();
      }
    });
  }

  it("patterns are headed by each week's NeetCode name", async () => {
    await open("/content?tab=patterns");
    const weeks = res.weeks.filter((x) => x.topics.some((t) => t.kind === "pattern"));
    const headings = panel().getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toHaveLength(weeks.length); // one per week; several weeks can share a NeetCode name
    weeks.forEach((w, i) => {
      expect(headings[i]).toBe(w.neetcode);
      expect(within(panel().getByRole("region", { name: `Week ${w.week} patterns` })).getByText(`Week ${w.week}`)).toBeInTheDocument();
    });
  });

  it("Concepts: 80 numbered cards plus the 5 core-reading cards, each core one first in its week", async () => {
    await open("/content?tab=concepts");
    expect(panel().getAllByRole("checkbox")).toHaveLength(85);
    expect(panel().getAllByText("Core reading")).toHaveLength(5);
    for (const w of res.weeks) {
      const core = w.topics.filter((t) => t.kind === "concept").map((t) => t.title);
      if (core.length === 0) continue;
      const names = within(panel().getByRole("list", { name: `Week ${w.week} concept cards` })).getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"));
      expect(names.slice(0, core.length).sort()).toEqual([...core].sort()); // core reading comes before the numbered concepts
      expect(core.some((t) => names.slice(core.length).includes(t))).toBe(false);
    }
    expect(panel().getByRole("status", { name: "Concepts read" })).toHaveTextContent("0 of 85 read");
  });

  it("Concepts, Week 2: that week's concepts only", async () => {
    await open("/content?week=2&tab=concepts");
    expect(panel().getAllByRole("checkbox")).toHaveLength(curriculum.weeks[1]!.concepts.length);
    for (const c of curriculum.weeks[1]!.concepts) expect(panel().getByLabelText(c)).toBeInTheDocument();
  });

  it("problems: All weeks and Week 2 render with the dashboard buttons", async () => {
    await open("/content");
    expect(panel().getByRole("heading", { name: /^Week 13 ·/ })).toBeInTheDocument();
    expect(panel().getByRole("link", { name: /LeetCode dashboard/ })).toHaveAttribute("href", "https://leetcode.com/problemset/");
    await open("/content?week=2");
    expect(panel().getAllByRole("link", { name: "Two Sum" }).length).toBeGreaterThan(0);
  });

  it("Data Structures: all 16 structures are listed, with the Beyond-the-plan ones badged", async () => {
    await open("/content?tab=data-structures");
    const ds = getDataStructures()!;
    expect(ds.structures).toHaveLength(16);
    const list = within(panel().getByRole("list", { name: "Data structures" }));
    expect(list.getAllByRole("listitem")).toHaveLength(16);
    for (const s of ds.structures) {
      const li = list.getByRole("link", { name: s.name }).closest("li")!;
      if (s.inPlan) expect(li).not.toHaveTextContent("Beyond the plan");
      else expect(li).toHaveTextContent("Beyond the plan");
    }
    expect(list.getAllByText("Beyond the plan")).toHaveLength(ds.structures.filter((s) => !s.inPlan).length);
  });

  it("Data Structures, Week 2: only the structures taught that week", async () => {
    await open("/content?week=2&tab=data-structures");
    const taught = new Set(res.weeks.find((w) => w.week === 2)!.topics.filter((t) => t.kind === "data-structure").map((t) => t.structure));
    const list = within(panel().getByRole("list", { name: "Data structures" }));
    expect(list.getAllByRole("listitem")).toHaveLength(taught.size);
    for (const name of taught) expect(list.getByRole("link", { name: name! })).toBeInTheDocument();
  });

  it("every structure opens its page: HackerRank block, topics, weeks' problems, no spare problems", async () => {
    const user = await open("/content?tab=data-structures");
    for (const s of getDataStructures()!.structures) {
      await user.click(within(panel().getByRole("list", { name: "Data structures" })).getByRole("link", { name: s.name }));
      expect(panel().getByRole("heading", { level: 2, name: s.name })).toBeInTheDocument();
      const hr = within(panel().getByRole("region", { name: "HackerRank" }));
      expect(hr.getByRole("link", { name: /Practise on HackerRank/ })).toHaveAttribute("href", s.hackerrankUrl);
      expect(hr.getByText(s.hackerrankSubdomain ? `Open the ${s.hackerrankSubdomain} sub-domain on that page.` : /No sub-domain/)).toBeInTheDocument();
      const mine = topics().filter((t) => t.structure === s.name);
      for (const t of mine) expect(within(panel().getByRole("region", { name: "Learn" })).getByLabelText(t.title)).toBeInTheDocument();
      const taughtIn = res.weeks.filter((w) => w.topics.some((t) => t.structure === s.name)).map((w) => w.week);
      const problems = within(panel().getByRole("region", { name: "Problems from my plan" }));
      for (const w of taughtIn) expect(problems.getByRole("region", { name: `Week ${w} problems` })).toBeInTheDocument();
      expect(problems.queryByRole("region", { name: "Spare problems" })).not.toBeInTheDocument();
      await user.click(panel().getByRole("link", { name: /All data structures/ }));
    }
  });
});
