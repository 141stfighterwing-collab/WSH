import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/admin/users/login — Authenticate user by username + password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
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
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      // Check if user is banned or suspended
      if (user.status === 'banned') {
        return NextResponse.json(
          { error: 'Account has been banned. Contact an administrator.' },
          { status: 403 }
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
            { status: 403 }
          );
        }
        // Suspension expired — auto-unsuspend
        await db.user.update({
          where: { id: user.id },
          data: { status: 'active' },
        });
      }

      // Simple password comparison (plain text for now — production should use bcrypt)
      if (user.password !== password) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      // Return user data (without password)
      const { password: _pw, ...safeUser } = user;
      return NextResponse.json({
        user: safeUser,
        message: 'Login successful',
      });
    } catch {
      // DB not available — allow fallback local auth
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
