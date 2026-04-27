/**
 * Delivery metrics computed from in-browser MediaPipe face landmark detection.
 *
 * These are aggregated from per-frame samples taken during video recording.
 * The video itself never leaves the browser unencoded — we only ship raw
 * stats + the recorded video file (for self-review).
 */
export interface DeliveryMetrics {
  /** % of frames where the user looked at (or near) the camera. */
  eye_contact_pct: number;

  /** % of frames where the user looked notably down (>15° head pitch). */
  looking_down_pct: number;

  /** % of frames where the user smiled. */
  smile_pct: number;

  /**
   * Head movement variance — a 0-100 score where 0 = stiff/frozen,
   * 100 = excessive head bobbing. Around 30-60 is natural.
   */
  head_movement: number;

  /** Number of frames analyzed. Sanity-check that recording produced data. */
  frames_analyzed: number;

  /** Sampling rate used (frames per second of video). */
  sampling_rate_hz: number;
}

export function summarizeDeliveryForPrompt(m: DeliveryMetrics): string {
  return [
    `eye contact: ${m.eye_contact_pct.toFixed(0)}% of recording`,
    `looking down: ${m.looking_down_pct.toFixed(0)}%`,
    `smiling: ${m.smile_pct.toFixed(0)}%`,
    `head movement: ${m.head_movement.toFixed(0)}/100 (lower = stiff, higher = excessive)`,
  ].join(', ');
}

/**
 * Quick verdicts on each metric for the results page UI.
 * Threshold values are tuned for sales-style monologue delivery.
 */
export function judgeDelivery(m: DeliveryMetrics): {
  eye_contact: 'good' | 'mixed' | 'poor';
  looking_down: 'good' | 'mixed' | 'poor';
  smile: 'good' | 'mixed' | 'poor';
  head_movement: 'good' | 'mixed' | 'poor';
} {
  return {
    eye_contact: m.eye_contact_pct >= 75 ? 'good' : m.eye_contact_pct >= 55 ? 'mixed' : 'poor',
    looking_down: m.looking_down_pct <= 10 ? 'good' : m.looking_down_pct <= 25 ? 'mixed' : 'poor',
    smile: m.smile_pct >= 15 ? 'good' : m.smile_pct >= 5 ? 'mixed' : 'poor',
    head_movement:
      m.head_movement >= 25 && m.head_movement <= 65
        ? 'good'
        : m.head_movement >= 15 && m.head_movement <= 80
          ? 'mixed'
          : 'poor',
  };
}
