# InteractiveDSA — Feature Spec

## 1. Purpose
One learner, 90 days, Python. Every day has coding. The app tells the learner exactly what to do today, records what was done or missed, teaches each week's topic visually, and tests understanding with a mock test every other day. Solving happens on LeetCode and HackerRank; the app only records time, approach, code and outcome. The plan itself is `docs/PLAN_90_DAY.md`; the data is `content/curriculum.json` (version 2).

## 2. Plan structure
- **90 plan days** over 13 weeks: Weeks 1–12 have 7 days, **Week 13 has 6**. Start date is set in Settings (default `2026-10-26`, a Monday; the plan then finishes `2027-01-23`).
- A week can be **extended** (section 3.12). Plan days are therefore *not* fixed dates: each plan day's date is computed from the start date + all extensions before it.
- `content/curriculum.json` defines every day: a `kind`, an optional **learn item**, 0–3 problems, an optional **mock**, an optional **fallback** problem, a timed-minutes hint and a coding note. Each week also has a `pool` of spare problems (feeds mock Program 1 and free practice; never counts toward day status).
- **Mocks:** a plan day is a mock day exactly when its plan-day number is odd (45 mocks). A mock day's learn item is its "Mock N" row. Extension days never have a mock. The mock engine itself arrives in Phase B of the migration; until then the Mock row is ticked by hand.
- **Old-topic problems** (Day 4 / Day 7 from Week 2 on) come from earlier weeks and are shown **without any week or topic label**, so the learner practises spotting the pattern. Their origin week is revealed only on the problem's own page after it has been attempted.
- Day kinds: `new-topic` (cold try first), `topic`, `python-fluency` (HackerRank, Week 1), `old-topics`, `timed` (45 min per problem), `redo`, `wrap-up` (Week 13 Day 6).
- Weekly rhythm differs between odd and even weeks (mocks alternate days); see `docs/PLAN_90_DAY.md`.

## 3. Features

