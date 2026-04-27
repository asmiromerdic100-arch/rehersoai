import type { Database, ScenarioCategory, ScenarioDifficulty } from '@/lib/supabase/types';

export type ScenarioRow = Database['public']['Tables']['scenarios']['Row'];

/** The 7 feedback categories. Must match skills.json slugs. */
export const FEEDBACK_CATEGORIES = [
  'confidence',
  'clarity',
  'structure',
  'discovery',
  'objection_handling',
  'active_listening',
  'closing_readiness',
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  confidence: 'Confidence',
  clarity: 'Clarity',
  structure: 'Structure',
  discovery: 'Discovery',
  objection_handling: 'Objection Handling',
  active_listening: 'Active Listening',
  closing_readiness: 'Closing Readiness',
};

export const CATEGORY_ORDER_FULL: FeedbackCategory[] = [...FEEDBACK_CATEGORIES];

export interface ScenarioRubric {
  ideal_behaviors: string[];
  common_mistakes: string[];
  category_weights: Record<FeedbackCategory, number>;
}

/** Type-safe view of a scenario with parsed rubric. */
export interface Scenario extends Omit<ScenarioRow, 'rubric'> {
  rubric: ScenarioRubric;
}

export function parseScenario(row: ScenarioRow): Scenario {
  return { ...row, rubric: row.rubric as unknown as ScenarioRubric };
}

export const CATEGORY_DISPLAY: Record<ScenarioCategory, string> = {
  cold_call: 'Cold Call',
  discovery: 'Discovery',
  objection: 'Objection',
  closing: 'Closing',
  demo: 'Demo',
};

export const DIFFICULTY_DISPLAY: Record<ScenarioDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
