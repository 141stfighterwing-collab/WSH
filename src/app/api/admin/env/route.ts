import { NextRequest, NextResponse } from 'next/server';

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

/**
 * POST /api/admin/env
 *
 * Updates process.env at runtime for the current server process.
 * Values are set in-memory only — they do NOT persist across server restarts.
 * For persistent changes, update the .env file or docker-compose.yml.
 *
 * Security: Only certain AI-related keys can be written at runtime.
 *          Sensitive keys (JWT_SECRET, ADMIN_DEFAULT_PASSWORD, DATABASE_URL)
 *          are blocked from runtime modification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body as { key?: string; value?: string };

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Missing "key" field' }, { status: 400 });
    }

    if (value === undefined || typeof value !== 'string') {
      return NextResponse.json({ error: 'Missing "value" field' }, { status: 400 });
    }

    // Block sensitive keys from runtime modification
    const BLOCKED_KEYS = [
      'JWT_SECRET',
      'ADMIN_DEFAULT_PASSWORD',
      'DATABASE_URL',
      'POSTGRES_PASSWORD',
      'POSTGRES_USER',
    ];

    if (BLOCKED_KEYS.includes(key.toUpperCase())) {
      return NextResponse.json(
        { error: `"${key}" cannot be changed at runtime. Update your .env file or docker-compose.yml and restart the server.` },
        { status: 403 },
      );
    }

    // Set the value in process.env for the current process
    process.env[key] = value;

    return NextResponse.json({
      success: true,
      key,
      message: `${key} updated (runtime only — does not persist across restarts)`,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
