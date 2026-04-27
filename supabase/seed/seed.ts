/**
 * Seeds skills and scenarios into Supabase.
 * Run with: pnpm seed
 *
 * Idempotent: upserts on slug, so rerunning is safe.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const SEED_DIR = join(process.cwd(), 'supabase', 'seed');

interface SkillRecord {
  slug: string;
  name: string;
  description: string;
  display_order: number;
}

interface ScenarioRecord {
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  description: string;
  buyer_context: string;
  user_goal: string;
  challenge_prompt: string;
  rubric: unknown;
  skill_slugs: string[];
}

async function seedSkills(): Promise<Map<string, string>> {
  console.log('→ Seeding skills…');
  const raw = readFileSync(join(SEED_DIR, 'skills.json'), 'utf-8');
  const skills = JSON.parse(raw) as SkillRecord[];

  const { data, error } = await supabase
    .from('skills')
    .upsert(skills, { onConflict: 'slug' })
    .select('id, slug');

  if (error) throw error;

  const slugToId = new Map<string, string>();
  for (const row of data ?? []) slugToId.set(row.slug, row.id);
  console.log(`  ✓ ${skills.length} skills`);
  return slugToId;
}

async function seedScenarios(skillIds: Map<string, string>): Promise<void> {
  console.log('→ Seeding scenarios…');
  const dir = join(SEED_DIR, 'scenarios');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf-8');
    const scenario = JSON.parse(raw) as ScenarioRecord;

    // Validate skill_slugs before touching the DB
    for (const slug of scenario.skill_slugs) {
      if (!skillIds.has(slug)) {
        throw new Error(
          `Scenario "${scenario.slug}" references unknown skill "${slug}". Check skills.json.`,
        );
      }
    }

    // Validate rubric shape minimally
    const rubric = scenario.rubric as Record<string, unknown>;
    if (
      !Array.isArray(rubric.ideal_behaviors) ||
      !Array.isArray(rubric.common_mistakes) ||
      typeof rubric.category_weights !== 'object'
    ) {
      throw new Error(`Scenario "${scenario.slug}" has malformed rubric.`);
    }

    // Upsert the scenario
    const { data: scenarioRow, error: upsertErr } = await supabase
      .from('scenarios')
      .upsert(
        {
          slug: scenario.slug,
          title: scenario.title,
          category: scenario.category,
          difficulty: scenario.difficulty,
          description: scenario.description,
          buyer_context: scenario.buyer_context,
          user_goal: scenario.user_goal,
          challenge_prompt: scenario.challenge_prompt,
          rubric: scenario.rubric,
          is_active: true,
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single();

    if (upsertErr || !scenarioRow) throw upsertErr ?? new Error('No scenario row returned');

    // Replace skill links
    await supabase.from('scenario_skills').delete().eq('scenario_id', scenarioRow.id);

    const links = scenario.skill_slugs.map((slug) => ({
      scenario_id: scenarioRow.id,
      skill_id: skillIds.get(slug)!,
      weight: 1.0,
    }));

    if (links.length > 0) {
      const { error: linkErr } = await supabase.from('scenario_skills').insert(links);
      if (linkErr) throw linkErr;
    }

    console.log(`  ✓ ${scenario.slug}`);
  }

  console.log(`  ✓ ${files.length} scenarios total`);
}

async function main(): Promise<void> {
  try {
    const skillIds = await seedSkills();
    await seedScenarios(skillIds);
    console.log('\n✓ Seed complete.');
  } catch (err) {
    console.error('\n✗ Seed failed:', err);
    process.exit(1);
  }
}

main();
