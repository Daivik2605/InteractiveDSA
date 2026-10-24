# Handoff: move InteractiveDSA to the 90-day Python curriculum (schema v2)

## Step 0 — you do this (about 2 minutes)

Copy these into the project, then start Claude Code in that folder:

| File I sent | Put it at |
|---|---|
| `curriculum.json` | `content/curriculum.json` (replace; the old one is in git history) |
| `curriculum-v2.types.ts` | `docs/curriculum-v2.types.ts` |
| `build.py` | `scripts/build_curriculum.py` (the source of truth for the JSON) |
| this file | `docs/MIGRATION_V2.md` |

Also paste the text of the "90-Day Python DSA Interview Curriculum" doc into `docs/PLAN_90_DAY.md`.

Commit before each phase. Claude Code is told never to run git, so that stays with you.

---

## Step 1 — paste this into Claude Code

> Read CLAUDE.md, then docs/MIGRATION_V2.md, docs/PLAN_90_DAY.md and docs/curriculum-v2.types.ts. content/curriculum.json is already the new version-2 file. Do Phase A of docs/MIGRATION_V2.md only. Show me your plan first, then implement, then run `npm test`, `npm run typecheck` and `npm run validate`. Stop when Phase A is done.

Then the same one-liner for Phase B, C and D, one phase per session.

---

## What changed (context for Claude Code)

The plan is now **90 days, Python-only, 1.5–2.5 h/day**. The weekly quiz, review quiz and drill are replaced by a **mock test every other day**. 1–2 days per week are **unlabelled old-topic practice**. Solving still happens on LeetCode/HackerRank; the app only records time, approach, code and outcome. No hints, no mistake categories, no in-browser Python, no SQL.

Schema v2 is in `docs/curriculum-v2.types.ts`. Key differences from v1:

- 13 weeks, but **Week 13 has 6 days** (90 plan days, not 91). Week 1–12 have 7.
- Every `Problem` has `role`: `core | old-topic | fallback | pool` and `platform`. `old-topic` problems carry `fromWeek`, which the UI must **never show** (that is the point of the practice).
- Every `PlanDay` has `planDay` (1–90), `kind`, `mock` (or null), `learn` (may be null), `fallback`, `timedMinutes`, `codingNote`.
- `pool` problems are spares per week. They never count toward day status. They feed mock Program 1 and free practice.
- Problem IDs are new. **v1 IDs now point to different problems.** The learner has not started (start date 2026-10-26), so no data migration of completions is needed. Still, bump Dexie only where a new table is added, and do not delete existing tables.
- The top-level `mockSpec`, `practicalTasks` drive the mock builder.

## Rules that still apply (from CLAUDE.md)

Never run git. Content stays in `content/` as data. Every content change passes `npm run validate` and `python3 scripts/check_outputs.py`. Dates are local `YYYY-MM-DD` strings. `lib/schedule.ts` stays pure and unit-tested. Completions are keyed by item id, never by date. 

---

## Phase A — Load the v2 curriculum

Goal: the app runs on the new file with the existing Today, Calendar and Problems pages.

1. Replace the curriculum types in `src/types/content.ts` with `docs/curriculum-v2.types.ts` (keep the progress types; replace `MockSession`).
2. Update `scripts/validate-content.ts` (zod) to the v2 shape and add these checks: 90 total plan days; Week 13 has 6 days, others 7; `mock` is non-null exactly when `planDay` is odd, numbered 1–45 in order; ids unique across days, fallbacks and pools; no problem URL appears twice anywhere in the file; `old-topic` problems have `fromWeek` < their week; a `redo` day has a `fallback`; `learn` is non-null on every day with a `mock` or `kind === "new-topic"`.
3. Update `lib/plan.ts` and `lib/schedule.ts` for **variable week length** (the schedule builds from each week's `days.length`, not a constant 7) and for 90 days. Extension days are inserted after a week's last day as before; **extension days never have a mock**.
4. Item model: a day's items are its learn item (if `learn` is non-null) plus `problems`. A `fallback` is not an item; it is shown only when the redo queue is empty and never affects day status or the catch-up queue.
5. `lib/learn.ts` matches learn labels with `/^weekly quiz|pattern drill|review quiz/` — those labels no longer exist. Replace with `learnKind` returning `"mock" | "new-topic" | "other"` based on `day.mock` and `day.kind`, not on label text. Remove the label-regex approach.
6. Today page: show the day's `kind` in plain words, the `timedMinutes` hint, `codingNote`, and a **"Mock N"** row when `mock` is set. Old-topic problems render with **no week/topic label** anywhere (Today, Calendar day detail, Problems list when the filter is "all"; the Problems page may reveal the origin week only on the problem's own detail page after it has been attempted).
7. Problem log: platform badge (LeetCode/HackerRank). Everything else (outcome, minutes, redo rules, journal) is unchanged.
8. Update tests: `schedule.test.ts`, `plan.test.ts`, `App.test.tsx` for 90 days, a 6-day Week 13, mock-day flags, and fallbacks.

