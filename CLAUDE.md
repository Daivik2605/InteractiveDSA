# InteractiveDSA — project guide for Claude Code

A personal study app for a 13-week (≈90-day) DSA interview plan in **Python**.
Goal of the learner: solve medium-to-hard LeetCode-style interview questions.
Practice happens on LeetCode; this app handles the daily checklist, concepts, visuals and quizzes.

Read these before any work:
- `docs/SPEC.md` — features and behaviour (source of truth)
- `docs/CONTENT_SCHEMA.md` — TypeScript types for all content and progress data
- `docs/CURRICULUM.md` — what each week teaches
- `docs/BUILD_PLAN.md` — the build order; work on one phase at a time
- `content/curriculum.json` — weeks, days and LeetCode problems (do not hand-edit problem lists without being asked)

## Stack
- Vite + React 18 + TypeScript (strict)
- Tailwind CSS
- React Router (hash router, so it works on GitHub Pages)
- Framer Motion for step-through visuals; visuals are SVG React components
- Shiki for Python syntax highlighting
- Recharts for the dashboard
- Dexie (IndexedDB) for progress; JSON export/import for backup
- Vitest + React Testing Library for tests
- No backend. Supabase sync is a later, optional phase — do not add it unless asked.

## Folder structure
```
content/
  curriculum.json            # weeks → days → problems (exists)
  questions/week-01.json     # MCQs per week (generated per phase)
  templates/week-01.md       # Python templates per week
scripts/
  validate-content.ts        # schema validation for all content
  check_outputs.py           # runs every "output" MCQ snippet and compares with the stored answer
src/
  app/                       # routes, layout
  features/
    today/                   # daily checklist + catch-up queue
    calendar/                # sidebar mini calendar, full calendar page, week extensions, streaks
    quiz/                    # quiz engine, review quiz
    problems/                # problem log + redo scheduling
    drill/                   # pattern-recognition drill
    dashboard/               # weak spots
    visuals/                 # reusable visualizers (ArrayViz, PointerViz, WindowViz, StackViz, GridViz, TreeViz, GraphViz, DPTableViz)
  lib/
    db.ts                    # Dexie schema
    dates.ts                 # all date logic (local time zone, no UTC drift)
    schedule.ts              # day status, catch-up queue, redo dates
  types/content.ts           # copied from docs/CONTENT_SCHEMA.md
```

## Rules
- **Never run git commands** (no add, commit, push, checkout, reset, stash). The user handles all version control. When a phase is done, say so and stop.
- Content lives in `content/` as data. Components never hard-code questions or problems.
- Every content change must pass `npm run validate` (schema) and `python3 scripts/check_outputs.py` (output questions).
- All dates are local calendar dates as `YYYY-MM-DD` strings. Never store `Date` objects or UTC timestamps for days.
- Keep `lib/schedule.ts` pure and unit-tested: building the schedule from start date + week extensions, day status, missed days, catch-up queue, streaks, redo dates.
- Completions are keyed by plan item id, never by date. Dates of plan days are always computed (weeks can be extended).
- The calendar sidebar (SPEC 3.12) is part of the app layout and shows on every page.
- Python in questions must be valid Python 3.11 and idiomatic (`collections`, `heapq`, `bisect`).
- Explanations must state the time and space complexity whenever the question involves an algorithm.
- Mobile-friendly: works at 375px width. Supports dark mode.
- Do not delete user progress during migrations; bump the Dexie version and migrate.

## Commands (once scaffolded)
- `npm run dev` · `npm run build` · `npm test` · `npm run validate` · `python3 scripts/check_outputs.py`
