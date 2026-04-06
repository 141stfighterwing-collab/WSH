import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/admin/users/register — Register a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, email } = body as {
      username: string;
      password: string;
      email?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username.length < 2) {
      return NextResponse.json(
        { error: 'Username must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    const userEmail = email || `${username}@wsh.local`;

    try {
      // Check if username already exists
      const existing = await db.user.findUnique({
        where: { username },
      }).catch(() => null);

      if (existing) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }

      const user = await db.user.create({
        data: {
          username,
          password,
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

      return NextResponse.json({
        user,
        message: 'Registration successful',
      });
    } catch {
      return NextResponse.json(
        { error: 'Registration failed — database may be unavailable' },
        { status: 503 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
