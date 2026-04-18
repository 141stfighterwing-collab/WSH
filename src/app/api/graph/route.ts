import { NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';

interface GraphNode {
  id: string;
  title: string;
  type: string;
  tags: string[];
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// In-memory note storage for API access
// In production this would read from Prisma/DB
interface StoredNote {
  id: string;
  title: string;
  type: string;
  tags: string[];
  isDeleted: boolean;
}

export async function GET(request: Request) {
  try {
    // Read notes from the request body or use a simple in-memory approach
    // Since the client-side store holds the data, we accept notes as query param data
    const { searchParams } = new URL(request.url);
    const notesParam = searchParams.get('notes');

    let notes: StoredNote[] = [];

    if (notesParam) {
      try {
        notes = JSON.parse(decodeURIComponent(notesParam));
      } catch {
        notes = [];
      }
    }

    // Filter out deleted notes
    const activeNotes = notes.filter((n) => !n.isDeleted);

    // Build nodes
    const nodes: GraphNode[] = activeNotes.map((note) => ({
      id: note.id,
      title: note.title || 'Untitled',
      type: note.type || 'quick',
      tags: note.tags || [],
    }));

    // Build edges from shared tags
    const edges: GraphEdge[] = [];
    const edgeMap = new Map<string, GraphEdge>();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const sharedTags = nodes[i].tags.filter((tag) =>
          nodes[j].tags.includes(tag)
        );

        if (sharedTags.length > 0) {
          const edgeKey = [nodes[i].id, nodes[j].id].sort().join('--');
          const existing = edgeMap.get(edgeKey);
          if (existing) {
            existing.weight += sharedTags.length;
          } else {
            edgeMap.set(edgeKey, {
              source: nodes[i].id,
              target: nodes[j].id,
              weight: sharedTags.length,
            });
          }
        }
      }
    }

    // Also connect notes that are in the same folder (if folderId available)
    // For now, just return tag-based edges
    edges.push(...edgeMap.values());

    const data: GraphData = { nodes, edges };

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog('error', `GET /graph failed: ${message}`, 'notes');
    return NextResponse.json({ nodes: [], edges: [] });
  }
}
