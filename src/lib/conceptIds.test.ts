import { describe, expect, it } from "vitest";
import { curriculum } from "./curriculum";
import { conceptId, curriculumConcepts } from "./conceptIds";
import snapshot from "./fixtures/concept-ids.json";

// content/concept-links.json (and every saved concept tick) is keyed by these ids. If this fails, a concept in
// curriculum.json was reordered, removed or reworded: restore it, or move the ids deliberately (update the links file,
// migrate the saved ticks, then regenerate src/lib/fixtures/concept-ids.json). Appending a concept at the END of a week is fine.
describe("concept ids stay stable", () => {
  const now = new Map(curriculumConcepts(curriculum.weeks).map((c) => [c.id, c.text]));

  it("builds ids from week and position", () => {
    expect(conceptId(3, 2)).toBe("w03-c2");
    expect(conceptId(13, 10)).toBe("w13-c10");
    expect([...now.keys()].slice(0, 2)).toEqual(["w01-c1", "w01-c2"]);
  });

  it("there are still 80 concepts or more", () => {
    expect(Object.keys(snapshot)).toHaveLength(80);
    expect(now.size).toBeGreaterThanOrEqual(80);
  });

  for (const [id, text] of Object.entries(snapshot)) {
    it(`${id} is still "${text.slice(0, 50)}"`, () => {
      expect(now.has(id), `${id} was removed or its week now has fewer concepts`).toBe(true);
      expect(now.get(id), `${id} now says something else: a concept was reordered or reworded`).toBe(text);
    });
  }
});
