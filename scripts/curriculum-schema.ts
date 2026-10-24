// Zod schema + cross-checks for content/curriculum.json (version 2). Used by validate-content.ts and its test.
// The types it mirrors are in src/types/content.ts (docs/curriculum-v2.types.ts).

import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const nonEmpty = z.string().min(1);
const mockExtra = z.enum(["debug", "explain-aloud", "complexity-check"]);

export const TOTAL_PLAN_DAYS = 90;
export const MOCK_COUNT = 45;
export const PYTHON_THEMES = 15;

const Problem = z
  .strictObject({
    id: z.string().regex(/^w\d{2}-(d[1-7]-(p\d+|fb)|pool-\d+)$/, 'expected an id like "w03-d2-p1", "w03-d7-fb" or "w03-pool-04"'),
    platform: z.enum(["LeetCode", "HackerRank"]),
    lcNumber: z.number().int().positive().optional(),
    title: nonEmpty,
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    url: z.string().url(),
    role: z.enum(["core", "old-topic", "fallback", "pool"]),
    fromWeek: z.number().int().min(1).max(13).optional(),
  })
  .superRefine((p, ctx) => {
    const host = p.platform === "LeetCode" ? /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/ : /^https:\/\/www\.hackerrank\.com\/.+/;
    if (!host.test(p.url)) ctx.addIssue({ code: "custom", path: ["url"], message: `expected a ${p.platform} URL` });
    if (p.role === "old-topic" && p.fromWeek === undefined) ctx.addIssue({ code: "custom", path: ["fromWeek"], message: "old-topic problems need fromWeek" });
    if (p.role !== "old-topic" && p.fromWeek !== undefined) ctx.addIssue({ code: "custom", path: ["fromWeek"], message: "only old-topic problems have fromWeek" });
  });

const MockSlot = z.strictObject({
  number: z.number().int().min(1).max(MOCK_COUNT),
  pythonTheme: z.number().int().min(1).max(PYTHON_THEMES),
  extra: mockExtra,
  program2: z.boolean(),
  diagnostic: z.boolean(),
  final: z.boolean(),
  mcqCount: z.number().int().positive(),
});

const PlanDay = z.strictObject({
  day: z.number().int().min(1).max(7),
  planDay: z.number().int().min(1).max(TOTAL_PLAN_DAYS),
  kind: z.enum(["new-topic", "topic", "python-fluency", "old-topics", "timed", "redo", "wrap-up"]),
  mock: MockSlot.nullable(),
  learn: nonEmpty.nullable(),
  problems: z.array(Problem),
  fallback: Problem.nullable(),
  timedMinutes: z.number().int().positive().nullable(),
  codingNote: z.string().nullable(),
});

const Week = z.strictObject({
  week: z.number().int().min(1).max(13),
  title: nonEmpty,
  goal: nonEmpty,
  concepts: z.array(nonEmpty).min(1),
  visuals: z.array(nonEmpty).min(1),
  templates: z.array(nonEmpty).min(1),
  days: z.array(PlanDay).min(6).max(7),
  pool: z.array(Problem),
  problemCount: z.number().int().nonnegative(),
  oldTopicCount: z.number().int().nonnegative(),
  mockCount: z.number().int().nonnegative(),
});

const MockPart = z.strictObject({
  part: z.enum(["A", "B", "C", "D"]),
  name: nonEmpty,
  minutes: z.number().int().positive(),
  mix: z.strictObject({ python: z.number(), currentAndLastWeek: z.number(), spacedReview: z.number() }).optional(),
  source: z.string().optional(),
  when: z.string().optional(),
  rotation: z.array(mockExtra).optional(),
});

const PracticalTask = z.strictObject({
  id: z.string().regex(/^pt-\d{2}$/, 'expected an id like "pt-01"'),
  title: nonEmpty,
  levels: z.tuple([nonEmpty, nonEmpty, nonEmpty]),
  unlockWeek: z.number().int().min(1).max(13),
});

