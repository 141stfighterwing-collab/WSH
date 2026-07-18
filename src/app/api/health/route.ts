import { NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';
import { db } from '@/lib/db';

// Version from BUILD_VERSION env (set by Dockerfile at build time),
// fallback to the current release string.
function getVersion(): string {
  return process.env.BUILD_VERSION || '4.4.18';
}

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
        addLog('error', `Health check: DB fallback ping failed: ${message.slice(0, 100)}`, 'database');
      }
    } else {
      dbStatus = 'error';
      dbDetail = message.slice(0, 100);
      addLog('error', `Health check: DB error: ${message.slice(0, 200)}`, 'database');
    }
  }
  // NOTE: No db.$disconnect() — the singleton persists for the app lifetime

  const jwtSecret = process.env.JWT_SECRET;
  const authConfigured = Boolean(
    jwtSecret && jwtSecret !== 'change-me-in-production',
  );
  const databaseReady =
    dbStatus === 'connected' || dbStatus === 'connected_no_tables';
  const healthy = authConfigured && databaseReady;

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      version: getVersion(),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        detail: dbDetail,
      },
      authentication: {
        status: authConfigured ? 'configured' : 'misconfigured',
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
