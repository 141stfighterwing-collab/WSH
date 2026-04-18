import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { addLog } from '@/lib/logger';

/** Guard: only admin/super-admin can access admin routes */
function requireAdmin(request: NextRequest): NextResponse | null {
  const role = request.headers.get('x-user-role');
  if (role !== 'admin' && role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }
  return null;
}

/** Path to the persistent .env file (shared via Docker volume at /app/tmp/env) */
const ENV_FILE = process.env.WSH_ENV_PATH || '/app/tmp/env/runtime.env';

/** Allowed keys that can be written at runtime */
const ALLOWED_PREFIXES = [
  'AI_', 'ANTHROPIC_', 'OPENAI_', 'GEMINI_', 'LOG_LEVEL', 'MAX_UPLOAD_SIZE',
  'NEXT_PUBLIC_', 'STORAGE_TYPE', 'BACKUP_INTERVAL',
];

/** Blocked keys — never writable even if prefix matches */
const BLOCKED_KEYS = [
  'JWT_SECRET',
  'ADMIN_DEFAULT_PASSWORD',
  'ADMIN_DEFAULT_USERNAME',
  'ADMIN_DEFAULT_EMAIL',
  'DATABASE_URL',
  'POSTGRES_PASSWORD',
  'POSTGRES_USER',
  'POSTGRES_DB',
  'DOCKER_ENABLED',
  'NODE_ENV',
  'PORT',
  'HOSTNAME',
];

function isKeyAllowed(key: string): boolean {
  const upper = key.toUpperCase();
  if (BLOCKED_KEYS.includes(upper)) return false;
  return ALLOWED_PREFIXES.some((p) => upper.startsWith(p));
}

/**
 * Read the .env file from disk and return it as a Record<string, string>.
 * Returns empty object if file doesn't exist.
 */
function readEnvFile(): Record<string, string> {
  try {
    if (!existsSync(ENV_FILE)) return {};
    const content = readFileSync(ENV_FILE, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

/**
 * Write a key-value pair to the .env file on disk.
 * Updates existing key or appends a new line.
 * Returns true on success, false on failure.
 */
function writeEnvFile(env: Record<string, string>): boolean {
  try {
    const dir = ENV_FILE.substring(0, ENV_FILE.lastIndexOf('/'));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const lines: string[] = ['# WSH Runtime Environment Variables', '# Modified via Admin > ENV Settings or Settings > AI Engine', ''];
    for (const [k, v] of Object.entries(env)) {
      // Quote values that contain spaces or special chars
      const needsQuoting = /[\s"'`#$]/.test(v);
      lines.push(`${k}=${needsQuoting ? `"${v.replace(/"/g, '\\"')}"` : v}`);
    }
    lines.push('');
    writeFileSync(ENV_FILE, lines.join('\n'), 'utf-8');
    return true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[env] Failed to write ${ENV_FILE}:`, errMsg);
    addLog('error', `Failed to write ENV file ${ENV_FILE}: ${errMsg}`, 'env');
    return false;
  }
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
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
 * Updates process.env at runtime AND persists to a .env file on disk.
 * The .env file is mounted as a Docker volume so it survives container restarts.
 *
 * Security: Only AI-related and non-sensitive keys can be written.
 *          Sensitive keys (JWT_SECRET, ADMIN_DEFAULT_PASSWORD, DATABASE_URL)
 *          are blocked from modification entirely.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const { key, value } = body as { key?: string; value?: string };

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Missing "key" field' }, { status: 400 });
    }

    if (value === undefined || typeof value !== 'string') {
      return NextResponse.json({ error: 'Missing "value" field' }, { status: 400 });
    }

    if (!isKeyAllowed(key)) {
      return NextResponse.json(
        { error: `"${key}" is not allowed to be changed at runtime. Update your .env file or docker-compose.yml and restart.` },
        { status: 403 },
      );
    }

    // 1. Set in process.env for immediate use
    process.env[key] = value;

    // 2. Persist to .env file on disk
    const fileEnv = readEnvFile();
    fileEnv[key] = value;
    const diskOk = writeEnvFile(fileEnv);

    // 3. Log the action
    const isApiKey = key.includes('API_KEY') || key.includes('SECRET');
    const displayKey = isApiKey ? `${key}=****${value.slice(-4)}` : `${key}=${value}`;
    const username = request.headers.get('x-user-username') || 'admin';

    if (diskOk) {
      addLog('info', `ENV saved by ${username}: ${displayKey} (persisted to disk)`, 'env');
    } else {
      addLog('warn', `ENV saved by ${username}: ${displayKey} (IN MEMORY ONLY — disk write FAILED)`, 'env');
    }

    return NextResponse.json({
      success: true,
      key,
      persisted: diskOk,
      message: diskOk
        ? `${key} saved — active immediately and persisted to disk`
        : `${key} saved in memory but FAILED to persist to disk. Check Docker volume permissions.`,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
