import 'server-only';

import Groq from 'groq-sdk';

import type { EvaluationInput, EvaluationResult, Evaluator } from './index';
import { buildEvaluatorPrompt } from './prompt';
import { EvaluatorOutputSchema, filterValidAnnotations } from './schema';

const MODEL = 'llama-3.3-70b-versatile';

/**
 * Groq-backed fallback evaluator using Llama 3.3 70B.
 * Very fast (~1s) on Groq's free tier. Same output contract as Gemini.
 */
export class GroqEvaluator implements Evaluator {
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');

    const client = new Groq({ apiKey });
    const prompt = buildEvaluatorPrompt(input);

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a sales coach. You always return only valid JSON matching the requested schema.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Groq returned empty response');

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

    return { output, modelUsed: `groq:${MODEL}` };
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
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Evaluator output was not valid JSON');
  }
}
