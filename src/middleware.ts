import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware responsibilities:
 *  1. Refresh the Supabase session cookie on every request (required by @supabase/ssr).
 *  2. Redirect unauthenticated users away from app routes → /login.
 *  3. Redirect authenticated users away from /login → /dashboard.
 *  4. Redirect authed users without a completed profile → /onboarding.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Apply to request for any downstream handlers...
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          // ...and regenerate the response with updated cookies.
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: getUser() refreshes the session. Do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path === '/login';
  const isOnboarding = path === '/onboarding';
  const isPublic = isAuthRoute || path.startsWith('/_next') || path.startsWith('/api/auth');
  const isRoot = path === '/';

  // Not signed in, trying to hit an app route → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Signed in, on /login or / → /dashboard (middleware handles onboarding below)
  if (user && (isAuthRoute || isRoot)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Signed in but not onboarded → /onboarding (except on /onboarding itself)
  if (user && !isOnboarding && !isPublic) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && !profile.onboarded_at) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  // Signed in + onboarded but visiting /onboarding → /dashboard
  if (user && isOnboarding) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.onboarded_at) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match every request path except:
     *  - /_next/static, /_next/image (Next internals)
     *  - /favicon.ico and common asset extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
