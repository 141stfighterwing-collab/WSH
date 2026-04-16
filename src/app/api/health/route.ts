import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/health — Database connectivity health check
// Uses the singleton db client from @/lib/db to avoid creating
// new PrismaClient instances per poll (which exhausts connection pools).
export async function GET() {
  let dbStatus = 'disconnected';
  let dbLatencyMs = -1;
  let dbDetail = '';

  try {
    // Test actual table access, not just connection
    const start = Date.now();
    const userCount = await db.user.count();
    dbLatencyMs = Date.now() - start;
    dbStatus = 'connected';
    dbDetail = `${userCount} users`;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // If table doesn't exist, still mark as "connected" but note the issue
    if (message.includes('relation') || message.includes('table') || message.includes('does not exist')) {
      try {
        // Fallback: just ping the connection
        const start = Date.now();
        await db.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - start;
        dbStatus = 'connected_no_tables';
        dbDetail = 'connected but tables missing';
      } catch {
        dbStatus = 'error';
        dbDetail = message.slice(0, 100);
      }
    } else {
      dbStatus = 'error';
      dbDetail = message.slice(0, 100);
    }
  }
  // NOTE: No db.$disconnect() — the singleton persists for the app lifetime

  return NextResponse.json({
    status: 'healthy',
    version: '4.3.2',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      detail: dbDetail,
    },
  });
}
