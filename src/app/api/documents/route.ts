import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/documents — List all documents for the current user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const documents = await db.document.findMany({
      where: { uploadedBy: userId },
      select: {
        id: true, title: true, fileName: true, fileSize: true, mimeType: true,
        pageCount: true, totalChars: true, chunkCount: true, status: true,
        errorMessage: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
