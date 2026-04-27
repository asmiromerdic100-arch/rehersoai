import { Clock } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import type { AttemptWithScenario } from '@/lib/attempts/queries';
import { CATEGORY_DISPLAY } from '@/types/scenario';

interface RecentAttemptsProps {
  attempts: AttemptWithScenario[];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function RecentAttempts({ attempts }: RecentAttemptsProps) {
  if (attempts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center">
        <Clock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Your recent practice sessions will show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {attempts.map(({ attempt, scenario, overall_score }) => (
        <li key={attempt.id}>
          <Link
            href={
              attempt.status === 'complete'
                ? `/results/${attempt.id}`
                : `/practice/${attempt.id}`
            }
            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="secondary" className="text-[11px]">
                  {CATEGORY_DISPLAY[scenario.category]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Attempt {attempt.attempt_number} · {relativeTime(attempt.created_at)}
                </span>
              </div>
              <div className="truncate font-medium">{scenario.title}</div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {attempt.status === 'processing' && (
                <span className="text-xs text-muted-foreground">Processing…</span>
              )}
              {attempt.status === 'failed' && (
                <span className="text-xs text-destructive">Failed</span>
              )}
              {attempt.status === 'complete' && overall_score !== null && (
                <span className="font-mono text-sm font-semibold">{overall_score}</span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
