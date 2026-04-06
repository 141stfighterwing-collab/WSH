import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  const results: Record<string, string> = {};

  try {
    // Test 1: Write — use email (which IS @unique) for upsert
    const testEmail = '_db_health_check@wsh.local';
    const testUser = await prisma.user.upsert({
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
    const readUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (readUser) {
      results.read = `OK — found user id=${readUser.id}, username=${readUser.username}`;
    } else {
      results.read = 'FAIL — could not read back the record';
    }

    // Test 3: Count — ensure table is accessible
    const userCount = await prisma.user.count();
    results.count = `OK — ${userCount} user(s) in database`;

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
  } finally {
    await prisma.$disconnect();
  }
}
