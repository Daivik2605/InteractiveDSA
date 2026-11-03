// Zod schema + cross-checks for content/data-structures.json (optional file). Used by validate-content.ts and its test.
// The types it mirrors are in src/types/content.ts (DataStructuresFile).

import { z } from "zod";

const nonEmpty = z.string().min(1);
const https = z.string().refine((u) => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}, "expected an https:// URL");

export const DataStructures = z
  .strictObject({
    version: z.number().int().positive(),
    checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
    note: z.string(),
    hackerrank: z.strictObject({ title: nonEmpty, url: https, dashboard: https }),
    structures: z.array(z.strictObject({ name: nonEmpty, hackerrankSubdomain: nonEmpty.nullable(), inPlan: z.boolean(), hackerrankUrl: https })).min(1),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.structures.forEach((s, i) => {
      if (seen.has(s.name)) ctx.addIssue({ code: "custom", path: ["structures", i, "name"], message: `structure name "${s.name}" appears twice` });
      seen.add(s.name);
    });
  });

export type DataStructuresData = z.infer<typeof DataStructures>;

/** Every structure named in resources.json must exist here. */
export function dataStructuresProblems(file: DataStructuresData, resourceStructureNames: readonly string[]): string[] {
  const known = new Set(file.structures.map((s) => s.name));
  return [...new Set(resourceStructureNames)].filter((n) => !known.has(n)).map((n) => `structures: "${n}" is used in resources.json but missing here`);
}
