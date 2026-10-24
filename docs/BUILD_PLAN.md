# Build Plan — one phase per Claude Code session

Start each session with: *"Read CLAUDE.md and the docs it lists, then do Phase N."*
Check the result in the browser before moving on. You (not Claude Code) commit and push after each phase.

---

### Phase 1 — Scaffold + data layer
**Status:** done
> Read CLAUDE.md and the docs it lists, then do Phase 1 of docs/BUILD_PLAN.md: scaffold Vite + React + TypeScript + Tailwind + React Router (hash) + Dexie + Vitest. Copy the types from docs/CONTENT_SCHEMA.md into src/types/content.ts. Create src/lib/db.ts, src/lib/dates.ts and src/lib/schedule.ts (schedule built from start date + week extensions, day status, catch-up queue, streaks, redo dates) with unit tests covering missed, partial, done-late and rest days, extending the current week, extending an already-passed week, and removing a future extension. Write scripts/validate-content.ts (zod) and run it on content/curriculum.json. Add a basic layout with nav: Today, Calendar, Weeks, Problems, Dashboard, Settings, and an empty right-hand sidebar slot.

**Done when:** `npm test` and `npm run validate` pass; app runs with empty pages.

### Phase 2 — Today, catch-up and calendar
**Status:** done
> Do Phase 2: build the calendar sidebar on every page and the week-extension dialog (SPEC 3.12), the Today page (checklist, problem log modal, catch-up queue, redo-due section, rest day), the Calendar page (status colours, day details, streaks) and Settings (start date, theme, extensions list, export/import/reset). Follow SPEC sections 3.1–3.4, 3.11 and 3.12.

**Done when:** the sidebar shows today's week, day, topic and missed count on every page; changing the start date to two weeks ago shows missed days and a catch-up queue; extending Week 1 by 3 days moves Week 2 and the finish date; export and re-import restores everything.

### Phase 2.5 — Edit day
**Status:** done
> Read CLAUDE.md and the docs it lists, then do Phase 2.5 of docs/BUILD_PLAN.md. Show me your plan first. Build SPEC 3.13: the Edit day view (study log, custom items, moving plan items within a week, ticking with a chosen date, "+ Add a day to Week N"). Bump Dexie to v2 with the CustomItem, ItemMove and DayLog tables from CONTENT_SCHEMA.md, migrating existing data without loss, and include them in export/import (old v1 exports must still import). Update lib/schedule.ts so day items, status and catch-up include custom items and moves, with tests. Also build the Problem journal (SPEC 3.14): ProblemEntry table, the "Log a problem I found" form, problem detail page with attempts, and the Problems list with filters and search; add the "failed" outcome.

**Done when:** you can add a task and a custom LeetCode problem to a past day, write a study log, move a problem to tomorrow, tick something with yesterday's date (day shows done, not done-late), add a day to Week 1 and fill it, and a v1 export still imports. Plus: log a problem you found during Week 1 (link, description, your code, complexity, comments, outcome) without attaching it to a day, then find it via search on the Problems page.

### Phase 3 — Quiz engine
**Status:** done
> Do Phase 3: build the quiz engine (SPEC 3.6), the review quiz with Leitner boxes (3.7) and the pattern drill (3.8). Use a small sample question file with 6 questions to test. Add Shiki highlighting and keyboard shortcuts. Write scripts/check_outputs.py that runs every `output` question's code with python3 and compares stdout with the correct option.

**Done when:** a sample quiz runs end to end and answers are saved; review quiz picks due cards.

### Migration v2 — 90-day Python curriculum (docs/MIGRATION_V2.md)
**Status:** in progress (Phase A done; B–D not started). Do this before the remaining phases below: Phases 4 and later are superseded by Migration v2 Phases B–D.

- **A — Load the v2 curriculum.** **Status:** done. v2 types, `scripts/curriculum-schema.ts` validator (+ test), 90-day / 6-day-Week-13 schedule, item model (fallback is not an item, wrap-up manual item, no day-7 slots), `learnKind` from `mock`/`kind`, "Mock N" row, day kind / timed hint / coding note on Today, old-topic problems hidden from topic labels, platform badges. Quizzes/drill still work but no longer tick plan items.
- **B — Mock engine.** **Status:** not started.
- **C — Weeks page, dashboard, export.** **Status:** not started.
- **D — Content (a week at a time).** **Status:** not started.

### Phase 3.5 — Supabase sync
**Status:** paused until the v2 migration is done (3.5.1 done; 3.5.2–3.5.6 not started). `docs/DATA_CONTRACT.md`, `supabase/dsa_schema.sql` and SPEC 3.15 still describe the 91-day plan and the old quizzes, so they must be reworked after Phase B.
> Read CLAUDE.md, ../CLAUDE.md, ../docs/ARCHITECTURE.md, ../docs/CONTRACT.md and docs/DATA_CONTRACT.md, then do the next unfinished sub-phase. Stop after each and list what to check by hand. Each ends with `npm test`, `npm run typecheck`, `npm run validate` and `python3 scripts/check_outputs.py` passing. With no `.env.local` the app must behave exactly as before.

