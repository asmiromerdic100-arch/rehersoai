/**
 * Evaluator factory + types + fallback chain.
 *
 * Phase 1 changes:
 *   - EvaluationInput now includes optional `deliveryMetrics` for body-language data
 *   - Evaluator output post-processed to merge `try_this_next_time` into `suggestions`
 *     with a clear marker prefix, so we don't need a schema migration.
 *   - When/if you run a schema migration in Phase 2 to add a try_this_next_time column,
 *     update saveEvaluation() to write to the new column instead of merging.
 */

import 'server-only';

import { GeminiEvaluator } from './gemini';
import { GroqLlamaEvaluator } from './groq-llm';
import { MockEvaluator } from './mock';
import type { EvaluatorOutput } from './schema';

// ─── Public types ────────────────────────────────────────────────────

export interface ScenarioRubric {
  ideal_behaviors: string[];
  common_mistakes: string[];
  category_weights: Record<string, number>;
}

export interface ScenarioForEvaluation {
  title: string;
  difficulty: string;
  buyer_context: string;
  user_goal: string;
  challenge_prompt: string;
  rubric: ScenarioRubric;
}

/**
 * Body-language and delivery metrics from video submissions.
 * All fields optional — populated only for video submissions.
 * Values are normalized 0..1 percentages unless noted.
 */
export interface DeliveryMetrics {
  eyeContactPct?: number;          // 0..1, fraction of time looking at camera
  lookingDownPct?: number;         // 0..1, script-reading detector
  smilePct?: number;               // 0..1, fraction of time smiling
  headMovementVariance?: number;   // 0..1, normalized motion
  fillerWordsPerMin?: number;      // raw count per minute
}

export interface EvaluationInput {
  scenario: ScenarioForEvaluation;
  transcript: string;
  submissionMode: 'audio' | 'video' | 'text';
  durationSeconds?: number;
  deliveryMetrics?: DeliveryMetrics;
}

export interface EvaluationResult {
  output: EvaluatorOutput;
  modelUsed: string;
}

export interface Evaluator {
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
}

// ─── Factory + fallback chain ────────────────────────────────────────

/**
 * Returns the configured evaluator. Wraps it in a FallbackEvaluator that
 * auto-falls-back to Groq Llama if the primary (Gemini) hits a rate limit.
 *
 * Set EVALUATOR_PROVIDER=mock for local development without API keys.
 */
export function getEvaluator(): Evaluator {
  const provider = process.env.EVALUATOR_PROVIDER ?? 'gemini';

  switch (provider) {
    case 'gemini':
      return new FallbackEvaluator(new GeminiEvaluator(), new GroqLlamaEvaluator());
    case 'groq':
      return new GroqLlamaEvaluator();
    case 'mock':
      return new MockEvaluator();
    default:
      throw new Error(`Unknown EVALUATOR_PROVIDER: ${provider}`);
  }
}

/**
 * Wraps a primary evaluator with a fallback. If the primary throws a
 * rate-limit / quota error, we transparently retry with the fallback so
 * the user gets feedback instead of an error screen.
 */
class FallbackEvaluator implements Evaluator {
  constructor(
    private primary: Evaluator,
    private fallback: Evaluator,
  ) {}

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    try {
      return await this.primary.evaluate(input);
    } catch (err) {
      if (isRateLimitError(err)) {
        console.warn('[evaluator] primary rate-limited, falling back', err);
        return await this.fallback.evaluate(input);
      }
      throw err;
    }
  }
}

function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('429') ||
    /quota/i.test(message) ||
    /rate.?limit/i.test(message) ||
    /resource.?exhausted/i.test(message)
  );
}

// ─── Output post-processing ──────────────────────────────────────────

/**
 * The evaluator schema includes `try_this_next_time` (Phase 1 addition),
 * but the DB `feedback` table doesn't have a column for it yet — that's
 * Phase 2's schema migration.
 *
 * For now: prepend the try-this rewrites onto `suggestions` with a marker
 * prefix, so the UI can render them as a distinct section without a DB change.
 *
 * Marker convention: rewrites start with "💬 Try: " so the UI can detect
 * and split them visually. Higher-level suggestions remain unmarked.
 *
 * When Phase 2 adds the column, replace this with a direct write to the new
 * column and remove the prefix.
 */
const TRY_THIS_PREFIX = '💬 Try: ';

export function mergeTryThisIntoSuggestions(output: EvaluatorOutput): EvaluatorOutput {
  const tryThis = output.try_this_next_time.map((s) => `${TRY_THIS_PREFIX}${s}`);
  return {
    ...output,
    suggestions: [...tryThis, ...output.suggestions].slice(0, 8),
  };
}

/**
 * Helper for the UI: split a single suggestions array back into
 * [tryThisRewrites, generalSuggestions] so they can be rendered separately.
 */
export function splitSuggestions(suggestions: string[]): {
  tryThis: string[];
  general: string[];
} {
  const tryThis: string[] = [];
  const general: string[] = [];
  for (const s of suggestions) {
    if (s.startsWith(TRY_THIS_PREFIX)) {
      tryThis.push(s.slice(TRY_THIS_PREFIX.length));
    } else {
      general.push(s);
    }
  }
  return { tryThis, general };
}
