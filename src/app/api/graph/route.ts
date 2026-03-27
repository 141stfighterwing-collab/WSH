import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/graph - Get notes as graph data (nodes and edges)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const tag = searchParams.get('tag');
    const noteType = searchParams.get('type');
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Build filter conditions
    const where: any = {
      userId,
      isDeleted: false,
    };

    if (folderId) {
      where.folderId = folderId;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (noteType) {
      where.type = noteType;
    }

    // Fetch notes
    const notes = await prisma.note.findMany({
      where,
      include: {
        folder: { select: { id: true, name: true } },
      },
    });

    // Fetch explicit note links
    const noteLinks = await prisma.noteLink.findMany({
      where: {
        OR: [
          { fromNote: { userId } },
          { toNote: { userId } },
        ],
      },
    });

    // Build nodes
    const nodes = notes.map(note => ({
      id: note.id,
      title: note.title,
      type: note.type,
      folder: note.folder ? { id: note.folder.id, name: note.folder.name } : null,
      tags: note.tags,
      color: note.color,
      accessCount: note.accessCount,
      createdAt: note.createdAt,
      // Position will be calculated on frontend or stored
      x: 0,
      y: 0,
    }));

    // Build edges from various relationships
    const edges: any[] = [];
    const edgeSet = new Set<string>(); // To avoid duplicates

    // 1. Explicit links
    noteLinks.forEach(link => {
      const key = `${link.fromNoteId}-${link.toNoteId}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({
          id: link.id,
          source: link.fromNoteId,
          target: link.toNoteId,
          type: link.linkType,
          weight: link.weight,
          relation: 'explicit',
        });
      }
    });

    // 2. Shared tags (implicit connections)
    const tagMap = new Map<string, string[]>();
    notes.forEach(note => {
      note.tags.forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }
        tagMap.get(tag)!.push(note.id);
      });
    });

    tagMap.forEach((noteIds, tag) => {
      // Connect notes with same tag
      for (let i = 0; i < noteIds.length; i++) {
        for (let j = i + 1; j < noteIds.length; j++) {
          const key1 = `${noteIds[i]}-${noteIds[j]}`;
          const key2 = `${noteIds[j]}-${noteIds[i]}`;

          if (!edgeSet.has(key1) && !edgeSet.has(key2)) {
            edgeSet.add(key1);
            edges.push({
              id: `tag-${tag}-${i}-${j}`,
              source: noteIds[i],
              target: noteIds[j],
              type: 'shared_tag',
              weight: 1,
              relation: 'tag',
              tag,
            });
          }
        }
      }
    });

    // 3. Same folder (implicit connections)
    const folderMap = new Map<string, string[]>();
    notes.forEach(note => {
      if (note.folderId) {
        if (!folderMap.has(note.folderId)) {
          folderMap.set(note.folderId, []);
        }
        folderMap.get(note.folderId)!.push(note.id);
      }
    });

    folderMap.forEach((noteIds, folderId) => {
      // Only add folder edges if not too many notes (avoid cluttering)
      if (noteIds.length <= 10) {
        for (let i = 0; i < noteIds.length; i++) {
          for (let j = i + 1; j < noteIds.length; j++) {
            const key1 = `${noteIds[i]}-${noteIds[j]}`;
            const key2 = `${noteIds[j]}-${noteIds[i]}`;

            if (!edgeSet.has(key1) && !edgeSet.has(key2)) {
              edgeSet.add(key1);
              edges.push({
                id: `folder-${folderId}-${i}-${j}`,
                source: noteIds[i],
                target: noteIds[j],
                type: 'same_folder',
                weight: 0.5,
                relation: 'folder',
              });
            }
          }
        }
      }
    });

    // Calculate statistics
    const stats = {
      totalNotes: nodes.length,
      totalEdges: edges.length,
      byType: nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byFolder: nodes.reduce((acc, n) => {
        const folderName = n.folder?.name || 'Uncategorized';
        acc[folderName] = (acc[folderName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      connectionCounts: nodes.map(n => ({
        id: n.id,
        connections: edges.filter(e => e.source === n.id || e.target === n.id).length,
      })),
    };

    return NextResponse.json({
      nodes,
      edges,
      stats,
    });
  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
}

// POST /api/graph - Create a note link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromNoteId, toNoteId, linkType = 'related', weight = 1, createdBy } = body;

    if (!fromNoteId || !toNoteId) {
      return NextResponse.json({ error: 'fromNoteId and toNoteId required' }, { status: 400 });
    }

    // Check if link already exists
    const existing = await prisma.noteLink.findFirst({
      where: { fromNoteId, toNoteId },
    });

    if (existing) {
      return NextResponse.json({ link: existing, message: 'Link already exists' });
    }

    const link = await prisma.noteLink.create({
      data: {
        fromNoteId,
        toNoteId,
        linkType,
        weight,
        createdBy,
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Create link error:', error);
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}

// DELETE /api/graph - Delete a note link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json({ error: 'linkId required' }, { status: 400 });
    }

    await prisma.noteLink.delete({
      where: { id: linkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete link error:', error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
