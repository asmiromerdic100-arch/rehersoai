-- ═══════════════════════════════════════════════════════════════════
-- Storage: recordings bucket
-- Path convention: {user_id}/{attempt_id}.{ext}
-- ═══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recordings',
  'recordings',
  false,
  10 * 1024 * 1024, -- 10MB hard cap (well above the 5-min × 32kbps estimate)
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
on conflict (id) do nothing;

-- Users can read/write only files scoped to their own user_id folder.
create policy "recordings_own_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "recordings_own_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "recordings_own_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );