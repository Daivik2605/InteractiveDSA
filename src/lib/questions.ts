import type { DrillPrompt, Question, QuestionFile } from "../types/content";

export interface QuestionBank {
  questions: Question[];
  drill: DrillPrompt[];
  byId: ReadonlyMap<string, Question>;
  drillById: ReadonlyMap<string, DrillPrompt>;
}

/** Pure: builds the lookup tables from parsed question files. */
export function buildBank(files: readonly QuestionFile[]): QuestionBank {
  const questions = files.flatMap((f) => f.questions);
  const drill = files.flatMap((f) => f.drill ?? []);
  return {
    questions,
    drill,
    byId: new Map(questions.map((q) => [q.id, q])),
    drillById: new Map(drill.map((d) => [d.id, d])),
  };
}

// Validated by `npm run validate`; the JSON's inferred types are wider than ours, hence the cast.
const modules = import.meta.glob("../../content/questions/*.json", { eager: true, import: "default" });

export const bank: QuestionBank = buildBank(Object.values(modules) as QuestionFile[]);

/** The pattern a recorded answer belongs to (for per-pattern stats), by question or drill id. */
export function patternOf(b: QuestionBank, id: string): string | undefined {
  const q = b.byId.get(id);
  if (q) return q.type === "pattern" ? q.options[q.answer] : q.pattern;
  return b.drillById.get(id)?.answer;
}

export const questionsOfWeek = (b: QuestionBank, week: number) => b.questions.filter((q) => q.week === week);
