import 'server-only';

import type { Transcriber, TranscriptionInput, TranscriptionResult } from './index';

/**
 * Mock transcriber. Returns a realistic-enough transcript so the evaluator
 * has something to chew on during development without hitting any API.
 */
export class MockTranscriber implements Transcriber {
  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    await new Promise((r) => setTimeout(r, 800));
    return {
      transcript:
        "Hi Sarah, this is Alex from Acme. I know this is a cold call — I'll keep it to 30 seconds. I work with RevOps leaders at B2B SaaS companies your size, and most of them are dealing with forecasting gaps across their deal stages. I'm not sure if that's something on your plate right now, but I thought it was worth a quick call to check. Do you have 30 seconds for me to explain why I reached out, or is now just a bad time?",
      durationSeconds: 28,
      modelUsed: 'mock',
    };
  }
}
