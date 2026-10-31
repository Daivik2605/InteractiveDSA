# InteractiveDSA — data contract

What this app publishes to the shared Supabase project, so the dashboard (and anything else) can read it without knowing the app's rules. Defined by `../docs/CONTRACT.md`; SQL in `supabase/dsa_schema.sql`.

**Prefix:** `dsa_` · **Storage prefix:** `dsa-` (no buckets yet) · **Contract version:** 1

Dexie (IndexedDB) stays the source of truth. The cloud is a mirror plus two computed tables. The app works fully offline and while signed out.

## 1. Views the dashboard reads

Both are `security_invoker = true`, granted to `authenticated`, and hide soft-deleted rows. Standard columns come first in the exact order of `CONTRACT.md`; extras follow.

### `dsa_dashboard_daily` (one row per user per day)

| # | Column | Notes |
|---|---|---|
| 1 | `user_id` | |
| 2 | `day` | local date |
| 3 | `app` | always `'dsa'` |
| 4 | `active_minutes` | `max(study_minutes, coding_minutes + quiz_minutes)` — see rule below |
| 5 | `items_done` | items **completed on this date** (`completedOn = day`), wherever they sit in the plan, so catch-up work shows on the day it was done. It can exceed `items_planned`. |
| 6 | `items_planned` | `items_total`; null on off-plan days |
| 7 | `streak_current` | current streak **as of this date**; null on off-plan days |
| 8 | `headline` | built in SQL, e.g. `3 problems · 1 hint · quiz 24/30`; falls back to `rest day` / `missed` / `no activity` |
| 9 | `updated_at` | |
| extras | `week, plan_day_index, plan_day_id, status, items_total, items_ticked, problems_attempted, solved_alone, needed_hint, needed_solution, failed, coding_minutes, study_minutes, quiz_minutes, quiz_answered, quiz_correct, redos_due, catchup_queue_size, current_streak, longest_streak` | |

### `dsa_dashboard_now` (one row per user)

| # | Column | Notes |
|---|---|---|
| 1–8 | `user_id, app, contract_version, status_line, needs_attention, attention_label, last_activity_at, updated_at` | `needs_attention` = catch-up items + redos due; `attention_label` = `'catch-up + redos'` |
| extras | `week, day_in_week, plan_progress_pct, solved_alone_total, problems_total, longest_streak, next_redo_on` | |

`status_line` examples: `Week 3 · Day 2 · 2 left today`, `Starts in 4 days`, `Plan complete`.
`last_activity_at` is the latest write to any data table, except `settings`.

## 2. Computed tables (written by the app)

### `dsa_daily_summary` — unique `(user_id, day)`
Built by the pure function `src/lib/summary.ts` (reusing `schedule.ts` / `plan.ts`), recomputed on start and after progress changes. Only rows whose hash changed are pushed. Rows for dates that no longer exist are soft-deleted (`deleted_at`).

Rows exist for every scheduled date from the start date through today, **and** for any other date with an attempt, quiz answer or study log (status `off-plan`, plan columns null).

**`status` values:** `done`, `done-late`, `partial`, `missed`, `rest`, `today`, `upcoming`, `off-plan`.
- `today`: today's row until every item is done.
- `upcoming`: a scheduled day in the future (not normally written; allowed for a future start date).
- `off-plan`: activity on a date that is not a scheduled day (before the start date, after the plan ends, journal-only problems, orphaned study logs).

**Two kinds of columns, on purpose:**
- *Plan columns* describe the scheduled day and are **current**: `status`, `week`, `plan_day_index`, `plan_day_id`, `items_total`, `items_ticked`. A missed day later caught up becomes `done-late`.
- *As-of columns* are **replayed as of that date** by running `schedule.ts` on only the data up to that date: `current_streak`, `longest_streak`, `redos_due`, `catchup_queue_size`. The schedule itself uses the current start date and extensions.
- *Activity columns* are keyed by **when the work happened**: `items_done`, `problems_attempted`, `solved_alone`, `needed_hint`, `needed_solution`, `failed`, `coding_minutes`, `quiz_answered`, `quiz_correct`, `quiz_minutes`. `study_minutes` comes from the day log of the scheduled day (a log whose day no longer exists uses its `updatedOn`).

