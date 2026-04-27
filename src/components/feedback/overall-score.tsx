import { cn } from '@/lib/utils/cn';

interface OverallScoreProps {
  score: number;
}

export function OverallScore({ score }: OverallScoreProps) {
  const band =
    score >= 80
      ? { label: 'Strong', color: 'text-success' }
      : score >= 65
        ? { label: 'Solid', color: 'text-foreground' }
        : score >= 50
          ? { label: 'Room to grow', color: 'text-warning' }
          : { label: 'Keep practicing', color: 'text-destructive' };

  return (
    <div className="flex items-center gap-6 rounded-lg border bg-card p-6">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-foreground/10">
        <span className="font-mono text-3xl font-semibold tabular-nums">{score}</span>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Overall
        </div>
        <div className={cn('text-2xl font-semibold tracking-tight', band.color)}>
          {band.label}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Out of 100.</p>
      </div>
    </div>
  );
}
