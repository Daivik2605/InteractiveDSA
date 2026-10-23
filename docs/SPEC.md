# InteractiveDSA — Feature Spec

## 1. Purpose
One learner, 13 weeks, Python. Every day has coding. The app tells the learner exactly what to do today, records what was done or missed, teaches each week's topic visually, tests understanding with MCQs and resurfaces weak areas.

## 2. Plan structure
- 13 weeks × 7 plan days = 91 plan days. Start date is set in Settings (default `2026-10-26`, a Monday).
- A week can be **extended** (section 3.12). Plan days are therefore *not* fixed dates: each plan day's date is computed from the start date + all extensions before it.
- `content/curriculum.json` defines every day: one **learn item** + 0–3 **LeetCode problems**.
- Weekly rhythm:

| Day | Learn item | Coding |
|---|---|---|
| 1 | Visuals + Python templates | 2 easier problems |
| 2 | Weekly quiz (30+ MCQs) | 2 problems |
| 3–5 | 5-minute pattern drill | 2–3 problems |
| 6 | Timed session (45 min/problem) | 1–2 harder problems |
| 7 | Review quiz (15 Qs from past weeks) | Redo 2–3 problems from the redo/catch-up queue |

Week 13 day 6 is a mock interview (random problems from any week).

## 3. Features

### 3.1 Today (home screen)
- Shows "Week N · Day D · date" and today's checklist: learn item + problems (title, difficulty, LeetCode link opening in a new tab).
- Each item has a checkbox. Ticking a problem opens a quick log: **Solved alone / Needed hint / Needed solution**, minutes taken, optional note.
- The learn item is ticked automatically when its quiz/drill is completed, or manually.
- Day 7's "redo" slots are filled from the redo queue (3.4); if empty, from the catch-up queue.
- Before the start date: countdown + link to Week 1 lesson. After day 91: "Plan complete" + free practice mode.

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
- Outcome rules: **Needed hint** → redo in 3 days. **Needed solution** → redo in 3 and 7 days. **Solved alone** but over 40 min → redo in 7 days.
- A redo is complete when re-solved alone. Redos due appear on Today in a "Redo due" section.
- Problems page: filter by week, pattern, difficulty, outcome; shows attempts history.

### 3.5 Weekly lesson
Per week page with tabs:
1. **Concepts** — short explanation cards (markdown) incl. Python cost table for the week's structures.
2. **Visuals** — interactive step-through visualizers with Prev / Next / Play and a caption explaining each step, plus the code line highlighted for that step.
3. **Templates** — Python templates with copy button and a "hide and recall" mode (blank out the code; reveal line by line).
4. **Problems** — that week's LeetCode list with log status.

### 3.6 Weekly quiz
- 30–40 MCQs per week from `content/questions/week-NN.json`.
- Question types (mix per week, at least 5 of each): `pattern`, `complexity`, `output`, `bug`, `approach`. Optional `concept`.
- One question at a time; options shuffled; after answering, show correct/incorrect + explanation (+ complexity). Code shown with Shiki highlighting.
- Optional visual on a question (a small static diagram via a visualizer component state).
- End screen: score, score by type, list of missed questions, "Retry missed".
- Every answer is saved (questionId, correct, timestamp).

### 3.7 Review quiz (spaced repetition)
- 15 questions from all *previous* weeks.
- Each question has a Leitner box (1–5). Wrong → box 1. Right → box +1. Due intervals: box1 = 1 day, 2 = 3, 3 = 7, 4 = 14, 5 = 30.
- Selection: due questions first (lowest box first), then never-seen questions from earlier weeks, then random from earlier weeks. Cap 5 per week so older weeks still appear.
- Week 1 day 7 has no earlier weeks → review quiz uses Week 1 questions answered wrong + random Week 1.

### 3.8 Pattern-recognition drill
- Shows a short problem description (no title); learner picks the pattern from 6 options within 20 seconds.
- 10 prompts per drill, drawn from all weeks up to the current one. Uses `pattern` questions plus `drill` prompts.
- Records accuracy and average time per pattern.

### 3.9 Dashboard
- Accuracy by week, by question type, by pattern (bar charts).
- Problems: count by outcome, by difficulty; average minutes.
- "Weakest 5 patterns" with a button to start a targeted quiz.

### 3.10 Mock interview (week 13, also available anytime after week 6)
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
- Extension days contain: this week's catch-up items first, then redos due, then "Redo any 2 problems from this week" — so they still include coding.
- Rules:
  - You can extend the current week or any future week, more than once (max 14 extra days per week).
  - You can extend a week whose 7 days have already passed (e.g. you are on "Week 2 Day 2" but still on arrays) **only if nothing in the following week is ticked yet**. Then Week 2 starts on the next day and all later weeks shift.
  - An extension can be removed or shortened, but only for extension days that haven't arrived yet.
  - Extensions never delete or move completion records; completions belong to plan items, not dates.
- Missed days stay counted after an extension; an extension is not a way to erase misses.
- The calendar and Settings list all extensions (week, days, reason, date added).

## 4. Non-functional
- Works offline after first load; all data in IndexedDB.
- Responsive down to 375px; keyboard shortcuts in quiz (1–4 to answer, Enter for next).
- Accessible: visuals have text captions; colours are never the only signal.
- Deploys as a static site (GitHub Pages or Vercel).

## 5. Out of scope (for now)
- Running Python in the browser, accounts/sync, AI-generated questions at runtime, notifications.
