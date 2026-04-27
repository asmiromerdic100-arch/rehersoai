import 'server-only';

import type { FeedbackCategory } from '@/types/scenario';

import type { EvaluationInput, EvaluationResult, Evaluator } from './index';
import type { EvaluatorOutput } from './schema';

/**
 * Deterministic mock evaluator. Returns plausible feedback without any
 * API calls so you can click through the full happy path in development.
 *
 * Scores vary slightly with transcript length and word choice so the same
 * scenario with different submissions feels different.
 */
export class MockEvaluator implements Evaluator {
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const { scenario, transcript } = input;
    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

    // Base score responds roughly to effort; very short submissions score lower.
    const base = Math.min(85, 40 + Math.min(50, Math.floor(wordCount / 2)));
    const variance = () => base + Math.floor(Math.random() * 16) - 8;

    const weights = scenario.rubric.category_weights;
    const category_scores: Record<FeedbackCategory, number | null> = {
      confidence: weights.confidence > 0 ? clamp(variance()) : null,
      clarity: weights.clarity > 0 ? clamp(variance()) : null,
      structure: weights.structure > 0 ? clamp(variance()) : null,
      discovery: weights.discovery > 0 ? clamp(variance()) : null,
      objection_handling: weights.objection_handling > 0 ? clamp(variance()) : null,
      active_listening: weights.active_listening > 0 ? clamp(variance()) : null,
      closing_readiness: weights.closing_readiness > 0 ? clamp(variance()) : null,
    };

    // Weighted average for overall_score
    let sum = 0;
    let totalWeight = 0;
    for (const [cat, score] of Object.entries(category_scores) as [
      FeedbackCategory,
      number | null,
    ][]) {
      if (score === null) continue;
      sum += score * weights[cat];
      totalWeight += weights[cat];
    }
    const overall_score = totalWeight > 0 ? Math.round(sum / totalWeight) : base;

    // Pick a couple of transcript substrings for annotations.
    const sentences = transcript
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);
    const firstSentence = sentences[0]?.slice(0, 120) ?? transcript.slice(0, 60);
    const laterSentence = sentences[Math.floor(sentences.length / 2)]?.slice(0, 120) ?? '';

    const output: EvaluatorOutput = {
      overall_score,
      category_scores,
      strengths: [
        `Clear opening: "${firstSentence.slice(0, 60)}${firstSentence.length > 60 ? '…' : ''}" set the right tone.`,
        wordCount >= 60
          ? 'Good level of detail — you developed your thinking rather than rushing.'
          : 'Concise and direct.',
      ],
      weaknesses: [
        wordCount < 40
          ? 'Response was very short — expand on at least one of your points.'
          : 'Could be tighter — some phrases could be cut without losing meaning.',
        `Consider a stronger link to the buyer's specific situation (${scenario.rubric.ideal_behaviors[0]?.toLowerCase() ?? 'their context'}).`,
      ],
      suggestions: [
        scenario.rubric.ideal_behaviors[2] ??
          `Try: "I know this is a cold call — I'll keep it to 30 seconds."`,
        `Next attempt: focus on avoiding "${scenario.rubric.common_mistakes[0] ?? 'generic value props'}".`,
      ],
      transcript_annotations: [
        ...(firstSentence
          ? [
              {
                quote: firstSentence,
                category: 'clarity' as const,
                sentiment: 'positive' as const,
                note: 'Opening line works — clear and direct.',
              },
            ]
          : []),
        ...(laterSentence
          ? [
              {
                quote: laterSentence,
                category: 'structure' as const,
                sentiment: 'neutral' as const,
                note: 'This is the pivot point — make it count.',
              },
            ]
          : []),
      ],
    };

    // Simulate realistic latency so the UX matches production.
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    return { output, modelUsed: 'mock' };
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
