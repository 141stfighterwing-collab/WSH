import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';
import { db } from '@/lib/db';

// GET /api/documents — List all documents for the current user, optionally filtered by folder
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    const where: Record<string, unknown> = { uploadedBy: userId };
    // folderId=none means "unfoldered", folderId=<id> means that specific folder
    if (folderId === 'none') {
      where.folderId = null;
    } else if (folderId) {
      where.folderId = folderId;
    }

    const documents = await db.document.findMany({
      where,
      select: {
        id: true, title: true, fileName: true, fileSize: true, mimeType: true,
        pageCount: true, totalChars: true, chunkCount: true, status: true,
        errorMessage: true, folderId: true, createdAt: true, updatedAt: true,
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list documents';
    addLog('error', `GET /documents failed: ${message}`, 'documents');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
