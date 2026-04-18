import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';
import { db } from '@/lib/db';
import {
  comparePassword,
  signToken,
  checkRateLimit,
  getRateLimitInfo,
} from '@/lib/auth';

// POST /api/admin/users/login — Authenticate user by username + password
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (BUG-006 fix): 10 login attempts per minute per IP
    const clientIP =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `login:${clientIP}`;

    if (!checkRateLimit(rateLimitKey, 10, 60 * 1000)) {
      const info = getRateLimitInfo(rateLimitKey, 10, 60 * 1000);
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((info.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(info.resetAt).toISOString(),
          },
        },
      );
    }

    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 },
      );
    }

    try {
      const user = await db.user.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          password: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 },
        );
      }

      // Check if user is banned or suspended
      if (user.status === 'banned') {
        return NextResponse.json(
          { error: 'Account has been banned. Contact an administrator.' },
          { status: 403 },
        );
      }

      if (user.status === 'suspended') {
        // Check if suspension has expired (24 hours from updatedAt)
        const suspendedAt = new Date(user.updatedAt || user.createdAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - suspendedAt.getTime()) / (1000 * 60 * 60);
        if (hoursDiff < 24) {
          const remainingHours = Math.ceil(24 - hoursDiff);
          return NextResponse.json(
            { error: `Account is suspended. ${remainingHours} hour(s) remaining.` },
            { status: 403 },
          );
        }
        // Suspension expired — auto-unsuspend
        await db.user.update({
          where: { id: user.id },
          data: { status: 'active' },
        });
      }

      // BUG-001 fix: use bcrypt comparison instead of plaintext
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 },
        );
      }

      // BUG-002 fix: issue JWT token with user identity and role
      const { password: _pw, ...safeUser } = user;
      const token = await signToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      const info = getRateLimitInfo(rateLimitKey, 10, 60 * 1000);
      return NextResponse.json(
        {
          user: safeUser,
          token,
          message: 'Login successful',
        },
        {
          headers: {
            'X-RateLimit-Remaining': String(info.remaining),
          },
        },
      );
    } catch {
      addLog('error', 'Login failed — database unavailable', 'auth');
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    addLog('error', `Login error: ${message}`, 'auth');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
