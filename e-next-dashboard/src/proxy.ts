import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Skip proxy for static files and public assets
  if (
    path.startsWith('/_next') ||  // Next.js static files
    path.startsWith('/static') || // Static files
    path.match(/\.(svg|jpg|jpeg|png|gif|ico|css|js)$/) || // Image and other static files
    path.startsWith('/api') ||    // API routes
    path.includes('favicon.ico')  // Favicon
  ) {
    return NextResponse.next();
  }

  // Get all auth-related cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const userType = request.cookies.get('userType')?.value;
  const profileId = request.cookies.get('profileId')?.value;

  const isAuthenticated = accessToken && refreshToken && userType && profileId;
  const isAuthPath = path === '/auth/login' || path.startsWith('/auth/');

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (isAuthenticated && isAuthPath) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    return response;
  }

  // If accessing protected routes and not authenticated, redirect to login
  if (!isAuthenticated && !isAuthPath) {
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    return response;
  }

  return NextResponse.next();
}

// Configure which paths proxy will run on
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. api (API routes)
     * 2. _next/static (static files)
     * 3. _next/image (image optimization files)
     * 4. favicon.ico (favicon file)
     */
    '/((?!api|media-proxy|_next/static|_next/image|favicon.ico).*)',
  ],
}; 