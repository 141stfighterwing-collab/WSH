import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';
import { db } from '@/lib/db';
import { extractPreview } from '@/lib/notes';

// GET /api/notes — Fetch paginated notes for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || '50'), 1), 100);
    const cursor = searchParams.get('cursor');
    const type = searchParams.get('type');
    const folderId = searchParams.get('folderId');
    const search = searchParams.get('search')?.trim();
    const date = searchParams.get('date');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const where: Record<string, unknown> = { userId };
    if (!includeDeleted) where.isDeleted = false;
    if (type) where.type = type;
    if (folderId) where.folderId = folderId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { rawContent: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (date) {
      const start = new Date(`${date}T00:00:00.000`);
      const end = new Date(`${date}T23:59:59.999`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        where.createdAt = { gte: start, lte: end };
      }
    }

    const notes = await db.note.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = notes.length > limit;
    const page = hasMore ? notes.slice(0, limit) : notes;

    const serialized = page.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      rawContent: note.rawContent,
      preview: extractPreview({ rawContent: note.rawContent, content: note.content }),
      type: note.type,
      tags: safeParseTags(note.tags),
      color: note.color,
      folderId: note.folderId,
      userId: note.userId,
      isDeleted: note.isDeleted,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      notes: serialized,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      hasMore,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog('error', `GET /notes failed: ${message}`, 'notes');
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST /api/notes — Create a new note
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, rawContent, type, tags, color, folderId } = body;

    const note = await db.note.create({
      data: {
        title: title || 'Untitled Note',
        content: content || '',
        rawContent: rawContent || '',
        type: type || 'quick',
        tags: JSON.stringify(tags || []),
        color: color || 'yellow',
        folderId: folderId || null,
        userId,
      },
    });

    return NextResponse.json({
      note: {
        ...note,
        tags: safeParseTags(note.tags),
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog('error', `POST /notes failed: ${message}`, 'notes');
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

// PUT /api/notes — Update an existing note
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.note.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.content !== undefined) data.content = updates.content;
    if (updates.rawContent !== undefined) data.rawContent = updates.rawContent;
    if (updates.type !== undefined) data.type = updates.type;
    if (updates.tags !== undefined) data.tags = JSON.stringify(updates.tags);
    if (updates.color !== undefined) data.color = updates.color;
    if (updates.folderId !== undefined) data.folderId = updates.folderId || null;
    if (updates.isDeleted !== undefined) data.isDeleted = updates.isDeleted;

    const note = await db.note.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      note: {
        ...note,
        tags: safeParseTags(note.tags),
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog('error', `PUT /notes failed: ${message}`, 'notes');
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

// DELETE /api/notes?id=<id> — Permanently delete a note
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.note.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await db.note.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog('error', `DELETE /notes failed: ${message}`, 'notes');
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}

// Helper: safely parse tags from JSON string
function safeParseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}
