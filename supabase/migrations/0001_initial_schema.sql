-- ═══════════════════════════════════════════════════════════════════
-- RehersoAI — Initial Schema
-- ═══════════════════════════════════════════════════════════════════

-- gen_random_uuid() is built into modern Postgres (13+); no extension needed.

-- ─────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────
create type user_role as enum ('SDR', 'BDR', 'AE', 'other');
create type scenario_category as enum ('cold_call', 'discovery', 'objection', 'closing', 'demo');
create type scenario_difficulty as enum ('beginner', 'intermediate', 'advanced');
create type submission_mode as enum ('audio', 'text');
create type attempt_status as enum ('processing', 'complete', 'failed');

-- ─────────────────────────────────────────────────────────────────────
-- profiles — 1:1 with auth.users
-- ─────────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role user_role,
  experience_months int check (experience_months >= 0),
  primary_goal text,
  onboarded_at timestamptz,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────────────────────────────
-- skills — seeded, supports future Duolingo-style progression
-- ─────────────────────────────────────────────────────────────────────
create table skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  display_order int default 0 not null,
  created_at timestamptz default now() not null
);

create index skills_display_order_idx on skills(display_order);

-- ─────────────────────────────────────────────────────────────────────
-- scenarios — seeded; no user-facing editor in V1
-- ─────────────────────────────────────────────────────────────────────
create table scenarios (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category scenario_category not null,
  difficulty scenario_difficulty default 'beginner' not null,
  description text not null,
  buyer_context text not null,
  user_goal text not null,
  challenge_prompt text not null,
  rubric jsonb not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create index scenarios_category_idx on scenarios(category);
create index scenarios_active_idx on scenarios(is_active);
create index scenarios_slug_idx on scenarios(slug);

-- ─────────────────────────────────────────────────────────────────────
-- scenario_skills — many-to-many
-- ─────────────────────────────────────────────────────────────────────
create table scenario_skills (
  scenario_id uuid references scenarios on delete cascade not null,
  skill_id uuid references skills on delete cascade not null,
  weight float default 1.0 not null check (weight >= 0 and weight <= 1),
  primary key (scenario_id, skill_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- attempts — user submissions
-- ─────────────────────────────────────────────────────────────────────
-- attempt_number is populated by a BEFORE INSERT trigger per (user, scenario).
-- It's nullable at column level so INSERTs can omit it; the trigger always fills
-- it in, and a deferred CHECK enforces non-null post-trigger.
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  scenario_id uuid references scenarios not null,
  attempt_number int,
  submission_mode submission_mode not null,
  audio_path text,
  transcript text,
  duration_seconds int check (duration_seconds >= 0),
  status attempt_status default 'processing' not null,
  error_message text,
  created_at timestamptz default now() not null,
  completed_at timestamptz,
  -- integrity: audio mode needs audio_path; text mode needs transcript
  constraint audio_has_path check (
    submission_mode != 'audio' or audio_path is not null
  ),
  constraint text_has_transcript check (
    submission_mode != 'text' or transcript is not null
  )
);

create index attempts_user_scenario_idx on attempts(user_id, scenario_id);
create index attempts_user_created_idx on attempts(user_id, created_at desc);
create index attempts_status_idx on attempts(status) where status = 'processing';

-- ─────────────────────────────────────────────────────────────────────
-- feedback — 1:1 with attempts
-- ─────────────────────────────────────────────────────────────────────
create table feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid unique references attempts on delete cascade not null,
  overall_score int not null check (overall_score between 0 and 100),
  category_scores jsonb not null,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  suggestions text[] not null default '{}',
  transcript_annotations jsonb not null default '[]',
  model_used text not null,
  user_rating int check (user_rating in (-1, 1)),
  created_at timestamptz default now() not null
);

create index feedback_attempt_idx on feedback(attempt_id);

-- ═══════════════════════════════════════════════════════════════════
-- Triggers & Functions
-- ═══════════════════════════════════════════════════════════════════

-- Auto-assign attempt_number per (user, scenario).
-- Runs only when the caller doesn't pre-set the value.
create or replace function set_attempt_number()
returns trigger
language plpgsql
as $$
begin
  select coalesce(max(attempt_number), 0) + 1
  into new.attempt_number
  from attempts
  where user_id = new.user_id and scenario_id = new.scenario_id;
  return new;
end;
$$;

create trigger attempts_set_number
  before insert on attempts
  for each row
  when (new.attempt_number is null)
  execute function set_attempt_number();

-- Post-trigger sanity check: attempt_number must always end up populated.
alter table attempts add constraint attempt_number_not_null check (attempt_number is not null);

-- Auto-create profile row when a new auth.users row is created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();