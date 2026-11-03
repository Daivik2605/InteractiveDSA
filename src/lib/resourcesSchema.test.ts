import { describe, expect, it } from "vitest";
import { Resources, resourcesProblems } from "../../scripts/resources-schema";

const link = (n: number) => ({ site: "Site", title: `Doc ${n}`, url: `https://example.com/${n}` });
const topic = (id: string, over: object = {}) => ({ id, title: id, kind: "pattern", resources: [link(1), link(2)], ...over });
const file = (topics: object[], over: object = {}) => ({
  version: 1,
  checkedOn: "2026-11-01",
  note: "",
  roadmap: { title: "Roadmap", url: "https://neetcode.io/roadmap" },
  weeks: [{ week: 1, title: "Arrays", neetcode: "Arrays & Hashing", topics }],
  ...over,
});
const errors = (data: unknown) => {
  const r = Resources.safeParse(data);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("resources.json schema", () => {
  it("accepts a valid file", () => {
    expect(errors(file([topic("a"), topic("b", { kind: "data-structure", structure: "Array" })]))).toEqual([]);
  });
  it("rejects duplicate topic ids, even across weeks", () => {
    const two = file([topic("a")], { weeks: [{ week: 1, title: "A", neetcode: "x", topics: [topic("a")] }, { week: 2, title: "B", neetcode: "y", topics: [topic("a")] }] });
    expect(errors(two).join()).toMatch(/not unique/);
  });
  it("rejects a bad kind, a data-structure with no structure, fewer than 2 resources and non-https URLs", () => {
    expect(errors(file([topic("a", { kind: "idea" })]))).not.toEqual([]);
    expect(errors(file([topic("a", { kind: "data-structure" })])).join()).toMatch(/structure/);
    expect(errors(file([topic("a", { resources: [link(1)] })])).join()).toMatch(/at least 2/);
    expect(errors(file([topic("a", { resources: [link(1), { site: "S", title: "T", url: "http://example.com" }] })])).join()).toMatch(/https/);
  });
  it("cross-checks week numbers against the curriculum", () => {
    const f = Resources.parse(file([topic("a")]));
    expect(resourcesProblems(f, [1, 2, 3])).toEqual([]);
    expect(resourcesProblems(f, [2, 3])).toHaveLength(1);
  });
});
