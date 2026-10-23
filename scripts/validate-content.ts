// Validates everything in content/ against the types in docs/CONTENT_SCHEMA.md.
// Usage: npm run validate

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const nonEmpty = z.string().min(1);

// ── curriculum ───────────────────────────────────────────────────────────────

const Problem = z.strictObject({
  id: z.string().regex(/^w\d{2}-d[1-7]-p\d+$/, 'expected an id like "w03-d2-p1"'),
  title: nonEmpty,
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  url: z.string().regex(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/, "expected a leetcode.com problem URL"),
  lcNumber: z.number().int().positive().optional(),
  source: z.enum(["original", "added"]),
});

const PlanDay = z.strictObject({
  day: z.number().int().min(1).max(7),
  learn: nonEmpty,
  problems: z.array(Problem),
  codingNote: z.string().nullable(),
});

const Week = z.strictObject({
  week: z.number().int().min(1).max(13),
  title: nonEmpty,
  goal: nonEmpty,
  concepts: z.array(nonEmpty).min(1),
  visuals: z.array(nonEmpty).min(1),
  templates: z.array(nonEmpty).min(1),
  days: z.array(PlanDay).length(7),
  problemCount: z.number().int().nonnegative(),
});

const Curriculum = z
  .strictObject({
    version: z.number().int().positive(),
    defaultStartDate: dateString,
    weeks: z.array(Week).length(13),
  })
  .superRefine((c, ctx) => {
    const seen = new Set<string>();
    c.weeks.forEach((w, wi) => {
      if (w.week !== wi + 1) ctx.addIssue({ code: "custom", path: ["weeks", wi, "week"], message: `expected week ${wi + 1}` });
      const nn = String(w.week).padStart(2, "0");
      let count = 0;
      w.days.forEach((d, di) => {
        if (d.day !== di + 1) ctx.addIssue({ code: "custom", path: ["weeks", wi, "days", di, "day"], message: `expected day ${di + 1}` });
        d.problems.forEach((p, pi) => {
          count++;
          const path = ["weeks", wi, "days", di, "problems", pi, "id"];
          if (!p.id.startsWith(`w${nn}-d${d.day}-p`)) ctx.addIssue({ code: "custom", path, message: `id "${p.id}" does not match its position (w${nn}-d${d.day})` });
          if (seen.has(p.id)) ctx.addIssue({ code: "custom", path, message: `duplicate problem id "${p.id}"` });
          seen.add(p.id);
        });
      });
      if (count !== w.problemCount) {
        ctx.addIssue({ code: "custom", path: ["weeks", wi, "problemCount"], message: `problemCount is ${w.problemCount} but the week has ${count} problems` });
      }
    });
  });

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

const curriculum = check("content/curriculum.json", join(contentDir, "curriculum.json"), Curriculum) as
  | z.infer<typeof Curriculum>
  | undefined;
if (curriculum) {
  const total = curriculum.weeks.reduce((n, w) => n + w.problemCount, 0);
  console.log(`  ${curriculum.weeks.length} weeks, ${curriculum.weeks.length * 7} plan days, ${total} problems`);
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
