import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';
import { db } from '@/lib/db';
import { processDocument, saveUploadedFile } from '@/lib/pdfProcessor';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'upload', 'documents');

// POST /api/documents/upload — Upload, save, extract, and chunk a document
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const allowed = ['pdf', 'txt', 'md', 'docx', 'doc', 'rtf', 'html', 'htm', 'csv', 'json', 'xml', 'yaml', 'yml', 'log', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 50MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = await saveUploadedFile(buffer, file.name, UPLOAD_DIR);

    const document = await db.document.create({
      data: {
        title: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        status: 'processing',
        uploadedBy: userId,
      },
    });

    try {
      const processed = await processDocument(buffer, file.name);

      if (processed.chunks.length > 0) {
        await db.documentChunk.createMany({
          data: processed.chunks.map((chunk) => ({
            documentId: document.id,
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            charCount: chunk.charCount,
          })),
        });
      }

      const updatedDoc = await db.document.update({
        where: { id: document.id },
        data: {
          status: 'ready',
          pageCount: processed.totalPages,
          totalChars: processed.totalChars,
          chunkCount: processed.totalChunks,
        },
      });

      return NextResponse.json({
        success: true,
        document: updatedDoc,
        message: `Processed ${processed.totalPages} page(s), ${processed.totalChunks} chunk(s), ${processed.totalChars.toLocaleString()} characters`,
      });
    } catch (processError) {
      const errorMsg = processError instanceof Error ? processError.message : 'Processing failed';
      addLog('error', `Document processing failed for ${file.name}: ${errorMsg}`, 'documents');
      // Mark as 'ready' anyway so the file can still be viewed/embedded — text extraction is optional
      await db.document.update({
        where: { id: document.id },
        data: { status: 'ready', errorMessage: errorMsg, pageCount: 0, totalChars: 0, chunkCount: 0 },
      });
      return NextResponse.json({
        success: true,
        document: { id: document.id, title: document.title },
        message: `File uploaded and ready to view. Note: text extraction encountered an issue (${errorMsg}) — document can still be viewed inline.`,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    addLog('error', `POST /documents/upload failed: ${message}`, 'documents');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
