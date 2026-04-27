import { notFound } from 'next/navigation';

import { getScenarioBySlug } from '@/lib/scenarios/queries';

import { PracticeInterface } from './practice-interface';

interface Props {
  params: { slug: string };
}

export default async function PracticePage({ params }: Props) {
  const scenario = await getScenarioBySlug(params.slug);
  if (!scenario) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rehearsing
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{scenario.title}</h1>
      </div>

      <div className="rounded-lg border-l-4 border-primary bg-muted/50 p-5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          The moment
        </div>
        <p className="text-base leading-relaxed">{scenario.challenge_prompt}</p>
      </div>

      <PracticeInterface scenarioId={scenario.id} />
    </div>
  );
}
