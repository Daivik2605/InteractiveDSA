// Validates everything in content/ against the types in src/types/content.ts (curriculum: scripts/curriculum-schema.ts).
// Usage: npm run validate

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { DebugFile, PracticalTask, QuestionFile, practicalProblems, questionFileProblems, type PracticalTaskData, type QuestionFileData } from "./content-schema";
import { Curriculum, type CurriculumFile } from "./curriculum-schema";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");

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
const seenQuestionIds = new Map<string, string>();
if (existsSync(questionsDir)) {
  for (const name of readdirSync(questionsDir).filter((n) => n.endsWith(".json")).sort()) {
    const file = check(`content/questions/${name}`, join(questionsDir, name), QuestionFile) as QuestionFileData | undefined;
    if (!file) continue;
    const problems = questionFileProblems(name, file);
    for (const q of file.questions) {
      const other = seenQuestionIds.get(q.id);
      if (other) problems.push(`${q.id} is also in ${other}`);
      seenQuestionIds.set(q.id, name);
    }
    for (const p of problems) console.error(`    content/questions/${name}: ${p}`);
    if (problems.length > 0) failures++;
  }
}

const practicalDir = join(contentDir, "practical");
if (existsSync(practicalDir)) {
  for (const name of readdirSync(practicalDir).filter((n) => n.endsWith(".json")).sort()) {
    const task = check(`content/practical/${name}`, join(practicalDir, name), PracticalTask) as PracticalTaskData | undefined;
    if (!task) continue;
    const problems = practicalProblems(name, task, curriculum);
    for (const p of problems) console.error(`    content/practical/${name}: ${p}`);
    if (problems.length > 0) failures++;
  }
}

const debugFile = join(contentDir, "mock-extras", "debug.json");
if (existsSync(debugFile)) check("content/mock-extras/debug.json", debugFile, DebugFile);

// ── lessons: content/concepts/week-NN.md and content/templates/week-NN.md ───
// Each `## ` heading must match the curriculum's list for that week, in order; every section needs a Python block
// that parses (templates also need a "Use when" note).
function checkLessons(kind: "concepts" | "templates") {
  const dir = join(contentDir, kind);
  if (!existsSync(dir) || !curriculum) return;
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
    const label = `content/${kind}/${name}`;
    const m = /^week-(\d{2})\.md$/.exec(name);
    const week = m ? curriculum.weeks.find((w) => w.week === Number(m[1])) : undefined;
    const problems: string[] = [];
    if (!week) problems.push("file name must be week-NN.md for a week in the curriculum");
    else {
      const sections = readFileSync(join(dir, name), "utf8").split(/^## /m).slice(1);
      const wanted = week[kind];
      if (sections.length !== wanted.length) problems.push(`expected ${wanted.length} sections (one per item in weeks[${week.week - 1}].${kind}), found ${sections.length}`);
      sections.forEach((sec, i) => {
        const title = sec.split("\n")[0]!.trim();
        if (wanted[i] !== undefined && title !== wanted[i]) problems.push(`section ${i + 1} is "${title}", expected "${wanted[i]}"`);
        const blocks = [...sec.matchAll(/```python\n([\s\S]*?)```/g)].map((b) => b[1]!);
        if (blocks.length === 0) problems.push(`"${title}" has no python code block`);
        if (kind === "templates" && !/\*Use when\*/.test(sec)) problems.push(`"${title}" has no "*Use when*" note`);
        for (const code of blocks) {
          const r = spawnSync("python3", ["-I", "-c", "import ast,sys; ast.parse(sys.stdin.read())"], { input: code, encoding: "utf8" });
          if (r.status !== 0) problems.push(`"${title}" has a code block that is not valid Python: ${r.stderr.trim().split("\n").at(-1)}`);
        }
      });
    }
    if (problems.length === 0) console.log(`✓ ${label}`);
    else {
      failures++;
      console.error(`✗ ${label}`);
      for (const p of problems) console.error(`    ${p}`);
    }
  }
}
checkLessons("concepts");
checkLessons("templates");

if (failures > 0) {
  console.error(`\n${failures} file(s) failed validation.`);
  process.exit(1);
}
console.log("\nAll content valid.");
