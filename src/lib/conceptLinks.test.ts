import { describe, expect, it } from "vitest";
import { conceptId, curriculumConcepts } from "./conceptIds";
import { getConceptLinks } from "./concepts";
import { curriculum } from "./curriculum";

// The real content/concept-links.json: every curriculum concept needs 2-3 links, and nothing may be keyed to a concept that is gone.
describe("content/concept-links.json", () => {
  const file = getConceptLinks();
  const ids = curriculumConcepts(curriculum.weeks).map((c) => c.id);

  it("exists", () => {
    expect(file).toBeDefined();
  });

  it("has an entry for each of the 80 concepts, and no entry for anything else", () => {
    expect(ids).toHaveLength(80);
    expect(Object.keys(file!.concepts).sort()).toEqual([...ids].sort());
  });

  for (const id of ids) {
    it(`${id} has 2-3 https links with no repeated URL`, () => {
      const links = file!.concepts[id]!;
      expect(links.length).toBeGreaterThanOrEqual(2);
      expect(links.length).toBeLessThanOrEqual(3);
      for (const l of links) expect(l.url).toMatch(/^https:\/\//);
      expect(new Set(links.map((l) => l.url)).size).toBe(links.length);
    });
  }

  it("uses the same id scheme as the curriculum (w03-c2 is the 2nd concept of Week 3)", () => {
    expect(conceptId(3, 2)).toBe("w03-c2");
    expect(file!.concepts["w03-c2"]).toBeDefined();
  });
});
