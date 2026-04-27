'use client';

import { Loader2, Mic, Square, Trash2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createAudioUploadUrl } from '@/lib/attempts/actions';
import { createClient } from '@/lib/supabase/client';
import {
  formatDuration,
  MAX_AUDIO_BYTES,
  MAX_RECORDING_SECONDS,
  pickMimeType,
} from '@/lib/utils/audio';

type RecorderState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'submitting';

interface AudioRecorderProps {
  scenarioId: string;
  onSubmitted: (attemptId: string) => void;
}

export function AudioRecorder({ scenarioId, onSubmitted }: AudioRecorderProps) {
  const { toast } = useToast();
  const [state, setState] = React.useState<RecorderState>('idle');
  const [elapsed, setElapsed] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [extension, setExtension] = React.useState<'webm' | 'mp4'>('webm');

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useRef<number>(0);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mimeType, extension: ext } = pickMimeType();
      setExtension(ext);

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > MAX_AUDIO_BYTES) {
          toast({
            title: 'Recording too large',
            description: 'Please keep recordings under 10MB.',
            variant: 'destructive',
          });
          resetRecording();
          return;
        }
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState('recorded');
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setElapsed(0);
      setState('recording');

      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(seconds);
        if (seconds >= MAX_RECORDING_SECONDS) stop();
      }, 250);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not access microphone';
      toast({
        title: 'Microphone unavailable',
        description: `${message}. Try the text tab instead.`,
        variant: 'destructive',
      });
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function resetRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsed(0);
    setState('idle');
  }

  async function submit() {
    if (!audioBlob) return;
    setState('uploading');

    try {
      // Step 1: get signed URL
      const { path, token } = await createAudioUploadUrl({ extension });

      // Step 2: upload directly to Supabase Storage
      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from('recordings')
        .uploadToSignedUrl(path, token, audioBlob);
      if (uploadErr) throw uploadErr;

      // Step 3: create attempt server-side and kick off processing
      setState('submitting');
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          submissionMode: 'audio',
          audioPath: path,
          durationSeconds: elapsed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Submission failed');
      }
      const { attemptId } = (await res.json()) as { attemptId: string };
      onSubmitted(attemptId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      toast({ title: 'Submission failed', description: message, variant: 'destructive' });
      setState('recorded');
    }
  }

  const timeLabel = formatDuration(elapsed);
  const remaining = formatDuration(Math.max(0, MAX_RECORDING_SECONDS - elapsed));

  return (
    <div className="rounded-lg border bg-card p-8">
      <div className="flex flex-col items-center gap-6">
        {state === 'idle' && (
          <>
            <p className="text-sm text-muted-foreground">
              Click the button and respond aloud as if you're on the call.
            </p>
            <Button onClick={start} size="lg" className="h-16 w-16 rounded-full p-0">
              <Mic className="h-6 w-6" />
            </Button>
            <div className="text-xs text-muted-foreground">5 minute maximum</div>
          </>
        )}

        {state === 'recording' && (
          <>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-destructive" />
              <span className="font-mono text-2xl tabular-nums">{timeLabel}</span>
            </div>
            <Button onClick={stop} size="lg" variant="destructive">
              <Square className="h-4 w-4" />
              Stop recording
            </Button>
            <div className="text-xs text-muted-foreground">{remaining} remaining</div>
          </>
        )}

        {state === 'recorded' && audioUrl && (
          <>
            <audio src={audioUrl} controls className="w-full max-w-md" />
            <div className="text-sm text-muted-foreground">
              Recorded: <span className="font-mono">{timeLabel}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetRecording}>
                <Trash2 className="h-4 w-4" />
                Re-record
              </Button>
              <Button onClick={submit}>Submit for feedback</Button>
            </div>
          </>
        )}

        {(state === 'uploading' || state === 'submitting') && (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {state === 'uploading' ? 'Uploading your recording…' : 'Starting evaluation…'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
