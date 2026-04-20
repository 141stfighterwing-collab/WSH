import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';
import { db } from '@/lib/db';
import { deleteUploadedFile } from '@/lib/pdfProcessor';

// GET /api/documents/[id] — Get a document with its chunks
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
      include: {
        chunks: {
          select: { id: true, pageNumber: true, chunkIndex: true, content: true, charCount: true },
          orderBy: [{ pageNumber: 'asc' }, { chunkIndex: 'asc' }],
        },
      },
    });

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (document.uploadedBy !== userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    return NextResponse.json({ document });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get document';
    addLog('error', `GET /documents/[id] failed: ${message}`, 'documents');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/documents/[id] — Delete a document and its chunks
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { id } = await params;
    const document = await db.document.findUnique({
      where: { id },
      select: { id: true, uploadedBy: true, filePath: true },
    });

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (document.uploadedBy !== userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    await db.document.delete({ where: { id } });
    if (document.filePath) await deleteUploadedFile(document.filePath);

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete document';
    addLog('error', `DELETE /documents/[id] failed: ${message}`, 'documents');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/documents/[id] — Update document metadata (folder assignment, title)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { id } = await params;
    const document = await db.document.findUnique({
      where: { id },
      select: { id: true, uploadedBy: true },
    });

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (document.uploadedBy !== userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if ('folderId' in body) data.folderId = body.folderId || null;
    if ('title' in body && typeof body.title === 'string') data.title = body.title;

    const updated = await db.document.update({
      where: { id },
      data,
      select: {
        id: true, title: true, fileName: true, folderId: true,
        folder: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update document';
    addLog('error', `PUT /documents/[id] failed: ${message}`, 'documents');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
