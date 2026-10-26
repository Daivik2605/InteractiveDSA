// Zod schemas + file-level checks for content/questions, content/practical and content/mock-extras.
// Used by validate-content.ts and src/lib/contentSchema.test.ts. Curriculum lives in curriculum-schema.ts.

import { z } from "zod";
import type { CurriculumFile } from "./curriculum-schema";

const nonEmpty = z.string().min(1);

export const MIN_QUESTIONS_PER_WEEK = 20;
export const MIN_QUESTIONS_PER_THEME = 8;
export const PYTHON_THEME_COUNT = 15;

// ── questions ────────────────────────────────────────────────────────────────

const theme = z.number().int().min(1).max(PYTHON_THEME_COUNT);

export const Question = z
  .strictObject({
    id: z.string().regex(/^[wt]\d{2}-q\d{2,}$/, 'expected an id like "w01-q07" (week) or "t01-q07" (Python theme)'),
    week: z.number().int().min(1).max(13),
    theme: theme.optional(),
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
    const m = /^t(\d{2})-/.exec(q.id);
    if (m) {
      if (q.theme === undefined) ctx.addIssue({ code: "custom", path: ["theme"], message: "t-ids are Python-theme questions and need a theme" });
      else if (q.theme !== Number(m[1])) ctx.addIssue({ code: "custom", path: ["theme"], message: `id says theme ${Number(m[1])} but theme is ${q.theme}` });
    }
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

export const QuestionFile = z
  .strictObject({
    week: z.number().int().min(1).max(13),
    theme: theme.optional(),
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

export type QuestionFileData = z.infer<typeof QuestionFile>;

/** Rules that depend on the file name: week-NN.json and python-theme-NN.json. Returns problem descriptions. */
export function questionFileProblems(fileName: string, file: QuestionFileData): string[] {
  const problems: string[] = [];
  const weekMatch = /^week-(\d{2})\.json$/.exec(fileName);
  const themeMatch = /^python-theme-(\d{2})\.json$/.exec(fileName);
  if (weekMatch) {
    if (file.week !== Number(weekMatch[1])) problems.push(`file says week ${file.week}`);
    if (file.questions.length < MIN_QUESTIONS_PER_WEEK) problems.push(`needs at least ${MIN_QUESTIONS_PER_WEEK} questions, has ${file.questions.length}`);
    file.questions.forEach((q) => {
      if (q.id.startsWith("t")) problems.push(`${q.id}: theme question in a week file`);
    });
  } else if (themeMatch) {
    const n = Number(themeMatch[1]);
    if (n < 1 || n > PYTHON_THEME_COUNT) problems.push(`theme number must be 1–${PYTHON_THEME_COUNT}`);
    if (file.theme !== n) problems.push(`file must have "theme": ${n}`);
    if (file.questions.length < MIN_QUESTIONS_PER_THEME) problems.push(`needs at least ${MIN_QUESTIONS_PER_THEME} questions, has ${file.questions.length}`);
    file.questions.forEach((q) => {
      if (q.theme !== n) problems.push(`${q.id}: theme is ${q.theme ?? "missing"}, expected ${n}`);
      if (!q.id.startsWith(`t${String(n).padStart(2, "0")}-`)) problems.push(`${q.id}: id must start with t${String(n).padStart(2, "0")}-`);
    });
  } else {
    problems.push("file name must be week-NN.json or python-theme-NN.json");
  }
  return problems;
}

// ── practical tasks ──────────────────────────────────────────────────────────

const PracticalLevel = z.strictObject({
  level: z.number().int().min(1).max(3),
  title: nonEmpty,
  prompt: nonEmpty,
  signature: nonEmpty,
  sampleInput: nonEmpty,
  expectedOutput: nonEmpty,
  edgeCases: z.array(nonEmpty),
});

export const PracticalTask = z
  .strictObject({
    id: z.string().regex(/^pt-\d{2}$/, 'expected an id like "pt-01"'),
    title: nonEmpty,
    unlockWeek: z.number().int().min(1).max(13),
    intro: nonEmpty,
    rules: z.array(nonEmpty).min(1),
    levels: z.array(PracticalLevel).length(3),
  })
  .superRefine((t, ctx) => {
    t.levels.forEach((l, i) => {
      if (l.level !== i + 1) ctx.addIssue({ code: "custom", path: ["levels", i, "level"], message: `expected level ${i + 1}` });
    });
  });

export type PracticalTaskData = z.infer<typeof PracticalTask>;

/** The task must match its curriculum entry (id, title, unlock week) and its file name. */
export function practicalProblems(fileName: string, task: PracticalTaskData, curriculum: CurriculumFile | undefined): string[] {
  const problems: string[] = [];
  if (fileName !== `${task.id}.json`) problems.push(`file name must be ${task.id}.json`);
  if (!curriculum) return problems;
  const entry = curriculum.practicalTasks.find((p) => p.id === task.id);
  if (!entry) return [...problems, `"${task.id}" is not a practicalTasks id in curriculum.json`];
  if (entry.title !== task.title) problems.push(`title is "${task.title}", curriculum says "${entry.title}"`);
  if (entry.unlockWeek !== task.unlockWeek) problems.push(`unlockWeek is ${task.unlockWeek}, curriculum says ${entry.unlockWeek}`);
  return problems;
}

// ── mock extras: debug snippets ──────────────────────────────────────────────

const DebugSnippet = z
  .strictObject({
    id: z.string().regex(/^dbg-\d{2,}$/, 'expected an id like "dbg-01"'),
    title: nonEmpty,
    topic: nonEmpty,
    week: z.number().int().min(1).max(13),
    code: nonEmpty,
    bugLine: z.number().int().min(1),
    bug: nonEmpty,
    fix: nonEmpty,
    fixedCode: nonEmpty,
    expected: nonEmpty,
    actual: nonEmpty,
    explanation: nonEmpty,
  })
  .superRefine((s, ctx) => {
    const lines = s.code.split("\n").length;
    if (s.bugLine > lines) ctx.addIssue({ code: "custom", path: ["bugLine"], message: `bugLine ${s.bugLine} is outside the ${lines}-line snippet` });
    if (lines < 15 || lines > 25) ctx.addIssue({ code: "custom", path: ["code"], message: `snippets are 15–25 lines, this one has ${lines}` });
    if (s.fixedCode === s.code) ctx.addIssue({ code: "custom", path: ["fixedCode"], message: "fixedCode must differ from code" });
    if (s.actual === s.expected) ctx.addIssue({ code: "custom", path: ["actual"], message: "actual must differ from expected" });
  });

export const DebugFile = z
  .strictObject({ snippets: z.array(DebugSnippet).min(1) })
  .superRefine((f, ctx) => {
    const ids = new Set<string>();
    f.snippets.forEach((s, i) => {
      if (ids.has(s.id)) ctx.addIssue({ code: "custom", path: ["snippets", i, "id"], message: `duplicate snippet id "${s.id}"` });
      ids.add(s.id);
    });
  });
