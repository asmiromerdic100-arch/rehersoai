export const MAX_RECORDING_SECONDS = 300; // 5 minutes
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Pick a MediaRecorder mimeType the current browser supports.
 * Opus-in-webm is preferred (Chrome/Firefox). Safari needs mp4/m4a.
 */
export function pickMimeType(): { mimeType: string; extension: 'webm' | 'mp4' } {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return { mimeType: 'audio/webm', extension: 'webm' };
  }
  const candidates: Array<{ mimeType: string; extension: 'webm' | 'mp4' }> = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/webm', extension: 'webm' },
    { mimeType: 'audio/mp4', extension: 'mp4' },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
  }
  // Last resort — browser will pick.
  return { mimeType: '', extension: 'webm' };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
