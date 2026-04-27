import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { parseFeedback, type Feedback, type AttemptRow } from '@/types/feedback';
import { parseScenario, type Scenario } from '@/types/scenario';

export interface AttemptWithScenario {
  attempt: AttemptRow;
  scenario: Pick<Scenario, 'id' | 'slug' | 'title' | 'category' | 'difficulty'>;
  overall_score: number | null;
}

export async function getRecentAttempts(limit = 5): Promise<AttemptWithScenario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attempts')
    .select(
      `
      *,
      scenario:scenarios (id, slug, title, category, difficulty),
      feedback (overall_score)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load attempts: ${error.message}`);

  return (data ?? []).map((row) => {
    const { scenario, feedback, ...attempt } = row as unknown as AttemptRow & {
      scenario: AttemptWithScenario['scenario'];
      feedback: Array<{ overall_score: number }> | null;
    };
    return {
      attempt,
      scenario,
      overall_score: feedback && feedback.length > 0 ? feedback[0]!.overall_score : null,
    };
  });
}

export async function getAllAttemptsGrouped(): Promise<
  Array<{
    scenario: AttemptWithScenario['scenario'];
    attempts: Array<AttemptWithScenario>;
  }>
> {
  const attempts = await getRecentAttempts(1000);
  const byScenario = new Map<string, { scenario: AttemptWithScenario['scenario']; attempts: AttemptWithScenario[] }>();

  for (const row of attempts) {
    const existing = byScenario.get(row.scenario.id);
    if (existing) {
      existing.attempts.push(row);
    } else {
      byScenario.set(row.scenario.id, { scenario: row.scenario, attempts: [row] });
    }
  }

  return Array.from(byScenario.values());
}

export interface AttemptWithFeedback {
  attempt: AttemptRow;
  feedback: Feedback | null;
  scenario: Scenario;
}

export async function getAttemptWithFeedback(
  attemptId: string,
): Promise<AttemptWithFeedback | null> {
  const supabase = createClient();
  const { data: attempt, error: aErr } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (aErr) throw new Error(`Failed to load attempt: ${aErr.message}`);
  if (!attempt) return null;

  const [{ data: scenarioRow, error: sErr }, { data: feedbackRow, error: fErr }] =
    await Promise.all([
      supabase.from('scenarios').select('*').eq('id', attempt.scenario_id).single(),
      supabase.from('feedback').select('*').eq('attempt_id', attempt.id).maybeSingle(),
    ]);

  if (sErr) throw new Error(`Failed to load scenario: ${sErr.message}`);
  if (fErr) throw new Error(`Failed to load feedback: ${fErr.message}`);

  return {
    attempt,
    scenario: parseScenario(scenarioRow),
    feedback: feedbackRow ? parseFeedback(feedbackRow) : null,
  };
}

export async function getScenarioHistory(scenarioId: string): Promise<AttemptWithScenario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attempts')
    .select(
      `
      *,
      scenario:scenarios (id, slug, title, category, difficulty),
      feedback (overall_score)
    `,
    )
    .eq('scenario_id', scenarioId)
    .order('attempt_number', { ascending: true });

  if (error) throw new Error(`Failed to load history: ${error.message}`);

  return (data ?? []).map((row) => {
    const { scenario, feedback, ...attempt } = row as unknown as AttemptRow & {
      scenario: AttemptWithScenario['scenario'];
      feedback: Array<{ overall_score: number }> | null;
    };
    return {
      attempt,
      scenario,
      overall_score: feedback && feedback.length > 0 ? feedback[0]!.overall_score : null,
    };
  });
}
