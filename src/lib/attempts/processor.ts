import 'server-only';

import { getEvaluator } from '@/lib/evaluation';
import { getScenarioById } from '@/lib/scenarios/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranscriber } from '@/lib/transcription';
import type { DeliveryMetrics } from '@/types/delivery';

/**
 * Processes an attempt end-to-end:
 *   1. Loads the attempt and its scenario
 *   2. For audio/video: downloads the file and transcribes it.
 *      For text: uses the stored transcript directly.
 *   3. Runs the evaluator with scenario rubric + (for video) delivery metrics
 *   4. Persists feedback and marks the attempt complete
 */
export async function processAttempt(
  attemptId: string,
  deliveryMetrics: DeliveryMetrics | null = null,
): Promise<void> {
  const admin = createAdminClient();

  const { data: attempt, error: aErr } = await admin
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (aErr || !attempt) {
    console.error('processAttempt: attempt not found', attemptId, aErr);
    return;
  }

  try {
    const scenario = await getScenarioById(attempt.scenario_id);
    if (!scenario) throw new Error('Scenario not found');

    let transcript = attempt.transcript ?? '';
    let durationSeconds = attempt.duration_seconds ?? undefined;

    // Audio mode: download from recordings bucket and transcribe
    if (attempt.submission_mode === 'audio') {
      if (!attempt.audio_path) throw new Error('Audio attempt missing audio_path');
      const { data: blob, error: dErr } = await admin.storage
        .from('recordings')
        .download(attempt.audio_path);
      if (dErr || !blob) throw new Error(`Could not download recording: ${dErr?.message}`);

      const audioBuffer = await blob.arrayBuffer();
      const transcriber = getTranscriber();
      const result = await transcriber.transcribe({
        audioBuffer,
        mimeType: blob.type || 'audio/webm',
      });

      transcript = result.transcript;
      durationSeconds = result.durationSeconds ?? durationSeconds;

      await admin
        .from('attempts')
        .update({ transcript, duration_seconds: durationSeconds ?? null })
        .eq('id', attemptId);
    }

    // Video mode: download video, transcribe (Whisper accepts video files
    // too — extracts the audio track automatically)
    if (attempt.submission_mode === 'video') {
      if (!attempt.video_path) throw new Error('Video attempt missing video_path');
      const { data: blob, error: dErr } = await admin.storage
        .from('videos')
        .download(attempt.video_path);
      if (dErr || !blob) throw new Error(`Could not download video: ${dErr?.message}`);

      const videoBuffer = await blob.arrayBuffer();
      const transcriber = getTranscriber();
      const result = await transcriber.transcribe({
        audioBuffer: videoBuffer,
        mimeType: blob.type || 'video/webm',
      });

      transcript = result.transcript;
      durationSeconds = result.durationSeconds ?? durationSeconds;

      await admin
        .from('attempts')
        .update({ transcript, duration_seconds: durationSeconds ?? null })
        .eq('id', attemptId);
    }

    if (!transcript.trim()) {
      throw new Error('Submission is empty');
    }

    // Evaluate, with delivery metrics if available
    const evaluator = getEvaluator();
    const { output, modelUsed } = await evaluator.evaluate({
      scenario,
      transcript,
      submissionMode: attempt.submission_mode,
      durationSeconds,
      deliveryMetrics,
    });

    const { error: fErr } = await admin.from('feedback').insert({
      attempt_id: attemptId,
      overall_score: output.overall_score,
      category_scores: output.category_scores,
      strengths: output.strengths,
      weaknesses: output.weaknesses,
      suggestions: output.suggestions,
      transcript_annotations: output.transcript_annotations,
      delivery_metrics: deliveryMetrics ?? null,
      model_used: modelUsed,
    });
    if (fErr) throw new Error(`Failed to save feedback: ${fErr.message}`);

    await admin
      .from('attempts')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', attemptId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`processAttempt failed for ${attemptId}:`, message);
    await admin
      .from('attempts')
      .update({
        status: 'failed',
        error_message: message.slice(0, 500),
        completed_at: new Date().toISOString(),
      })
      .eq('id', attemptId);
  }
}
