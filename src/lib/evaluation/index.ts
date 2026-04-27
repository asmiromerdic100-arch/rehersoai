import 'server-only';

import type { DeliveryMetrics } from '@/types/delivery';
import type { Scenario } from '@/types/scenario';

import { GeminiEvaluator } from './gemini';
import { GroqEvaluator } from './groq-llm';
import { MockEvaluator } from './mock';
import type { EvaluatorOutput } from './schema';

export interface EvaluationInput {
  scenario: Scenario;
  transcript: string;
  submissionMode: 'audio' | 'text' | 'video';
  durationSeconds?: number;
  deliveryMetrics?: DeliveryMetrics | null;
}

export interface EvaluationResult {
  output: EvaluatorOutput;
  modelUsed: string;
}

export interface Evaluator {
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
}

export function getEvaluator(): Evaluator {
  const provider = process.env.EVALUATOR_PROVIDER ?? 'mock';
  switch (provider) {
    case 'gemini':
      return new GeminiEvaluator();
    case 'groq':
      return new GroqEvaluator();
    case 'mock':
      return new MockEvaluator();
    default:
      throw new Error(`Unknown evaluator provider: ${provider}`);
  }
}

export type { EvaluatorOutput };
