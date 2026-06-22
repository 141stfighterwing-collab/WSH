import type { Note } from '@/store/wshStore';

export const NOTES_PAGE_SIZE = 50;

export interface NotesListItem extends Note {
  preview: string;
}

export interface NotesPageResponse {
  notes: NotesListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NotesQueryParams {
  limit?: number;
  cursor?: string | null;
  type?: string | null;
  folderId?: string | null;
  search?: string | null;
  date?: string | null;
  includeDeleted?: boolean;
}

export function buildNotesQuery(params: NotesQueryParams): string {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.type) q.set('type', params.type);
  if (params.folderId) q.set('folderId', params.folderId);
  if (params.search) q.set('search', params.search);
  if (params.date) q.set('date', params.date);
  if (params.includeDeleted) q.set('includeDeleted', 'true');
  return q.toString();
}

export function extractPreview(note: Pick<Note, 'rawContent' | 'content'>): string {
  const raw = (note.rawContent || note.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return raw.slice(0, 180);
}
