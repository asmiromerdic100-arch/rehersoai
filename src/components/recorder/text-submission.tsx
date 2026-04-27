'use client';

import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const MIN_WORDS = 20;
const MAX_CHARS = 5000;

interface TextSubmissionProps {
  scenarioId: string;
  onSubmitted: (attemptId: string) => void;
}

export function TextSubmission({ scenarioId, onSubmitted }: TextSubmissionProps) {
  const { toast } = useToast();
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const wordCount = React.useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).length,
    [text],
  );
  const canSubmit = wordCount >= MIN_WORDS && text.length <= MAX_CHARS && !loading;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          submissionMode: 'text',
          transcript: text.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Submission failed');
      }
      const { attemptId } = (await res.json()) as { attemptId: string };
      onSubmitted(attemptId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      toast({ title: 'Submission failed', description: message, variant: 'destructive' });
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          Type your response exactly as you'd say it out loud. Write complete sentences — the
          evaluator reads this like a transcript.
        </p>
        <Textarea
          rows={10}
          placeholder="Your response…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          className="resize-none"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {wordCount} word{wordCount === 1 ? '' : 's'}
          {wordCount < MIN_WORDS && ` · ${MIN_WORDS - wordCount} more to submit`}
        </span>
        <span className={text.length > MAX_CHARS ? 'text-destructive' : ''}>
          {text.length} / {MAX_CHARS}
        </span>
      </div>
      <Button onClick={submit} disabled={!canSubmit} className="w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit for feedback
      </Button>
    </div>
  );
}
