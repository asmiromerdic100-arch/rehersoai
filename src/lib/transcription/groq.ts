import 'server-only';

import Groq from 'groq-sdk';

import type { Transcriber, TranscriptionInput, TranscriptionResult } from './index';

const MODEL = 'whisper-large-v3';

/**
 * Groq-backed Whisper transcription. Very fast and free at small scale.
 */
export class GroqTranscriber implements Transcriber {
  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');

    const client = new Groq({ apiKey });

    // Groq's SDK takes a File (Node 20+ has global File via undici).
    const extension = mimeToExtension(input.mimeType);
    const file = new File([input.audioBuffer], `audio.${extension}`, {
      type: input.mimeType || 'audio/webm',
    });

    const result = await client.audio.transcriptions.create({
      file,
      model: MODEL,
      language: 'en',
      response_format: 'verbose_json',
      temperature: 0,
    });

    const transcript = (result as { text?: string }).text ?? '';
    const duration = (result as { duration?: number }).duration;

    if (!transcript.trim()) {
      throw new Error('Transcription was empty — audio may be too short or silent.');
    }

    return {
      transcript: transcript.trim(),
      durationSeconds: duration ? Math.round(duration) : undefined,
      modelUsed: MODEL,
    };
  }
}

function mimeToExtension(mime: string): string {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('m4a')) return 'm4a';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}
