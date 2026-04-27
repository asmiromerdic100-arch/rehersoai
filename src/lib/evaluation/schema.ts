import { z } from 'zod';

import { FEEDBACK_CATEGORIES } from '@/types/scenario';

const CategoryEnum = z.enum(FEEDBACK_CATEGORIES);

export const TranscriptAnnotationSchema = z.object({
  quote: z.string().min(1).max(500),
  category: CategoryEnum,
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  note: z.string().min(1).max(400),
});

/**
 * Shape the evaluator must return. category_scores is an object with
 * exactly the 7 category keys; value is an integer 0-100 or null
 * (null = not exercised by this scenario).
 */
export const EvaluatorOutputSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  category_scores: z.object({
    confidence: z.number().int().min(0).max(100).nullable(),
    clarity: z.number().int().min(0).max(100).nullable(),
    structure: z.number().int().min(0).max(100).nullable(),
    discovery: z.number().int().min(0).max(100).nullable(),
    objection_handling: z.number().int().min(0).max(100).nullable(),
    active_listening: z.number().int().min(0).max(100).nullable(),
    closing_readiness: z.number().int().min(0).max(100).nullable(),
  }),
  strengths: z.array(z.string().min(1).max(300)).min(1).max(4),
  weaknesses: z.array(z.string().min(1).max(300)).min(1).max(4),
  suggestions: z.array(z.string().min(1).max(400)).min(1).max(4),
  transcript_annotations: z.array(TranscriptAnnotationSchema).max(8),
});

export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;

/**
 * Strip annotations whose quote isn't a verbatim substring of the transcript.
 * This catches the most common hallucination — the model paraphrasing a quote.
 * We prefer silently dropping bad annotations to failing the whole evaluation.
 */
export function filterValidAnnotations(
  annotations: EvaluatorOutput['transcript_annotations'],
  transcript: string,
): EvaluatorOutput['transcript_annotations'] {
  const lower = transcript.toLowerCase();
  return annotations.filter((a) => lower.includes(a.quote.toLowerCase()));
}
