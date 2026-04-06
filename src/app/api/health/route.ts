import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  let dbStatus = 'disconnected';
  let dbLatencyMs = -1;
  let dbDetail = '';

  try {
    // Test actual table access, not just connection
    const start = Date.now();
    const userCount = await prisma.user.count();
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
        await prisma.$queryRaw`SELECT 1`;
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
  } finally {
    await prisma.$disconnect();
  }

  return NextResponse.json({
    status: 'healthy',
    version: '3.6.1',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      detail: dbDetail,
    },
  });
}
