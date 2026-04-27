'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const OnboardingSchema = z.object({
  display_name: z.string().trim().min(1, 'Required').max(80),
  role: z.enum(['SDR', 'BDR', 'AE', 'other']),
  experience_months: z
    .number()
    .int()
    .min(0, 'Must be 0 or more')
    .max(600, 'Please enter a reasonable number'),
  primary_goal: z.string().trim().min(1, 'Required').max(500),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

export async function completeOnboarding(input: OnboardingInput): Promise<void> {
  const parsed = OnboardingSchema.parse(input);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.display_name,
      role: parsed.role,
      experience_months: parsed.experience_months,
      primary_goal: parsed.primary_goal,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

const ProfileUpdateSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
});

export async function updateDisplayName(input: z.infer<typeof ProfileUpdateSchema>): Promise<void> {
  const parsed = ProfileUpdateSchema.parse(input);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.display_name })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/settings');
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
