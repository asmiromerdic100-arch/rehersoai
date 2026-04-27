import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg animate-fade-in">{children}</div>
    </div>
  );
}
