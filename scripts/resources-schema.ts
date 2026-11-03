// Zod schema + cross-checks for content/resources.json (optional file). Used by validate-content.ts and its test.
// The types it mirrors are in src/types/content.ts (ResourcesFile).

import { z } from "zod";

const nonEmpty = z.string().min(1);
const https = z.string().refine((u) => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}, "expected an https:// URL");

const ResourceLink = z.strictObject({ site: nonEmpty, title: nonEmpty, url: https });

const Topic = z
  .strictObject({
    id: nonEmpty,
    title: nonEmpty,
    kind: z.enum(["data-structure", "pattern", "concept"]),
    structure: nonEmpty.optional(),
    resources: z.array(ResourceLink).min(2, "each topic needs at least 2 resources"),
  })
  .refine((t) => t.kind !== "data-structure" || !!t.structure, { message: 'a "data-structure" topic needs a structure name', path: ["structure"] });

export const Resources = z
  .strictObject({
    version: z.number().int().positive(),
    checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
    note: z.string(),
    roadmap: z.strictObject({ title: nonEmpty, url: https }),
    weeks: z.array(z.strictObject({ week: z.number().int().positive(), title: nonEmpty, neetcode: nonEmpty, topics: z.array(Topic) })),
  })
  .superRefine((file, ctx) => {
    const seenWeeks = new Set<number>();
    const seenIds = new Set<string>();
    file.weeks.forEach((w, wi) => {
      if (seenWeeks.has(w.week)) ctx.addIssue({ code: "custom", path: ["weeks", wi, "week"], message: `week ${w.week} appears twice` });
      seenWeeks.add(w.week);
      w.topics.forEach((t, ti) => {
        if (seenIds.has(t.id)) ctx.addIssue({ code: "custom", path: ["weeks", wi, "topics", ti, "id"], message: `topic id "${t.id}" is not unique` });
        seenIds.add(t.id);
      });
    });
  });

export type ResourcesData = z.infer<typeof Resources>;

/** Cross-check with the curriculum: every week in the file must be a curriculum week (and, when titled, match). */
export function resourcesProblems(file: ResourcesData, curriculumWeeks: readonly number[]): string[] {
  return file.weeks.filter((w) => !curriculumWeeks.includes(w.week)).map((w) => `weeks: week ${w.week} is not a week in curriculum.json`);
}
