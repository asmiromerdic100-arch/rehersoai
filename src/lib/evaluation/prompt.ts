/**
 * Builds the prompt sent to the LLM evaluator (Gemini 2.5 Flash).
 *
 * Phase 1 improvements over previous version:
 *   1. Sharper feedback — forces the model to cite specific quotes and lower temperature
 *      so feedback feels grounded, not horoscope-y.
 *   2. "Try this next time" section — every weakness must come paired with a concrete
 *      example rewrite the user could actually say next time.
 *   3. Body language integrated into the narrative — when video is submitted, body
 *      language metrics are woven into strengths/weaknesses/suggestions instead of
 *      being a separate detached panel.
 */

import type { EvaluationInput } from './index';

// Minimum thresholds for body language metrics to be flagged in narrative.
// These are tuned conservatively — we want to mention body language only when it
// either (a) genuinely helped the rep or (b) genuinely hurt them.
const BODY_LANG_THRESHOLDS = {
  EYE_CONTACT_LOW: 0.55, // <55% eye contact = weakness worth mentioning
  EYE_CONTACT_HIGH: 0.80, // >80% eye contact = strength worth mentioning
  LOOKING_DOWN_HIGH: 0.30, // >30% looking down = script-reading red flag
  SMILE_LOW: 0.10, // <10% smiling on a warm scenario = stiff/cold
  SMILE_HIGH: 0.40, // >40% smiling = warm presence
  HEAD_MOVEMENT_LOW: 0.05, // very still = robotic
  HEAD_MOVEMENT_HIGH: 0.40, // very fidgety = nervous
} as const;

export function buildEvaluatorPrompt(input: EvaluationInput): string {
  const { scenario, transcript, submissionMode, durationSeconds, deliveryMetrics } = input;
  const { rubric } = scenario;

  const idealList = rubric.ideal_behaviors.map((b, i) => `  ${i + 1}. ${b}`).join('\n');
  const mistakeList = rubric.common_mistakes.map((m, i) => `  ${i + 1}. ${m}`).join('\n');

  const activeCategories = Object.entries(rubric.category_weights)
    .filter(([, weight]) => weight > 0)
    .map(([cat, weight]) => `  - ${cat}: weight ${weight.toFixed(2)}`)
    .join('\n');

  const skippedCategories = Object.entries(rubric.category_weights)
    .filter(([, weight]) => weight === 0)
    .map(([cat]) => cat);

  const bodyLanguageBlock = buildBodyLanguageBlock(deliveryMetrics, submissionMode);
  const durationLine = durationSeconds
    ? `Duration: ${durationSeconds}s (${submissionMode})`
    : `Mode: ${submissionMode}`;

  return `You are a sharp, direct sales coach evaluating a sales rehearsal. Your feedback is honest, specific, and grounded in what the rep ACTUALLY said. You do not give vague advice or generic platitudes. Every observation must tie to a specific moment in their submission.

═══════════════════════════════════════════════════════════════════════
SCENARIO
═══════════════════════════════════════════════════════════════════════
Title:      ${scenario.title}
Difficulty: ${scenario.difficulty}

Buyer context:
${scenario.buyer_context}

What the rep needs to accomplish:
${scenario.user_goal}

The challenge moment:
${scenario.challenge_prompt}

═══════════════════════════════════════════════════════════════════════
RUBRIC FOR THIS SCENARIO
═══════════════════════════════════════════════════════════════════════

Ideal behaviors (what excellent looks like):
${idealList}

Common mistakes to watch for:
${mistakeList}

Categories to score (with weights for the overall score):
${activeCategories}
${skippedCategories.length > 0 ? `\nDo NOT score these categories — return null for each: ${skippedCategories.join(', ')}` : ''}

═══════════════════════════════════════════════════════════════════════
THE REP'S SUBMISSION
═══════════════════════════════════════════════════════════════════════
${durationLine}

Transcript:
"""
${transcript}
"""
${bodyLanguageBlock}
═══════════════════════════════════════════════════════════════════════
HOW TO WRITE THE FEEDBACK
═══════════════════════════════════════════════════════════════════════

You must return a JSON object matching the schema below — no prose, no markdown.

CRITICAL RULES — violating these makes the feedback useless:

1. EVERY strength and weakness must reference a SPECIFIC quote from the transcript.
   Bad:  "Your value prop was vague."
   Good: "Your value prop — 'we help companies optimize' — is too vague. The buyer doesn't know what 'optimize' means for their specific situation."

2. EVERY weakness must come paired with an actionable rewrite in 'try_this_next_time'.
   This is the most important field. The rewrite must be a concrete sentence the rep
   could actually say next time — not advice ABOUT what to say.
   Bad:  "Be more specific about value."
   Good: "Try: 'Other AI firms your size cut model deployment time from weeks to days using us — would that solve a real problem for you?'"

3. Score honestly. A genuinely good performance scores 75+. A weak one scores below 60.
   Do not inflate. Do not give participation trophies. The rep wants to improve, not feel good.

4. transcript_annotations.quote must be a VERBATIM substring of the transcript above.
   Copy the exact characters. Do not paraphrase. If you cannot find an exact quote
   for an observation, do not include it as an annotation.

5. Strengths: 2-3 items. Weaknesses: 2-3 items. Try-this-next-time: 2-3 items, one
   for each weakness. Annotations: 3-6 items max.

6. ${
    deliveryMetrics
      ? "BODY LANGUAGE: Weave the body-language signals into the narrative naturally. If eye contact was strong, mention it as a strength — tied to the moment. If they spent a lot of time looking down, that's a script-reading flag — call it out. Don't list metrics; describe what the body language MEANT for the buyer's experience."
      : "BODY LANGUAGE: Not provided for this submission (audio/text only). Focus entirely on the verbal content."
  }

7. Tone: direct, warm, professional. You're a coach who respects the rep enough to be honest. No cheerleading. No condescension.

═══════════════════════════════════════════════════════════════════════
OUTPUT SCHEMA
═══════════════════════════════════════════════════════════════════════

Return ONLY valid JSON in this exact shape:

{
  "overall_score": <integer 0-100>,
  "category_scores": {
    "confidence": <integer 0-100 or null>,
    "clarity": <integer 0-100 or null>,
    "structure": <integer 0-100 or null>,
    "discovery": <integer 0-100 or null>,
    "objection_handling": <integer 0-100 or null>,
    "active_listening": <integer 0-100 or null>,
    "closing_readiness": <integer 0-100 or null>
  },
  "strengths": [
    "<specific strength tied to a moment in the transcript>",
    "<another specific strength>"
  ],
  "weaknesses": [
    "<specific weakness tied to a moment in the transcript>",
    "<another specific weakness>"
  ],
  "try_this_next_time": [
    "<concrete sentence the rep could say next time, addressing weakness 1>",
    "<concrete sentence the rep could say next time, addressing weakness 2>"
  ],
  "suggestions": [
    "<higher-level tactical suggestion (different from try_this_next_time)>",
    "<another higher-level tactical suggestion>"
  ],
  "transcript_annotations": [
    {
      "quote": "<verbatim substring of the transcript>",
      "category": "<one of: confidence, clarity, structure, discovery, objection_handling, active_listening, closing_readiness>",
      "sentiment": "<positive | negative | neutral>",
      "note": "<short coaching note, max 1 sentence>"
    }
  ]
}

Now evaluate the submission. Return only the JSON object.
`;
}

