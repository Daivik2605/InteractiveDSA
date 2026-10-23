# Content & Data Schema

Copy these types into `src/types/content.ts`. `scripts/validate-content.ts` validates all JSON in `content/` against them (use zod).

## Curriculum (`content/curriculum.json`)
```ts
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Problem {
  id: string;            // "w03-d2-p1" — stable, never reuse
  title: string;
  difficulty: Difficulty;
  url: string;           // LeetCode URL
  lcNumber?: number;     // position in the original 150-problem roadmap
  source: "original" | "added";
}

export interface PlanDay {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  learn: string;         // label of the learn item
  problems: Problem[];
  codingNote: string | null; // e.g. day 7 redo instructions
}

export interface Week {
  week: number;          // 1–13
  title: string;
  goal: string;
  concepts: string[];
  visuals: string[];     // which visualizer scenes to build
  templates: string[];   // Python templates to include
  days: PlanDay[];
  problemCount: number;
}

export interface Curriculum { version: number; defaultStartDate: string; weeks: Week[]; }
```

## Questions (`content/questions/week-NN.json`)
```ts
export type QuestionType = "pattern" | "complexity" | "output" | "bug" | "approach" | "concept";

export interface Question {
  id: string;            // "w01-q07" — stable, never reuse
  week: number;
  type: QuestionType;
  pattern: string;       // e.g. "Sliding Window", used by the dashboard
  difficulty: "medium" | "hard"; // interview level
  prompt: string;        // markdown allowed
  code?: string;         // Python 3.11
  options: string[];     // 4 options
  answer: number;        // index into options
  explanation: string;   // why, incl. time/space when relevant
  complexity?: { time: string; space: string };
  visual?: { component: string; props: Record<string, unknown> }; // optional diagram
  tags?: string[];
}

export interface QuestionFile { week: number; questions: Question[]; drill?: DrillPrompt[]; }

export interface DrillPrompt {
  id: string;            // "w03-dr04"
  week: number;
  description: string;   // 1–3 sentence problem statement, no title
  answer: string;        // pattern name
  distractors: string[]; // 5 other pattern names
}
```

Rules:
- ≥ 30 questions per week; ≥ 5 of each of `pattern`, `complexity`, `output`, `bug`, `approach`.
- `output` questions: `code` must print exactly one line; the correct option must equal that line. Checked by `scripts/check_outputs.py`.
- Distractors must be plausible (common mistakes), never joke answers.
- ≥ 10 drill prompts per week.

### Example
```json
{
  "id": "w03-q12",
  "week": 3,
  "type": "complexity",
  "pattern": "Sliding Window",
  "difficulty": "medium",
  "prompt": "What is the time complexity of this function for a string of length n?",
  "code": "def longest(s):\n    seen, l, best = set(), 0, 0\n    for r, ch in enumerate(s):\n        while ch in seen:\n            seen.remove(s[l]); l += 1\n        seen.add(ch)\n        best = max(best, r - l + 1)\n    return best",
  "options": ["O(n)", "O(n²)", "O(n log n)", "O(n · k) where k = alphabet size"],
  "answer": 0,
  "explanation": "The while loop looks nested, but l only moves forward, so each index is added and removed at most once: O(n) total. Space O(min(n, alphabet)).",
  "complexity": { "time": "O(n)", "space": "O(min(n, Σ))" }
}
```

## Templates (`content/templates/week-NN.md`)
Markdown, one `## Heading` per template followed by a ```python block and a one-line "Use when…" note.

## Progress (Dexie / IndexedDB)
```ts
// Completions belong to plan items, not dates, so extensions can move dates safely.
export interface ItemCompletion {
  itemId: string;        // primary key: a problem id ("w03-d2-p1"), "w03-d2:learn", or an extension slot "w03-x1:s1"
  planDayId: string;     // "w03-d2" or extension day "w03-x1"
  completedOn: string;   // YYYY-MM-DD when actually done
}

export interface WeekExtension {
  id?: number;
  week: number;
  extraDays: number;     // 1–14 total per week (sum of all extensions for that week)
  reason?: string;
  createdOn: string;     // YYYY-MM-DD
}

// Computed in lib/schedule.ts, never stored:
export interface ScheduledDay {
  planDayId: string;     // "w03-d2" | "w03-x1"
  week: number;
  kind: "plan" | "extension";
  date: string;          // YYYY-MM-DD from startDate + preceding days + extensions
}

export interface ProblemAttempt {
  id?: number;
  problemId: string;
  date: string;
  outcome: "alone" | "hint" | "solution";
  minutes: number;
  note?: string;
  isRedo: boolean;
}

export interface RedoTask { id?: number; problemId: string; dueOn: string; doneOn?: string; }

export interface QuizAnswer {
  id?: number;
  questionId: string;
  correct: boolean;
  answeredAt: string;    // ISO timestamp
  mode: "weekly" | "review" | "targeted" | "drill";
  ms?: number;           // time to answer (drill)
}

export interface CardState { questionId: string; box: 1 | 2 | 3 | 4 | 5; dueOn: string; }

export interface RestDay { date: string; }

export interface MockSession {
  id?: number; date: string; problemIds: string[];
  checklist: Record<string, boolean[]>; rating: 1 | 2 | 3 | 4 | 5; notes?: string;
}

export interface Settings { id: "settings"; startDate: string; theme: "light" | "dark" | "system"; }
```
Export/import = one JSON object with every table plus `schemaVersion`.
