import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { parseScenario, type Scenario } from '@/types/scenario';

export async function getScenarios(): Promise<Scenario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('is_active', true)
    .order('difficulty', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw new Error(`Failed to load scenarios: ${error.message}`);
  return (data ?? []).map(parseScenario);
}

export async function getScenarioBySlug(slug: string): Promise<Scenario | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(`Failed to load scenario: ${error.message}`);
  return data ? parseScenario(data) : null;
}

export async function getScenarioById(id: string): Promise<Scenario | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load scenario: ${error.message}`);
  return data ? parseScenario(data) : null;
}
