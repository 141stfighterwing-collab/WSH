import { NextRequest, NextResponse } from 'next/server';
import { getLogs, clearLogs, addLog } from '@/lib/logger';

/** Guard: only admin/super-admin can access admin routes */
function requireAdmin(request: NextRequest): NextResponse | null {
  const role = request.headers.get('x-user-role');
  if (role !== 'admin' && role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const limit = parseInt(searchParams.get('limit') || '200', 10);
  const source = searchParams.get('source');

  let filtered = getLogs();

  if (level && level !== 'all') {
    filtered = filtered.filter((log) => log.level === level);
  }

  if (source) {
    filtered = filtered.filter((log) => log.source === source);
  }

  const logs = filtered.slice(-limit);

  return NextResponse.json({
    logs,
    total: getLogs().length,
    filteredCount: logs.length,
  });
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const count = getLogs().length;
  clearLogs();
  addLog('info', `Logs cleared (${count} entries removed) by admin`, 'system');
  return NextResponse.json({ message: 'All logs cleared', count: 0 });
}
