import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getScenarioHistory } from '@/lib/attempts/queries';
import { getScenarioById } from '@/lib/scenarios/queries';
import { CATEGORY_DISPLAY, DIFFICULTY_DISPLAY } from '@/types/scenario';

import { ScoreTrend } from './score-trend';

interface Props {
  params: { scenarioId: string };
}

export default async function ScenarioHistoryPage({ params }: Props) {
  const [scenario, attempts] = await Promise.all([
    getScenarioById(params.scenarioId),
    getScenarioHistory(params.scenarioId),
  ]);

  if (!scenario) notFound();

  const completed = attempts.filter(
    (a) => a.attempt.status === 'complete' && a.overall_score !== null,
  );

  const trendData = completed.map((a) => ({
    attempt: a.attempt.attempt_number,
    score: a.overall_score as number,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href="/history"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All history
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{CATEGORY_DISPLAY[scenario.category]}</Badge>
          <Badge variant="outline">{DIFFICULTY_DISPLAY[scenario.difficulty]}</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{scenario.title}</h1>
      </div>

      {trendData.length >= 2 && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Score over time
          </h2>
          <ScoreTrend data={trendData} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          All attempts
        </h2>
        {attempts.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No attempts yet.
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {attempts.map(({ attempt, overall_score }) => (
              <li key={attempt.id}>
                <Link
                  href={`/results/${attempt.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <div className="font-medium">Attempt {attempt.attempt_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(attempt.created_at).toLocaleString()} ·{' '}
                      {attempt.submission_mode === 'audio' ? 'Audio' : 'Text'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {attempt.status === 'processing' && (
                      <span className="text-xs text-muted-foreground">Processing…</span>
                    )}
                    {attempt.status === 'failed' && (
                      <span className="text-xs text-destructive">Failed</span>
                    )}
                    {attempt.status === 'complete' && overall_score !== null && (
                      <span className="font-mono text-lg font-semibold tabular-nums">
                        {overall_score}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="border-t pt-6">
        <Button asChild>
          <Link href={`/practice/${scenario.slug}`}>Try again</Link>
        </Button>
      </div>
    </div>
  );
}
