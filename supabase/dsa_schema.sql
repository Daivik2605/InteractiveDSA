-- InteractiveDSA (prefix dsa_) — Supabase schema.
-- This file creates ONLY dsa_ objects (tables, views, functions, triggers, policies) in schema public.
-- It is safe to re-run: every statement is idempotent and nothing here ever drops user data.
-- Paste into Supabase → SQL Editor → Run. Future upgrades are APPENDED at the bottom, never edited above.
-- See docs/DATA_CONTRACT.md for what each table and view means.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Mirror tables: one per Dexie table (see src/lib/db.ts TABLE_NAMES).
--    `data` holds the full Dexie row so restore is exact; typed columns are for querying.
--    Tables keyed by Dexie ++id carry (device_id, local_id): auto-increment ids are only unique per install.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.dsa_completions (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id      text not null,
  plan_day_id  text,
  completed_on date,
  attempt_id   bigint,
  data         jsonb not null,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (user_id, item_id)
);

create table if not exists public.dsa_extensions (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id  text not null,
  local_id   bigint not null,
  week       int,
  extra_days int,
  created_on date,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, device_id, local_id)
);

create table if not exists public.dsa_attempts (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id  text not null,
  local_id   bigint not null,
  problem_id text,
  day        date,
  outcome    text,
  minutes    int,
  is_redo    boolean,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, device_id, local_id)
);

create table if not exists public.dsa_redos (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id    text not null,
  local_id     bigint not null,
  problem_id   text,
  due_on       date,
  done_on      date,
  attempted_on date,
  created_on   date,
  data         jsonb not null,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (user_id, device_id, local_id)
);

create table if not exists public.dsa_quiz_answers (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id   text not null,
  local_id    bigint not null,
  question_id text,
  answered_at timestamptz,
  mode        text,
  correct     boolean,
  ms          int,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (user_id, device_id, local_id)
);

create table if not exists public.dsa_cards (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null,
  box         int,
  due_on      date,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (user_id, question_id)
);

create table if not exists public.dsa_rest_days (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, day)
);

create table if not exists public.dsa_mocks (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id  text not null,
  local_id   bigint not null,
  day        date,
  rating     int,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, device_id, local_id)
);

create table if not exists public.dsa_settings (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key        text not null,                 -- always 'settings' (Dexie key)
  start_date date,
  theme      text,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, key)
);

create table if not exists public.dsa_custom_items (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id     text not null,
  plan_day_id text,
  week        int,
  kind        text,
  title       text,
  created_on  date,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (user_id, item_id)
);

create table if not exists public.dsa_item_moves (
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id          text not null,
  from_plan_day_id text,
  to_plan_day_id   text,
  moved_on         date,
  data             jsonb not null,
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (user_id, item_id)
);

create table if not exists public.dsa_day_logs (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_day_id text not null,
  minutes     int,
  updated_on  date,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (user_id, plan_day_id)
);

