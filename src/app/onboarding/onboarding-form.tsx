'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { completeOnboarding } from '@/lib/profile/actions';
import type { UserRole } from '@/lib/supabase/types';

type Step = 1 | 2;

export function OnboardingForm() {
  const [step, setStep] = React.useState<Step>(1);
  const [displayName, setDisplayName] = React.useState('');
  const [role, setRole] = React.useState<UserRole | ''>('');
  const [experienceMonths, setExperienceMonths] = React.useState<string>('');
  const [primaryGoal, setPrimaryGoal] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const canContinue =
    displayName.trim().length > 0 &&
    role.length > 0 &&
    experienceMonths.length > 0 &&
    Number(experienceMonths) >= 0;

  const canSubmit = primaryGoal.trim().length > 0;

  async function onSubmit() {
    if (loading || !canSubmit || !role) return;
    setLoading(true);
    try {
      await completeOnboarding({
        display_name: displayName.trim(),
        role,
        experience_months: Number(experienceMonths),
        primary_goal: primaryGoal.trim(),
      });
      // completeOnboarding redirects on success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast({ title: 'Could not save', description: message, variant: 'destructive' });
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={step === 1 ? 'font-medium text-foreground' : ''}>1. About you</span>
          <span>·</span>
          <span className={step === 2 ? 'font-medium text-foreground' : ''}>2. Your goal</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">What should we call you?</Label>
              <Input
                id="display_name"
                placeholder="e.g. Alex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Your current role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SDR">SDR</SelectItem>
                  <SelectItem value="BDR">BDR</SelectItem>
                  <SelectItem value="AE">AE</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Months in a sales role</Label>
              <Input
                id="experience"
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                placeholder="0"
                value={experienceMonths}
                onChange={(e) => setExperienceMonths(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Roughly. If you're just starting, put 0.
              </p>
            </div>
            <Button className="w-full" disabled={!canContinue} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal">What do you most want to improve?</Label>
              <Textarea
                id="goal"
                rows={4}
                placeholder="e.g. My cold call openers — I lose people in the first 15 seconds."
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll suggest scenarios that target this.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button className="flex-1" onClick={onSubmit} disabled={!canSubmit || loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Start practicing
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
