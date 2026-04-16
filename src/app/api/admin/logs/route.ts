import { NextRequest, NextResponse } from 'next/server';

const MAX_LOGS = 500;

/** Guard: only admin/super-admin can access admin routes */
function requireAdmin(request: NextRequest): NextResponse | null {
  const role = request.headers.get('x-user-role');
  if (role !== 'admin' && role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }
  return null;
}


interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source?: string;
}

let systemLogs: LogEntry[] = [
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    level: 'info',
    message: 'WSH application started successfully',
    source: 'system',
  },
  {
    timestamp: new Date(Date.now() - 3500000).toISOString(),
    level: 'info',
    message: 'Database connection established',
    source: 'database',
  },
  {
    timestamp: new Date(Date.now() - 3400000).toISOString(),
    level: 'info',
    message: 'AI synthesis engine initialized',
    source: 'ai-engine',
  },
  {
    timestamp: new Date(Date.now() - 3000000).toISOString(),
    level: 'warn',
    message: 'Rate limit approaching threshold (75%)',
    source: 'rate-limiter',
  },
  {
    timestamp: new Date(Date.now() - 2000000).toISOString(),
    level: 'info',
    message: 'User session cleaned up (5 expired sessions)',
    source: 'auth',
  },
  {
    timestamp: new Date(Date.now() - 1000000).toISOString(),
    level: 'error',
    message: 'Failed to sync note changes to backup (retry scheduled)',
    source: 'sync',
  },
];

export function addLog(level: 'info' | 'warn' | 'error', message: string, source?: string) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    source: source || 'system',
  };
  systemLogs.push(entry);
  if (systemLogs.length > MAX_LOGS) {
    systemLogs = systemLogs.slice(-MAX_LOGS);
  }
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const source = searchParams.get('source');

  let filtered = [...systemLogs];

  if (level && level !== 'all') {
    filtered = filtered.filter((log) => log.level === level);
  }

  if (source) {
    filtered = filtered.filter((log) => log.source === source);
  }

  const logs = filtered.slice(-limit);

  return NextResponse.json({
    logs,
    total: systemLogs.length,
    filteredCount: logs.length,
  });
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  systemLogs = [];
  return NextResponse.json({ message: 'All logs cleared', count: 0 });
}