Done when: `npm test`, `typecheck` and `validate` pass; with start date 2026-10-26 the sidebar shows "Week 1 · Day 1 of 90"; Week 13 Day 6 is plan day 90; extending Week 12 by 2 days moves Week 13 by 2 days; changing the start date back two weeks shows missed days and a catch-up queue; no old-topic problem shows its source week.

## Phase B — Mock engine (replaces weekly quiz, review quiz and drill)

Read `mockSpec` in the JSON. A mock has four timed parts: **A** 18 MCQs (20 for Mock 45): 7 Python-language questions for the mock's `pythonTheme` first, then 6 from this week and last week, then 5 Leitner-due cards from older weeks; **B** Program 1: an unlabelled problem from an earlier week's `pool` not yet attempted (Weeks 1–2: the Week 1 pool, or the HackerRank problems); **C** Program 2 when `mock.program2` is true: a `practicalTask` whose `unlockWeek` ≤ the current week, with its 3 levels shown one at a time; **D** the extra, one of `debug | explain-aloud | complexity-check`.

1. New route `/mock/:number`, started from the "Mock N" row on Today. One MCQ at a time using the existing quiz components (Shiki, keyboard shortcuts, saved `QuizAnswer` with a new `mode: "mock"`, Leitner update unchanged).
2. Programs are done elsewhere. The app shows the problem link, a 25/30-minute timer, then a small form: outcome (`alone | hint | solution | failed`), minutes, levels completed (Program 2), approach, code (optional). Use the existing attempt log so redo scheduling applies.
3. Extra: show the instruction (debug: a code snippet from `content/mock-extras/debug.json`; explain-aloud: the problem plus a 3-minute timer; complexity-check: prompts about the Program 1 solution) and a "done" tick.
4. End screen: MCQ score by type, programs, extra, a 1–5 self-rating. Save a `MockSession` (new Dexie table, bump the version, keep all existing data). Ticking the mock row happens when the session is saved.
5. Mock 1 is a diagnostic: show the score as the baseline and do not count it toward weak-spot ranking.
6. Remove the weekly quiz, review quiz and pattern-drill pages and nav entries once the mock replaces them; keep their lib code only if the mock reuses it.
7. Tests for the question picker (theme first, caps per week, due cards, no repeats within a mock), the Program 1 picker (unattempted, earlier week only), and the Leitner update.

Done when: Mock 1 runs end to end with a small sample question file; a saved session reloads; Mock 2 picks a practical task; extension days show no mock.

## Phase C — Weeks, dashboard, export

1. Weeks page (replaces the 5-line placeholder): per-week tabs Concepts, Visuals, Templates, Problems (the day list), plus "Add a day to Week N". Reuse the visuals registry; show a placeholder where a visual isn't built yet.
2. Dashboard (Recharts): mock score trend, accuracy by Python theme and by question type, problems by outcome and difficulty, average minutes, weakest 5 themes/patterns with a "start targeted mock" button.
3. Export/import: include `MockSession` and the new `mode`. A v1 export must still import.

## Phase D — Content (one week per session, one week ahead of the learner)

For Week N, write: `content/questions/week-NN.json` (about 25 MCQs of types pattern, complexity, output, bug, approach, concept), `content/templates/week-NN.md`, and the visuals listed in `weeks[N].visuals`. Python-language questions go in `content/questions/python-theme-TT.json` (about 10 per theme, 15 themes), each tagged with its `theme`. Put the 16 practical tasks' full prompts in `content/practical/pt-NN.json`. Debug snippets go in `content/mock-extras/debug.json`. Relax the old "30+ per week" rule in validate to "20+ per week, 8+ per Python theme". Start with Week 1, Python themes 1–3 and tasks pt-01 to pt-03: Mock 1 and 2 need them before 26 Oct.

---

## Things to decide when Claude Code asks

- Whether to keep the pattern-drill code for the mock's "pattern" MCQs or delete it.
- Where to store attempted-in-mock problems so Program 1 never repeats one (suggested: an attempt with `source: "mock"`).
- Whether Week 13 Day 6 (wrap-up, no problems) ticks manually. Suggested: yes, a single manual item.

## Not in scope

SQL (a separate project later), in-browser Python, system design and behavioural prep.

## Supabase sync (Phase 3.5)

Sync is **paused until after Phase B** of this migration. Sub-phase 1 files stay as they are. The sync schema and contract docs must be reworked afterwards, because they describe the 91-day plan, the weekly quiz, review quiz and drill, and the old `MockSession`, all of which this migration replaces. Mark Phase 3.5 in BUILD_PLAN.md as "paused until the v2 migration is done" and do not build 3.5.2–3.5.6 yet.
