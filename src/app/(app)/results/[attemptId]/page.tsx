import { AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AnnotatedTranscript } from '@/components/feedback/annotated-transcript';
import { CategoryBars } from '@/components/feedback/category-bars';
import { DeliveryPanel } from '@/components/feedback/delivery-panel';
import {
  StrengthsList,
  SuggestionsList,
  WeaknessesList,
} from '@/components/feedback/feedback-lists';
import { OverallScore } from '@/components/feedback/overall-score';
import { RatingButtons } from '@/components/feedback/rating-buttons';
import { VideoPlayer } from '@/components/feedback/video-player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAttemptWithFeedback } from '@/lib/attempts/queries';
import { CATEGORY_DISPLAY } from '@/types/scenario';

interface Props {
  params: { attemptId: string };
}

export default async function ResultsPage({ params }: Props) {
  const result = await getAttemptWithFeedback(params.attemptId);
  if (!result) notFound();

  const { attempt, feedback, scenario } = result;

  // Failed attempt — show error state with retry
  if (attempt.status === 'failed' || !feedback) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Badge variant="secondary">{CATEGORY_DISPLAY[scenario.category]}</Badge>
          <h1 className="text-2xl font-semibold tracking-tight">{scenario.title}</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Evaluation failed
          </div>
          <p className="text-sm text-muted-foreground">
            {attempt.error_message ??
              'Something went wrong processing your submission. Try again — no charge, no questions.'}
          </p>
        </div>
        <Button asChild>
          <Link href={`/practice/${scenario.slug}`}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/scenarios/${scenario.slug}`} className="hover:text-foreground">
            {scenario.title}
          </Link>
          <span>·</span>
          <span>Attempt {attempt.attempt_number}</span>
          <span>·</span>
          <span>{new Date(attempt.created_at).toLocaleString()}</span>
          {attempt.submission_mode === 'video' && (
            <>
              <span>·</span>
              <Badge variant="outline" className="text-[10px]">Video</Badge>
            </>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Your feedback</h1>
      </div>

      {/* Top row: score + categories */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,340px)_1fr]">
        <OverallScore score={feedback.overall_score} />
        <CategoryBars scores={feedback.category_scores} />
      </div>

      {/* Delivery (video only) */}
      {feedback.delivery_metrics && <DeliveryPanel metrics={feedback.delivery_metrics} />}

      {/* Strengths + Weaknesses */}
      <div className="grid gap-4 md:grid-cols-2">
        <StrengthsList items={feedback.strengths} />
        <WeaknessesList items={feedback.weaknesses} />
      </div>

      {/* Suggestions */}
      <SuggestionsList items={feedback.suggestions} />

      {/* Video playback (video only) */}
      {attempt.submission_mode === 'video' && attempt.video_path && (
        <VideoPlayer videoPath={attempt.video_path} />
      )}

      {/* Annotated transcript */}
      {attempt.transcript && (
        <AnnotatedTranscript
          transcript={attempt.transcript}
          annotations={feedback.transcript_annotations}
        />
      )}

      {/* Footer CTAs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <RatingButtons attemptId={attempt.id} initialRating={feedback.user_rating} />
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/history/${scenario.id}`}>
              See history
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/practice/${scenario.slug}`}>
              <RotateCcw className="h-4 w-4" />
              Try again
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
