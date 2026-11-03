// Zod schema + cross-checks for content/concept-links.json (optional file). Used by validate-content.ts and its test.
// Keys are concept ids ("w03-c2", src/lib/conceptIds.ts); each concept has 2-3 https links, no duplicate URL within a concept.

import { z } from "zod";

const nonEmpty = z.string().min(1);
const https = z.string().refine((u) => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}, "expected an https:// URL");

const Link = z.strictObject({ site: nonEmpty, title: nonEmpty, url: https });

export const ConceptLinks = z
  .strictObject({
  version: z.number().int().positive(),
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD").optional(),
  note: z.string().optional(),
  /** Each concept's wording when the links were chosen (id -> text); checked against curriculum.json by conceptTextDiffs. */
  texts: z.record(z.string(), nonEmpty).optional(),
  concepts: z.record(
    z.string(),
    z
      .array(Link)
      .min(2, "each concept needs 2-3 links")
      .max(3, "each concept needs 2-3 links")
      .refine((links) => new Set(links.map((l) => l.url)).size === links.length, "a concept lists the same URL twice"),
  ),
  })
  .superRefine((file, ctx) => {
    for (const id of Object.keys(file.concepts)) {
      if (!/^w\d{2}-c\d+$/.test(id)) ctx.addIssue({ code: "custom", path: ["concepts", id], message: `"${id}" is not a concept id like "w03-c2"` });
    }
  });

export type ConceptLinksData = z.infer<typeof ConceptLinks>;

/** Every key must be a concept that exists in curriculum.json. */
export function conceptLinksProblems(file: ConceptLinksData, conceptIds: ReadonlySet<string>): string[] {
  return Object.keys(file.concepts).filter((id) => !conceptIds.has(id)).map((id) => `concepts.${id}: no such concept in curriculum.json`);
}

export interface ConceptTextDiff {
  id: string;
  curriculum: string | undefined; // undefined = the id is not in the curriculum
  file: string;
}

/** Every `texts` entry must equal the concept string in curriculum.json. Reports; never edits. */
export function conceptTextDiffs(file: ConceptLinksData, curriculumTexts: ReadonlyMap<string, string>): ConceptTextDiff[] {
  return Object.entries(file.texts ?? {})
    .filter(([id, text]) => curriculumTexts.get(id) !== text)
    .map(([id, text]) => ({ id, curriculum: curriculumTexts.get(id), file: text }));
}
