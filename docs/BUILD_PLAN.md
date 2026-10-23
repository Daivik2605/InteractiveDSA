# Build Plan — one phase per Claude Code session

Start each session with: *"Read CLAUDE.md and the docs it lists, then do Phase N."*
Check the result in the browser before moving on. Commit after each phase.

---

### Phase 1 — Scaffold + data layer
> Read CLAUDE.md and the docs it lists, then do Phase 1 of docs/BUILD_PLAN.md: scaffold Vite + React + TypeScript + Tailwind + React Router (hash) + Dexie + Vitest. Copy the types from docs/CONTENT_SCHEMA.md into src/types/content.ts. Create src/lib/db.ts, src/lib/dates.ts and src/lib/schedule.ts (schedule built from start date + week extensions, day status, catch-up queue, streaks, redo dates) with unit tests covering missed, partial, done-late and rest days, extending the current week, extending an already-passed week, and removing a future extension. Write scripts/validate-content.ts (zod) and run it on content/curriculum.json. Add a basic layout with nav: Today, Calendar, Weeks, Problems, Dashboard, Settings, and an empty right-hand sidebar slot.

**Done when:** `npm test` and `npm run validate` pass; app runs with empty pages.

### Phase 2 — Today, catch-up and calendar
> Do Phase 2: build the calendar sidebar on every page and the week-extension dialog (SPEC 3.12), the Today page (checklist, problem log modal, catch-up queue, redo-due section, rest day), the Calendar page (status colours, day details, streaks) and Settings (start date, theme, extensions list, export/import/reset). Follow SPEC sections 3.1–3.4, 3.11 and 3.12.

**Done when:** the sidebar shows today's week, day, topic and missed count on every page; changing the start date to two weeks ago shows missed days and a catch-up queue; extending Week 1 by 3 days moves Week 2 and the finish date; export and re-import restores everything.

### Phase 3 — Quiz engine
> Do Phase 3: build the quiz engine (SPEC 3.6), the review quiz with Leitner boxes (3.7) and the pattern drill (3.8). Use a small sample question file with 6 questions to test. Add Shiki highlighting and keyboard shortcuts. Write scripts/check_outputs.py that runs every `output` question's code with python3 and compares stdout with the correct option.

**Done when:** a sample quiz runs end to end and answers are saved; review quiz picks due cards.

### Phase 4 — Week 1 content
> Do Phase 4: write content/questions/week-01.json (35 MCQs following the CONTENT_SCHEMA rules, plus 10 drill prompts) and content/templates/week-01.md for Week 1 in docs/CURRICULUM.md. Interview-level, Python 3.11. Run validate and check_outputs.py and fix anything failing.

**Done when:** both scripts pass. **You:** take the quiz and flag any question that feels wrong or too easy.

### Phase 5 — Visualizer kit
> Do Phase 5: build the reusable visualizers in src/features/visuals (start with ArrayViz and PointerViz, then WindowViz, StackViz) driven by a list of steps {state, caption, codeLine}, with Prev/Next/Play. Build the Week 1 visuals listed in the curriculum and the weekly lesson page (Concepts, Visuals, Templates, Problems tabs).

**Done when:** Week 1 lesson page is complete and works on a phone-width screen.

### Phase 6 — Dashboard + mock mode
> Do Phase 6: Dashboard (SPEC 3.9) with Recharts and Mock interview mode (3.10).

### Phase 7 — Deploy
> Do Phase 7: configure the build for GitHub Pages (or Vercel), add a GitHub Actions workflow, and make the app work offline (vite-plugin-pwa).

### Phase 8+ — One week of content per session (Weeks 2–13)
> Write Week N content: questions/week-NN.json, templates/week-NN.md and the visual scenes listed for Week N (add TreeViz / GridViz / GraphViz / DPTableViz / HeapViz when first needed). Run validate and check_outputs.py.

Tip: stay one week ahead — build Week N+1's content while you study Week N.

---

## Optional later
- Supabase login + sync if you want progress on phone and laptop.
- In-browser Python (Pyodide) to run your own code against sample tests.
