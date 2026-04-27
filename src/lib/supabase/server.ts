import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from './types';

/**
 * Server-side Supabase client. Reads the user's auth session from cookies
 * so Server Components and Server Actions get the signed-in user's context,
 * and RLS policies enforce permissions automatically.
 *
 * Must be called fresh per request — do not memoize.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `set` can fail in Server Components where cookies are read-only.
            // Middleware handles session refresh; this is safe to swallow.
          }
        },
      },
    },
  );
}
