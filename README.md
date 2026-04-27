# RehersoAI

AI-powered sales rehearsal. Pick a scenario, record or type your response, get structured feedback in ~20 seconds, retry to improve.

**V1 is deliberately narrow:** async rehearsal (not real-time roleplay), desktop-only, for B2B SaaS SDRs/BDRs practicing cold calls, discovery, and objection handling.

---

## Stack

- **Next.js 14** (App Router, Server Components, TypeScript strict)
- **Supabase** — auth, Postgres with RLS, storage, realtime
- **Google Gemini 2.0 Flash** — primary evaluator (free tier)
- **Groq** — Whisper transcription + Llama fallback evaluator (free tier)
- **Tailwind + shadcn/ui** — styling
- **Zod** — validation at every boundary
- **Vercel** — hosting (free tier sufficient)

**Marginal cost at beta scale: $0.** See "Upgrading to paid models" below.

---

## Project layout

```
rehersoai/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # email/password auth
│   │   ├── (app)/                 # authenticated routes
│   │   │   ├── dashboard/
│   │   │   ├── scenarios/[slug]/
│   │   │   ├── practice/[slug]/
│   │   │   ├── results/[attemptId]/
│   │   │   ├── history/
│   │   │   └── settings/
│   │   ├── onboarding/            # 2-step profile setup
│   │   └── api/attempts/          # POST attempt + polling fallback
│   ├── components/
│   │   ├── ui/                    # shadcn primitives
│   │   ├── feedback/              # score, bars, lists, annotated transcript
│   │   ├── recorder/              # AudioRecorder, TextSubmission
│   │   ├── scenario/              # ScenarioCard
│   │   ├── attempt/               # RecentAttempts
│   │   └── nav/                   # Sidebar
│   ├── lib/
│   │   ├── supabase/              # browser, server, admin clients
│   │   ├── scenarios/queries.ts
│   │   ├── attempts/              # queries, actions, processor
│   │   ├── evaluation/            # interface, gemini, groq, mock, schema, prompt
│   │   ├── transcription/         # interface, groq, mock
│   │   ├── profile/actions.ts
│   │   └── utils/
│   ├── types/                     # domain types
│   └── middleware.ts              # session refresh + route gating
├── supabase/
│   ├── migrations/                # schema, RLS, storage
│   └── seed/
│       ├── skills.json
│       ├── scenarios/*.json       # one file per scenario
│       ├── seed.ts                # idempotent seed script
│       └── README.md              # scenario authoring guide
└── scripts/
    └── calibrate-evaluator.ts     # sanity-check prompt changes
```

---

## Local setup

### Prerequisites
- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Create a Supabase project

At [supabase.com/dashboard](https://supabase.com/dashboard), create a new project. Grab three values from **Settings → API**:
- Project URL
- `anon` public key
- `service_role` secret key

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in the Supabase keys. Leave AI provider vars as `mock` for now — you can run the whole app without API keys.

### 4. Apply migrations

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This runs the three migrations in `supabase/migrations/` against your cloud DB.

### 5. Seed scenarios

```bash
pnpm seed
```

Upserts skills and scenarios. Idempotent — rerun after editing JSON files.

### 6. Generate types (optional but recommended)

```bash
supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/types.ts
```

Replaces the hand-written types with auto-generated ones matching your actual schema.

### 7. Run

```bash
pnpm dev
```

Open [localhost:3000](http://localhost:3000), sign up, complete onboarding, click into a scenario, submit text or audio.

With `EVALUATOR_PROVIDER=mock` and `TRANSCRIBER_PROVIDER=mock` (default), you'll get deterministic feedback without any external API calls. Perfect for development.

---

## Flipping on real AI

### Gemini (primary evaluator)

1. Get a key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — free tier is ~1500 req/day
2. `GOOGLE_GENAI_API_KEY=...` in `.env.local`
3. `EVALUATOR_PROVIDER=gemini`

### Groq (transcription + fallback evaluator)

1. Get a key at [console.groq.com/keys](https://console.groq.com/keys) — free tier is generous
2. `GROQ_API_KEY=...` in `.env.local`
3. `TRANSCRIBER_PROVIDER=groq` for audio transcription
4. `EVALUATOR_PROVIDER=groq` to use Llama 3.3 instead of Gemini

The evaluator interface is provider-agnostic. To add Claude or GPT-4 later, add a new class implementing `Evaluator` in `src/lib/evaluation/` and wire it into `getEvaluator()`.

---

## Scenario authoring

The single biggest driver of product quality is the scenario rubric. See `supabase/seed/README.md` for the full schema. Short version: each scenario is a JSON file with `ideal_behaviors`, `common_mistakes`, and `category_weights` — these go directly into the evaluator prompt.

V1 ships with 2 sample scenarios. The target is 8. Add yours to `supabase/seed/scenarios/*.json`, then `pnpm seed`.

---

## Calibration

After changing the evaluator prompt, run:

```bash
EVALUATOR_PROVIDER=gemini pnpm calibrate
```

This runs 5 pre-written submissions (strong, mediocre, weak) against the current prompt and prints scores so you can catch regressions. Add more samples to `scripts/calibrate-evaluator.ts` as you find interesting edge cases.

---

## Deployment

### Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Add the env vars from `.env.local` to Vercel's environment settings
4. Deploy

The `POST /api/attempts` route has `maxDuration: 60`. If Vercel's free tier limits to 10s (verify at deploy time), move the processor to a background queue — see "Next up" below.

### Supabase production

Point your Vercel env vars at the same Supabase project. RLS protects everything, so there's no staging/production confusion at the data layer for V1.

---

## Key architectural decisions

- **Server-first rendering.** Everything except the recorder, toast, rating buttons, and charts is a Server Component. Supabase queries happen in Server Components under the user's auth context — RLS does the auth work.
- **Audio upload goes direct to Supabase Storage** via signed URLs. The Next.js API never sees audio bytes, avoiding the 4.5MB body limit and saving Vercel bandwidth.
- **Evaluator + transcriber are swappable providers.** `EVALUATOR_PROVIDER` and `TRANSCRIBER_PROVIDER` env vars pick implementations at runtime.
- **Feedback JSON is Zod-validated.** Hallucinated annotation quotes are silently dropped (not verbatim in transcript).
- **Synchronous processing inside `POST /api/attempts`.** Realtime subscriptions notify the client. When latency becomes a problem, move `processAttempt` into Inngest — the function is already lift-and-shift ready.

---

## What's explicitly NOT in V1

- Video recording / body language feedback
- Real-time AI buyer role-play (different product)
- Team / manager dashboards
- Billing
- CRM / Slack integrations
- Mobile (recording has MediaRecorder issues on mobile Safari — desktop-only for now)
- Scenario editor UI (scenarios live in JSON seed files, edited by the founder)
- Skill tree UI (the schema supports it; the Duolingo play comes in V1.5)

---

## Next up

1. **Author the remaining 6 scenarios** (see `supabase/seed/README.md`)
2. **Wire real AI** — Gemini + Groq keys, flip env vars, run `pnpm calibrate`
3. **Recruit 5 beta users** from the target ICP (0–18 month B2B SaaS SDRs/BDRs)
4. **Tune the prompt** based on thumbs-down feedback the first week
5. **Measure D1 retention** — if ≥40% of signups do a second attempt within 7 days, you have a product
