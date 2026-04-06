import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  let dbStatus = 'disconnected';
  let dbLatencyMs = -1;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  } finally {
    await prisma.$disconnect();
  }

  return NextResponse.json({
    status: 'healthy',
    version: '3.6.0',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
  });
}
