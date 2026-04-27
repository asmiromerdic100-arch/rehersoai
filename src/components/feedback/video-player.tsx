'use client';

import * as React from 'react';

import { getVideoSignedUrl } from '@/lib/attempts/actions';

interface VideoPlayerProps {
  videoPath: string;
}

export function VideoPlayer({ videoPath }: VideoPlayerProps) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await getVideoSignedUrl(videoPath);
        if (!cancelled) setSrc(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load video';
        if (!cancelled) setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoPath]);

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Couldn't load the video: {error}
      </div>
    );
  }

  if (!src) {
    return (
      <div className="aspect-video w-full animate-pulse rounded-lg border bg-muted" />
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Watch yourself back
      </h3>
      <video src={src} controls className="aspect-video w-full rounded-md bg-black" />
      <p className="mt-3 text-xs text-muted-foreground">
        Self-review is one of the highest-leverage things you can do. Watch the moments where you
        looked down or where the score dropped — note what was happening verbally.
      </p>
    </div>
  );
}
