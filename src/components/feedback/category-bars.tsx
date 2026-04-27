import { CATEGORY_LABELS, CATEGORY_ORDER_FULL, type FeedbackCategory } from '@/types/scenario';
import type { CategoryScores } from '@/types/feedback';
import { cn } from '@/lib/utils/cn';

interface CategoryBarsProps {
  scores: CategoryScores;
}

export function CategoryBars({ scores }: CategoryBarsProps) {
  // Order by score descending, with nulls last
  const scored = CATEGORY_ORDER_FULL
    .map((cat) => ({ category: cat, score: scores[cat] ?? null }))
    .filter((x) => x.score !== null) as Array<{ category: FeedbackCategory; score: number }>;

  const unscored = CATEGORY_ORDER_FULL.filter((cat) => scores[cat] === null || scores[cat] === undefined);

  scored.sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Category scores
      </h3>
      <div className="space-y-3">
        {scored.map(({ category, score }) => (
          <CategoryRow key={category} category={category} score={score} />
        ))}
      </div>
      {unscored.length > 0 && (
        <div className="pt-3 text-xs text-muted-foreground">
          Not exercised by this scenario: {unscored.map((c) => CATEGORY_LABELS[c]).join(', ')}.
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category, score }: { category: FeedbackCategory; score: number }) {
  const color =
    score >= 75
      ? 'bg-success'
      : score >= 60
        ? 'bg-foreground/80'
        : score >= 45
          ? 'bg-warning'
          : 'bg-destructive';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{CATEGORY_LABELS[category]}</span>
        <span className="font-mono tabular-nums text-muted-foreground">{score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
