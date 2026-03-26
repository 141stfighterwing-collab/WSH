import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const SCRIPTS_DIR = '/scripts';

// GET /api/executor/scripts - List available scripts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scriptName = searchParams.get('name');
  const action = searchParams.get('action');

  // Get specific script content
  if (scriptName && action === 'content') {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const normalizedPath = path.normalize(scriptPath);
    
    if (!normalizedPath.startsWith(SCRIPTS_DIR)) {
      return NextResponse.json({ error: 'Invalid script path' }, { status: 403 });
    }

    if (!existsSync(normalizedPath)) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    try {
      const content = await readFile(normalizedPath, 'utf-8');
      const stats = await stat(normalizedPath);
      
      return NextResponse.json({
        name: scriptName,
        path: normalizedPath,
        content,
        size: stats.size,
        modified: stats.mtime,
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // List all scripts
  try {
    if (!existsSync(SCRIPTS_DIR)) {
      return NextResponse.json({
        scripts: [],
        directory: SCRIPTS_DIR,
        exists: false,
      });
    }

    const files = await readdir(SCRIPTS_DIR);
    const scripts = [];

    for (const file of files) {
      if (file.endsWith('.ps1') || file.endsWith('.psm1')) {
        const filePath = path.join(SCRIPTS_DIR, file);
        try {
          const stats = await stat(filePath);
          
          // Try to extract synopsis from script
          let synopsis = '';
          try {
            const content = await readFile(filePath, 'utf-8');
            const synopsisMatch = content.match(/\.SYNOPSIS\s*\n?\s*(.+?)(?:\n|$)/i);
            if (synopsisMatch) {
              synopsis = synopsisMatch[1].trim();
            }
          } catch {}

          scripts.push({
            name: file,
            path: `/scripts/${file}`,
            size: stats.size,
            modified: stats.mtime,
            synopsis: synopsis || 'No description available',
          });
        } catch (error) {
          console.error(`Error reading script ${file}:`, error);
        }
      }
    }

    return NextResponse.json({
      scripts,
      directory: SCRIPTS_DIR,
      exists: true,
      count: scripts.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
