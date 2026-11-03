// Concept ids: "w03-c2" is the 2nd string of weeks[2].concepts in curriculum.json. Built from week and position, never from the
// text, so rewording a concept keeps its tick and its links. content/concept-links.json is keyed by these ids, so concepts
// must only ever be appended: reordering or removing one moves the ids (src/lib/conceptIds.test.ts guards this).
// Pure and dependency-free: scripts/validate-content.ts imports it too.

export const conceptId = (week: number, position: number): string => `w${String(week).padStart(2, "0")}-c${position}`;

/** Every curriculum concept as { id, week, position, text }, in curriculum order. */
export function curriculumConcepts(weeks: readonly { week: number; concepts: readonly string[] }[]) {
  return weeks.flatMap((w) => w.concepts.map((text, i) => ({ id: conceptId(w.week, i + 1), week: w.week, position: i + 1, text })));
}
