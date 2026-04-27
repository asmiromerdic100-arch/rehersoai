/**
 * Evaluator calibration harness.
 *
 * Runs a set of hand-crafted submissions (strong / mediocre / weak) through
 * the current evaluator and prints scores. Use this whenever you change the
 * prompt to catch regressions before they reach users.
 *
 * Usage:
 *   EVALUATOR_PROVIDER=gemini pnpm calibrate
 *   EVALUATOR_PROVIDER=groq   pnpm calibrate
 *   EVALUATOR_PROVIDER=mock   pnpm calibrate
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

config({ path: '.env.local' });

import { getEvaluator } from '../src/lib/evaluation';
import type { Scenario } from '../src/types/scenario';

interface SampleSubmission {
  label: string;
  scenarioSlug: string;
  expectedBand: 'strong' | 'mediocre' | 'weak';
  transcript: string;
}

// ─────────────────────────────────────────────────────────────
// Samples — add more as you hand-craft them
// ─────────────────────────────────────────────────────────────
const SAMPLES: SampleSubmission[] = [
  {
    label: 'cold-call · strong',
    scenarioSlug: 'cold-call-opener-saas-ops',
    expectedBand: 'strong',
    transcript:
      "Hi Sarah, this is Alex from Acme. I know this is a cold call — I'll keep it to 30 seconds. I work with RevOps leaders at B2B SaaS companies your size, and most of them are dealing with forecasting gaps across pipeline stages. I don't know if that's a priority for you right now, but I thought it was worth a quick call. Do you have 30 seconds for me to explain why I reached out, or is now just a bad time?",
  },
  {
    label: 'cold-call · mediocre',
    scenarioSlug: 'cold-call-opener-saas-ops',
    expectedBand: 'mediocre',
    transcript:
      "Hi Sarah, how are you doing today? This is Alex from Acme. We help companies like yours grow revenue. I wanted to tell you about our amazing platform that a lot of SaaS companies are using. Do you have a few minutes?",
  },
  {
    label: 'cold-call · weak',
    scenarioSlug: 'cold-call-opener-saas-ops',
    expectedBand: 'weak',
    transcript:
      "Uh hi, so my name's Alex and I'm calling from Acme, we do a bunch of stuff, I'm not sure if you'd be interested but we have this really cool platform that helps with like a lot of things, if you had a moment I could walk you through it.",
  },
  {
    label: 'email-objection · strong',
    scenarioSlug: 'objection-send-me-an-email',
    expectedBand: 'strong',
    transcript:
      "Totally get it, and I'd rather not clutter your inbox. Here's the thing — if this isn't a priority, an email's just going to get buried. If you can give me 60 seconds, I'll tell you the one reason other RevOps leaders we work with say this is worth their time. If it doesn't land, I'll send you nothing and we'll both move on.",
  },
  {
    label: 'email-objection · weak',
    scenarioSlug: 'objection-send-me-an-email',
    expectedBand: 'weak',
    transcript:
      "Oh sure, no problem. I'll send you an email today with all the information. Let me know what you think.",
  },
];

interface ScenarioFile {
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  description: string;
  buyer_context: string;
  user_goal: string;
  challenge_prompt: string;
  rubric: Scenario['rubric'];
}

function loadScenario(slug: string): Scenario {
  const path = join(process.cwd(), 'supabase', 'seed', 'scenarios', `${slug}.json`);
  const raw = readFileSync(path, 'utf-8');
  const file = JSON.parse(raw) as ScenarioFile;
  return {
    id: 'calibration',
    slug: file.slug,
    title: file.title,
    category: file.category as Scenario['category'],
    difficulty: file.difficulty as Scenario['difficulty'],
    description: file.description,
    buyer_context: file.buyer_context,
    user_goal: file.user_goal,
    challenge_prompt: file.challenge_prompt,
    rubric: file.rubric,
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

async function main() {
  const provider = process.env.EVALUATOR_PROVIDER ?? 'mock';
  console.log(`\n▸ Calibrating with provider: ${provider}\n`);

  const evaluator = getEvaluator();

  for (const sample of SAMPLES) {
    const scenario = loadScenario(sample.scenarioSlug);
    console.log(`─ ${sample.label}  (expected: ${sample.expectedBand})`);

    try {
      const start = Date.now();
      const { output, modelUsed } = await evaluator.evaluate({
        scenario,
        transcript: sample.transcript,
        submissionMode: 'text',
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      console.log(`  score: ${output.overall_score}  (${elapsed}s, ${modelUsed})`);
      console.log(
        `  categories: ${Object.entries(output.category_scores)
          .filter(([, v]) => v !== null)
          .map(([k, v]) => `${k.slice(0, 3)}=${v}`)
          .join(' · ')}`,
      );
      console.log(`  strengths: ${output.strengths.length}, weaknesses: ${output.weaknesses.length}, annotations: ${output.transcript_annotations.length}`);
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ FAILED: ${message}\n`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
