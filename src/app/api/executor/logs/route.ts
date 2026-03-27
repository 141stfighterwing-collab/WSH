import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const LOGS_DIR = '/logs';

// GET /api/executor/logs - Retrieve execution logs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const logFile = searchParams.get('file');
  const level = searchParams.get('level');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Get specific log file content
  if (logFile) {
    const logPath = path.join(LOGS_DIR, logFile);
    const normalizedPath = path.normalize(logPath);
    
    if (!normalizedPath.startsWith(LOGS_DIR)) {
      return NextResponse.json({ error: 'Invalid log path' }, { status: 403 });
    }

    if (!existsSync(normalizedPath)) {
      return NextResponse.json({ error: 'Log file not found' }, { status: 404 });
    }

    try {
      const content = await readFile(normalizedPath, 'utf-8');
      const stats = await stat(normalizedPath);
      
      // Parse log entries
      const lines = content.split('\n').filter(Boolean);
      let entries = lines.map(line => {
        try {
          // Try to parse JSON log entry
          const jsonMatch = line.match(/\[([^\]]+)\]\s+\[(\w+)\]\s+(.+)/);
          if (jsonMatch) {
            return {
              timestamp: jsonMatch[1],
              level: jsonMatch[2],
              raw: jsonMatch[3],
              line,
            };
          }
          return { raw: line };
        } catch {
          return { raw: line };
        }
      });

      // Filter by level if specified
      if (level) {
        entries = entries.filter(e => e.level === level.toUpperCase());
      }

      // Apply pagination
      const paginatedEntries = entries.slice(offset, offset + limit);

      return NextResponse.json({
        file: logFile,
        path: normalizedPath,
        size: stats.size,
        modified: stats.mtime,
        totalLines: lines.length,
        entries: paginatedEntries,
        pagination: {
          offset,
          limit,
          total: entries.length,
        },
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // List all log files
  try {
    if (!existsSync(LOGS_DIR)) {
      return NextResponse.json({
        logs: [],
        directory: LOGS_DIR,
        exists: false,
      });
    }

    const files = await readdir(LOGS_DIR);
    const logs = [];

    for (const file of files) {
      if (file.endsWith('.log') || file.endsWith('.txt')) {
        const filePath = path.join(LOGS_DIR, file);
        try {
          const stats = await stat(filePath);
          logs.push({
            name: file,
            path: `/logs/${file}`,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          });
        } catch (error) {
          console.error(`Error reading log ${file}:`, error);
        }
      }
    }

    // Sort by modified time, newest first
    logs.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return NextResponse.json({
      logs,
      directory: LOGS_DIR,
      exists: true,
      count: logs.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