/**
 * Build the body-language section of the prompt.
 * Returns empty string for audio/text submissions or when no metrics are provided.
 */
function buildBodyLanguageBlock(
  metrics: EvaluationInput['deliveryMetrics'],
  submissionMode: string,
): string {
  if (!metrics || submissionMode !== 'video') return '';

  const observations: string[] = [];

  // Eye contact
  if (typeof metrics.eyeContactPct === 'number') {
    const pct = (metrics.eyeContactPct * 100).toFixed(0);
    if (metrics.eyeContactPct < BODY_LANG_THRESHOLDS.EYE_CONTACT_LOW) {
      observations.push(
        `Eye contact: ${pct}% — LOW. They were avoiding the camera most of the time. Likely reading from a script or notes, or nervous.`,
      );
    } else if (metrics.eyeContactPct > BODY_LANG_THRESHOLDS.EYE_CONTACT_HIGH) {
      observations.push(
        `Eye contact: ${pct}% — STRONG. They held the buyer's attention well throughout.`,
      );
    } else {
      observations.push(`Eye contact: ${pct}% — average.`);
    }
  }

  // Looking down (script-reading detector)
  if (typeof metrics.lookingDownPct === 'number') {
    const pct = (metrics.lookingDownPct * 100).toFixed(0);
    if (metrics.lookingDownPct > BODY_LANG_THRESHOLDS.LOOKING_DOWN_HIGH) {
      observations.push(
        `Looking down: ${pct}% — HIGH. Likely reading from a script or notes. This signals lack of preparation or low confidence to a buyer.`,
      );
    }
  }

  // Smile
  if (typeof metrics.smilePct === 'number') {
    const pct = (metrics.smilePct * 100).toFixed(0);
    if (metrics.smilePct < BODY_LANG_THRESHOLDS.SMILE_LOW) {
      observations.push(
        `Smile: ${pct}% — they came across as cold or stiff. Even a slight smile signals warmth and confidence.`,
      );
    } else if (metrics.smilePct > BODY_LANG_THRESHOLDS.SMILE_HIGH) {
      observations.push(`Smile: ${pct}% — warm, approachable presence.`);
    }
  }

  // Head movement
  if (typeof metrics.headMovementVariance === 'number') {
    if (metrics.headMovementVariance < BODY_LANG_THRESHOLDS.HEAD_MOVEMENT_LOW) {
      observations.push(
        `Head movement: very still — they came across as robotic or frozen. Natural head movement signals engagement.`,
      );
    } else if (metrics.headMovementVariance > BODY_LANG_THRESHOLDS.HEAD_MOVEMENT_HIGH) {
      observations.push(
        `Head movement: very fidgety — signals nervousness. Buyers read constant movement as low confidence.`,
      );
    }
  }

  // Filler words per minute (if tracked)
  if (typeof metrics.fillerWordsPerMin === 'number' && metrics.fillerWordsPerMin > 6) {
    observations.push(
      `Filler words: ${metrics.fillerWordsPerMin.toFixed(1)} per minute — high. Buyers register this as low certainty.`,
    );
  }

  if (observations.length === 0) return '';

  return `
Body language signals (from video analysis):
${observations.map((o) => `  • ${o}`).join('\n')}

When you write strengths, weaknesses, and try_this_next_time, weave these signals into the narrative naturally. Don't list them as separate metrics. Describe what they MEANT for how the rep came across to the buyer.
`;
}
