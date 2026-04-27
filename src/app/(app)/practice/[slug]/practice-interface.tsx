'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { AudioRecorder } from '@/components/recorder/audio-recorder';
import { TextSubmission } from '@/components/recorder/text-submission';
import { VideoRecorder } from '@/components/recorder/video-recorder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';

interface PracticeInterfaceProps {
  scenarioId: string;
}

export function PracticeInterface({ scenarioId }: PracticeInterfaceProps) {
  const router = useRouter();
  const [processingAttemptId, setProcessingAttemptId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!processingAttemptId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`attempt-${processingAttemptId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attempts',
          filter: `id=eq.${processingAttemptId}`,
        },
        (payload) => {
          const status = (payload.new as { status: string }).status;
          if (status === 'complete' || status === 'failed') {
            router.push(`/results/${processingAttemptId}`);
          }
        },
      )
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('attempts')
        .select('status')
        .eq('id', processingAttemptId)
        .single();
      if (data && (data.status === 'complete' || data.status === 'failed')) {
        router.push(`/results/${processingAttemptId}`);
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [processingAttemptId, router]);

  if (processingAttemptId) {
    return <ProcessingScreen />;
  }

  return (
    <Tabs defaultValue="audio">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="audio">Audio</TabsTrigger>
        <TabsTrigger value="video">Video</TabsTrigger>
        <TabsTrigger value="text">Text</TabsTrigger>
      </TabsList>
      <TabsContent value="audio">
        <AudioRecorder scenarioId={scenarioId} onSubmitted={setProcessingAttemptId} />
      </TabsContent>
      <TabsContent value="video">
        <VideoRecorder scenarioId={scenarioId} onSubmitted={setProcessingAttemptId} />
      </TabsContent>
      <TabsContent value="text">
        <TextSubmission scenarioId={scenarioId} onSubmitted={setProcessingAttemptId} />
      </TabsContent>
    </Tabs>
  );
}

function ProcessingScreen() {
  const [phase, setPhase] = React.useState<'transcribing' | 'evaluating' | 'finalizing'>(
    'transcribing',
  );

  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase('evaluating'), 4000);
    const t2 = setTimeout(() => setPhase('finalizing'), 12000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const label = {
    transcribing: 'Transcribing your submission…',
    evaluating: 'Your coach is reviewing…',
    finalizing: 'Almost there…',
  }[phase];

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border bg-card p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">
        Usually takes 10–20 seconds. Hang tight.
      </p>
    </div>
  );
}
