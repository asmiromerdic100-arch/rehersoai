/**
 * Zod schema for evaluator output validation.
 *
 * Phase 1 changes:
 * - Added `try_this_next_time` field — concrete actionable rewrites paired with weaknesses
 * - Tightened transcript_annotations validation
 *
 * The shape here is the contract between the LLM and our DB. If the LLM returns
 * something that doesn't match, we retry once, then fail the attempt with a
 * useful error message.
 */

import { z } from 'zod';

const FEEDBACK_CATEGORIES = [
  'confidence',
  'clarity',
  'structure',
  'discovery',
  'objection_handling',
  'active_listening',
  'closing_readiness',
] as const;

const ScoreOrNull = z.number().int().min(0).max(100).nullable();

export const EvaluatorOutputSchema = z.object({
  overall_score: z.number().int().min(0).max(100),

  category_scores: z.object({
    confidence: ScoreOrNull,
    clarity: ScoreOrNull,
    structure: ScoreOrNull,
    discovery: ScoreOrNull,
    objection_handling: ScoreOrNull,
    active_listening: ScoreOrNull,
    closing_readiness: ScoreOrNull,
  }),

  strengths: z.array(z.string().min(1)).min(1).max(4),
  weaknesses: z.array(z.string().min(1)).min(1).max(4),

  // Phase 1: new field. Concrete sentences the rep could say next time.
  // Should mirror the weaknesses array — one rewrite per weakness ideally.
  try_this_next_time: z.array(z.string().min(1)).min(1).max(4),

  // Higher-level tactical suggestions (separate from per-weakness rewrites).
  suggestions: z.array(z.string().min(1)).min(1).max(4),

  transcript_annotations: z
    .array(
      z.object({
        quote: z.string().min(1),
        category: z.enum(FEEDBACK_CATEGORIES),
        sentiment: z.enum(['positive', 'negative', 'neutral']),
        note: z.string().min(1),
      }),
    )
    .max(8),
});

export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;

/**
 * Verify each annotation's quote actually appears as a substring of the transcript.
 * Phase 1: tightened to also strip surrounding whitespace mismatches.
 *
 * If the LLM hallucinates a quote that's not in the transcript, we drop that
 * annotation rather than failing the whole response. We never want to surface
 * a "quote" that the rep didn't actually say — that destroys trust.
 */
export function filterValidAnnotations(
  annotations: EvaluatorOutput['transcript_annotations'],
  transcript: string,
): EvaluatorOutput['transcript_annotations'] {
  // Normalize: lowercase + collapse whitespace for fuzzy matching
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedTranscript = normalize(transcript);

  return annotations.filter((ann) => {
    const normalizedQuote = normalize(ann.quote);
    return normalizedTranscript.includes(normalizedQuote);
  });
}
