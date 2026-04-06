import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, hashPassword } from '@/lib/auth';

// Helper: verify JWT from Authorization header
async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

// GET /api/admin/users — List all users (auth required)
export async function GET(request: NextRequest) {
  try {
    // BUG-004 fix: require authentication
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admin/super-admin can list users
    if (!['admin', 'super-admin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/users — Create user (admin only)
export async function POST(request: NextRequest) {
  try {
    // BUG-004 fix: require authentication
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!['admin', 'super-admin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, password, role } = body as {
      username: string;
      email: string;
      password?: string;
      role?: string;
    };

    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 },
      );
    }

    // BUG-009 fix: no mock fallback — return real error if DB fails
    if (password && password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const validRoles = ['user', 'admin', 'super-admin'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 },
      );
    }

    const hashedPassword = await hashPassword(password || 'changeme-default');

    const user = await db.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role || 'user',
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

    return NextResponse.json({ user, message: 'User created successfully' }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    // Distinguish unique constraint violations
    if (message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/admin/users — Update user (admin only)
export async function PATCH(request: NextRequest) {
  try {
    // BUG-004 fix: require authentication
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!['admin', 'super-admin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, password, role } = body as {
      userId: string;
      action: 'ban' | 'unban' | 'suspend' | 'unsuspend' | 'change-password' | 'change-role';
      password?: string;
      role?: string;
    };

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action are required' },
        { status: 400 },
      );
    }

    let updateData: Record<string, string> = {};
    let actionLabel = '';

    switch (action) {
      case 'ban':
        updateData = { status: 'banned' };
        actionLabel = 'banned';
        break;
      case 'unban':
        updateData = { status: 'active' };
        actionLabel = 'unbanned';
        break;
      case 'suspend':
        updateData = { status: 'suspended' };
        actionLabel = 'suspended for 24 hours';
        break;
      case 'unsuspend':
        updateData = { status: 'active' };
        actionLabel = 'unsuspended';
        break;
      case 'change-password':
        if (!password || password.length < 8) {
          return NextResponse.json(
            { error: 'Password must be at least 8 characters' },
            { status: 400 },
          );
        }
        // BUG-001 fix: hash new password
        updateData = { password: await hashPassword(password) };
        actionLabel = 'password changed';
        break;
      case 'change-role':
        if (!role || !['user', 'admin', 'super-admin'].includes(role)) {
          return NextResponse.json(
            { error: 'Invalid role. Must be user, admin, or super-admin' },
            { status: 400 },
          );
        }
        updateData = { role };
        actionLabel = `role changed to ${role}`;
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    // BUG-009 fix: no mock fallback — propagate real errors
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      user: updatedUser,
      message: `User ${updatedUser.username} ${actionLabel} successfully`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/users — Delete user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // BUG-004 fix: require authentication
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!['admin', 'super-admin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    // Prevent self-deletion
    if (userId === payload.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 },
      );
    }

    // BUG-009 fix: no mock fallback — propagate real errors
    await db.user.delete({ where: { id: userId } });
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
