import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    AI_PROVIDER: process.env.AI_PROVIDER || '(auto-detect)',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not set',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'not set',
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'default',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'configured' : 'not set',
    AI_SYNTHESIS_MODEL: process.env.AI_SYNTHESIS_MODEL || '(provider default)',
    AI_SYNTHESIS_TEMPERATURE: process.env.AI_SYNTHESIS_TEMPERATURE || '0.7',
    AI_SYNTHESIS_MAX_TOKENS: process.env.AI_SYNTHESIS_MAX_TOKENS || '4096',
    AI_DAILY_LIMIT: process.env.AI_DAILY_LIMIT || '800',
    DOCKER_ENABLED: process.env.DOCKER_ENABLED || 'false',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not set',
  };

  return NextResponse.json({ env: envVars });
}
