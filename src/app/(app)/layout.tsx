import { redirect } from 'next/navigation';

import { Sidebar } from '@/components/nav/sidebar';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar
        user={{
          email: user.email ?? '',
          displayName: profile?.display_name ?? null,
          role: profile?.role ?? null,
        }}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-12">{children}</div>
      </main>
    </div>
  );
}
