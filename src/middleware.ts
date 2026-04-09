import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * BUG-004 fix: Server-side authentication middleware.
 *
 * Protected routes (all /api/admin/* except login/register):
 *   - Require a valid JWT in the Authorization: Bearer <token> header
 *   - Return 401 if missing or invalid
 *
 * Public routes (no auth required):
 *   - /api/health
 *   - /api/db-test
 *   - /api/admin/users/login
 *   - /api/admin/users/register
 *   - /api/graph (public read)
 *   - /api/synthesis (has its own auth check)
 */

const PUBLIC_PATHS = [
  '/api/health',
  '/api/db-test',
  '/api/admin/users/login',
  '/api/admin/users/register',
  '/api/admin/users/verify',
  '/api/graph',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes and non-API routes
  if (!pathname.startsWith('/api/') || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/api/') &&
    (pathname.includes('/_next') || pathname.includes('/favicon') || pathname.includes('/static'))
  ) {
    return NextResponse.next();
  }

  // Protect all other API routes
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required. Provide a valid JWT token.' },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token. Please log in again.' },
      { status: 401 },
    );
  }

  // Attach user info to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-username', payload.username);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};
