'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

/**
 * Generate a signed upload URL so the client can PUT audio directly
 * to Supabase Storage under the user's folder. Keeps bandwidth off
 * the Next.js runtime and avoids the 4.5MB body-size limit.
 *
 * Path convention enforced: {user_id}/{uuid}.{ext}
 * The storage RLS policy checks that the first folder matches auth.uid().
 */
const SignedUploadSchema = z.object({
  extension: z.enum(['webm', 'mp4', 'm4a', 'mp3', 'wav', 'ogg']),
});

export async function createAudioUploadUrl(
  input: z.infer<typeof SignedUploadSchema>,
): Promise<{ uploadUrl: string; path: string; token: string }> {
  const { extension } = SignedUploadSchema.parse(input);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const uuid = crypto.randomUUID();
  const path = `${user.id}/${uuid}.${extension}`;

  const { data, error } = await supabase.storage
    .from('recordings')
    .createSignedUploadUrl(path);

  if (error || !data) throw new Error(error?.message ?? 'Failed to create upload URL');

  return { uploadUrl: data.signedUrl, path, token: data.token };
}

/**
 * Same as audio upload but for the videos bucket.
 */
const VideoUploadSchema = z.object({
  extension: z.enum(['webm', 'mp4']),
});

export async function createVideoUploadUrl(
  input: z.infer<typeof VideoUploadSchema>,
): Promise<{ uploadUrl: string; path: string; token: string }> {
  const { extension } = VideoUploadSchema.parse(input);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const uuid = crypto.randomUUID();
  const path = `${user.id}/${uuid}.${extension}`;

  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUploadUrl(path);

  if (error || !data) throw new Error(error?.message ?? 'Failed to create upload URL');

  return { uploadUrl: data.signedUrl, path, token: data.token };
}

/**
 * Returns a short-lived signed URL for playback of a video file.
 */
export async function getVideoSignedUrl(path: string): Promise<string> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Path-prefix check protects against ID-guessing
  if (path.split('/')[0] !== user.id) {
    throw new Error('Forbidden');
  }

  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (error || !data) throw new Error(error?.message ?? 'Failed to get video URL');
  return data.signedUrl;
}

/**
 * Thumbs-up/down on feedback. Signals evaluator quality for prompt tuning.
 */
const RateFeedbackSchema = z.object({
  attemptId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(-1)]),
});

export async function rateFeedback(attemptId: string, rating: 1 | -1): Promise<void> {
  const parsed = RateFeedbackSchema.parse({ attemptId, rating });
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('feedback')
    .update({ user_rating: parsed.rating })
    .eq('attempt_id', parsed.attemptId);

  if (error) throw new Error(error.message);
  revalidatePath(`/results/${parsed.attemptId}`);
}
