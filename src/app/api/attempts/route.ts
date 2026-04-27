import { NextResponse } from 'next/server';
import { z } from 'zod';

import { processAttempt } from '@/lib/attempts/processor';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DeliveryMetricsSchema = z.object({
  eye_contact_pct: z.number().min(0).max(100),
  looking_down_pct: z.number().min(0).max(100),
  smile_pct: z.number().min(0).max(100),
  head_movement: z.number().min(0).max(100),
  frames_analyzed: z.number().int().min(0),
  sampling_rate_hz: z.number().min(1).max(60),
});

const BodySchema = z.discriminatedUnion('submissionMode', [
  z.object({
    scenarioId: z.string().uuid(),
    submissionMode: z.literal('audio'),
    audioPath: z.string().min(1),
    durationSeconds: z.number().int().min(0).max(600).optional(),
  }),
  z.object({
    scenarioId: z.string().uuid(),
    submissionMode: z.literal('text'),
    transcript: z.string().min(10).max(10_000),
  }),
  z.object({
    scenarioId: z.string().uuid(),
    submissionMode: z.literal('video'),
    videoPath: z.string().min(1),
    deliveryMetrics: DeliveryMetricsSchema,
    durationSeconds: z.number().int().min(0).max(600).optional(),
  }),
]);

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request body';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Path-prefix security check: storage paths must live in this user's folder
  if (body.submissionMode === 'audio') {
    if (body.audioPath.split('/')[0] !== user.id) {
      return NextResponse.json({ error: 'Invalid audio path' }, { status: 403 });
    }
  } else if (body.submissionMode === 'video') {
    if (body.videoPath.split('/')[0] !== user.id) {
      return NextResponse.json({ error: 'Invalid video path' }, { status: 403 });
    }
  }

  // Build the insert payload per submission mode
  type InsertPayload =
    | {
        user_id: string;
        scenario_id: string;
        submission_mode: 'audio';
        audio_path: string;
        duration_seconds: number | null;
        status: 'processing';
      }
    | {
        user_id: string;
        scenario_id: string;
        submission_mode: 'text';
        transcript: string;
        status: 'processing';
      }
    | {
        user_id: string;
        scenario_id: string;
        submission_mode: 'video';
        video_path: string;
        duration_seconds: number | null;
        status: 'processing';
      };

  let insertPayload: InsertPayload;
  let deliveryMetrics: z.infer<typeof DeliveryMetricsSchema> | null = null;

  if (body.submissionMode === 'audio') {
    insertPayload = {
      user_id: user.id,
      scenario_id: body.scenarioId,
      submission_mode: 'audio',
      audio_path: body.audioPath,
      duration_seconds: body.durationSeconds ?? null,
      status: 'processing',
    };
  } else if (body.submissionMode === 'text') {
    insertPayload = {
      user_id: user.id,
      scenario_id: body.scenarioId,
      submission_mode: 'text',
      transcript: body.transcript,
      status: 'processing',
    };
  } else {
    insertPayload = {
      user_id: user.id,
      scenario_id: body.scenarioId,
      submission_mode: 'video',
      video_path: body.videoPath,
      duration_seconds: body.durationSeconds ?? null,
      status: 'processing',
    };
    deliveryMetrics = body.deliveryMetrics;
  }

  const { data: attempt, error } = await supabase
    .from('attempts')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error || !attempt) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create attempt' },
      { status: 500 },
    );
  }

  await processAttempt(attempt.id, deliveryMetrics);

  return NextResponse.json({ attemptId: attempt.id, status: 'complete' });
}
