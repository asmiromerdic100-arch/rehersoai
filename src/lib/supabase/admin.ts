import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './types';

/**
 * Admin client using the service role key. Bypasses RLS.
 * Use ONLY in server code for trusted operations:
 *   - writing feedback rows after AI evaluation
 *   - seeding
 *   - admin/internal scripts
 *
 * Never import this from a Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