create table if not exists public.dsa_problem_entries (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  problem_id text not null,
  confidence int,
  updated_on date,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, problem_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Computed tables, written by the app from its own code (the dashboard never re-implements the rules).
-- ─────────────────────────────────────────────────────────────────────────────

-- One row per user per day. Plan columns describe the scheduled day; activity columns describe work
-- done ON that date. Days with activity outside the schedule have status 'off-plan' and null plan columns.
create table if not exists public.dsa_daily_summary (
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day                date not null,
  week               int,
  plan_day_index     int,
  plan_day_id        text,
  status             text not null,
  items_total        int,
  items_done         int not null default 0,   -- items completed ON this date (completedOn = day)
  items_ticked       int,                      -- this scheduled day's own items ticked, whenever
  problems_attempted int not null default 0,
  solved_alone       int not null default 0,
  needed_hint        int not null default 0,
  needed_solution    int not null default 0,
  failed             int not null default 0,
  coding_minutes     int not null default 0,
  study_minutes      int not null default 0,
  quiz_minutes       int not null default 0,
  active_minutes     int not null default 0,   -- max(study_minutes, coding_minutes + quiz_minutes)
  quiz_answered      int not null default 0,
  quiz_correct       int not null default 0,
  redos_due          int,                      -- as of this date
  catchup_queue_size int,                      -- as of this date
  current_streak     int,                      -- as of this date
  longest_streak     int,                      -- as of this date
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  unique (user_id, day),
  constraint dsa_daily_summary_status_chk check
    (status in ('done','done-late','partial','missed','rest','today','upcoming','off-plan'))
);

-- One row per user: the app's current state. Also records which install (device_id) owns the cloud copy.
create table if not exists public.dsa_current_state (
  user_id            uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  device_id          text,
  contract_version   int not null default 1,
  status_line        text not null default '',
  needs_attention    int not null default 0,
  attention_label    text,
  week               int,
  day_in_week        int,
  plan_progress_pct  int,
  solved_alone_total int,
  problems_total     int,
  longest_streak     int,
  next_redo_on       date,
  last_activity_at   timestamptz,
  updated_at         timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security, "own rows" policy, last-write-wins trigger, grants — for every dsa_ table.
-- ─────────────────────────────────────────────────────────────────────────────

-- Last-write-wins: ignore an update that is older than the stored row (a stale device can't overwrite newer data).
create or replace function public.dsa_keep_newer() returns trigger
language plpgsql as $$
begin
  if new.updated_at < old.updated_at and coalesce(current_setting('dsa.force_write', true), '') <> 'on' then
    return null; -- skip this update silently
  end if;
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'dsa_completions','dsa_extensions','dsa_attempts','dsa_redos','dsa_quiz_answers','dsa_cards',
    'dsa_rest_days','dsa_mocks','dsa_settings','dsa_custom_items','dsa_item_moves','dsa_day_logs',
    'dsa_problem_entries','dsa_daily_summary','dsa_current_state'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('drop trigger if exists dsa_keep_newer on public.%I', t);
    execute format(
      'create trigger dsa_keep_newer before update on public.%I for each row execute function public.dsa_keep_newer()', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helper functions (security invoker: RLS still applies, so they only ever see the caller's rows).
-- ─────────────────────────────────────────────────────────────────────────────

-- First-sync guard: true if the signed-in user's cloud already holds any live dsa_ mirror rows.
create or replace function public.dsa_cloud_has_data() returns boolean
language plpgsql stable security invoker as $$
declare
  t text;
  found boolean;
begin
  foreach t in array array[
    'dsa_completions','dsa_extensions','dsa_attempts','dsa_redos','dsa_quiz_answers','dsa_cards',
    'dsa_rest_days','dsa_mocks','dsa_settings','dsa_custom_items','dsa_item_moves','dsa_day_logs',
    'dsa_problem_entries'
  ] loop
    execute format('select exists (select 1 from public.%I where deleted_at is null)', t) into found;
    if found then return true; end if;
  end loop;
  return false;
end $$;

-- "Replace cloud with this device": soft-deletes every live mirror and summary row of the signed-in user.
-- Tombstones are stamped at the epoch, so the replacing device's backfill (also epoch) can revive its own rows
-- while rows it does not have stay deleted. Returns the number of rows soft-deleted.
create or replace function public.dsa_soft_delete_all() returns int
language plpgsql security invoker as $$
declare
  t text;
  n int;
  total int := 0;
begin
  perform set_config('dsa.force_write', 'on', true); -- this transaction only: bypass dsa_keep_newer
  foreach t in array array[
    'dsa_completions','dsa_extensions','dsa_attempts','dsa_redos','dsa_quiz_answers','dsa_cards',
    'dsa_rest_days','dsa_mocks','dsa_settings','dsa_custom_items','dsa_item_moves','dsa_day_logs',
    'dsa_problem_entries','dsa_daily_summary'
  ] loop
    execute format(
      'update public.%I set deleted_at = now(), updated_at = to_timestamp(0) where deleted_at is null', t);
    get diagnostics n = row_count;
    total := total + n;
  end loop;
  return total;
end $$;

grant execute on function public.dsa_cloud_has_data() to authenticated;
grant execute on function public.dsa_soft_delete_all() to authenticated;
revoke execute on function public.dsa_cloud_has_data() from anon;
revoke execute on function public.dsa_soft_delete_all() from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Dashboard views (docs/CONTRACT.md). Standard columns first, in contract order; extras after.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.dsa_dashboard_daily with (security_invoker = true) as
select
  s.user_id,
  s.day,
  'dsa'::text                       as app,
  s.active_minutes,
  s.items_done,
  s.items_total                     as items_planned,
  s.current_streak                  as streak_current,
  coalesce(nullif(concat_ws(' · ',
    case when s.status = 'off-plan' then 'off-plan' end,
    case when s.problems_attempted > 0
         then s.problems_attempted || case when s.problems_attempted = 1 then ' problem' else ' problems' end end,
    case when s.needed_hint > 0
         then s.needed_hint || case when s.needed_hint = 1 then ' hint' else ' hints' end end,
    case when s.needed_solution > 0
         then s.needed_solution || case when s.needed_solution = 1 then ' solution' else ' solutions' end end,
    case when s.failed > 0 then s.failed || ' failed' end,
    case when s.quiz_answered > 0 then 'quiz ' || s.quiz_correct || '/' || s.quiz_answered end,
    case when s.study_minutes > 0 and s.problems_attempted = 0 and s.quiz_answered = 0 then 'study log' end
  ), ''),
  case s.status when 'rest' then 'rest day' when 'missed' then 'missed' else 'no activity' end
  )                                 as headline,
  s.updated_at,
  -- extras (app-specific)
  s.week,
  s.plan_day_index,
  s.plan_day_id,
  s.status,
  s.items_total,
  s.items_ticked,
  s.problems_attempted,
  s.solved_alone,
  s.needed_hint,
  s.needed_solution,
  s.failed,
  s.coding_minutes,
  s.study_minutes,
  s.quiz_minutes,
  s.quiz_answered,
  s.quiz_correct,
  s.redos_due,
  s.catchup_queue_size,
  s.current_streak,
  s.longest_streak
from public.dsa_daily_summary s
where s.deleted_at is null;

create or replace view public.dsa_dashboard_now with (security_invoker = true) as
select
  c.user_id,
  'dsa'::text as app,
  c.contract_version,
  c.status_line,
  c.needs_attention,
  c.attention_label,
  c.last_activity_at,
  c.updated_at,
  -- extras (app-specific)
  c.week,
  c.day_in_week,
  c.plan_progress_pct,
  c.solved_alone_total,
  c.problems_total,
  c.longest_streak,
  c.next_redo_on
from public.dsa_current_state c;

grant select on public.dsa_dashboard_daily to authenticated;
grant select on public.dsa_dashboard_now to authenticated;
revoke all on public.dsa_dashboard_daily from anon;
revoke all on public.dsa_dashboard_now from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Upgrades — APPEND new statements below this line (add column if not exists, create or replace view, …).
-- ─────────────────────────────────────────────────────────────────────────────
