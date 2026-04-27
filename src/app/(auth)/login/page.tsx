import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">RehersoAI</h1>
        <p className="text-sm text-muted-foreground">
          Rehearse. Get feedback. Close more deals.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
