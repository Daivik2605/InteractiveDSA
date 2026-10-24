// Validates everything in content/ against the types in src/types/content.ts (curriculum: scripts/curriculum-schema.ts).
// Usage: npm run validate

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Curriculum, type CurriculumFile } from "./curriculum-schema";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");

const nonEmpty = z.string().min(1);

// ── questions ────────────────────────────────────────────────────────────────

const Question = z
  .strictObject({
    id: z.string().regex(/^w\d{2}-q\d{2,}$/, 'expected an id like "w01-q07"'),
    week: z.number().int().min(1).max(13),
    type: z.enum(["pattern", "complexity", "output", "bug", "approach", "concept"]),
    pattern: nonEmpty,
    difficulty: z.enum(["medium", "hard"]),
    prompt: nonEmpty,
    code: z.string().optional(),
    options: z.array(nonEmpty).length(4),
    answer: z.number().int().min(0).max(3),
    explanation: nonEmpty,
    complexity: z.strictObject({ time: nonEmpty, space: nonEmpty }).optional(),
    visual: z.strictObject({ component: nonEmpty, props: z.record(z.string(), z.unknown()) }).optional(),
    tags: z.array(nonEmpty).optional(),
  })
  .superRefine((q, ctx) => {
    if (new Set(q.options).size !== q.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "options must be distinct" });
    if (q.type === "output" && !q.code) ctx.addIssue({ code: "custom", path: ["code"], message: "output questions need code" });
  });

const DrillPrompt = z
  .strictObject({
    id: z.string().regex(/^w\d{2}-dr\d{2,}$/, 'expected an id like "w03-dr04"'),
    week: z.number().int().min(1).max(13),
    description: nonEmpty,
    answer: nonEmpty,
    distractors: z.array(nonEmpty).length(5),
  })
  .superRefine((d, ctx) => {
    if (d.distractors.includes(d.answer)) ctx.addIssue({ code: "custom", path: ["distractors"], message: "distractors must not contain the answer" });
    if (new Set(d.distractors).size !== d.distractors.length) ctx.addIssue({ code: "custom", path: ["distractors"], message: "distractors must be distinct" });
  });

const QuestionFile = z
  .strictObject({
    week: z.number().int().min(1).max(13),
    questions: z.array(Question),
    drill: z.array(DrillPrompt).optional(),
  })
  .superRefine((f, ctx) => {
    const ids = new Set<string>();
    f.questions.forEach((q, i) => {
      if (q.week !== f.week) ctx.addIssue({ code: "custom", path: ["questions", i, "week"], message: `week ${q.week} in a week-${f.week} file` });
      if (ids.has(q.id)) ctx.addIssue({ code: "custom", path: ["questions", i, "id"], message: `duplicate question id "${q.id}"` });
      ids.add(q.id);
    });
    f.drill?.forEach((d, i) => {
      if (d.week !== f.week) ctx.addIssue({ code: "custom", path: ["drill", i, "week"], message: `week ${d.week} in a week-${f.week} file` });
      if (ids.has(d.id)) ctx.addIssue({ code: "custom", path: ["drill", i, "id"], message: `duplicate id "${d.id}"` });
      ids.add(d.id);
    });
  });

// ── runner ───────────────────────────────────────────────────────────────────

let failures = 0;

function check(label: string, file: string, schema: z.ZodType) {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`✗ ${label}: cannot read/parse JSON — ${(e as Error).message}`);
    failures++;
    return undefined;
  }
  const result = schema.safeParse(data);
  if (result.success) {
    console.log(`✓ ${label}`);
    return result.data;
  }
  failures++;
  console.error(`✗ ${label}`);
  for (const issue of result.error.issues) console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  return undefined;
}

const curriculum = check("content/curriculum.json", join(contentDir, "curriculum.json"), Curriculum) as CurriculumFile | undefined;
if (curriculum) {
  const core = curriculum.weeks.reduce((n, w) => n + w.problemCount, 0);
  const old = curriculum.weeks.reduce((n, w) => n + w.oldTopicCount, 0);
  const mocks = curriculum.weeks.reduce((n, w) => n + w.mockCount, 0);
  console.log(`  ${curriculum.weeks.length} weeks, ${curriculum.totalPlanDays} plan days, ${core} core + ${old} old-topic problems, ${mocks} mocks`);
}

const questionsDir = join(contentDir, "questions");
if (existsSync(questionsDir)) {
  for (const name of readdirSync(questionsDir).filter((n) => n.endsWith(".json")).sort()) {
    const file = check(`content/questions/${name}`, join(questionsDir, name), QuestionFile) as
      | z.infer<typeof QuestionFile>
      | undefined;
    const m = /^week-(\d{2})\.json$/.exec(name);
    if (file && m && file.week !== Number(m[1])) {
      console.error(`✗ content/questions/${name}: file says week ${file.week}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} file(s) failed validation.`);
  process.exit(1);
}
console.log("\nAll content valid.");
