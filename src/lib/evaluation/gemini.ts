/**
 * Gemini-backed evaluator.
 *
 * Phase 1 changes:
 *   - Temperature lowered from 0.4 → 0.25 for more consistent grading
 *   - Calls mergeTryThisIntoSuggestions to fold the new try_this_next_time field
 *     into the existing suggestions array (no DB migration required)
 */

import 'server-only';

import { GoogleGenerativeAI } from '@google/generative-ai';

import type { EvaluationInput, EvaluationResult, Evaluator } from './index';
import { mergeTryThisIntoSuggestions } from './index';
import { buildEvaluatorPrompt } from './prompt';
import { EvaluatorOutputSchema, filterValidAnnotations } from './schema';

const MODEL = 'gemini-2.5-flash';

export class GeminiEvaluator implements Evaluator {
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GENAI_API_KEY is not set');

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        // Phase 1: lowered from 0.4 to 0.25. We want consistent grading and
        // grounded specific feedback, not creative variation. The cost of
        // boring feedback is much lower than the cost of inconsistent feedback.
        temperature: 0.25,
        maxOutputTokens: 2048,
      },
    });

    const prompt = buildEvaluatorPrompt(input);

    const raw = await runWithRetry(async () => {
      const res = await model.generateContent(prompt);
      return res.response.text();
    });

    const parsed = safeJsonParse(raw);
    const validated = EvaluatorOutputSchema.safeParse(parsed);

    if (!validated.success) {
      throw new Error(
        `Evaluator returned invalid JSON: ${validated.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
      );
    }

    // Phase 1 post-processing:
    // 1. Drop any annotations whose quotes don't actually appear in the transcript
    // 2. Merge try_this_next_time into suggestions with the prefix marker
    const cleanedOutput = mergeTryThisIntoSuggestions({
      ...validated.data,
      transcript_annotations: filterValidAnnotations(
        validated.data.transcript_annotations,
        input.transcript,
      ),
    });

    return { output: cleanedOutput, modelUsed: MODEL };
  }
}

async function runWithRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 800));
      return runWithRetry(fn, retries - 1);
    }
    throw err;
  }
}

function safeJsonParse(raw: string): unknown {
  // Strip accidental markdown fences if the model inserted them.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first { ... } block.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Evaluator output was not valid JSON');
  }
}