- **3.5.1 — Schema + docs.** **Status:** done. `supabase/dsa_schema.sql`, `docs/DATA_CONTRACT.md`, SPEC 3.15, CLAUDE.md, README, `.env.example`, DECISIONS lines. No app code.
- **3.5.2 — Foundations.** **Status:** not started. Spike test first: a Dexie hook writes `outbox` in the same transaction (else explicit outbox writes). Dexie v3 (`outbox`, `syncMeta`), hooks on every data table (opt-out per transaction for import/reset/restore), `saveExtensions` diff instead of `clear()`, optional `createdOn` on new redo rows, `ms` recorded on weekly/review/targeted answers, Supabase client (null without env), sign-in UI.
- **3.5.3 — Push sync.** **Status:** not started. Coalescing outbox push with retry/backoff, first-sync guard ("needs choice"), backfill, status UI and sync dot. Test: a fresh install signing in to a populated cloud pushes nothing and its default settings never overwrite the cloud's.
- **3.5.4 — Summary + views.** **Status:** not started. `src/lib/summary.ts`, hashed upsert of `dsa_daily_summary` and `dsa_current_state`, views live. Then run `../supabase/checks.sql`: queries 1–8 must return zero rows.
- **3.5.5 — Restore, import, reset.** **Status:** not started. Restore from cloud (round-trips exactly), "Replace cloud with this device", import re-push, reset with optional cloud soft-delete.
- **3.5.6 — Port 5174.** **Status:** not started. Export/sync reminder first, then `server`/`preview` port 5174 with `strictPort`. Hand-check: open 5174, sign in, see the guard, restore, and confirm the start date and history are intact in Supabase.

### Phase 3.6 — TaskFlow reset hook
**Status:** not started. **Blocked until:** Phase 3.5 sync is done here (needs the Supabase client and sign-in), and TaskFlow phase 5 has created `taskflow_end_reset` (see `../../taskflow/docs/BUILD_PLAN.md`).
> Read ../docs/prompts/07-reset-hook.md and follow it.

What it adds: when a TaskFlow nap/reset is running and I **start work here**, the reset ends at that moment and DSA shows a popup — *"Reset ended at 4:12 pm — nap 1h 05m, reset 42m. Recorded."* — with an "Open TaskFlow" link.
- **Start moments** (confirm in the plan step): starting a problem attempt, starting any quiz mode (weekly / review / targeted), starting a study session/log, starting mock interview mode (once Phase 6 exists). Opening the app, browsing lessons and settings are **not** starts.
- `endTaskflowReset(detail)` calls `supabase.rpc('taskflow_end_reset', { p_app: 'dsa', p_detail, p_at })` fire-and-forget (≈3 s timeout, never blocks or throws into the UI, only when signed in).
- **Offline:** queue `{detail, at}` locally (a tiny Dexie table or `syncMeta` entry, excluded from export/import/reset like `outbox`) and send on reconnect with the original start time; popup shows on sync.
- With no `.env.local`, no TaskFlow, or the function missing, the app behaves exactly as before.
- Docs: a line in `CLAUDE.md` that new start moments must call the hook; a "Shared calls" note in `docs/DATA_CONTRACT.md`; a line in `../docs/DECISIONS.md`.

**Done when:** with a reset running in TaskFlow, starting a quiz shows the popup and TaskFlow shows the reset ended then; with none running nothing visible happens; offline start → popup after reconnect with the right time. `npm test`, `npm run typecheck`, `npm run validate` and `check_outputs.py` pass.

### Phase 4 — Week 1 content
**Status:** superseded by Migration v2 Phase D
> Do Phase 4: write content/questions/week-01.json (35 MCQs following the CONTENT_SCHEMA rules, plus 10 drill prompts) and content/templates/week-01.md for Week 1 in docs/CURRICULUM.md. Interview-level, Python 3.11. Run validate and check_outputs.py and fix anything failing. Turn on strict question-count rules in validate-content (30+ per week, ≥5 per type, ≥10 drill prompts).

**Done when:** both scripts pass. **You:** take the quiz and flag any question that feels wrong or too easy.

### Phase 5 — Visualizer kit
**Status:** not started
> Do Phase 5: build the reusable visualizers in src/features/visuals (start with ArrayViz and PointerViz, then WindowViz, StackViz) driven by a list of steps {state, caption, codeLine}, with Prev/Next/Play. Build the Week 1 visuals listed in the curriculum and the weekly lesson page (Concepts, Visuals, Templates, Problems tabs). Place AddDayButton on the week page (SPEC 3.13).

**Done when:** Week 1 lesson page is complete and works on a phone-width screen.

### Phase 6 — Dashboard + mock mode
**Status:** not started
> Do Phase 6: Dashboard (SPEC 3.9) with Recharts and Mock interview mode (3.10).

### Phase 7 — Deploy
**Status:** not started
> Do Phase 7: configure the build for GitHub Pages (or Vercel), add a GitHub Actions workflow, and make the app work offline (vite-plugin-pwa).

### Phase 8+ — One week of content per session (Weeks 2–13)
**Status:** not started
> Write Week N content: questions/week-NN.json, templates/week-NN.md and the visual scenes listed for Week N (add TreeViz / GridViz / GraphViz / DPTableViz / HeapViz when first needed). Run validate and check_outputs.py.

Tip: stay one week ahead — build Week N+1's content while you study Week N.

---

## Optional later
- Real multi-device sync (needs a UUID migration for the `++id` tables; see DATA_CONTRACT).
- In-browser Python (Pyodide) to run your own code against sample tests.
