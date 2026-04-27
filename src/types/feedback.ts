import type { Database } from '@/lib/supabase/types';
import type { DeliveryMetrics } from './delivery';
import type { FeedbackCategory } from './scenario';

export type AttemptRow = Database['public']['Tables']['attempts']['Row'];
export type FeedbackRow = Database['public']['Tables']['feedback']['Row'];

export interface CategoryScores extends Partial<Record<FeedbackCategory, number | null>> {}

export interface TranscriptAnnotation {
  quote: string;
  category: FeedbackCategory;
  sentiment: 'positive' | 'negative' | 'neutral';
  note: string;
}

/** Type-safe view of a feedback row with parsed jsonb. */
export interface Feedback
  extends Omit<FeedbackRow, 'category_scores' | 'transcript_annotations' | 'delivery_metrics'> {
  category_scores: CategoryScores;
  transcript_annotations: TranscriptAnnotation[];
  delivery_metrics: DeliveryMetrics | null;
}

export function parseFeedback(row: FeedbackRow): Feedback {
  return {
    ...row,
    category_scores: (row.category_scores as unknown as CategoryScores) ?? {},
    transcript_annotations:
      (row.transcript_annotations as unknown as TranscriptAnnotation[]) ?? [],
    delivery_metrics: (row.delivery_metrics as unknown as DeliveryMetrics) ?? null,
  };
}
