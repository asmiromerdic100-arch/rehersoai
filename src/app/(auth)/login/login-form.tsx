'use client';

import { CheckCircle2, Loader2, Mail } from 'lucide-react';
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
  const [verificationSent, setVerificationSent] = React.useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Build redirect URL based on current origin so it works in dev + prod
        const redirectTo = `${window.location.origin}/auth/callback`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;

        // Supabase returns a user with no session when email confirmation is required.
        // If a session IS returned, email confirmation is disabled in Supabase settings.
        if (data.session) {
          toast({
            title: 'Account created',
            description: "You're signed in — let's set up your profile.",
          });
          router.refresh();
          router.push('/dashboard');
          return;
        }

        // Email confirmation flow — show "check your email" screen
        setVerificationSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast({
        title: mode === 'signup' ? 'Sign-up failed' : 'Sign-in failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      toast({
        title: 'Email sent',
        description: 'Check your inbox (and spam folder).',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not resend email';
      toast({ title: 'Resend failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // ─── Verification-pending screen ────────────────────────────────────
  if (verificationSent) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-5 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="h-7 w-7 text-primary" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to{' '}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Click the link in the email to activate your account and start practicing.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <span>Didn&apos;t get it? Check your spam folder.</span>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={resendVerification}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Resend verification email
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setVerificationSent(false);
                setMode('signin');
                setPassword('');
              }}
            >
              Back to sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Standard sign-in / sign-up form ───────────────────────────────
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
              placeholder="you@company.com"
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
              placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {mode === 'signup' && (
              <p className="text-xs text-muted-foreground">
                At least 8 characters. We&apos;ll send you a verification email.
              </p>
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
