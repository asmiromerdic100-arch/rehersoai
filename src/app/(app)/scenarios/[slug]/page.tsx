import { ArrowRight, Target, User } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getScenarioBySlug } from '@/lib/scenarios/queries';
import { CATEGORY_DISPLAY, DIFFICULTY_DISPLAY } from '@/types/scenario';

interface Props {
  params: { slug: string };
}

export default async function ScenarioDetailPage({ params }: Props) {
  const scenario = await getScenarioBySlug(params.slug);
  if (!scenario) notFound();

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to scenarios
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{CATEGORY_DISPLAY[scenario.category]}</Badge>
          <Badge variant="outline">{DIFFICULTY_DISPLAY[scenario.difficulty]}</Badge>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">{scenario.title}</h1>
        <p className="text-lg text-muted-foreground">{scenario.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4 text-muted-foreground" />
            The buyer
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {scenario.buyer_context}
          </p>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-muted-foreground" />
            Your goal
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{scenario.user_goal}</p>
        </section>
      </div>

      <section className="rounded-lg border-l-4 border-primary bg-muted/50 p-5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          The moment
        </div>
        <p className="text-base leading-relaxed">{scenario.challenge_prompt}</p>
      </section>

      <div className="flex items-center justify-between border-t pt-6">
        <div className="text-sm text-muted-foreground">
          You'll record audio or type your response. Feedback in ~20 seconds.
        </div>
        <Button size="lg" asChild>
          <Link href={`/practice/${scenario.slug}`}>
            Start practice
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
