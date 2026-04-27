'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export function LoginForm() {
  const [mode, setMode] = React.useState<Mode>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({
          title: 'Account created',
          description: 'You\'re signed in. Let\'s set up your profile.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Middleware will route to /onboarding or /dashboard as appropriate.
      router.refresh();
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast({ title: 'Sign in failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {mode === 'signup' && (
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}{' '}
          <button
            type="button"
            className="font-medium text-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
