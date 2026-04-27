'use client';

import * as React from 'react';

import type { DeliveryMetrics } from '@/types/delivery';

/**
 * MediaPipe FaceLandmarker hosted on Google's CDN.
 * The .task model file is ~3MB, downloaded once and cached by the browser.
 */
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';

const SAMPLING_RATE_HZ = 5; // 5 frames per second is plenty for delivery analysis

/** A single sampled frame's measurements. */
interface FrameSample {
  hasFace: boolean;
  lookingAtCamera: boolean;
  lookingDown: boolean;
  smiling: boolean;
  headPitch: number;
  headYaw: number;
}

/**
 * Hook that, given a video element actively playing the user's webcam,
 * runs MediaPipe face landmark detection at SAMPLING_RATE_HZ and accumulates
 * per-frame samples. Call `start()` when recording begins and `stop()` when
 * it ends — `stop()` returns aggregated DeliveryMetrics.
 */
export function useFaceAnalyzer() {
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const landmarkerRef = React.useRef<unknown>(null);
  const samplesRef = React.useRef<FrameSample[]>([]);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Lazy-load MediaPipe Tasks Vision; it's bundled with the page but heavy.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setIsReady(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'MediaPipe failed to load';
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
      const l = landmarkerRef.current as { close?: () => void } | null;
      l?.close?.();
    };
  }, []);

  function start(video: HTMLVideoElement) {
    if (!isReady || intervalRef.current) return;
    samplesRef.current = [];
    videoRef.current = video;

    intervalRef.current = setInterval(() => {
      const v = videoRef.current;
      const l = landmarkerRef.current as {
        detectForVideo: (
          v: HTMLVideoElement,
          ts: number,
        ) => {
          faceBlendshapes?: Array<{ categories: Array<{ categoryName: string; score: number }> }>;
          facialTransformationMatrixes?: Array<{ data: number[] }>;
        };
      } | null;
      if (!v || !l || v.readyState < 2) return;

      try {
        const result = l.detectForVideo(v, performance.now());
        const sample = extractSample(result);
        samplesRef.current.push(sample);
      } catch {
        // Skip a bad frame, keep going
      }
    }, 1000 / SAMPLING_RATE_HZ);
  }

  function stop(): DeliveryMetrics {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const samples = samplesRef.current;
    samplesRef.current = [];
    return aggregate(samples);
  }

  return { isReady, error, start, stop };
}

/**
 * Convert MediaPipe output for one frame into our minimal FrameSample.
 *
 * Blendshape names come from MediaPipe's ARKit-style facial coding:
 *  - eyeLookInRight / eyeLookInLeft when looking at center (camera)
 *  - eyeLookDown* high when looking down
 *  - mouthSmileLeft + mouthSmileRight high when smiling
 *
 * Head pose comes from the 4x4 transformation matrix's rotation submatrix.
 */
function extractSample(result: {
  faceBlendshapes?: Array<{ categories: Array<{ categoryName: string; score: number }> }>;
  facialTransformationMatrixes?: Array<{ data: number[] }>;
}): FrameSample {
  const blendshapes = result.faceBlendshapes?.[0]?.categories;
  const matrix = result.facialTransformationMatrixes?.[0]?.data;

  if (!blendshapes || !matrix) {
    return {
      hasFace: false,
      lookingAtCamera: false,
      lookingDown: false,
      smiling: false,
      headPitch: 0,
      headYaw: 0,
    };
  }

  const score = (name: string): number =>
    blendshapes.find((b) => b.categoryName === name)?.score ?? 0;

  // Approximate head pose from the rotation matrix.
  // Pitch ≈ asin(-m[9]) where m is row-major 4x4. MediaPipe is column-major.
  const m = matrix; // column-major
  const pitch = Math.asin(-clamp(m[6] ?? 0, -1, 1)); // rotation around X
  const yaw = Math.atan2(m[2] ?? 0, m[0] ?? 1); // rotation around Y

  const pitchDeg = (pitch * 180) / Math.PI;
  const yawDeg = (yaw * 180) / Math.PI;

  // Camera-looking heuristic: small yaw and small pitch + low eye-look-out scores
  const lookOut =
    score('eyeLookOutRight') + score('eyeLookOutLeft') + score('eyeLookUpRight') + score('eyeLookUpLeft');
  const lookingAtCamera = Math.abs(yawDeg) < 15 && Math.abs(pitchDeg) < 15 && lookOut < 0.6;

  // Looking down: significant downward pitch OR high eye-look-down blendshape
  const lookDown = score('eyeLookDownRight') + score('eyeLookDownLeft');
  const lookingDown = pitchDeg > 12 || lookDown > 0.5;

  // Smiling: average of left + right smile blendshapes above threshold
  const smile = (score('mouthSmileLeft') + score('mouthSmileRight')) / 2;
  const smiling = smile > 0.25;

  return {
    hasFace: true,
    lookingAtCamera,
    lookingDown,
    smiling,
    headPitch: pitchDeg,
    headYaw: yawDeg,
  };
}

function aggregate(samples: FrameSample[]): DeliveryMetrics {
  const valid = samples.filter((s) => s.hasFace);
  const total = valid.length;

  if (total === 0) {
    return {
      eye_contact_pct: 0,
      looking_down_pct: 0,
      smile_pct: 0,
      head_movement: 0,
      frames_analyzed: 0,
      sampling_rate_hz: SAMPLING_RATE_HZ,
    };
  }

  const eye = valid.filter((s) => s.lookingAtCamera).length;
  const down = valid.filter((s) => s.lookingDown).length;
  const smile = valid.filter((s) => s.smiling).length;

  // Head movement = standard deviation of pitch + yaw, normalized to 0-100
  const pitches = valid.map((s) => s.headPitch);
  const yaws = valid.map((s) => s.headYaw);
  const movement = stddev(pitches) + stddev(yaws);
  // Empirically, sales-style natural movement gives 4-12 here.
  // Map: 0→0, 4→25, 8→50, 12→75, 16+→100
  const headMovement = Math.min(100, Math.max(0, (movement / 16) * 100));

  return {
    eye_contact_pct: (eye / total) * 100,
    looking_down_pct: (down / total) * 100,
    smile_pct: (smile / total) * 100,
    head_movement: headMovement,
    frames_analyzed: total,
    sampling_rate_hz: SAMPLING_RATE_HZ,
  };
}

function stddev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((acc, x) => acc + (x - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
