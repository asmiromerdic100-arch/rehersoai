import { RecentAttempts } from '@/components/attempt/recent-attempts';
import { ScenarioCard } from '@/components/scenario/scenario-card';
import { getRecentAttempts } from '@/lib/attempts/queries';
import { getScenarios } from '@/lib/scenarios/queries';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, scenarios, attempts] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
    getScenarios(),
    getRecentAttempts(5),
  ]);

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi, {firstName}.
        </h1>
        <p className="text-muted-foreground">
          Pick a scenario to rehearse. You'll get feedback in about 20 seconds.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent attempts
        </h2>
        <RecentAttempts attempts={attempts} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Scenarios
        </h2>
        {scenarios.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No scenarios yet. Run{' '}
              <code className="font-mono text-xs">pnpm seed</code> to load the starter library.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {scenarios.map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
