import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Handles the email verification callback from Supabase.
 *
 * Supabase appends `?code=<auth_code>` to the redirect URL when the user
 * clicks the verification link in their email. We exchange that code for
 * a session, which signs them in. Then we route them to onboarding so
 * they can set up their profile before practicing.
 *
 * If something goes wrong, we send them back to /login with an error.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorDescription = searchParams.get('error_description');

  // Supabase puts errors directly in the URL (e.g. expired link)
  if (errorDescription) {
    const params = new URLSearchParams({ error: errorDescription });
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  if (!code) {
    const params = new URLSearchParams({
      error: 'Missing verification code. The link may be malformed.',
    });
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const params = new URLSearchParams({
      error: error.message || 'Could not verify your email. Try again or request a new link.',
    });
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  // Verification succeeded — send them to onboarding.
  // The middleware will route them onward to /dashboard if they've already
  // completed onboarding (e.g. if they verified twice).
  return NextResponse.redirect(`${origin}/onboarding`);
}