### 3.1 Today (home screen)
- Shows "Week N · Day D · date", the day's kind in plain words (New topic, Topic practice, Python fluency, Old topics (mixed), Timed practice · 45 min per problem, Redo day, Wrap-up), the coding note, and today's checklist: the learn item (a **"Mock N"** row on mock days) + problems (title, difficulty, platform badge, link opening in a new tab).
- On a `redo` day, due redos appear in the "Redo due" section; when none are due the day's **fallback** problem is offered under "Try this instead". The fallback is logged as a normal attempt (Problems page, journal, redo rules) but is never a checklist item, so it never changes day status or the catch-up queue.
- Each item has a checkbox. Ticking a problem opens a quick log: **Solved alone / Needed hint / Needed solution**, minutes taken, optional note.
- Learn items (the Mock row, concept notes, the Week 13 wrap-up item) are ticked manually; the mock engine will tick the Mock row when a session is saved (Phase B).
- Plan days have no redo slots. Redo slots (filled from this week's catch-up, then due redos, then "any problem from this week") exist on **extension days only**.
- Before the start date: countdown + link to Week 1 lesson. After day 90: "Plan complete" + free practice mode.

### 3.2 Missed days and catch-up queue
- Day status (computed, never stored):
  - `done` — every item ticked on or before that date
  - `done-late` — every item ticked, at least one after that date
  - `partial` — date has passed, some items ticked
  - `missed` — date has passed, nothing ticked
  - `today` / `upcoming`
- Every unticked item from a past day goes into the **catch-up queue**, shown on Today below the checklist, oldest first, with its original date ("from Tue 3 Nov").
- Missing a day does not shift the plan on its own; only a week extension (3.12) does. Completing a catch-up item records `completedOn` = the actual date, so the record shows it was late.
- Optional "Rest day" button marks today as an intentional skip (status `rest`, items still go to catch-up). Max 1 per week; shown differently on the calendar.

### 3.3 Calendar page & streaks
- Full-size version of the sidebar calendar (3.12): every scheduled day coloured by status (done, done-late, partial, missed, rest, extension, upcoming), with week bands labelled by topic.
- Clicking a day shows its items and when each was completed.
- Current streak (consecutive `done` days up to yesterday/today), longest streak, total missed days, catch-up queue size.

### 3.4 Problem log & redo scheduling
- One record per problem attempt.
- Outcomes: **Solved alone**, **Needed hint**, **Needed solution**, **Failed** (gave up / couldn't finish).
- Outcome rules: **Needed hint** → redo in 3 days. **Needed solution** or **Failed** → redo in 3 and 7 days. **Solved alone** but over 40 min → redo in 7 days.
- Every outcome, **Failed** included, ticks the item and counts the day as worked on; a failed attempt never sends the item to the catch-up queue. It records the outcome and schedules the redos above. A problem never has more than one pending redo chain: a new attempt that earns redos closes the old pending ones as attempted.
- A redo is complete when re-solved alone. Redos due appear on Today in a "Redo due" section.
- Problems page: filter by week, pattern, difficulty, outcome; shows attempts history.

### 3.5 Weekly lesson
Per week page with tabs:
1. **Concepts** — short explanation cards (markdown) incl. Python cost table for the week's structures.
2. **Visuals** — interactive step-through visualizers with Prev / Next / Play and a caption explaining each step, plus the code line highlighted for that step.
3. **Templates** — Python templates with copy button and a "hide and recall" mode (blank out the code; reveal line by line).
4. **Problems** — that week's LeetCode list with log status.

### 3.6 Weekly quiz — *replaced by the mock engine (Phase B); the page still works but no longer ticks a plan item*
- 30–40 MCQs per week from `content/questions/week-NN.json`.
- Question types (mix per week, at least 5 of each): `pattern`, `complexity`, `output`, `bug`, `approach`. Optional `concept`.
- One question at a time; options shuffled; after answering, show correct/incorrect + explanation (+ complexity). Code shown with Shiki highlighting.
- Optional visual on a question (a small static diagram via a visualizer component state).
- End screen: score, score by type, list of missed questions, "Retry missed".
- Every answer is saved (questionId, correct, timestamp).

### 3.7 Review quiz (spaced repetition) — *replaced by Mock part A (Phase B); Leitner boxes stay*
- 15 questions from all *previous* weeks.
- Each question has a Leitner box (1–5). Wrong → box 1. Right → box +1. Due intervals: box1 = 1 day, 2 = 3, 3 = 7, 4 = 14, 5 = 30.
- Selection: due questions first (lowest box first), then never-seen questions from earlier weeks, then random from earlier weeks. Cap 5 per week so older weeks still appear.
- Week 1 day 7 has no earlier weeks → review quiz uses Week 1 questions answered wrong + random Week 1.

### 3.8 Pattern-recognition drill — *replaced by the mock engine (Phase B)*
- Shows a short problem description (no title); learner picks the pattern from 6 options within 20 seconds.
- 10 prompts per drill, drawn from all weeks up to the current one. Uses `pattern` questions plus `drill` prompts.
- Records accuracy and average time per pattern.

### 3.9 Dashboard
- Accuracy by week, by question type, by pattern (bar charts).
- Problems: count by outcome, by difficulty; average minutes.
- "Weakest 5 patterns" with a button to start a targeted quiz.

### 3.10 Mock tests — *engine not built yet (Phase B); see docs/MIGRATION_V2.md and docs/PLAN_90_DAY.md*
A mock every other day (45 in total): A. MCQs, B. Program 1, C. Program 2 (even mocks and Mock 45), D. Extra. Mock 1 is a diagnostic. The old mock-interview description below is superseded.

(Superseded) Mock interview:
- Picks 2 Mediums + 1 Hard from completed weeks; 45-minute timer per problem.
- Checklist per problem: clarified inputs, stated brute force + Big-O, stated optimal + Big-O, coded, tested edge cases.
- Saved as a mock record with self-rating 1–5.

### 3.11 Settings
- Start date; theme (light/dark/system); export progress (JSON download); import progress (JSON upload with confirmation); reset progress (typed confirmation).

### 3.12 Calendar sidebar (on every page) and week extensions

**Sidebar** — fixed on the right of every page (≥ 1024px). Below that it collapses into a top bar showing "Week · Day · missed count" that opens the sidebar as a drawer.

Contents, top to bottom:
1. **Today**: date, "Week N · Day D", the current topic and progress through the plan ("Day 18 of 95").
2. **Mini month calendar**: today outlined; each day coloured by status; days belonging to the same week share a thin topic band; extension days marked with a "+". Prev/next month arrows. Clicking a day opens its details (items and when each was done).
3. **Stats**: days missed (count of past days with status `missed`), partial days, catch-up items left, current streak.
4. **Finish date**: projected finish, with "+N days vs original plan" when extended.
5. **"Need more time on this topic?"** button (opens the extension dialog).

**Extending a week**
- Two ways: the sidebar button, or clicking a future date in the mini calendar → "Extend Week N until this date".
- Dialog: choose +1 to +7 days (or the end date), optional reason, preview showing the new dates of the next week and the new finish date. Confirm to apply.
- Effect: Week N gains extra **extension days** after its Day 7. Every later week moves forward by the same number of days.
- Extension days contain: this week's catch-up items first, then redos due, then "Redo any 2 problems from this week" — so they still include coding. **Extension days never have a mock.**
- Rules:
  - You can extend the current week or any future week, more than once (max 14 extra days per week).
  - You can extend a week whose 7 days have already passed (e.g. you are on "Week 2 Day 2" but still on arrays) **only if nothing in the following week is ticked yet**. Then Week 2 starts on the next day and all later weeks shift.
  - An extension can be removed or shortened, but only for extension days that haven't arrived yet.
  - Extensions never delete or move completion records; completions belong to plan items, not dates.
- Missed days stay counted after an extension; an extension is not a way to erase misses.
- The calendar and Settings list all extensions (week, days, reason, date added).

### 3.13 Editing a day: study log, custom items, adding days

Every day (past, today or future) has an **Edit day** view, opened from the Today page or by clicking a day in either calendar.

**Study log** — "What I studied" for that day:
- Free-text notes (markdown), minutes studied, optional links (videos, articles).
- Editable at any time; shows "edited on …" when changed after the day.
- Shown in the day-detail panel and searchable on the Calendar page.

**Add stuff to a day**:
- Add a **custom item** to any day: either a LeetCode problem (title, difficulty, URL) or a task ("Watch heap video", "Re-read sliding window notes").
- Custom problems use the same problem log and redo scheduling as plan problems.
- Custom items count toward that day's status like plan items. If unticked when the day passes, they go to the catch-up queue.
- Custom items can be edited or deleted. Deleting one that is ticked asks for confirmation and removes its completion (attempt history stays).
- Plan items can't be deleted, but can be **moved** to another day of the same week or its extension days (e.g. push a hard problem to tomorrow). A moved item keeps its id and history and shows "moved from Tue 3 Nov".

**Correct a tick date**:
- "I did this but forgot to tick" → tick with a chosen date (any date from the day's planned date up to today). This sets `completedOn` to that date, so a forgotten tick isn't recorded as late. Ticking for a future date is not allowed.

**Add a day for this topic**:
- "+ Add a day to Week N" on the Edit day view, the week page and the sidebar. It is a shortcut for a +1 extension (3.12) and follows the same rules.
- After adding, the new extension day opens in Edit day so items can be added straight away. Extension days can hold custom items in addition to their two redo slots.

### 3.14 Problem journal

A record of every problem you work on: plan problems, custom problems on a day, and problems you find on your own.

**Log a problem I found** (button on Today, Problems page, sidebar and Edit day):
- Link (URL), title, platform (LeetCode / other), difficulty.
- Topic: the week it belongs to (defaults to the current week) and pattern tags (e.g. "Prefix Sum", "Two Pointers").
- Problem description (markdown; paste or summarise).
- Attach to a day (optional). Attached → it appears on that day's checklist and counts toward its status, like any custom item (3.13). Not attached → journal only; it never affects day status or catch-up.
- First attempt (optional): outcome, minutes, date.

**Every problem's journal entry** (plan, custom or found) has a detail page:
- Description, my approach (markdown), my solution (Python code with highlighting), time and space complexity I worked out, key insight / what I missed, comments.
- Confidence 1–5 ("could I solve this cold in an interview?").
- Attempt history: every attempt with date, outcome, minutes and note. "Log another attempt" uses the normal problem log, so redo scheduling applies.
- "Redo later" button adds a manual redo task (pick a date).
- Plan problems get the same fields; their title/link come from the curriculum and can't be edited.

**Problems page** (replaces the simple list in 3.4):
- Table of all problems with last outcome, attempts, confidence, week, pattern tags, difficulty, source (plan / custom / found).
- Filters: week, pattern tag, difficulty, last outcome, source, confidence ≤ N. Search over title, description, comments and code.
- Sort by last attempted, confidence, or attempts.

### 3.15 Cloud sync (Supabase)

Progress is mirrored to the shared PersonalOS Supabase project so it survives cleared browser storage and the dashboard can read it. Dexie stays the source of truth: the UI reads Dexie, and the app works fully offline, signed out, and with no `.env.local`. Details: `docs/DATA_CONTRACT.md`.

- **Sign-in:** Settings has email/password sign-in (the same account as the other apps), sign-out, a sync status (synced / N pending / offline / needs choice / error with message) and **Sync now**. The layout shows a small sync dot.
- **Outbox:** every write to a data table is recorded in an outbox in the same Dexie transaction, and pushed as an upsert when signed in and online (on start, on sign-in, when back online, debounced after changes). Failed pushes retry with backoff; an entry is deleted only after success.
- **First-sync guard:** a device never pushes to a cloud that already has data unless it is that data's device or the user has chosen **Restore from cloud** (default) or **Replace cloud with this device** (typed confirmation). Until chosen, nothing is pushed.
- **Backfill:** after the first successful sign-in (and a choice, if needed) every local row is pushed.
- **Restore:** if the local database is empty and the cloud has data, offer **Restore from cloud**. Conflicts are last-write-wins by `updated_at`.
- **Import / export / reset:** import queues a full re-push; reset asks whether to also soft-delete the cloud copy. The sync tables are never exported.
- **Dashboard summary:** the app writes `dsa_daily_summary` and `dsa_current_state` from its own code and publishes `dsa_dashboard_daily` and `dsa_dashboard_now`.
- **Quiz timing:** every quiz mode records `ms` (time from question shown to answer) so quiz time can be counted.

## 4. Non-functional
- Works offline after first load; all data in IndexedDB, mirrored to Supabase when signed in (3.15).
- Responsive down to 375px; keyboard shortcuts in quiz (1–4 to answer, Enter for next).
- Accessible: visuals have text captions; colours are never the only signal.
- Deploys as a static site (GitHub Pages or Vercel).

## 5. Out of scope (for now)
- Running Python in the browser, true multi-device sync (cloud sync is single-install, see DATA_CONTRACT), AI-generated questions at runtime, notifications.
