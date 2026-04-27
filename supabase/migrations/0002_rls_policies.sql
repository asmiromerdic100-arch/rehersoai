-- ═══════════════════════════════════════════════════════════════════
-- Row-Level Security Policies
-- ═══════════════════════════════════════════════════════════════════

-- Enable RLS on all user-data tables
alter table profiles enable row level security;
alter table scenarios enable row level security;
alter table skills enable row level security;
alter table scenario_skills enable row level security;
alter table attempts enable row level security;
alter table feedback enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- profiles — users read/update their own row only
-- ─────────────────────────────────────────────────────────────────────
create policy "profiles_self_select"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_self_update"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT policy — rows are created by the on_auth_user_created trigger
-- under security-definer context.

-- ─────────────────────────────────────────────────────────────────────
-- scenarios — all authenticated users can read active scenarios
-- ─────────────────────────────────────────────────────────────────────
create policy "scenarios_read_active"
  on scenarios for select
  to authenticated
  using (is_active = true);

-- Inserts/updates only via service role (seed script).

-- ─────────────────────────────────────────────────────────────────────
-- skills + scenario_skills — globally readable by authed users
-- ─────────────────────────────────────────────────────────────────────
create policy "skills_read_all"
  on skills for select
  to authenticated
  using (true);

create policy "scenario_skills_read_all"
  on scenario_skills for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────
-- attempts — users access only their own attempts
-- ─────────────────────────────────────────────────────────────────────
create policy "attempts_self_select"
  on attempts for select
  using (auth.uid() = user_id);

create policy "attempts_self_insert"
  on attempts for insert
  with check (auth.uid() = user_id);

create policy "attempts_self_update"
  on attempts for update
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- feedback — readable iff owner of the underlying attempt
-- ─────────────────────────────────────────────────────────────────────
create policy "feedback_self_select"
  on feedback for select
  using (
    exists (
      select 1 from attempts
      where attempts.id = feedback.attempt_id
        and attempts.user_id = auth.uid()
    )
  );

-- Users can rate their own feedback (thumbs up/down).
create policy "feedback_self_rate"
  on feedback for update
  using (
    exists (
      select 1 from attempts
      where attempts.id = feedback.attempt_id
        and attempts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from attempts
      where attempts.id = feedback.attempt_id
        and attempts.user_id = auth.uid()
    )
  );

-- Feedback inserts happen from API route under the service role client,
-- which bypasses RLS. No insert policy needed here.