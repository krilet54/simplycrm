// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Always allow root path through - it's the public landing page
  if (pathname === '/') {
    return NextResponse.next();
  }
  
  // Skip auth check for public paths, marketing pages, and API routes (APIs handle auth themselves)
  const publicPaths = ['/login', '/auth/callback', '/auth/join-workspace', '/join/', '/api/', '/terms', '/privacy'];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  
  // Fast path: skip middleware entirely for public routes
  if (isPublic) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Redirect unauthenticated users to login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect authenticated users away from login
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (error) {
    // If auth check fails, allow the request through to the page (page will handle it)
    console.error('Middleware auth check failed:', error);
  }

  return response;
}

export const config = {
  matcher: [
    // Only run on actual pages - exclude all static files and assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|txt|xml|css|js|woff|woff2|ttf|eot|ico)$).*)',
  ],
};
