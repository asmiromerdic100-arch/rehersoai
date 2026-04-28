import 'server-only';

import { GoogleGenerativeAI } from '@google/generative-ai';

import type { EvaluationInput, EvaluationResult, Evaluator } from './index';
import { buildEvaluatorPrompt } from './prompt';
import { EvaluatorOutputSchema, filterValidAnnotations } from './schema';

const MODEL = 'gemini-2.5-flash';

/**
 * Gemini-backed evaluator. Free tier ~250 req/day on 2.5 Flash.
 * Uses JSON mode for structured output; still validates with Zod because
 * JSON mode does not guarantee schema conformance.
 */
export class GeminiEvaluator implements Evaluator {
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GENAI_API_KEY is not set');

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
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

    const output = {
      ...validated.data,
      transcript_annotations: filterValidAnnotations(
        validated.data.transcript_annotations,
        input.transcript,
      ),
    };

    return { output, modelUsed: MODEL };
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
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Evaluator output was not valid JSON');
  }
}
