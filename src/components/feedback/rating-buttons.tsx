'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import * as React from 'react';

import { useToast } from '@/hooks/use-toast';
import { rateFeedback } from '@/lib/attempts/actions';
import { cn } from '@/lib/utils/cn';

interface RatingButtonsProps {
  attemptId: string;
  initialRating: number | null;
}

export function RatingButtons({ attemptId, initialRating }: RatingButtonsProps) {
  const { toast } = useToast();
  const [rating, setRating] = React.useState<number | null>(initialRating);
  const [pending, setPending] = React.useState(false);

  async function rate(value: 1 | -1) {
    if (pending) return;
    const previous = rating;
    setRating(value);
    setPending(true);

    try {
      await rateFeedback(attemptId, value);
      toast({ title: 'Thanks — that helps us improve the coach.' });
    } catch (err) {
      setRating(previous);
      const message = err instanceof Error ? err.message : 'Could not save rating';
      toast({ title: 'Could not save', description: message, variant: 'destructive' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span>Was this feedback useful?</span>
      <button
        type="button"
        onClick={() => rate(1)}
        disabled={pending}
        aria-label="Useful"
        className={cn(
          'rounded-md border p-1.5 transition-colors',
          rating === 1
            ? 'border-success bg-success/15 text-success'
            : 'hover:bg-muted',
        )}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => rate(-1)}
        disabled={pending}
        aria-label="Not useful"
        className={cn(
          'rounded-md border p-1.5 transition-colors',
          rating === -1
            ? 'border-destructive bg-destructive/15 text-destructive'
            : 'hover:bg-muted',
        )}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
