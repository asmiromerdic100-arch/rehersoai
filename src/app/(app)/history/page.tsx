import { ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { getAllAttemptsGrouped } from '@/lib/attempts/queries';
import { CATEGORY_DISPLAY } from '@/types/scenario';

export default async function HistoryPage() {
  const groups = await getAllAttemptsGrouped();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-muted-foreground">Every attempt, grouped by scenario.</p>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center">
          <Clock className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No attempts yet. Pick a scenario from the{' '}
            <Link href="/dashboard" className="underline">
              dashboard
            </Link>{' '}
            to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map(({ scenario, attempts }) => {
            const completed = attempts.filter((a) => a.attempt.status === 'complete');
            const latest = attempts[0];
            const best = completed.reduce<number | null>(
              (acc, cur) =>
                cur.overall_score !== null && (acc === null || cur.overall_score > acc)
                  ? cur.overall_score
                  : acc,
              null,
            );

            return (
              <li key={scenario.id}>
                <Link
                  href={`/history/${scenario.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card p-5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        {CATEGORY_DISPLAY[scenario.category]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {attempts.length} attempt{attempts.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="truncate font-medium">{scenario.title}</div>
                    {latest && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Last attempt {new Date(latest.attempt.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-6">
                    {best !== null && (
                      <div className="text-right">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Best
                        </div>
                        <div className="font-mono text-lg font-semibold tabular-nums">{best}</div>
                      </div>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