**`active_minutes` rule:** `max(study_minutes, coding_minutes + quiz_minutes)` for that day. A study log may already include the time spent on problems and quizzes, so adding them would double count. `quiz_minutes = ceil(sum of answer ms / 60000)`; every quiz mode records `ms` (time from question shown to answer). Answers recorded before this was added have no `ms` and count as 0.

Redo as-of replay uses the redo row's `createdOn` when present. Older redo rows fall back to their creating attempt's date; old manual redos (no `createdOn`) count as existing from the start.

### `dsa_current_state` — one row per user
`device_id, contract_version, status_line, needs_attention, attention_label, week, day_in_week, plan_progress_pct, solved_alone_total, problems_total, longest_streak, next_redo_on, last_activity_at, updated_at`. Written on app start and after every change. `device_id` names the install that owns the cloud copy (see section 4).

## 3. Mirror tables

One cloud table per Dexie table, all with `user_id`, RLS and the `"own rows"` policy, plus `data jsonb` (the full Dexie row, so restore is exact), `updated_at` and `deleted_at` (soft delete, so deletions sync). A `BEFORE UPDATE` trigger ignores an update whose `updated_at` is older than the stored row (last write wins).

| Dexie table | Cloud table | Cloud key |
|---|---|---|
| completions | `dsa_completions` | `item_id` |
| extensions | `dsa_extensions` | `device_id, local_id` |
| attempts | `dsa_attempts` | `device_id, local_id` |
| redos | `dsa_redos` | `device_id, local_id` |
| quizAnswers | `dsa_quiz_answers` | `device_id, local_id` |
| cards | `dsa_cards` | `question_id` |
| restDays | `dsa_rest_days` | `day` |
| mocks | `dsa_mocks` | `device_id, local_id` |
| settings | `dsa_settings` | `key` (`'settings'`) |
| customItems | `dsa_custom_items` | `item_id` |
| itemMoves | `dsa_item_moves` | `item_id` |
| dayLogs | `dsa_day_logs` | `plan_day_id` |
| problemEntries | `dsa_problem_entries` | `problem_id` |

The internal Dexie tables `outbox` and `syncMeta` are never exported, imported, reset or mirrored.

**Auto-increment ids.** Dexie `++id` ids are only unique per install, so those five tables carry the install's `device_id` in the cloud key. Restore adopts the cloud's `device_id` (from `dsa_current_state`), so local ids and the references between them (`attemptId`, `createdByAttemptId`, `closedByAttemptId`) stay valid. **Limit:** this supports one install at a time. Real multi-device use would need a UUID migration for those tables.

## 4. First-sync guard

A device must never push anything (mirror rows, settings, summary rows or current state) to a cloud that already has data, unless it is that data's device or the user has chosen.

On sign-in, if `syncMeta.backfilledFor` is not this user **and** the cloud has data (`dsa_cloud_has_data()` is true) **and** `dsa_current_state.device_id` is not this install: sync pauses, the outbox keeps queuing locally but pushes nothing, and the sync dot shows "needs choice". The user picks:
- **Restore from cloud** (default). Available even if local has a few new rows; those are kept and pushed after the restore.
- **Replace cloud with this device**. Needs a typed confirmation, calls `dsa_soft_delete_all()` (soft-deletes the cloud rows), then backfills.

A fresh install's default settings row therefore never overwrites the cloud settings.

## 5. Functions

| Function | Purpose |
|---|---|
| `dsa_keep_newer()` | trigger: last-write-wins by `updated_at` |
| `dsa_cloud_has_data()` | first-sync guard: any live mirror rows for this user? |
| `dsa_soft_delete_all()` | "Replace cloud": soft-deletes every mirror and summary row of the user (stamped at the epoch so the replacing device's backfill can revive its own rows) |

## 6. Changelog
- v1 — initial contract.

## Local-only tables added by curriculum v3

`missedReasons` (Dexie v6, why a day was missed) and `dayNotes` (Dexie v7, free-text notes per day) are local only in the same way. `dayDraws` (Dexie v5) holds the review problems drawn for each day's review slots. It is **local only**: it is in export/import like every other data table, but sync is paused (Phase 3.5), so it is not pushed and nothing here or in `supabase/dsa_schema.sql` changes yet. When sync resumes it needs a `dsa_day_draws` table with the same `"own rows"` policy; the 45-mock plan, the "Mock N" row and the 91-day assumptions in this contract are also stale and are reworked at the same time.

