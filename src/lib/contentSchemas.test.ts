import { describe, expect, it } from "vitest";
import { ConceptLinks, conceptLinksProblems, conceptTextDiffs } from "../../scripts/concept-links-schema";
import { DataStructures, dataStructuresProblems } from "../../scripts/data-structures-schema";

const errors = (schema: { safeParse: (d: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, data: unknown) => {
  const r = schema.safeParse(data);
  return r.success ? [] : r.error!.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

const hr = { title: "HackerRank", url: "https://www.hackerrank.com/domains/data-structures", dashboard: "https://www.hackerrank.com/dashboard" };
const st = (name: string, over: object = {}) => ({ name, hackerrankSubdomain: "Stacks", inPlan: true, hackerrankUrl: hr.url, ...over });
const ds = (structures: object[], over: object = {}) => ({ version: 1, checkedOn: "2026-11-02", note: "", hackerrank: hr, structures, ...over });

describe("data-structures.json schema", () => {
  it("accepts a valid file, with a null sub-domain and a beyond-the-plan entry", () => {
    expect(errors(DataStructures, ds([st("Stack"), st("String", { hackerrankSubdomain: null }), st("AVL", { inPlan: false })]))).toEqual([]);
  });
  it("rejects duplicate names and non-https URLs", () => {
    expect(errors(DataStructures, ds([st("Stack"), st("Stack")])).join()).toMatch(/appears twice/);
    expect(errors(DataStructures, ds([st("Stack", { hackerrankUrl: "http://x.example/" })])).join()).toMatch(/https/);
    expect(errors(DataStructures, ds([st("Stack")], { hackerrank: { ...hr, dashboard: "ftp://x" } })).join()).toMatch(/https/);
  });
  it("every structure used in resources.json must exist", () => {
    const f = DataStructures.parse(ds([st("Stack"), st("Graph")]));
    expect(dataStructuresProblems(f, ["Stack", "Graph", "Stack"])).toEqual([]);
    expect(dataStructuresProblems(f, ["Stack", "Heap"])).toEqual(['structures: "Heap" is used in resources.json but missing here']);
  });
});

const link = (n: number) => ({ site: "S", title: `T${n}`, url: `https://example.com/${n}` });
describe("concept-links.json schema", () => {
  it("accepts 2-3 https links per concept", () => {
    expect(errors(ConceptLinks, { version: 1, concepts: { "w03-c2": [link(1), link(2)], "w01-c1": [link(1), link(2), link(3)] } })).toEqual([]);
  });
  it("rejects 1 or 4 links, a duplicate URL within a concept, non-https and a malformed id", () => {
    expect(errors(ConceptLinks, { version: 1, concepts: { "w03-c2": [link(1)] } }).join()).toMatch(/2-3/);
    expect(errors(ConceptLinks, { version: 1, concepts: { "w03-c2": [link(1), link(2), link(3), link(4)] } }).join()).toMatch(/2-3/);
    expect(errors(ConceptLinks, { version: 1, concepts: { "w03-c2": [link(1), link(1)] } }).join()).toMatch(/same URL/);
    expect(errors(ConceptLinks, { version: 1, concepts: { "w03-c2": [link(1), { site: "S", title: "T", url: "http://example.com" }] } }).join()).toMatch(/https/);
    expect(errors(ConceptLinks, { version: 1, concepts: { bad: [link(1), link(2)] } }).join()).toMatch(/concept id/);
  });
  it("the same URL may appear under different concepts", () => {
    expect(errors(ConceptLinks, { version: 1, concepts: { "w01-c1": [link(1), link(2)], "w01-c2": [link(1), link(3)] } })).toEqual([]);
  });
  it("ids must exist in the curriculum", () => {
    const f = ConceptLinks.parse({ version: 1, concepts: { "w01-c1": [link(1), link(2)], "w99-c1": [link(1), link(2)] } });
    expect(conceptLinksProblems(f, new Set(["w01-c1"]))).toEqual(["concepts.w99-c1: no such concept in curriculum.json"]);
  });
  it("accepts the optional checkedOn, note and texts, and flags a text that differs from the curriculum", () => {
    const f = ConceptLinks.parse({
      version: 1,
      checkedOn: "2026-11-02",
      note: "n",
      texts: { "w01-c1": "How cost grows", "w01-c2": "Old wording", "w99-c1": "Not a concept" },
      concepts: { "w01-c1": [link(1), link(2)] },
    });
    const curriculumTexts = new Map([["w01-c1", "How cost grows"], ["w01-c2", "What every operation costs"]]);
    expect(conceptTextDiffs(f, curriculumTexts)).toEqual([
      { id: "w01-c2", curriculum: "What every operation costs", file: "Old wording" },
      { id: "w99-c1", curriculum: undefined, file: "Not a concept" },
    ]);
    expect(conceptTextDiffs(ConceptLinks.parse({ version: 1, concepts: { "w01-c1": [link(1), link(2)] } }), curriculumTexts)).toEqual([]); // texts is optional
  });
});
