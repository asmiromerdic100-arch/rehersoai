import { Eye, Smile, MoveVertical, ArrowDown } from 'lucide-react';

import type { DeliveryMetrics } from '@/types/delivery';
import { judgeDelivery } from '@/types/delivery';
import { cn } from '@/lib/utils/cn';

interface DeliveryPanelProps {
  metrics: DeliveryMetrics;
}

export function DeliveryPanel({ metrics }: DeliveryPanelProps) {
  if (metrics.frames_analyzed < 5) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Delivery
        </h3>
        <p className="text-sm text-muted-foreground">
          Couldn't reliably detect your face during this recording. Make sure you're in good
          lighting and centered in the frame.
        </p>
      </div>
    );
  }

  const verdicts = judgeDelivery(metrics);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Delivery
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DeliveryStat
          icon={Eye}
          label="Eye contact"
          value={`${metrics.eye_contact_pct.toFixed(0)}%`}
          verdict={verdicts.eye_contact}
          subtitle={subtitle(verdicts.eye_contact, 'Solid', 'Could improve', 'Looked away often')}
        />
        <DeliveryStat
          icon={ArrowDown}
          label="Looking down"
          value={`${metrics.looking_down_pct.toFixed(0)}%`}
          verdict={verdicts.looking_down}
          subtitle={subtitle(
            verdicts.looking_down,
            'Looking up',
            'Some script-reading',
            'A lot of script-reading',
          )}
        />
        <DeliveryStat
          icon={Smile}
          label="Smiling"
          value={`${metrics.smile_pct.toFixed(0)}%`}
          verdict={verdicts.smile}
          subtitle={subtitle(verdicts.smile, 'Warm', 'Reserved', 'Stone-faced')}
        />
        <DeliveryStat
          icon={MoveVertical}
          label="Movement"
          value={`${metrics.head_movement.toFixed(0)}/100`}
          verdict={verdicts.head_movement}
          subtitle={subtitle(verdicts.head_movement, 'Natural', 'A bit stiff', 'Stiff or distracting')}
        />
      </div>
    </div>
  );
}

function subtitle(
  verdict: 'good' | 'mixed' | 'poor',
  good: string,
  mixed: string,
  poor: string,
): string {
  return verdict === 'good' ? good : verdict === 'mixed' ? mixed : poor;
}

function DeliveryStat({
  icon: Icon,
  label,
  value,
  verdict,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  verdict: 'good' | 'mixed' | 'poor';
  subtitle: string;
}) {
  const valueColor =
    verdict === 'good'
      ? 'text-success'
      : verdict === 'mixed'
        ? 'text-foreground'
        : 'text-destructive';

  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn('font-mono text-2xl font-semibold tabular-nums', valueColor)}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}
