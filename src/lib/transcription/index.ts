import 'server-only';

import { GroqTranscriber } from './groq';
import { MockTranscriber } from './mock';

export interface TranscriptionInput {
  audioBuffer: ArrayBuffer;
  mimeType: string;
}

export interface TranscriptionResult {
  transcript: string;
  durationSeconds?: number;
  modelUsed: string;
}

export interface Transcriber {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export function getTranscriber(): Transcriber {
  const provider = process.env.TRANSCRIBER_PROVIDER ?? 'mock';
  switch (provider) {
    case 'groq':
      return new GroqTranscriber();
    case 'mock':
      return new MockTranscriber();
    default:
      throw new Error(`Unknown transcriber provider: ${provider}`);
  }
}
