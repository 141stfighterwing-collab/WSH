import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    version: '3.5.3',
    timestamp: new Date().toISOString(),
  });
}
