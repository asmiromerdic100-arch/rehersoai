import type { DeliveryMetrics } from '@/types/delivery';
import { summarizeDeliveryForPrompt } from '@/types/delivery';
import type { Scenario } from '@/types/scenario';

/**
 * Build the evaluator prompt. The entire product quality ceiling is set here
 * and in the scenario rubric. Three principles:
 *
 *   1. Ground in the rubric. The model scores against ideal_behaviors and
 *      common_mistakes, not abstract sales theory.
 *   2. Quote-grounded annotations. The model must cite verbatim substrings;
 *      we validate this server-side.
 *   3. Structured JSON output only. No prose outside the JSON.
 */
export interface PromptInput {
  scenario: Scenario;
  transcript: string;
  submissionMode: 'audio' | 'text' | 'video';
  durationSeconds?: number;
  deliveryMetrics?: DeliveryMetrics | null;
}

export function buildEvaluatorPrompt(input: PromptInput): string {
  const { scenario, transcript, submissionMode, durationSeconds, deliveryMetrics } = input;
  const rubric = scenario.rubric;

  const weightsLines = Object.entries(rubric.category_weights)
    .map(([cat, w]) => `  - ${cat}: weight ${w.toFixed(2)}${w === 0 ? ' (NOT EXERCISED — return null)' : ''}`)
    .join('\n');

  const ideal = rubric.ideal_behaviors.map((b) => `  - ${b}`).join('\n');
  const mistakes = rubric.common_mistakes.map((m) => `  - ${m}`).join('\n');

  const duration = durationSeconds
    ? `${durationSeconds}s ${submissionMode}`
    : submissionMode;

  // Body-language section is only included for video submissions with usable data.
  let deliverySection = '';
  if (submissionMode === 'video' && deliveryMetrics && deliveryMetrics.frames_analyzed >= 5) {
    deliverySection = `

DELIVERY METRICS (measured from the video — body language and presence):
${summarizeDeliveryForPrompt(deliveryMetrics)}

Sales-coaching guidance for these metrics:
- Eye contact above 75% is good; below 55% suggests reading from notes or nervousness.
- "Looking down" above 25% strongly suggests reading from a script — penalize.
- Smiling between 10-30% is natural and warm. 0% reads as cold/robotic. 50%+ reads as forced.
- Head movement between 25-65 is engaged delivery. Below 20 is stiff/frozen. Above 75 is distracting.

When you give feedback, INTEGRATE these delivery observations into the same coaching narrative
as the verbal critique. Do NOT score them as separate categories. If eye contact was low during
the value prop, mention it specifically. Tie body language back to verbal moments where possible.
`;
  }

  return `You are a sales coach evaluating a rehearsal submission. Give honest, specific, actionable feedback grounded in what the rep actually said. Do not be sycophantic. Do not give platitudes. Call out weak moments directly.

SCENARIO: ${scenario.title}

BUYER CONTEXT:
${scenario.buyer_context}

REP'S GOAL:
${scenario.user_goal}

THE MOMENT THE REP IS RESPONDING TO:
${scenario.challenge_prompt}

IDEAL BEHAVIORS FOR THIS SCENARIO:
${ideal}

COMMON MISTAKES TO WATCH FOR:
${mistakes}

CATEGORIES TO SCORE (0-100; return null when weight is 0):
${weightsLines}

REP'S SUBMISSION (${duration}):
"""
${transcript}
"""${deliverySection}

Return ONLY a JSON object matching this exact shape — no markdown fences, no prose before or after:

{
  "overall_score": <0-100 int>,
  "category_scores": {
    "confidence": <int|null>,
    "clarity": <int|null>,
    "structure": <int|null>,
    "discovery": <int|null>,
    "objection_handling": <int|null>,
    "active_listening": <int|null>,
    "closing_readiness": <int|null>
  },
  "strengths": ["specific thing 1", "specific thing 2"],
  "weaknesses": ["specific thing 1", "specific thing 2"],
  "suggestions": ["concrete actionable fix with example phrasing if possible"],
  "transcript_annotations": [
    {
      "quote": "<verbatim substring of the submission>",
      "category": "<one of the category slugs>",
      "sentiment": "positive" | "negative" | "neutral",
      "note": "why this moment matters"
    }
  ]
}

SCORING RULES:
- A genuinely solid performance scores 75+. A weak one scores below 60. Don't inflate.
- If the submission is too short, off-topic, or refuses to engage, score accordingly and explain in weaknesses.
- Return null (not 0) for categories with weight 0 — those aren't exercised by this scenario.
- overall_score should roughly reflect the weighted average of the scored categories.
- For VIDEO submissions, factor delivery into confidence and clarity scores.

STRENGTHS/WEAKNESSES RULES:
- 2-3 items each, each tied to something specific the rep said or did.
- No generic platitudes ("be more confident!"). Reference the submission.
- For video: at least one item should reference body language / delivery if metrics suggest it matters.

SUGGESTIONS RULES:
- 2-3 actionable fixes. When possible, include example phrasing like: Try saying: "..."
- Focus on the highest-leverage fix first.

TRANSCRIPT_ANNOTATIONS RULES:
- 2-6 annotations. Each "quote" field MUST be a VERBATIM substring of the submission — character-for-character. Do not paraphrase or re-punctuate.
- Mix positive and negative moments. Ground the strengths/weaknesses in these.
`;
}
