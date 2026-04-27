import { Check, X } from 'lucide-react';

interface ListProps {
  items: string[];
}

export function StrengthsList({ items }: ListProps) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        What worked
      </h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span className="text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeaknessesList({ items }: ListProps) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        What to fix
      </h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span className="text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SuggestionsList({ items }: ListProps) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Try next time
      </h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground">
              {(i + 1).toString().padStart(2, '0')}
            </span>
            <span className="text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
