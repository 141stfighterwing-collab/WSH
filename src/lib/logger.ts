/**
 * WSH Global Logger v1.0
 *
 * Intercepts console.log, console.warn, console.error at the server level
 * and pipes everything into the admin logs system. This ensures ALL errors
 * (including unhandled ones from API providers like Gemini quota errors)
 * appear in the Admin > Logs panel.
 *
 * Usage:
 *   import { addLog } from '@/lib/logger';
 *   addLog('error', 'something broke', 'database');
 *
 * The console intercept is activated by instrumentation.ts at server boot.
 */

/* eslint-disable no-console */

// Store original console methods before we override them
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

// Log entry interface
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

// In-memory log store (ring buffer)
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
    // stack parsing failed
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
      // After 3 repeats, start showing "repeated N times" every 10th occurrence
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

/** Activate console interceptors — call once at server startup */
export function interceptConsole(): void {
  // Intercept console.error → 'error' log
  console.error = (...args: unknown[]) => {
    originalConsole.error(...args);
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (message && shouldLog(message)) {
      addLog('error', message, detectSource());
    }
  };

  // Intercept console.warn → 'warn' log
  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args);
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (message && shouldLog(message)) {
      addLog('warn', message, detectSource());
    }
  };

  // Intercept console.log → 'info' log (only for server-side)
  console.log = (...args: unknown[]) => {
    originalConsole.log(...args);
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (message && shouldLog(message)) {
      addLog('info', message, detectSource());
    }
  };

  addLog('info', 'Console interceptor active — all console.log/warn/error now piped to admin logs', 'system');
}
