import { AlertCircle } from 'lucide-react';

import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { error?: string };
}

export default function LoginPage({ searchParams }: Props) {
  const error = searchParams.error;

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">RehersoAI</h1>
        <p className="text-sm text-muted-foreground">
          Rehearse. Get feedback. Close more deals.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{error}</p>
        </div>
      )}

      <LoginForm />
    </div>
  );
}
