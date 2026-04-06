import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// GET /api/admin/db-test — Test database write + read
export async function GET() {
  const results: Record<string, string> = {};
  let success = true;

  // Test 1: Write a test record
  try {
    const testId = `db-test-${randomUUID().slice(0, 8)}`;
    const testNote = await db.note.create({
      data: {
        id: testId,
        title: `DB Test - ${new Date().toISOString()}`,
        content: 'WSH Database connectivity test record. Safe to delete.',
        rawContent: 'WSH Database connectivity test record.',
        type: 'quick',
        tags: '["db-test"]',
        color: 'yellow',
        folderId: null,
        userId: 'system-test',
        isDeleted: true, // Mark as deleted so it doesn't appear in UI
      },
    });
    results.write = `OK — created note id=${testNote.id}`;
  } catch (e: unknown) {
    success = false;
    results.write = `FAIL — ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`;
  }

  // Test 2: Read the test record
  try {
    const testNotes = await db.note.findMany({
      where: { title: { startsWith: 'DB Test -' } },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    results.read = `OK — found ${testNotes.length} test records`;
    results.latestId = testNotes[0]?.id || 'none';
  } catch (e: unknown) {
    success = false;
    results.read = `FAIL — ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`;
  }

  // Test 3: Cleanup — delete test records older than 1 minute
  try {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const deleted = await db.note.deleteMany({
      where: {
        title: { startsWith: 'DB Test -' },
        createdAt: { lt: oneMinuteAgo },
        isDeleted: true,
      },
    });
    results.cleanup = `OK — removed ${deleted.count} old test records`;
  } catch (e: unknown) {
    results.cleanup = `WARN — cleanup failed: ${(e instanceof Error ? e.message : String(e)).slice(0, 100)}`;
  }

  // Test 4: Count active users
  try {
    const userCount = await db.user.count();
    results.userCount = String(userCount);
  } catch (e: unknown) {
    results.userCount = `FAIL — ${(e instanceof Error ? e.message : String(e)).slice(0, 100)}`;
  }

  // Test 5: Count active notes
  try {
    const noteCount = await db.note.count({ where: { isDeleted: false } });
    results.noteCount = String(noteCount);
  } catch (e: unknown) {
    results.noteCount = `FAIL — ${(e instanceof Error ? e.message : String(e)).slice(0, 100)}`;
  }

  return NextResponse.json({
    status: success ? 'connected' : 'error',
    results,
    timestamp: new Date().toISOString(),
  });
}
