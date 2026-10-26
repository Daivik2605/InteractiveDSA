import { describe, expect, it } from "vitest";
import curriculum from "../../content/curriculum.json";
import debug from "../../content/mock-extras/debug.json";
import pt01 from "../../content/practical/pt-01.json";
import theme01 from "../../content/questions/python-theme-01.json";
import week01 from "../../content/questions/week-01.json";
import { DebugFile, PracticalTask, Question, QuestionFile, practicalProblems, questionFileProblems, type QuestionFileData } from "../../scripts/content-schema";
import type { CurriculumFile } from "../../scripts/curriculum-schema";

const clone = <T,>(x: T): T => structuredClone(x);
const messages = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
const asFile = (x: unknown) => QuestionFile.parse(x) as QuestionFileData;
const cur = curriculum as unknown as CurriculumFile;

describe("question files", () => {
  it("accepts the real week and theme files", () => {
    expect(messages(QuestionFile.safeParse(week01))).toEqual([]);
    expect(messages(QuestionFile.safeParse(theme01))).toEqual([]);
    expect(questionFileProblems("week-01.json", asFile(week01))).toEqual([]);
    expect(questionFileProblems("python-theme-01.json", asFile(theme01))).toEqual([]);
  });

  it("accepts w- and t- ids and rejects other id shapes", () => {
    const q = clone(theme01.questions[0]!) as Record<string, unknown>;
    expect(messages(Question.safeParse(q))).toEqual([]);
    expect(messages(Question.safeParse({ ...q, id: "x01-q01" })).join("\n")).toMatch(/expected an id like/);
    expect(messages(Question.safeParse({ ...q, id: "t1-q01" })).join("\n")).toMatch(/expected an id like/);
  });

  it("requires a theme on t- ids that matches the id, and limits it to 1-15", () => {
    const q = clone(theme01.questions[0]!) as Record<string, unknown>;
    const { theme: _drop, ...noTheme } = q;
    expect(messages(Question.safeParse(noTheme)).join("\n")).toMatch(/need a theme/);
    expect(messages(Question.safeParse({ ...q, theme: 2 })).join("\n")).toMatch(/id says theme 1/);
    expect(messages(Question.safeParse({ ...q, theme: 16 })).length).toBeGreaterThan(0);
    expect(messages(Question.safeParse({ ...q, theme: 0 })).length).toBeGreaterThan(0);
  });

  it("accepts an optional theme on a w- question and on the file", () => {
    const q = { ...clone(week01.questions[0]!), theme: 3 };
    expect(messages(Question.safeParse(q))).toEqual([]);
    expect(messages(QuestionFile.safeParse({ ...clone(week01), theme: 3 }))).toEqual([]);
  });

  it("python-theme-NN.json needs theme NN on the file and on every question", () => {
    const f = clone(theme01);
    f.theme = 2;
    expect(questionFileProblems("python-theme-01.json", asFile(f)).join("\n")).toMatch(/must have "theme": 1/);
    const g = clone(theme01) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    g.questions[3].theme = 2;
    g.questions[3].id = "t02-q04";
    const out = questionFileProblems("python-theme-01.json", asFile(g)).join("\n");
    expect(out).toMatch(/t02-q04: theme is 2, expected 1/);
    expect(out).toMatch(/id must start with t01-/);
    expect(questionFileProblems("python-theme-16.json", asFile(g)).join("\n")).toMatch(/theme number must be 1–15/);
  });

  it("enforces 20+ questions per week file and 8+ per theme file, with no 5-per-type rule", () => {
    const w = clone(week01);
    w.questions = w.questions.filter((q) => q.type !== "concept").slice(0, 19);
    expect(questionFileProblems("week-01.json", asFile(w)).join("\n")).toMatch(/at least 20 questions, has 19/);
    const ok = clone(week01);
    ok.questions = ok.questions.filter((q) => q.type !== "approach"); // fewer than 5 of a type is fine
    expect(ok.questions.length).toBeGreaterThanOrEqual(20);
    expect(questionFileProblems("week-01.json", asFile(ok))).toEqual([]);
    const t = clone(theme01);
    t.questions = t.questions.slice(0, 7);
    expect(questionFileProblems("python-theme-01.json", asFile(t)).join("\n")).toMatch(/at least 8 questions, has 7/);
  });

  it("rejects an unknown file name", () => {
    expect(questionFileProblems("misc.json", asFile(week01)).join("\n")).toMatch(/file name must be/);
  });
});

