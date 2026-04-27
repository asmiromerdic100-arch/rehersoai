'use client';

import { Loader2, Trash2, Video, VideoOff } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFaceAnalyzer } from '@/hooks/use-face-analyzer';
import { createVideoUploadUrl } from '@/lib/attempts/actions';
import { createClient } from '@/lib/supabase/client';
import { formatDuration, MAX_RECORDING_SECONDS } from '@/lib/utils/audio';
import type { DeliveryMetrics } from '@/types/delivery';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

type RecorderState =
  | 'init'
  | 'preview'
  | 'recording'
  | 'recorded'
  | 'uploading'
  | 'submitting';

interface VideoRecorderProps {
  scenarioId: string;
  onSubmitted: (attemptId: string) => void;
}

export function VideoRecorder({ scenarioId, onSubmitted }: VideoRecorderProps) {
  const { toast } = useToast();
  const { isReady: analyzerReady, error: analyzerError, start: startAnalyzer, stop: stopAnalyzer } =
    useFaceAnalyzer();

  const [state, setState] = React.useState<RecorderState>('init');
  const [elapsed, setElapsed] = React.useState(0);
  const [videoBlob, setVideoBlob] = React.useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [extension, setExtension] = React.useState<'webm' | 'mp4'>('webm');
  const [metrics, setMetrics] = React.useState<DeliveryMetrics | null>(null);

  const liveVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const playbackVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useRef<number>(0);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      streamRef.current = stream;

      // Wire to live preview
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {
          // Autoplay can fail on Safari without user gesture; user clicked, so usually fine.
        });
      }
      setState('preview');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      toast({
        title: 'Camera unavailable',
        description: `${msg}. Try the Audio or Text tabs.`,
        variant: 'destructive',
      });
    }
  }

  function startRecording() {
    if (!streamRef.current || !liveVideoRef.current) return;

    const mime = pickVideoMimeType();
    setExtension(mime.extension);

    const recorder = new MediaRecorder(
      streamRef.current,
      mime.mimeType ? { mimeType: mime.mimeType } : undefined,
    );
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const finalMetrics = stopAnalyzer();

      if (blob.size > MAX_VIDEO_BYTES) {
        toast({
          title: 'Recording too large',
          description: 'Please keep video recordings under 100MB.',
          variant: 'destructive',
        });
        resetRecording();
        return;
      }

      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
      setMetrics(finalMetrics);
      setState('recorded');
    };

    recorder.start(500);
    recorderRef.current = recorder;
    startTimeRef.current = Date.now();
    setElapsed(0);
    setState('recording');

    // Start MediaPipe sampling
    if (analyzerReady && liveVideoRef.current) {
      startAnalyzer(liveVideoRef.current);
    }

    timerRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(seconds);
      if (seconds >= MAX_RECORDING_SECONDS) stopRecording();
    }, 250);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function resetRecording() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoBlob(null);
    setVideoUrl(null);
    setMetrics(null);
    setElapsed(0);
    setState('init');
  }

  async function submit() {
    if (!videoBlob || !metrics) return;
    setState('uploading');

    try {
      const { path, token } = await createVideoUploadUrl({ extension });

      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from('videos')
        .uploadToSignedUrl(path, token, videoBlob);
      if (uploadErr) throw uploadErr;

      setState('submitting');
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          submissionMode: 'video',
          videoPath: path,
          deliveryMetrics: metrics,
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
      const msg = err instanceof Error ? err.message : 'Submission failed';
      toast({ title: 'Submission failed', description: msg, variant: 'destructive' });
      setState('recorded');
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-4">
        {/* Live preview / recording view */}
        {(state === 'init' || state === 'preview' || state === 'recording') && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            {state === 'recording' && (
              <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                <span className="font-mono tabular-nums">{formatDuration(elapsed)}</span>
              </div>
            )}
          </div>
        )}

        {/* Playback view after recording */}
        {state === 'recorded' && videoUrl && (
          <video
            ref={playbackVideoRef}
            src={videoUrl}
            controls
            className="aspect-video w-full rounded-md bg-black"
          />
        )}

        {/* Controls / status */}
        {state === 'init' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Camera + microphone. Body-language analysis runs in your browser — your video never
              leaves your device until you submit.
            </p>
            <Button onClick={requestCamera} size="lg">
              <Video className="h-4 w-4" />
              Enable camera
            </Button>
            {analyzerError && (
              <p className="text-xs text-destructive">
                Body-language analyzer failed to load: {analyzerError}. Recording will still work.
              </p>
            )}
          </div>
        )}

        {state === 'preview' && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {analyzerReady
                ? 'Ready when you are. Look into the camera, speak naturally.'
                : 'Loading body-language analyzer…'}
            </div>
            <Button
              onClick={startRecording}
              size="lg"
              disabled={!analyzerReady}
              className="h-14 w-14 rounded-full p-0"
            >
              {analyzerReady ? <Video className="h-6 w-6" /> : <Loader2 className="h-5 w-5 animate-spin" />}
            </Button>
          </div>
        )}

        {state === 'recording' && (
          <div className="flex justify-center">
            <Button onClick={stopRecording} variant="destructive" size="lg">
              <VideoOff className="h-4 w-4" />
              Stop recording
            </Button>
          </div>
        )}

        {state === 'recorded' && metrics && (
          <>
            <DeliveryPreview metrics={metrics} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetRecording}>
                <Trash2 className="h-4 w-4" />
                Re-record
              </Button>
              <Button onClick={submit}>Submit for feedback</Button>
            </div>
          </>
        )}

        {(state === 'uploading' || state === 'submitting') && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {state === 'uploading' ? 'Uploading your video…' : 'Starting evaluation…'}
            </p>
            <p className="text-xs text-muted-foreground">
              Video upload is the slow part. Sit tight — usually under 30 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryPreview({ metrics }: { metrics: DeliveryMetrics }) {
  if (metrics.frames_analyzed < 5) {
    return (
      <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-xs text-foreground">
        Couldn't reliably detect your face in this recording. The verbal evaluation will still run,
        but body-language metrics will be skipped.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Eye contact" value={`${metrics.eye_contact_pct.toFixed(0)}%`} />
      <Stat label="Looking down" value={`${metrics.looking_down_pct.toFixed(0)}%`} />
      <Stat label="Smiling" value={`${metrics.smile_pct.toFixed(0)}%`} />
      <Stat label="Movement" value={`${metrics.head_movement.toFixed(0)}/100`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function pickVideoMimeType(): { mimeType: string; extension: 'webm' | 'mp4' } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', extension: 'webm' };
  }
  const candidates: Array<{ mimeType: string; extension: 'webm' | 'mp4' }> = [
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
    { mimeType: 'video/mp4', extension: 'mp4' },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
  }
  return { mimeType: '', extension: 'webm' };
}