export const Curriculum = z
  .strictObject({
    version: z.literal(2),
    defaultStartDate: dateString,
    totalPlanDays: z.literal(TOTAL_PLAN_DAYS),
    mockSpec: z.strictObject({
      rule: nonEmpty,
      parts: z.array(MockPart).length(4),
      pythonThemes: z.array(z.strictObject({ id: z.number().int(), title: nonEmpty })).length(PYTHON_THEMES),
    }),
    practicalTasks: z.array(PracticalTask).length(16),
    weeks: z.array(Week).length(13),
  })
  .superRefine((c, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    const ids = new Set<string>();
    const urls = new Set<string>();
    const seen = (path: (string | number)[], p: z.infer<typeof Problem>) => {
      if (ids.has(p.id)) issue([...path, "id"], `duplicate problem id "${p.id}"`);
      ids.add(p.id);
      if (urls.has(p.url)) issue([...path, "url"], `duplicate problem URL ${p.url}`);
      urls.add(p.url);
    };

    c.mockSpec.pythonThemes.forEach((t, i) => {
      if (t.id !== i + 1) issue(["mockSpec", "pythonThemes", i, "id"], `expected theme ${i + 1}`);
    });
    c.practicalTasks.forEach((t, i) => {
      if (t.id !== `pt-${String(i + 1).padStart(2, "0")}`) issue(["practicalTasks", i, "id"], `expected pt-${String(i + 1).padStart(2, "0")}`);
    });

    let planDay = 0;
    let mockNo = 0;
    c.weeks.forEach((w, wi) => {
      const nn = String(w.week).padStart(2, "0");
      const wp = ["weeks", wi];
      if (w.week !== wi + 1) issue([...wp, "week"], `expected week ${wi + 1}`);
      const wantDays = w.week === 13 ? 6 : 7;
      if (w.days.length !== wantDays) issue([...wp, "days"], `week ${w.week} must have ${wantDays} days, has ${w.days.length}`);

      let core = 0;
      let old = 0;
      let mocks = 0;
      w.days.forEach((d, di) => {
        const dp = [...wp, "days", di];
        planDay++;
        if (d.day !== di + 1) issue([...dp, "day"], `expected day ${di + 1}`);
        if (d.planDay !== planDay) issue([...dp, "planDay"], `expected planDay ${planDay}, got ${d.planDay}`);

        const odd = d.planDay % 2 === 1;
        if (odd !== (d.mock !== null)) issue([...dp, "mock"], odd ? "odd plan days must have a mock" : "even plan days must not have a mock");
        if (d.mock) {
          mocks++;
          mockNo++;
          const m = d.mock;
          if (m.number !== mockNo) issue([...dp, "mock", "number"], `expected Mock ${mockNo}, got ${m.number}`);
          if (m.pythonTheme !== ((m.number - 1) % PYTHON_THEMES) + 1) issue([...dp, "mock", "pythonTheme"], `Mock ${m.number} must lead with theme ${((m.number - 1) % PYTHON_THEMES) + 1}`);
          if (m.program2 !== (m.number % 2 === 0 || m.number === MOCK_COUNT)) issue([...dp, "mock", "program2"], "program2 must be true for even-numbered mocks and Mock 45 only");
          if (m.diagnostic !== (m.number === 1)) issue([...dp, "mock", "diagnostic"], "only Mock 1 is the diagnostic");
          if (m.final !== (m.number === MOCK_COUNT)) issue([...dp, "mock", "final"], "only Mock 45 is final");
          if (m.mcqCount !== (m.final ? 20 : 18)) issue([...dp, "mock", "mcqCount"], `expected ${m.final ? 20 : 18} MCQs`);
        }
        if ((d.mock || d.kind === "new-topic") && d.learn === null) issue([...dp, "learn"], "mock and new-topic days need a learn item");
        if (d.kind === "redo" && !d.fallback) issue([...dp, "fallback"], "a redo day needs a fallback problem");
        if (d.kind !== "wrap-up" && d.learn === null && d.problems.length === 0) issue(dp, "a day needs a learn item or at least one problem");
        if (d.kind === "wrap-up" && (d.learn !== null || d.problems.length > 0)) issue(dp, "the wrap-up day has no learn item or problems (it gets one manual item)");

        d.problems.forEach((p, pi) => {
          const pp = [...dp, "problems", pi];
          seen(pp, p);
          if (!p.id.startsWith(`w${nn}-d${d.day}-p`)) issue([...pp, "id"], `id "${p.id}" does not match its position (w${nn}-d${d.day})`);
          if (p.role !== "core" && p.role !== "old-topic") issue([...pp, "role"], `day problems must be core or old-topic, not ${p.role}`);
          if (p.role === "core") core++;
          if (p.role === "old-topic") {
            old++;
            if (p.fromWeek !== undefined && p.fromWeek >= w.week) issue([...pp, "fromWeek"], `fromWeek ${p.fromWeek} must be earlier than week ${w.week}`);
          }
        });
        if (d.fallback) {
          seen([...dp, "fallback"], d.fallback);
          if (d.fallback.role !== "fallback" || d.fallback.id !== `w${nn}-d${d.day}-fb`) issue([...dp, "fallback"], `fallback must have role "fallback" and id w${nn}-d${d.day}-fb`);
        }
      });

      w.pool.forEach((p, pi) => {
        const pp = [...wp, "pool", pi];
        seen(pp, p);
        if (p.role !== "pool" || !p.id.startsWith(`w${nn}-pool-`)) issue([...pp, "id"], `pool problems need role "pool" and an id like w${nn}-pool-NN`);
      });
      if (core !== w.problemCount) issue([...wp, "problemCount"], `problemCount is ${w.problemCount} but the week has ${core} core problems`);
      if (old !== w.oldTopicCount) issue([...wp, "oldTopicCount"], `oldTopicCount is ${w.oldTopicCount} but the week has ${old} old-topic problems`);
      if (mocks !== w.mockCount) issue([...wp, "mockCount"], `mockCount is ${w.mockCount} but the week has ${mocks} mocks`);
    });

    if (planDay !== TOTAL_PLAN_DAYS) issue(["weeks"], `expected ${TOTAL_PLAN_DAYS} plan days, found ${planDay}`);
    if (mockNo !== MOCK_COUNT) issue(["weeks"], `expected ${MOCK_COUNT} mocks, found ${mockNo}`);
  });

export type CurriculumFile = z.infer<typeof Curriculum>;
