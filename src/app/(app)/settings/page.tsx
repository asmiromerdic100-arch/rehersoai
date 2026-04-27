import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role, experience_months')
    .eq('id', user.id)
    .single();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Your account.</p>
      </header>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 grid grid-cols-[120px_1fr] gap-y-3 text-sm">
          <div className="text-muted-foreground">Email</div>
          <div className="font-medium">{user.email}</div>
          <div className="text-muted-foreground">Role</div>
          <div className="font-medium">{profile?.role ?? '—'}</div>
          <div className="text-muted-foreground">Experience</div>
          <div className="font-medium">
            {profile?.experience_months !== null && profile?.experience_months !== undefined
              ? `${profile.experience_months} months`
              : '—'}
          </div>
        </div>

        <SettingsForm initialDisplayName={profile?.display_name ?? ''} />
      </div>
    </div>
  );
}
