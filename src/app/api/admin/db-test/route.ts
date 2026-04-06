import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/admin/db-test — Test database write + read using safe operations
export async function POST() {
  const results: Record<string, string> = {};
  let success = true;

  // Test 1: Write — use email (unique field) for upsert
  try {
    const testEmail = '_db_health_check_admin@wsh.local';
    const testUser = await db.user.upsert({
      where: { email: testEmail },
      update: { username: '_db_health_check' },
      create: {
        email: testEmail,
        username: '_db_health_check',
        password: 'health-check-only-do-not-use',
        role: 'user',
      },
    });
    results.write = `OK — upserted user id=${testUser.id}`;
  } catch (e: unknown) {
    success = false;
    const msg = e instanceof Error ? e.message : String(e);
    results.write = `FAIL — ${msg.slice(0, 200)}`;
  }

  // Test 2: Read — find the test user
  try {
    const readUser = await db.user.findUnique({
      where: { email: '_db_health_check_admin@wsh.local' },
    });
    if (readUser) {
      results.read = `OK — found user id=${readUser.id}`;
    } else {
      results.read = 'FAIL — user not found';
      success = false;
    }
  } catch (e: unknown) {
    success = false;
    results.read = `FAIL — ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`;
  }

  // Test 3: Count users
  try {
    const userCount = await db.user.count();
    results.userCount = `OK — ${userCount} user(s) in database`;
  } catch (e: unknown) {
    success = false;
    results.userCount = `FAIL — ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`;
  }

  // Test 4: Count notes
  try {
    const noteCount = await db.note.count({ where: { isDeleted: false } });
    results.noteCount = `OK — ${noteCount} active note(s)`;
  } catch (e: unknown) {
    success = false;
    results.noteCount = `FAIL — ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`;
  }

  const errorDetail = results.write?.includes('FAIL') ? results.write : '';
  const tableHint = errorDetail.includes('relation') || errorDetail.includes('table')
    ? ' Tables may not exist — run: npx prisma db push'
    : '';

  return NextResponse.json({
    status: success ? 'ok' : 'error',
    results: {
      ...results,
      overall: success
        ? 'PASS — Database read/write is working correctly'
        : `FAIL — Database issue.${tableHint}`,
    },
    timestamp: new Date().toISOString(),
  });
}

// Keep GET for backward compatibility
export async function GET() {
  return POST();
}
