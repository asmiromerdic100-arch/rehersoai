'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import { CATEGORY_LABELS } from '@/types/scenario';
import type { TranscriptAnnotation } from '@/types/feedback';

interface AnnotatedTranscriptProps {
  transcript: string;
  annotations: TranscriptAnnotation[];
}

interface Segment {
  text: string;
  annotation: TranscriptAnnotation | null;
}

/**
 * Splits transcript into segments: annotated substrings and plain-text gaps.
 * Handles overlapping/adjacent annotations by picking the first hit at each index.
 */
function segmentTranscript(transcript: string, annotations: TranscriptAnnotation[]): Segment[] {
  if (annotations.length === 0) return [{ text: transcript, annotation: null }];

  // Find each annotation's range. Case-insensitive match but preserve original casing.
  const lower = transcript.toLowerCase();
  type Range = { start: number; end: number; annotation: TranscriptAnnotation };
  const ranges: Range[] = [];

  for (const annotation of annotations) {
    const idx = lower.indexOf(annotation.quote.toLowerCase());
    if (idx === -1) continue;
    ranges.push({ start: idx, end: idx + annotation.quote.length, annotation });
  }

  // Sort by start, drop overlaps (keep earliest).
  ranges.sort((a, b) => a.start - b.start);
  const nonOverlapping: Range[] = [];
  let lastEnd = -1;
  for (const r of ranges) {
    if (r.start >= lastEnd) {
      nonOverlapping.push(r);
      lastEnd = r.end;
    }
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of nonOverlapping) {
    if (r.start > cursor) {
      segments.push({ text: transcript.slice(cursor, r.start), annotation: null });
    }
    segments.push({ text: transcript.slice(r.start, r.end), annotation: r.annotation });
    cursor = r.end;
  }
  if (cursor < transcript.length) {
    segments.push({ text: transcript.slice(cursor), annotation: null });
  }
  return segments;
}

export function AnnotatedTranscript({ transcript, annotations }: AnnotatedTranscriptProps) {
  const segments = React.useMemo(
    () => segmentTranscript(transcript, annotations),
    [transcript, annotations],
  );
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Your response
      </h3>
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
        {segments.map((seg, i) =>
          seg.annotation ? (
            <AnnotatedSpan
              key={i}
              segment={seg}
              active={activeIndex === i}
              onToggle={() => setActiveIndex(activeIndex === i ? null : i)}
            />
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>

      {annotations.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Tap highlighted passages to see the coaching note.
        </p>
      )}
    </div>
  );
}

function AnnotatedSpan({
  segment,
  active,
  onToggle,
}: {
  segment: Segment;
  active: boolean;
  onToggle: () => void;
}) {
  const a = segment.annotation!;
  const bg =
    a.sentiment === 'positive'
      ? 'bg-success/15 hover:bg-success/25'
      : a.sentiment === 'negative'
        ? 'bg-destructive/15 hover:bg-destructive/25'
        : 'bg-muted hover:bg-muted/70';

  const borderColor =
    a.sentiment === 'positive'
      ? 'border-success/50'
      : a.sentiment === 'negative'
        ? 'border-destructive/50'
        : 'border-foreground/20';

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'cursor-pointer rounded-sm px-0.5 underline decoration-dotted underline-offset-4 transition-colors',
          bg,
        )}
      >
        {segment.text}
      </button>
      {active && (
        <span
          className={cn(
            'ml-1 mr-0.5 inline-block rounded-md border bg-background px-2 py-1 align-baseline text-[13px] font-normal not-italic shadow-sm',
            borderColor,
          )}
        >
          <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[a.category]}
          </span>
          {a.note}
        </span>
      )}
    </>
  );
}
