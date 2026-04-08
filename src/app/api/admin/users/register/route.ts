import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, checkRateLimit, getRateLimitInfo } from '@/lib/auth';

// POST /api/admin/users/register — Register a new user
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (BUG-005 fix): 3 registrations per minute per IP
    const clientIP =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `register:${clientIP}`;

    if (!checkRateLimit(rateLimitKey, 3, 60 * 1000)) {
      const info = getRateLimitInfo(rateLimitKey, 3, 60 * 1000);
      return NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again later.',
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
    const { username, password, email } = body as {
      username: string;
      password: string;
      email?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 },
      );
    }

    if (username.length < 2) {
      return NextResponse.json(
        { error: 'Username must be at least 2 characters' },
        { status: 400 },
      );
    }

    // BUG-007 fix: increase minimum password to 8 characters
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    // Password complexity check
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const complexityCount = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

    if (complexityCount < 2) {
      return NextResponse.json(
        {
          error:
            'Password must include at least 2 of: uppercase letter, lowercase letter, number, special character',
        },
        { status: 400 },
      );
    }

    // Email validation (BUG-003.4 fix)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      );
    }

    const userEmail = email || `${username}@example.com`;

    try {
      // Check if username already exists
      const existing = await db.user.findUnique({
        where: { username },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 },
        );
      }

      // Check if email already exists
      const existingEmail = await db.user.findUnique({
        where: { email: userEmail },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 },
        );
      }

      // BUG-001 fix: hash password before storing
      const hashedPassword = await hashPassword(password);

      const user = await db.user.create({
        data: {
          username,
          password: hashedPassword,
          email: userEmail,
          role: 'user',
          status: 'active',
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      const info = getRateLimitInfo(rateLimitKey, 3, 60 * 1000);
      return NextResponse.json(
        { user, message: 'Registration successful' },
        {
          status: 201,
          headers: {
            'X-RateLimit-Remaining': String(info.remaining),
          },
        },
      );
    } catch {
      return NextResponse.json(
        { error: 'Registration failed — database may be unavailable' },
        { status: 503 },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
