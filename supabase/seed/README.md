# Seed Data

## Skills

`skills.json` — the 7 core skills (= feedback categories). Edit carefully; slug changes will break scenario references.

## Scenarios

Each scenario is one JSON file in `scenarios/`. The filename should match the `slug`. Schema:

```json
{
  "slug": "kebab-case-id",
  "title": "Short human-readable title",
  "category": "cold_call | discovery | objection | closing | demo",
  "difficulty": "beginner | intermediate | advanced",
  "description": "One-liner shown on scenario cards.",
  "buyer_context": "Who the buyer is, their state of mind, the situation.",
  "user_goal": "What the rep must accomplish in this rehearsal.",
  "challenge_prompt": "The specific line or moment the rep must respond to.",
  "rubric": {
    "ideal_behaviors": ["...", "..."],
    "common_mistakes": ["...", "..."],
    "category_weights": {
      "confidence": 0.20,
      "clarity": 0.25,
      "structure": 0.20,
      "discovery": 0.05,
      "objection_handling": 0.00,
      "active_listening": 0.10,
      "closing_readiness": 0.20
    }
  },
  "skill_slugs": ["confidence", "clarity", "..."]
}
```

### Rules

- **All 7 category_weights must be present.** Set a category to `0.00` when it's not exercised by the scenario — the evaluator will skip scoring it.
- **Weights should sum to roughly 1.0.** Not strict, but aim for it so the overall score is well-calibrated.
- **`skill_slugs` must only use slugs from `skills.json`.** The seed script will fail otherwise.
- **`ideal_behaviors` and `common_mistakes`** are the most important fields. They're injected directly into the evaluator prompt. Be specific and concrete — the AI will only be as sharp as these are.

### Adding a scenario

1. Create `scenarios/your-slug.json`
2. Run `pnpm seed`
3. The script upserts on `slug`, so re-running is safe.

### Current scenario backlog (to reach V1's 8)

- [x] `cold-call-opener-saas-ops`
- [ ] Cold call opener with early "I'm busy" pushback (intermediate)
- [x] `objection-send-me-an-email`
- [ ] Discovery call opener (beginner)
- [ ] Discovery — asking open-ended questions under pressure (intermediate)
- [ ] Objection: "We already use [competitor]" (intermediate)
- [ ] Objection: price / "too expensive" (intermediate)
- [ ] Closing: asking for the next step (beginner)
