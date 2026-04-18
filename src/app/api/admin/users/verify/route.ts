import { NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/admin/users/verify — Verify an existing JWT token is still valid
// Returns the user info if valid, 401 if expired/invalid
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body as { token?: string };

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 },
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Token expired or invalid' },
        { status: 401 },
      );
    }

    // Look up the user in the database to ensure they still exist and are active
    try {
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 },
        );
      }

      if (user.status === 'banned') {
        return NextResponse.json(
          { error: 'Account has been banned' },
          { status: 403 },
        );
      }

      return NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        valid: true,
      });
    } catch {
      addLog('warn', 'Token verify: DB unavailable, trusting JWT payload', 'auth');
      // If DB is unavailable, trust the JWT payload (it's still signed)
      return NextResponse.json({
        user: {
          id: payload.userId,
          username: payload.username,
          email: '',
          role: payload.role,
          status: 'active',
        },
        valid: true,
      });
    }
  } catch {
    addLog('warn', 'Token verify: invalid request', 'auth');
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 },
    );
  }
}
