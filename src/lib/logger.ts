/**
 * WSH Global Logger v1.1
 *
 * Self-initializing: intercepts console.log/warn/error the first time
 * this module is imported on the server side. No instrumentation.ts needed.
 *
 * Safe for Edge Runtime: the interceptor only activates when
 * typeof window === 'undefined' (server-side Node.js context).
 *
 * Usage:
 *   import { addLog } from '@/lib/logger';
 *   addLog('error', 'something broke', 'database');
 */

/* eslint-disable no-console */

// ── Log Store ────────────────────────────────────────────────────────────

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

const MAX_LOGS = 500;
let systemLogs: LogEntry[] = [];

/** Add a log entry to the system log buffer */
export function addLog(level: 'info' | 'warn' | 'error', message: string, source?: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: typeof message === 'string' ? message : String(message),
    source: source || 'system',
  };
  systemLogs.push(entry);
  if (systemLogs.length > MAX_LOGS) {
    systemLogs = systemLogs.slice(-MAX_LOGS);
  }
}

/** Get all logs (for the GET endpoint) */
export function getLogs(): LogEntry[] {
  return systemLogs;
}

/** Clear all logs (for the DELETE endpoint) */
export function clearLogs(): void {
  systemLogs = [];
}

// ── Console Interceptor ─────────────────────────────────────────────────

// Store original console methods before any override
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

/**
 * Smart source detection from call stack.
 * Parses the file path to determine the log source category.
 */
function detectSource(): string {
  try {
    const stack = new Error().stack;
    if (!stack) return 'system';
    const lines = stack.split('\n').slice(1, 6);
    for (const line of lines) {
      if (line.includes('/api/synthesis/')) return 'ai-engine';
      if (line.includes('/api/admin/env/')) return 'env';
      if (line.includes('/api/admin/users/login/')) return 'auth';
      if (line.includes('/api/admin/users/register/')) return 'auth';
      if (line.includes('/api/admin/users/verify/')) return 'auth';
      if (line.includes('/api/admin/users/')) return 'auth';
      if (line.includes('/api/notes/')) return 'notes';
      if (line.includes('/api/folders/')) return 'notes';
      if (line.includes('/api/documents/')) return 'documents';
      if (line.includes('/api/graph/')) return 'notes';
      if (line.includes('/api/health/')) return 'system';
      if (line.includes('/api/admin/system/')) return 'system';
      if (line.includes('/api/admin/logs/')) return 'system';
      if (line.includes('/prisma') || line.includes('/database')) return 'database';
      if (line.includes('/node_modules/')) continue;
    }
  } catch {
    // stack parsing not available (Edge Runtime)
  }
  return 'system';
}

/** Rate limiter to avoid flooding logs with repeated identical messages */
const seenMessages = new Map<string, number>();
const DEDUP_WINDOW_MS = 5000;
const DEDUP_MAX_REPEATS = 3;

function shouldLog(message: string): boolean {
  const key = message.slice(0, 200);
  const now = Date.now();
  const lastSeen = seenMessages.get(key);
  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
    const count = seenMessages.get(key + ':count') || 1;
    if (count >= DEDUP_MAX_REPEATS) {
      const total = seenMessages.get(key + ':total') || DEDUP_MAX_REPEATS;
      if ((total - DEDUP_MAX_REPEATS) % 10 !== 0) {
        seenMessages.set(key + ':total', total + 1);
        return false;
      }
      seenMessages.set(key + ':total', total + 1);
      return true;
    }
    seenMessages.set(key + ':count', count + 1);
    seenMessages.set(key + ':total', (seenMessages.get(key + ':total') || count) + 1);
    return true;
  }
  seenMessages.set(key, now);
  seenMessages.set(key + ':count', 1);
  seenMessages.set(key + ':total', 1);
  return true;
}

// ── Self-initialize on first import (server-side only) ───────────────────

let _initialized = false;

function initInterceptor(): void {
  if (_initialized) return;
  _initialized = true;

  // Only intercept in Node.js server context (not Edge Runtime, not browser)
  if (typeof window !== 'undefined') return;
  // Guard: if process or process.on doesn't exist (Edge Runtime), skip
  if (typeof process === 'undefined' || typeof process.on !== 'function') return;

  // Override console.error
  console.error = (...args: unknown[]) => {
    originalConsole.error(...args);
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (message && shouldLog(message)) {
      addLog('error', message, detectSource());
    }
  };

  // Override console.warn
  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args);
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (message && shouldLog(message)) {
      addLog('warn', message, detectSource());
    }
  };

  // Override console.log
  console.log = (...args: unknown[]) => {
    originalConsole.log(...args);
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (message && shouldLog(message)) {
      addLog('info', message, detectSource());
    }
  };

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    addLog('error', `Unhandled rejection: ${message}`, 'system');
  });

  addLog('info', 'Console interceptor active — all console.log/warn/error piped to admin logs', 'system');
}

// Auto-init immediately when this module is imported
initInterceptor();
