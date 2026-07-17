import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';
import { db } from '@/lib/db';

interface SearchParams {
  query: string;
  mode: 'fulltext' | 'phrase' | 'boolean' | 'fuzzy';
  limit: number;
}

function parseParams(body: Record<string, unknown>): SearchParams {
  return {
    query: String(body.query || '').trim(),
    mode: ['fulltext', 'phrase', 'boolean', 'fuzzy'].includes(String(body.mode || ''))
      ? (body.mode as SearchParams['mode']) : 'fulltext',
    limit: Math.min(Math.max(Number(body.limit) || 30, 1), 100),
  };
}

function normalizeTerms(query: string): string[] {
  return query
    .replace(/[&|!():*<>'"\\]/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function parseBooleanQuery(query: string): { include: string[]; optional: string[]; exclude: string[] } {
  const tokens = query.split(/\s+/).filter(Boolean);
  const include: string[] = [];
  const optional: string[] = [];
  const exclude: string[] = [];

  let operator: 'AND' | 'OR' | 'NOT' = 'AND';
  for (const rawToken of tokens) {
    const token = rawToken.trim();
    const upper = token.toUpperCase();

    if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
      operator = upper;
      continue;
    }

    const cleaned = token.replace(/[&|!():*<>'"\\]/g, '').trim();
    if (cleaned.length < 2) continue;

    if (operator === 'NOT') exclude.push(cleaned);
    else if (operator === 'OR') optional.push(cleaned);
    else include.push(cleaned);

    operator = 'AND';
  }

  return { include, optional, exclude };
}

// POST /api/documents/search — Full-text search across all documents
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { query, mode, limit } = parseParams(body);

    if (!query) return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    if (query.length < 2) return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });

    const documentFilter = { document: { uploadedBy: userId, status: 'ready' } };

    let where: Record<string, unknown>;
    switch (mode) {
      case 'phrase':
        where = { ...documentFilter, content: { contains: query, mode: 'insensitive' } };
        break;
      case 'boolean': {
        const { include, optional, exclude } = parseBooleanQuery(query);
        where = {
          ...documentFilter,
          AND: [
            ...include.map((term) => ({ content: { contains: term, mode: 'insensitive' } })),
            ...exclude.map((term) => ({ NOT: { content: { contains: term, mode: 'insensitive' } } })),
            ...(optional.length > 0
              ? [{ OR: optional.map((term) => ({ content: { contains: term, mode: 'insensitive' } })) }]
              : []),
          ],
        };
        break;
      }
      case 'fuzzy': {
        const terms = query.split(/\s+/).filter(Boolean).map((t) => t.endsWith('*') ? t.slice(0, -1) : t).filter((t) => t.length >= 2);
        where = { ...documentFilter, OR: terms.map((term) => ({ content: { contains: term, mode: 'insensitive' } })) };
        break;
      }
      default: {
        const terms = normalizeTerms(query);
        where = {
          ...documentFilter,
          AND: terms.map((term) => ({ content: { contains: term, mode: 'insensitive' } })),
        };
      }
    }

    const chunks = await db.documentChunk.findMany({
      where,
      select: {
        id: true, pageNumber: true, chunkIndex: true, content: true, charCount: true,
        document: { select: { id: true, title: true, fileName: true, createdAt: true } },
      },
      orderBy: [
        { document: { createdAt: 'desc' } },
        { pageNumber: 'asc' },
        { chunkIndex: 'asc' },
      ],
      take: limit,
    });

    const results = chunks.map((chunk) => ({
      id: chunk.id,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      snippet: createSnippet(chunk.content, query),
      document: chunk.document,
    }));

    const matchingDocIds = [...new Set(chunks.map((c) => c.document.id))];

    return NextResponse.json({
      results,
      summary: { query, mode, totalMatches: results.length, matchingDocuments: matchingDocIds.length },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    addLog('error', `POST /documents/search failed: ${message}`, 'documents');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function createSnippet(content: string, query: string): string {
  const maxLen = 300;
  const terms = query.replace(/[&|!():*<>'"\\]/g, ' ').split(/\s+/).filter((t) => t.length >= 2);
  if (terms.length === 0) return content.slice(0, maxLen) + (content.length > maxLen ? '...' : '');

  const lower = content.toLowerCase();
  let bestPos = -1;
  for (const term of terms) {
    const pos = lower.indexOf(term.toLowerCase());
    if (pos !== -1 && (bestPos === -1 || pos < bestPos)) bestPos = pos;
  }

  if (bestPos === -1) return content.slice(0, maxLen) + (content.length > maxLen ? '...' : '');

  const start = Math.max(0, bestPos - 80);
  const end = Math.min(content.length, start + maxLen);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet += '...';

  for (const term of terms) {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    snippet = snippet.replace(regex, '«$1»');
  }
  return snippet;
}
