// Zod schema + cross-checks for content/curriculum.json (version 3). Used by validate-content.ts and its test.
// The types it mirrors are in src/types/content.ts.

import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const nonEmpty = z.string().min(1);
const mockExtra = z.enum(["debug", "explain-aloud", "complexity-check"]);

export const TOTAL_PLAN_DAYS = 90;
export const MOCK_COUNT = 26;
export const REVIEW_SLOTS = 2;
/** Plan days before this one have no review slots (plan days 1–4 were studied before review slots existed). */
export const FIRST_REVIEW_PLAN_DAY = 5;
export const MIN_PROBLEMS_FROM_REVIEW_DAY = 2;
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
  suggestedAfterWeek: z.number().int().min(1).max(13),
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
  learn: nonEmpty.nullable(),
  problems: z.array(Problem),
  fallback: Problem.nullable(),
  reviewSlots: z.number().int().min(0).max(REVIEW_SLOTS),
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
    version: z.literal(3),
    defaultStartDate: dateString,
    totalPlanDays: z.literal(TOTAL_PLAN_DAYS),
    mockSpec: z.strictObject({
      rule: nonEmpty,
      parts: z.array(MockPart).length(4),
      pythonThemes: z.array(z.strictObject({ id: z.number().int(), title: nonEmpty })).length(PYTHON_THEMES),
    }),
    mocks: z.array(MockSlot).length(MOCK_COUNT),
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

    c.mocks.forEach((m, i) => {
      const mp = ["mocks", i];
      if (m.number !== i + 1) issue([...mp, "number"], `expected Mock ${i + 1}, got ${m.number}`);
      if (m.suggestedAfterWeek !== Math.min(13, Math.ceil(m.number / 2))) issue([...mp, "suggestedAfterWeek"], `Mock ${m.number} is suggested after Week ${Math.min(13, Math.ceil(m.number / 2))}`);
      if (m.number <= PYTHON_THEMES && m.pythonTheme !== m.number) issue([...mp, "pythonTheme"], `Mock ${m.number} must lead with theme ${m.number} (themes 1–${PYTHON_THEMES} are used in order first)`);
      if (m.program2 !== (m.number % 2 === 0)) issue([...mp, "program2"], "program2 must be true for even-numbered mocks (the final included) and no others");
      if (m.diagnostic !== (m.number === 1)) issue([...mp, "diagnostic"], "only Mock 1 is the diagnostic");
      if (m.final !== (m.number === MOCK_COUNT)) issue([...mp, "final"], `only Mock ${MOCK_COUNT} is final`);
      if (m.mcqCount !== (m.final ? 20 : 18)) issue([...mp, "mcqCount"], `expected ${m.final ? 20 : 18} MCQs`);
    });

    let planDay = 0;
    c.weeks.forEach((w, wi) => {
      const nn = String(w.week).padStart(2, "0");
      const wp = ["weeks", wi];
      if (w.week !== wi + 1) issue([...wp, "week"], `expected week ${wi + 1}`);
      const wantDays = w.week === 13 ? 6 : 7;
      if (w.days.length !== wantDays) issue([...wp, "days"], `week ${w.week} must have ${wantDays} days, has ${w.days.length}`);

      let core = 0;
      let old = 0;
      w.days.forEach((d, di) => {
        const dp = [...wp, "days", di];
        planDay++;
        if (d.day !== di + 1) issue([...dp, "day"], `expected day ${di + 1}`);
        if (d.planDay !== planDay) issue([...dp, "planDay"], `expected planDay ${planDay}, got ${d.planDay}`);

        if (d.kind === "new-topic" && d.learn === null) issue([...dp, "learn"], "new-topic days need a learn item");
        const reviewDay = d.planDay >= FIRST_REVIEW_PLAN_DAY && d.kind !== "wrap-up";
        if (d.reviewSlots !== (reviewDay ? REVIEW_SLOTS : 0)) issue([...dp, "reviewSlots"], `plan day ${d.planDay} must have ${reviewDay ? REVIEW_SLOTS : 0} review slots`);
        if (reviewDay && d.problems.length < MIN_PROBLEMS_FROM_REVIEW_DAY) issue([...dp, "problems"], `plan day ${d.planDay} needs at least ${MIN_PROBLEMS_FROM_REVIEW_DAY} counted problems, has ${d.problems.length}`);
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
        const movedDayProblem = new RegExp(`^w${nn}-d[1-7]-p\\d+$`).test(p.id); // an over-long day's problem moved here keeps its id
        if (p.role !== "pool" || !(p.id.startsWith(`w${nn}-pool-`) || movedDayProblem)) issue([...pp, "id"], `pool problems need role "pool" and an id like w${nn}-pool-NN (or the day id of a problem moved out of its day)`);
      });
      if (core !== w.problemCount) issue([...wp, "problemCount"], `problemCount is ${w.problemCount} but the week has ${core} core problems`);
      if (old !== w.oldTopicCount) issue([...wp, "oldTopicCount"], `oldTopicCount is ${w.oldTopicCount} but the week has ${old} old-topic problems`);
    });

    if (planDay !== TOTAL_PLAN_DAYS) issue(["weeks"], `expected ${TOTAL_PLAN_DAYS} plan days, found ${planDay}`);
  });

export type CurriculumFile = z.infer<typeof Curriculum>;
