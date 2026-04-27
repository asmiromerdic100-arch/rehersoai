import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  CATEGORY_DISPLAY,
  DIFFICULTY_DISPLAY,
  type Scenario,
} from '@/types/scenario';

interface ScenarioCardProps {
  scenario: Scenario;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  return (
    <Link
      href={`/scenarios/${scenario.slug}`}
      className="group block rounded-lg border bg-card p-5 shadow-sm transition-all hover:border-foreground/30 hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <Badge variant="secondary">{CATEGORY_DISPLAY[scenario.category]}</Badge>
        <Badge variant="outline">{DIFFICULTY_DISPLAY[scenario.difficulty]}</Badge>
      </div>
      <h3 className="mb-2 font-semibold leading-tight tracking-tight">{scenario.title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{scenario.description}</p>
      <div className="flex items-center text-sm font-medium text-foreground/60 transition-colors group-hover:text-foreground">
        Start practice
        <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
