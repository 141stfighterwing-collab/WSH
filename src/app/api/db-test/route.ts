import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/db-test — Test database write + read using safe operations
// Uses the singleton db client from @/lib/db to avoid connection pool exhaustion
// that occurs when creating new PrismaClient() per request.
export async function POST() {
  const results: Record<string, string> = {};

  try {
    // Test 1: Write — use email (which IS @unique) for upsert
    const testEmail = '_db_health_check@wsh.local';
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

    // Test 2: Read — query the record back
    const readUser = await db.user.findUnique({
      where: { email: testEmail },
    });

    if (readUser) {
      results.read = `OK — found user id=${readUser.id}, username=${readUser.username}`;
    } else {
      results.read = 'FAIL — could not read back the record';
    }

    // Test 3: Count — ensure table is accessible
    const userCount = await db.user.count();
    results.count = `OK — ${userCount} user(s) in database`;

    // Test 4: Note count — verify notes table
    try {
      const noteCount = await db.note.count({ where: { isDeleted: false } });
      results.noteCount = `OK — ${noteCount} active note(s)`;
    } catch {
      results.noteCount = 'SKIP — notes table not accessible';
    }

    results.overall = 'PASS — Database read/write is working correctly';
    results.timestamp = new Date().toISOString();

    return NextResponse.json({ status: 'ok', results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: 'error',
      results: {
        write: `FAIL — ${message}`,
        read: 'SKIP — write failed',
        count: 'SKIP — write failed',
        overall: `FAIL — ${message.includes('relation') || message.includes('table') ? 'Database tables not created. Run: npx prisma db push' : 'Database connectivity issue'}`,
        timestamp: new Date().toISOString(),
      },
    });
  }
  // NOTE: No prisma.$disconnect() — the db singleton persists for the app lifetime
}

// Keep GET for backward compatibility
export async function GET() {
  return POST();
}
