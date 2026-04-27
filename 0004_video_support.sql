-- ═══════════════════════════════════════════════════════════════════
-- Storage: videos bucket (separate from recordings — different size limits)
-- Path convention: {user_id}/{uuid}.{ext}
-- ═══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  false,
  100 * 1024 * 1024, -- 100MB cap (5 min at typical webcam quality)
  array['video/webm', 'video/mp4']
)
on conflict (id) do nothing;

create policy "videos_own_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "videos_own_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "videos_own_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ═══════════════════════════════════════════════════════════════════
-- Add video columns to attempts and feedback
-- ═══════════════════════════════════════════════════════════════════

alter type submission_mode rename to submission_mode_old;
create type submission_mode as enum ('audio', 'text', 'video');

alter table attempts
  alter column submission_mode type submission_mode
  using submission_mode::text::submission_mode;

drop type submission_mode_old;

alter table attempts add column video_path text;

-- delivery_metrics is null when not a video submission, jsonb otherwise.
-- Schema: { eye_contact_pct, looking_down_pct, smile_pct, head_movement,
--          frames_analyzed, sampling_rate_hz }
alter table feedback add column delivery_metrics jsonb;