describe("practical tasks", () => {
  it("accepts the real file and matches its curriculum entry", () => {
    expect(messages(PracticalTask.safeParse(pt01))).toEqual([]);
    expect(practicalProblems("pt-01.json", PracticalTask.parse(pt01), cur)).toEqual([]);
  });

  it("needs exactly 3 levels numbered 1-3, each with every field", () => {
    const two = clone(pt01);
    two.levels.pop();
    expect(messages(PracticalTask.safeParse(two)).length).toBeGreaterThan(0);
    const swapped = clone(pt01);
    swapped.levels[1]!.level = 3;
    expect(messages(PracticalTask.safeParse(swapped)).join("\n")).toMatch(/expected level 2/);
    const missing = clone(pt01) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    delete missing.levels[0].expectedOutput;
    expect(messages(PracticalTask.safeParse(missing)).join("\n")).toMatch(/levels\.0\.expectedOutput/);
    const noRules = { ...clone(pt01), rules: [] };
    expect(messages(PracticalTask.safeParse(noRules)).length).toBeGreaterThan(0);
  });

  it("must match a curriculum practicalTasks id, title, unlock week and file name", () => {
    const task = PracticalTask.parse({ ...clone(pt01), id: "pt-99" });
    expect(practicalProblems("pt-99.json", task, cur).join("\n")).toMatch(/not a practicalTasks id/);
    const wrongTitle = PracticalTask.parse({ ...clone(pt01), title: "Something else", unlockWeek: 5 });
    const out = practicalProblems("pt-01.json", wrongTitle, cur).join("\n");
    expect(out).toMatch(/title is "Something else"/);
    expect(out).toMatch(/unlockWeek is 5/);
    expect(practicalProblems("pt-02.json", PracticalTask.parse(pt01), cur).join("\n")).toMatch(/file name must be pt-01.json/);
  });
});

describe("debug snippets", () => {
  it("accepts the real file", () => {
    expect(messages(DebugFile.safeParse(debug))).toEqual([]);
    expect(debug.snippets).toHaveLength(8);
  });

  it("keeps bugLine inside the snippet and the snippet 15-25 lines", () => {
    const d = clone(debug);
    d.snippets[0]!.bugLine = 99;
    expect(messages(DebugFile.safeParse(d)).join("\n")).toMatch(/outside the \d+-line snippet/);
    const e = clone(debug);
    e.snippets[0]!.code = "x = 1\nprint(x)";
    e.snippets[0]!.bugLine = 1;
    expect(messages(DebugFile.safeParse(e)).join("\n")).toMatch(/15–25 lines/);
  });

  it("requires a real difference between buggy and fixed, and actual vs expected", () => {
    const d = clone(debug);
    d.snippets[0]!.fixedCode = d.snippets[0]!.code;
    d.snippets[1]!.actual = d.snippets[1]!.expected;
    const out = messages(DebugFile.safeParse(d)).join("\n");
    expect(out).toMatch(/fixedCode must differ/);
    expect(out).toMatch(/actual must differ/);
  });

  it("requires every field and unique ids", () => {
    const d = clone(debug) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    delete d.snippets[2].fix;
    expect(messages(DebugFile.safeParse(d)).join("\n")).toMatch(/snippets\.2\.fix/);
    const e = clone(debug);
    e.snippets[3]!.id = e.snippets[0]!.id;
    expect(messages(DebugFile.safeParse(e)).join("\n")).toMatch(/duplicate snippet id/);
  });
});
