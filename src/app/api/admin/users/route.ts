import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const mockUsers = [
  {
    id: 'usr-admin-001',
    username: 'admin',
    email: 'admin@wsh.local',
    role: 'admin',
    status: 'active',
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'usr-superadmin-001',
    username: 'superadmin',
    email: 'super@wsh.local',
    role: 'super-admin',
    status: 'active',
    createdAt: new Date('2024-01-10').toISOString(),
  },
  {
    id: 'usr-demo-001',
    username: 'demo',
    email: 'demo@wsh.local',
    role: 'user',
    status: 'active',
    createdAt: new Date('2024-03-01').toISOString(),
  },
];

export async function GET() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const allUsers = users.length > 0 ? users : mockUsers;
    return NextResponse.json({ users: allUsers });
  } catch {
    return NextResponse.json({ users: mockUsers });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, role } = body as { username: string; email: string; password?: string; role?: string };

    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    try {
      const user = await db.user.create({
        data: {
          username,
          email,
          password: password || 'changeme',
          role: role || 'user',
          status: 'active',
        },
      });

      return NextResponse.json({ user, message: 'User created successfully' });
    } catch {
      return NextResponse.json(
        {
          user: {
            id: `usr-${Date.now()}`,
            username,
            email,
            role: role || 'user',
            status: 'active',
            createdAt: new Date().toISOString(),
          },
          message: 'User created successfully (mock)',
        },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
