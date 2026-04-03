import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    AI_SYNTHESIS_MODEL: process.env.AI_SYNTHESIS_MODEL || 'glm-4-flash',
    AI_SYNTHESIS_TEMPERATURE: process.env.AI_SYNTHESIS_TEMPERATURE || '0.7',
    AI_SYNTHESIS_MAX_TOKENS: process.env.AI_SYNTHESIS_MAX_TOKENS || '4096',
    AI_DAILY_LIMIT: process.env.AI_DAILY_LIMIT || '800',
    DOCKER_ENABLED: process.env.DOCKER_ENABLED || 'false',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not set',
  };

  return NextResponse.json({ env: envVars });
}
