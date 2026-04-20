import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// GET /api/documents/[id]/file — Serve the original uploaded file for viewing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { id } = await params;
    const document = await db.document.findUnique({
      where: { id },
      select: { id: true, uploadedBy: true, filePath: true, fileName: true, mimeType: true },
    });

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (document.uploadedBy !== userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    if (!document.filePath) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    // Resolve path relative to project root
    const fullPath = path.resolve(process.cwd(), document.filePath);
    if (!fullPath.startsWith(path.resolve(process.cwd()))) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const stat = fs.statSync(fullPath);

    // Determine content type
    const ext = document.fileName.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      md: 'text/markdown',
      html: 'text/html',
      htm: 'text/html',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      yaml: 'text/yaml',
      yml: 'text/yaml',
      log: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      rtf: 'application/rtf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    const contentType = document.mimeType || mimeMap[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.fileName)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to serve file';
    addLog('error', `GET /documents/[id]/file failed: ${message}`, 'documents');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
